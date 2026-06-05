import { io } from 'socket.io-client'
import { isElectron, getElectronToken, getElectronClientId } from './electronAuth'
import { getWebToken, getWebClientId, claimWebClient } from './webAuth'
import { getApiBaseUrl } from './config/api'

const BASE = getApiBaseUrl()

export const REELM_CACHE = {}

let socket = null
let socketUid = null
// Pending sets: track which rooms should be active so we can re-join after reconnect
const _pendingChannels = new Set()
const _pendingReelms = new Set()
let _presenceStatus = 'online'

export async function getIdToken() {
  if (isElectron) return getElectronToken()
  return getWebToken()
}

export function getClientId() {
  if (isElectron) return getElectronClientId()
  return getWebClientId()
}

const inflightRequests = new Map()
const responseCache = new Map()
const userDocCache = new Map()
const userPersistLastJson = new Map()
const userPersistPendingJson = new Map()
const profileCache = new Map()
// Server-owned documents must only be refreshed from the API. Letting the
// client PUT these snapshots back creates stale role/member copies and is the
// root cause of phantom members, duplicate roles, and slow login fan-out.
const SERVER_OWNED_USER_DOCS = new Set(['reelms'])

function stableJson(value) {
  try { return JSON.stringify(value) } catch { return String(value) }
}

function requestCacheTtl(path, method) {
  if (method !== 'GET') return 0
  if (path === '/api/v1/user/bootstrap') return 1000
  if (path.startsWith('/api/v1/user/profile/')) return 5 * 60 * 1000
  if (path.startsWith('/api/v1/users')) return 30 * 1000
  if (path.startsWith('/api/v1/reelms/discover')) return 20 * 1000
  if (path.startsWith('/api/v1/user/doc/reelms')) return 10 * 1000
  if (path.startsWith('/api/v1/user/doc/customization') || path.startsWith('/api/v1/user/doc/bg_image') || path.startsWith('/api/v1/user/doc/body_font') || path.startsWith('/api/v1/user/doc/environment')) return 60 * 1000
  if (path.startsWith('/api/v1/user/doc/')) return 8 * 1000
  if (path.startsWith('/api/v1/reelm/') && path.endsWith('/core')) return 5 * 1000
  if (path.startsWith('/api/v1/reelm/') && path.includes('/doc/')) return 5 * 1000
  return 0
}

function rememberUserDoc(sk, data) {
  if (!sk) return
  userDocCache.set(String(sk), { data, at: Date.now() })
  userPersistLastJson.set(String(sk), stableJson(data))
}

function userDocCacheTtl(sk) {
  const key = String(sk || '')
  if (['customization', 'bg_image', 'body_font', 'environment'].includes(key)) return 10 * 60 * 1000
  if (key === 'reelms') return 60 * 1000
  if (['chats', 'friends', 'friend_requests', 'notifications', 'message_requests', 'unread_counts'].includes(key)) return 15 * 1000
  return 1200
}

async function parseApiResponse(r) {
  if (r.status === 204) return null
  const ct = r.headers.get('content-type')
  if (!ct || !ct.includes('application/json')) return null
  return r.json()
}

function makeApiError(r, text) {
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch {}
  const err = new Error(payload?.message || payload?.error || text || r.statusText)
  err.status = r.status
  err.code = payload?.code || payload?.error || `http/${r.status}`
  err.details = payload?.details || payload?.issues || null
  err.payload = payload
  if (r.status === 401 && (err.code === 'auth/session-replaced' || err.code === 'session_replaced' || err.message === 'session_replaced')) {
    try { window.dispatchEvent(new CustomEvent('reelms:session-invalid', { detail: { code: err.code } })) } catch {}
  }
  return err
}

async function api(path, opts = {}) {
  const token = await getIdToken()
  if (!token) throw new Error('not_signed_in')
  const method = String(opts.method || 'GET').toUpperCase()
  const cacheKey = `${method}:${path}:${opts.body || ''}`
  const ttl = requestCacheTtl(path, method)
  const now = Date.now()
  if (ttl > 0) {
    const cached = responseCache.get(cacheKey)
    if (cached && now - cached.at < ttl) return cached.value
    if (inflightRequests.has(cacheKey)) return inflightRequests.get(cacheKey)
  }

  const run = (async () => {
    let attempt = 0
    while (true) {
      const r = await fetch(`${BASE}${path}`, {
        ...opts,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.headers || {}),
          Authorization: `Bearer ${token}`,
          'X-Reelms-Client-Id': getClientId(),
        },
      })
      if (r.ok) {
        const value = await parseApiResponse(r)
        if (ttl > 0) responseCache.set(cacheKey, { value, at: Date.now() })
        return value
      }
      if (r.status === 404 && opts.allowNotFound) return null
      const text = await r.text()
      const err = makeApiError(r, text)
      if (r.status === 429 && attempt < 2) {
        const retryAfter = Number(r.headers.get('retry-after') || 0)
        const waitMs = Math.min(2500, Math.max(350, retryAfter ? retryAfter * 1000 : 450 * (attempt + 1)))
        await new Promise(resolve => setTimeout(resolve, waitMs))
        attempt += 1
        continue
      }
      throw err
    }
  })()

  if (ttl > 0) {
    inflightRequests.set(cacheKey, run)
    run.finally(() => inflightRequests.delete(cacheKey)).catch(() => {})
  }
  return run
}

async function publicApi(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!r.ok) {
    const text = await r.text()
    let payload = null
    try { payload = text ? JSON.parse(text) : null } catch {}
    const err = new Error(payload?.message || payload?.error || text || r.statusText)
    err.status = r.status
    err.code = payload?.code || payload?.error || `http/${r.status}`
    err.details = payload?.details || payload?.issues || null
    throw err
  }
  if (r.status === 204) return null
  const ct = r.headers.get('content-type')
  if (!ct || !ct.includes('application/json')) return null
  return r.json()
}

export async function userBootstrap() {
  if (!isElectron) await claimWebClient().catch(() => null)
  const j = await api('/api/v1/user/bootstrap')
  const data = j.data || {}
  Object.entries(data || {}).forEach(([sk, value]) => rememberUserDoc(sk, value))
  return data
}

export async function userGetDoc(sk) {
  const key = String(sk || '')
  const cached = userDocCache.get(key)
  if (cached && Date.now() - cached.at < userDocCacheTtl(key)) return cached.data
  const j = await api(`/api/v1/user/doc/${encodeURIComponent(key)}`)
  rememberUserDoc(key, j.data)
  return j.data
}

export async function userPutDoc(sk, data) {
  const key = String(sk || '')
  await api(`/api/v1/user/doc/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
  rememberUserDoc(key, data)
  userPersistPendingJson.delete(key)
}

const CORE_DOC_FIELDS = new Set(['meta', 'structure', 'roles', 'members', 'join_requests', 'ban_list', 'timeout_list'])

function docFromCore(core, sk) {
  if (!core) return undefined
  if (sk === 'meta') {
    const { roles, members, categories, joinRequests, banList, timeoutList, ...meta } = core
    return meta
  }
  if (sk === 'structure') return { categories: Array.isArray(core.categories) ? core.categories : [] }
  if (sk === 'roles') return Array.isArray(core.roles) ? core.roles : []
  if (sk === 'members') return Array.isArray(core.members) ? core.members : []
  if (sk === 'join_requests') return Array.isArray(core.joinRequests) ? core.joinRequests : []
  if (sk === 'ban_list') return Array.isArray(core.banList) ? core.banList : []
  if (sk === 'timeout_list') return Array.isArray(core.timeoutList) ? core.timeoutList : []
  return undefined
}

export async function reelmGetDoc(reelmId, sk) {
  const id = reelmId || 'global'
  const key = String(sk || '')
  if (CORE_DOC_FIELDS.has(key)) {
    const core = await reelmGetCore(id).catch((err) => {
      if (err?.status === 403) return null
      throw err
    })
    const value = docFromCore(core, key)
    if (typeof value !== 'undefined') return value
    if (key === 'join_requests' || key === 'ban_list' || key === 'timeout_list') return []
  }
  const j = await api(`/api/v1/reelm/${encodeURIComponent(id)}/doc/${encodeURIComponent(key)}`)
  return j.data
}

export async function reelmGetCore(reelmId) {
  const id = reelmId || 'global'
  const j = await api(`/api/v1/reelm/${encodeURIComponent(id)}/core`)
  return j?.data || null
}

export async function reelmPutDoc(reelmId, sk, data, options = {}) {
  const id = reelmId || 'global'
  const body = { data, ...(options && typeof options === 'object' ? options : {}) }
  await api(`/api/v1/reelm/${encodeURIComponent(id)}/doc/${encodeURIComponent(sk)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function appGetDoc(sk) {
  const j = await api(`/api/v1/app/doc/${encodeURIComponent(sk)}`)
  return j.data
}

export async function appPutDoc(sk, data) {
  await api(`/api/v1/app/doc/${encodeURIComponent(sk)}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export async function socialNotify(targetUid, text, link = null) {
  await api('/api/v1/social/notify', { method: 'POST', body: JSON.stringify({ targetUid, text, link }) })
}

export async function socialFriendRequest(toUid, from) {
  return api('/api/v1/social/friend-request', { method: 'POST', body: JSON.stringify({ toUid, from }) })
}

export async function socialFriendAccept(requester, meProfile) {
  return api('/api/v1/social/friend-accept', { method: 'POST', body: JSON.stringify({ requester, meProfile }) })
}

export async function socialFriendReject(requesterId) {
  return api('/api/v1/social/friend-reject', { method: 'POST', body: JSON.stringify({ requesterId }) })
}

export async function socialRemoveFriend(friendId) {
  await api('/api/v1/social/remove-friend', { method: 'POST', body: JSON.stringify({ friendId }) })
}

export async function socialBlockUser(targetUid) {
  await api('/api/v1/social/block', { method: 'POST', body: JSON.stringify({ targetUid }) })
}

export async function socialUnblockUser(targetUid) {
  await api('/api/v1/social/unblock', { method: 'POST', body: JSON.stringify({ targetUid }) })
}

export async function socialMessageRequest(toUid, from, preview) {
  return api('/api/v1/social/message-request', { method: 'POST', body: JSON.stringify({ toUid, from, preview }) })
}

const reelmTimers = {}
const userTimers = {}

export function patchReelmCache(reelmId, partial) {
  const id = reelmId || 'global'
  REELM_CACHE[id] = { ...(REELM_CACHE[id] || {}), ...partial }
}

export function scheduleReelmPersist(reelmId, field, value, ms = 450) {
  const id = reelmId || 'global'
  const k = `${id}:${field}`
  clearTimeout(reelmTimers[k])
  reelmTimers[k] = setTimeout(() => {
    reelmPutDoc(id, field, value).catch(() => {})
    delete reelmTimers[k]
  }, ms)
}

export function scheduleUserPersist(sk, data, ms = 650) {
  const key = String(sk || '')
  if (SERVER_OWNED_USER_DOCS.has(key)) {
    rememberUserDoc(key, data)
    return
  }
  const nextJson = stableJson(data)
  if (userPersistLastJson.get(key) === nextJson || userPersistPendingJson.get(key) === nextJson) return
  userPersistPendingJson.set(key, nextJson)
  clearTimeout(userTimers[key])
  userTimers[key] = setTimeout(() => {
    userPutDoc(key, data).catch(() => {}).finally(() => {
      if (userPersistPendingJson.get(key) === nextJson) userPersistPendingJson.delete(key)
      delete userTimers[key]
    })
  }, ms)
}

const appTimers = {}
export function scheduleAppPersist(sk, data, ms = 450) {
  clearTimeout(appTimers[sk])
  appTimers[sk] = setTimeout(() => {
    appPutDoc(sk, data).catch(() => {})
    delete appTimers[sk]
  }, ms)
}

export async function recordUserSession(parseDeviceInfo, notifyNewDevice) {
  const ua = navigator.userAgent
  const device = parseDeviceInfo(ua)
  const j = await api('/api/v1/user/session/record', {
    method: 'POST',
    body: JSON.stringify({ ua, device, notifyNewDevice }),
  })
  const sessionId = j?.data?.sessionId || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  try { sessionStorage.setItem('reelms_session_id', sessionId) } catch (_) {}
  if (Array.isArray(j?.data?.sessions)) rememberUserDoc('sessions', j.data.sessions)
  return sessionId
}

let lastSessionTouchAt = 0
export async function touchUserSession() {
  let sessionId
  try { sessionId = sessionStorage.getItem('reelms_session_id') } catch (_) { return }
  if (!sessionId) return
  const now = Date.now()
  if (now - lastSessionTouchAt < 4 * 60 * 1000) return
  lastSessionTouchAt = now
  await api('/api/v1/user/session/touch', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function loadReelmDocuments(reelmId) {
  const id = reelmId || 'global'
  const fields = ['feed_posts', 'articles', 'article_drafts', 'threads', 'news']
  const entries = await Promise.all(
    fields.map(async (f) => {
      try {
        const v = await reelmGetDoc(id, f)
        return [f, Array.isArray(v) ? v : v == null ? (f === 'article_drafts' ? [] : []) : v]
      } catch {
        return [f, f === 'article_drafts' ? [] : []]
      }
    })
  )
  const obj = Object.fromEntries(entries)
  patchReelmCache(id, { ...obj, __loaded: true })
  return obj
}

export function connectReelmsSocket(handlers) {
  const { onUserDoc, onReelmDoc, onReelmManagerDoc, onReelmCoreSnapshot, onAppDoc, onMessage, onMessageDeleted, onMessagesCleared, onReaction, onVoicePosition, onVcEvent, onVcError, onVcCount, onVcCounts, onVcParticipants, onVcState, onPresence, onProfileUpdated, onReelmAccessRevoked, onReelmMemberJoined, onReelmMemberRemoved, onReelmMemberLeft, onJoinRequestRejected, onJoinRequestApproved, onReelmTimeout, onReelmTimeoutRemoved, onReelmBanned, onReelmClosed, onConnect } = handlers
  const run = async () => {
    const token = await getIdToken()
    if (!token) return
    if (socket) {
      socket.disconnect()
      socket = null
    }
    socket = io(BASE, {
      path: '/socket.io',
      auth: { token, clientId: getClientId() },
      transports: ['polling', 'websocket'],
    })
    // On every (re)connect: re-join all tracked rooms so server-side memberships are restored
    socket.on('connect', () => {
      _pendingChannels.forEach(key => socket.emit('joinChannel', key))
      socket.emit('presence:setStatus', { status: _presenceStatus })
      _pendingReelms.forEach(id => {
        socket.emit('joinReelm', id)
        socket.emit('vc:counts', { reelmId: id })
      })
      onConnect?.()
    })
    socket.on('reelms:doc', (msg) => {
      if (!msg || !msg.scope) return
      if (msg.scope === 'user' && msg.sk) {
        if (typeof msg.data !== 'undefined') rememberUserDoc(msg.sk, msg.data)
        onUserDoc?.(msg.sk, msg.data, msg.version, msg)
      }
      if (msg.scope === 'reelm' && msg.sk) onReelmDoc?.(msg.reelmId, msg.sk, msg.data, msg.version, msg)
      if (msg.scope === 'app' && msg.sk) onAppDoc?.(msg.sk, msg.data, msg.version, msg)
    })
    socket.on('reelms:manager-doc', (msg) => {
      if (msg?.reelmId && msg?.sk) onReelmManagerDoc?.(msg.reelmId, msg.sk, msg.data, msg.version, msg)
    })
    socket.on('reelm:core-snapshot', (msg) => {
      const id = String(msg?.reelm?.id || msg?.reelmId || '')
      if (id && msg?.reelm) {
        patchReelmCache(id, msg.reelm)
        for (const key of Array.from(responseCache.keys())) {
          if (String(key).includes(`/api/v1/reelm/${encodeURIComponent(id)}/`)) responseCache.delete(key)
        }
      }
      if (id) onReelmCoreSnapshot?.(msg)
    })
    socket.on('reelms:message', (msg) => {
      if (msg?.msgKey && msg?.message) onMessage?.(msg.msgKey, msg.message)
    })
    socket.on('reelms:message-deleted', (msg) => {
      if (msg?.msgKey && msg?.msgId) onMessageDeleted?.(msg.msgKey, msg.msgId)
    })
    socket.on('reelms:messages-cleared', (msg) => {
      if (msg?.msgKey) onMessagesCleared?.(msg.msgKey)
    })
    socket.on('reelms:reaction', (msg) => {
      if (msg?.msgKey && msg?.msgId && msg?.emoji) onReaction?.(msg)
    })
    socket.on('reelms:profile-updated', (msg) => {
      const id = String(msg?.profile?.id || msg?.profile?.uid || '')
      if (id) {
        profileCache.set(id, { data: msg.profile, at: Date.now() })
        for (const key of Array.from(responseCache.keys())) {
          if (String(key).includes(`/api/v1/user/profile/${encodeURIComponent(id)}`)) responseCache.delete(key)
        }
        onProfileUpdated?.(msg.profile)
      }
    })
    socket.on('reelm:access-revoked', (msg) => {
      if (msg?.reelmId) onReelmAccessRevoked?.(msg)
    })
    socket.on('reelm:member-joined', (msg) => {
      if (msg?.reelmId) onReelmMemberJoined?.(msg)
    })
    socket.on('reelm:member-removed', (msg) => {
      if (msg?.reelmId) onReelmMemberRemoved?.(msg)
    })
    socket.on('reelm:member-left', (msg) => {
      if (msg?.reelmId) onReelmMemberLeft?.(msg)
    })
    socket.on('reelm:join-request-rejected', (msg) => {
      if (msg?.reelmId) onJoinRequestRejected?.(msg)
    })
    socket.on('reelm:join-request-approved', (msg) => {
      if (msg?.reelmId) onJoinRequestApproved?.(msg)
    })
    socket.on('reelm:timeout', (msg) => {
      if (msg?.reelmId) onReelmTimeout?.(msg)
    })
    socket.on('reelm:timeout-removed', (msg) => {
      if (msg?.reelmId) onReelmTimeoutRemoved?.(msg)
    })
    socket.on('reelm:banned', (msg) => {
      if (msg?.reelmId) onReelmBanned?.(msg)
    })
    socket.on('reelm:closed', (msg) => {
      if (msg?.reelmId) onReelmClosed?.(msg)
    })
    socket.on('voicePosition', (msg) => {
      if (msg?.userId && typeof msg.x === 'number' && typeof msg.y === 'number') {
        onVoicePosition?.(msg)
      }
    })
    socket.on('vc:event', (msg) => {
      if (msg && msg.type) onVcEvent?.(msg)
    })
    socket.on('vc:error', (msg) => {
      if (msg && msg.error) onVcError?.(msg)
    })
    socket.on('vc:count', (msg) => {
      if (msg && typeof msg.channelId === 'string' && typeof msg.count === 'number') onVcCount?.(msg)
    })
    socket.on('vc:counts', (msg) => {
      if (msg && typeof msg.reelmId === 'string' && msg.counts) onVcCounts?.(msg)
    })
    socket.on('vc:state', (msg) => {
      if (msg && typeof msg.reelmId === 'string' && typeof msg.channelId === 'string') onVcState?.(msg)
    })
    socket.on('vc:participants', (msg) => {
      if (msg && typeof msg.reelmId === 'string') onVcParticipants?.(msg)
    })
    socket.on('reelms:presence', (msg) => {
      if (msg?.reelmId && Array.isArray(msg.users)) onPresence?.(msg)
    })
    socket.on('reelms:presence:update', (msg) => {
      if (msg?.reelmId && Array.isArray(msg.users)) onPresence?.(msg)
    })
    socket.on('auth:session-replaced', (msg) => {
      const code = msg?.code || 'auth/session-replaced'
      try { window.dispatchEvent(new CustomEvent('reelms:session-invalid', { detail: { code } })) } catch {}
    })
    socket.on('connect_error', (err) => {
      const code = err?.data?.code || err?.message || ''
      if (code === 'auth/session-replaced' || code === 'session_replaced') {
        try { window.dispatchEvent(new CustomEvent('reelms:session-invalid', { detail: { code } })) } catch {}
      }
    })
  }
  run()
  return () => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    _pendingChannels.clear()
    _pendingReelms.clear()
  }
}

export function socketJoinReelm(reelmId) {
  if (!reelmId) return
  _pendingReelms.add(reelmId)
  if (socket?.connected) socket.emit('joinReelm', reelmId)
}

export function socketLeaveReelm(reelmId) {
  if (!reelmId) return
  _pendingReelms.delete(reelmId)
  if (socket?.connected) socket.emit('leaveReelm', reelmId)
}

export function socketJoinChannel(msgKey) {
  if (!msgKey) return
  _pendingChannels.add(msgKey)
  if (socket?.connected) socket.emit('joinChannel', msgKey)
}

export function socketLeaveChannel(msgKey) {
  if (!msgKey) return
  _pendingChannels.delete(msgKey)
  if (socket?.connected) socket.emit('leaveChannel', msgKey)
}

export function socketSetPresenceStatus(status) {
  const allowed = new Set(['online', 'idle', 'busy', 'invisible', 'offline'])
  _presenceStatus = allowed.has(status) ? status : 'online'
  if (socket?.connected) socket.emit('presence:setStatus', { status: _presenceStatus })
}

export function socketEmitVoicePosition(reelmId, channelId, x, y) {
  if (!socket || !reelmId || !channelId) return
  socket.emit('voicePosition', { reelmId, channelId, x, y })
}

// ── Voice signaling ────────────────────────────────────────────────────────
export function socketRequestVcCounts(reelmId) {
  if (!reelmId) return
  // If connected, request immediately; otherwise the connect handler will emit for _pendingReelms
  if (socket?.connected) socket.emit('vc:counts', { reelmId })
}

export function socketVcJoin(reelmId, channelId, userName, userPhoto) {
  if (!socket || !reelmId || !channelId) return
  socket.emit('vc:join', { reelmId, channelId, userName, userPhoto })
}

export function socketVcLeave(reelmId, channelId) {
  if (!socket || !reelmId || !channelId) return
  socket.emit('vc:leave', { reelmId, channelId })
}

export function socketVcHeartbeat(reelmId, channelId) {
  if (!socket || !reelmId || !channelId) return
  socket.emit('vc:heartbeat', { reelmId, channelId })
}

// Send to a specific user (offer / answer / ice / here / remote_ctrl_*)
export function socketVcSignal(toUid, payload) {
  if (!socket || !toUid || !payload) return
  socket.emit('vc:signal', { to: toUid, payload })
}


export function socketVcKick(reelmId, channelId, targetUid) {
  if (!socket || !reelmId || !channelId || !targetUid) return
  socket.emit('vc:kick', { reelmId, channelId, targetUid })
}

export function socketVcMove(reelmId, channelId, targetUid) {
  if (!socket || !reelmId || !channelId || !targetUid) return
  socket.emit('vc:move', { reelmId, channelId, targetUid })
}

export function socketVcInvite(reelmId, channelId, targetUid) {
  if (!socket || !reelmId || !channelId || !targetUid) return
  socket.emit('vc:invite', { reelmId, channelId, targetUid })
}

export function socketVcModeratorMute(reelmId, channelId, targetUid) {
  if (!socket || !reelmId || !channelId || !targetUid) return
  socket.emit('vc:moderator-mute', { reelmId, channelId, targetUid })
}

// Broadcast to all in the vc room except sender (mute / video / screen)
export function socketVcBroadcast(reelmId, channelId, payload) {
  if (!socket || !reelmId || !channelId || !payload) return
  socket.emit('vc:broadcast', { reelmId, channelId, payload })
}

// ── User profiles ─────────────────────────────────────────────────────────────

export async function userProfilePut(data) {
  await api('/api/v1/user/profile', { method: 'PUT', body: JSON.stringify({ data }) })
  const id = String(data?.id || data?.uid || '')
  if (id) profileCache.set(id, { data, at: Date.now() })
}

export async function userProfilePatch(data) {
  await api('/api/v1/user/profile', { method: 'PATCH', body: JSON.stringify({ data }) })
  const id = String(data?.id || data?.uid || '')
  if (id) profileCache.set(id, { data: { ...(profileCache.get(id)?.data || {}), ...data }, at: Date.now() })
}

export async function userProfileGet() {
  const j = await api('/api/v1/user/profile')
  return j.data
}

export async function userProfileGetById(uid) {
  const id = String(uid || '')
  if (!id) return null
  const cached = profileCache.get(id)
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.data
  const j = await api(`/api/v1/user/profile/${encodeURIComponent(id)}`)
  const data = j.data || null
  if (data) profileCache.set(id, { data, at: Date.now() })
  return data
}

export async function userProfileDelete() {
  await api('/api/v1/user/profile', { method: 'DELETE' })
}

export async function userByUsername(username) {
  const j = await api(`/api/v1/user/by-username/${encodeURIComponent(username)}`)
  return j.data
}

export async function userByEmail(email) {
  const j = await api(`/api/v1/user/by-email/${encodeURIComponent(email)}`)
  return j.data
}

export async function userCheckUsername(username) {
  const path = `/api/v1/user/check-username/${encodeURIComponent(username)}`
  const j = await (await getIdToken() ? api(path) : publicApi(path))
  return { available: Boolean(j?.available), exists: Boolean(j?.exists ?? !j?.available) }
}

export async function userCheckEmail(email) {
  const path = `/api/v1/user/check-email/${encodeURIComponent(email)}`
  const j = await (await getIdToken() ? api(path) : publicApi(path))
  return { available: Boolean(j?.available), exists: Boolean(j?.exists ?? !j?.available) }
}

export async function usersList(query = '') {
  const q = encodeURIComponent(String(query || '').trim())
  const j = await api(`/api/v1/users${q ? `?q=${q}` : ''}`)
  return j.data || []
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function messagesGet(msgKey) {
  const j = await api(`/api/v1/messages/${encodeURIComponent(msgKey)}`)
  return j.data || []
}

export async function messageSend(msgKey, message) {
  await api(`/api/v1/messages/${encodeURIComponent(msgKey)}`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function messageDelete(msgKey, msgId) {
  await api(`/api/v1/messages/${encodeURIComponent(msgKey)}/${encodeURIComponent(msgId)}`, {
    method: 'DELETE',
  })
}

export async function messageDeleteConversation(msgKey) {
  await api(`/api/v1/messages/${encodeURIComponent(msgKey)}`, {
    method: 'DELETE',
  })
}

export async function reactionsGet(msgKey) {
  const res = await api(`/api/v1/reactions/${encodeURIComponent(msgKey)}`, { allowNotFound: true })
  return res || { data: {} }
}
export async function reactionsToggle(msgKey, msgId, emoji, userId) {
  return api(`/api/v1/reactions/${encodeURIComponent(msgKey)}/${encodeURIComponent(msgId)}`, {
    method: 'POST',
    body: JSON.stringify({ emoji, userId: String(userId) }),
  })
}

export async function modInboxGet() {
  return messagesGet('mod_inbox')
}

export async function modReportSend(report) {
  await api('/admin/mod-report', {
    method: 'POST',
    body: JSON.stringify({ report }),
  })
}

export async function reelmByCode(code) {
  try {
    const j = await api(`/api/v1/reelm/by-code/${encodeURIComponent(code)}`)
    return j?.data || null
  } catch {
    return null
  }
}

export async function createReelmRemote(reelm) {
  const j = await api('/api/v1/reelms/create', {
    method: 'POST',
    body: JSON.stringify({ reelm }),
  })
  return j?.data || null
}

export async function joinReelmByCode(code) {
  const j = await api('/api/v1/reelms/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return j?.data || null
}

export async function adminAllReelms() {
  const j = await api('/api/v1/admin/all-reelms')
  return j.data || []
}

export async function discoverReelms(query = '') {
  const q = encodeURIComponent(String(query || '').trim())
  const j = await api(`/api/v1/reelms/discover${q ? `?q=${q}` : ''}`)
  return j?.data || []
}

export async function requestJoinReelm(reelmId) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/request-join`, { method: 'POST' })
  return j?.data || null
}


export async function leaveReelmRemote(reelmId) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/leave`, { method: 'POST' })
  return j?.data || null
}

export async function closeReelmRemote(reelmId, confirmName) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/close`, {
    method: 'POST',
    body: JSON.stringify({ confirmName }),
  })
  return j?.data || null
}

export async function approveJoinReelm(reelmId, requesterId) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/approve-join`, {
    method: 'POST',
    body: JSON.stringify({ requesterId }),
  })
  return j?.data || null
}

export async function rejectJoinReelm(reelmId, requesterId) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/reject-join`, {
    method: 'POST',
    body: JSON.stringify({ requesterId }),
  })
  return j?.data || null
}


export async function acceptReelmInvite(reelmId) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/accept-invite`, { method: 'POST' })
  return j?.data || null
}

export async function rejectReelmInvite(reelmId) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/reject-invite`, { method: 'POST' })
  return j?.data || null
}

export async function inviteReelmFriend(reelmId, targetUid) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/invite`, {
    method: 'POST',
    body: JSON.stringify({ targetUid }),
  })
  return j?.data || null
}

export async function banReelmMember(reelmId, targetUid, reason = '') {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/ban`, {
    method: 'POST',
    body: JSON.stringify({ targetUid, reason }),
  })
  return j?.data || null
}

export async function timeoutReelmMember(reelmId, targetUid, minutes = 10, reason = '') {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/timeout`, {
    method: 'POST',
    body: JSON.stringify({ targetUid, minutes, reason }),
  })
  return j?.data || null
}

export async function untimeoutReelmMember(reelmId, targetUid) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/untimeout`, {
    method: 'POST',
    body: JSON.stringify({ targetUid }),
  })
  return j?.data || null
}

export async function unbanReelmMember(reelmId, targetUid) {
  const j = await api(`/api/v1/reelms/${encodeURIComponent(reelmId)}/unban`, {
    method: 'POST',
    body: JSON.stringify({ targetUid }),
  })
  return j?.data || null
}

// ── Media / Local Storage Sync ────────────────────────────────────────────────

// Register file metadata in AWS (after uploading to local storage)
export async function getVoiceIceServers() {
  const j = await publicApi('/realtime/ice-servers')
  return j?.data?.iceServers || []
}

export async function mediaCreateUploadUrl(fileName, fileSize, mimeType) {
  const j = await api('/api/v1/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileSize, mimeType }),
  })
  return j.data
}

export async function mediaCompleteUpload(mediaId, etag = null) {
  const j = await api(`/api/v1/media/${encodeURIComponent(mediaId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ etag }),
  })
  return j.data
}

export async function mediaUploadToS3(file) {
  const upload = await mediaCreateUploadUrl(file.name, file.size, file.type || 'application/octet-stream')
  const res = await fetch(upload.upload.uploadUrl, {
    method: upload.upload.method || 'PUT',
    headers: upload.upload.headers || { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return mediaCompleteUpload(upload.id, res.headers.get('etag'))
}

export async function mediaUploadMetadata(fileName, fileSize, mimeType, localFileId) {
  const j = await api('/api/v1/media/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileSize, mimeType, localFileId }),
  })
  return j.data
}

// List user's media files
export async function mediaList() {
  const j = await api('/api/v1/media/list')
  return j.data || []
}

// Delete media metadata
export async function mediaDelete(mediaId) {
  await api(`/api/v1/media/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE',
  })
}

// Share/unshare media (make public or private)
export async function mediaShare(mediaId, isPublic) {
  const j = await api(`/api/v1/media/${encodeURIComponent(mediaId)}/share`, {
    method: 'PUT',
    body: JSON.stringify({ isPublic }),
  })
  return j.data
}

export async function feedbackSend(name, email, message) {
  return api('/api/v1/feedback', { method: 'POST', body: JSON.stringify({ name, email, message }) })
}
