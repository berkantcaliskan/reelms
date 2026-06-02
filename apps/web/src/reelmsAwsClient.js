import { io } from 'socket.io-client'
import { isElectron, getElectronToken } from './electronAuth'
import { getWebToken } from './webAuth'
import { getApiBaseUrl } from './config/api'

const BASE = getApiBaseUrl()

export const REELM_CACHE = {}

let socket = null
let socketUid = null
// Pending sets: track which rooms should be active so we can re-join after reconnect
const _pendingChannels = new Set()
const _pendingReelms = new Set()

export async function getIdToken() {
  if (isElectron) return getElectronToken()
  return getWebToken()
}

async function api(path, opts = {}) {
  const token = await getIdToken()
  if (!token) throw new Error('not_signed_in')
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
  if (!r.ok) {
    if (r.status === 404 && opts.allowNotFound) return null
    const t = await r.text()
    throw new Error(t || r.statusText)
  }
  if (r.status === 204) return null
  const ct = r.headers.get('content-type')
  if (!ct || !ct.includes('application/json')) return null
  return r.json()
}

async function publicApi(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.statusText)
  }
  if (r.status === 204) return null
  const ct = r.headers.get('content-type')
  if (!ct || !ct.includes('application/json')) return null
  return r.json()
}

export async function userBootstrap() {
  const j = await api('/api/v1/user/bootstrap')
  return j.data || {}
}

export async function userGetDoc(sk) {
  const j = await api(`/api/v1/user/doc/${encodeURIComponent(sk)}`)
  return j.data
}

export async function userPutDoc(sk, data) {
  await api(`/api/v1/user/doc/${encodeURIComponent(sk)}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export async function reelmGetDoc(reelmId, sk) {
  const id = reelmId || 'global'
  const j = await api(`/api/v1/reelm/${encodeURIComponent(id)}/doc/${encodeURIComponent(sk)}`)
  return j.data
}

export async function reelmPutDoc(reelmId, sk, data) {
  const id = reelmId || 'global'
  await api(`/api/v1/reelm/${encodeURIComponent(id)}/doc/${encodeURIComponent(sk)}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
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

export async function socialNotify(targetUid, text) {
  await api('/api/v1/social/notify', { method: 'POST', body: JSON.stringify({ targetUid, text }) })
}

export async function socialFriendRequest(toUid, from) {
  await api('/api/v1/social/friend-request', { method: 'POST', body: JSON.stringify({ toUid, from }) })
}

export async function socialFriendAccept(requester, meProfile) {
  await api('/api/v1/social/friend-accept', { method: 'POST', body: JSON.stringify({ requester, meProfile }) })
}

export async function socialFriendReject(requesterId) {
  await api('/api/v1/social/friend-reject', { method: 'POST', body: JSON.stringify({ requesterId }) })
}

export async function socialRemoveFriend(friendId) {
  await api('/api/v1/social/remove-friend', { method: 'POST', body: JSON.stringify({ friendId }) })
}

export async function socialMessageRequest(toUid, from, preview) {
  await api('/api/v1/social/message-request', { method: 'POST', body: JSON.stringify({ toUid, from, preview }) })
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

export function scheduleUserPersist(sk, data, ms = 350) {
  clearTimeout(userTimers[sk])
  userTimers[sk] = setTimeout(() => {
    userPutDoc(sk, data).catch(() => {})
    delete userTimers[sk]
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
  const sessions = (await userGetDoc('sessions')) || []
  const ua = navigator.userAgent
  const list = Array.isArray(sessions) ? sessions : []
  const isNewDevice = list.length > 0 && !list.some((s) => s.ua === ua)
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const entry = {
    id: sessionId,
    loginTime: Date.now(),
    lastActivity: Date.now(),
    ua,
    device: parseDeviceInfo(ua),
  }
  const next = [entry, ...list].slice(0, 10)
  await userPutDoc('sessions', next)
  try {
    sessionStorage.setItem('reelms_session_id', sessionId)
  } catch (_) {}
  if (isNewDevice && notifyNewDevice !== false) {
    const notifs = (await userGetDoc('notifications')) || []
    const n = Array.isArray(notifs) ? notifs : []
    n.unshift({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      text: `New sign-in detected from ${parseDeviceInfo(ua)}`,
      time: Date.now(),
    })
    await userPutDoc('notifications', n)
  }
  return sessionId
}

export async function touchUserSession() {
  let sessionId
  try {
    sessionId = sessionStorage.getItem('reelms_session_id')
  } catch (_) {
    return
  }
  if (!sessionId) return
  const sessions = (await userGetDoc('sessions')) || []
  const list = Array.isArray(sessions) ? sessions : []
  const next = list.map((s) =>
    s.id === sessionId ? { ...s, lastActivity: Date.now() } : s
  )
  await userPutDoc('sessions', next)
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
  const { onUserDoc, onReelmDoc, onAppDoc, onMessage, onMessageDeleted, onReaction, onVoicePosition, onVcEvent, onVcCount, onVcCounts, onConnect } = handlers
  const run = async () => {
    const token = await getIdToken()
    if (!token) return
    if (socket) {
      socket.disconnect()
      socket = null
    }
    socket = io(BASE, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
    })
    // On every (re)connect: re-join all tracked rooms so server-side memberships are restored
    socket.on('connect', () => {
      _pendingChannels.forEach(key => socket.emit('joinChannel', key))
      _pendingReelms.forEach(id => {
        socket.emit('joinReelm', id)
        socket.emit('vc:counts', { reelmId: id })
      })
      onConnect?.()
    })
    socket.on('reelms:doc', (msg) => {
      if (!msg || !msg.scope) return
      if (msg.scope === 'user' && msg.sk) onUserDoc?.(msg.sk)
      if (msg.scope === 'reelm' && msg.sk) onReelmDoc?.(msg.reelmId, msg.sk)
      if (msg.scope === 'app' && msg.sk) onAppDoc?.(msg.sk)
    })
    socket.on('reelms:message', (msg) => {
      if (msg?.msgKey && msg?.message) onMessage?.(msg.msgKey, msg.message)
    })
    socket.on('reelms:message-deleted', (msg) => {
      if (msg?.msgKey && msg?.msgId) onMessageDeleted?.(msg.msgKey, msg.msgId)
    })
    socket.on('reelms:reaction', (msg) => {
      if (msg?.msgKey && msg?.msgId && msg?.emoji) onReaction?.(msg)
    })
    socket.on('voicePosition', (msg) => {
      if (msg?.userId && typeof msg.x === 'number' && typeof msg.y === 'number') {
        onVoicePosition?.(msg)
      }
    })
    socket.on('vc:event', (msg) => {
      if (msg && msg.type) onVcEvent?.(msg)
    })
    socket.on('vc:count', (msg) => {
      if (msg && typeof msg.channelId === 'string' && typeof msg.count === 'number') onVcCount?.(msg)
    })
    socket.on('vc:counts', (msg) => {
      if (msg && typeof msg.reelmId === 'string' && msg.counts) onVcCounts?.(msg)
    })
    socket.on('connect_error', () => {})
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

// Send to a specific user (offer / answer / ice / here / remote_ctrl_*)
export function socketVcSignal(toUid, payload) {
  if (!socket || !toUid || !payload) return
  socket.emit('vc:signal', { to: toUid, payload })
}

// Broadcast to all in the vc room except sender (mute / video / screen)
export function socketVcBroadcast(reelmId, channelId, payload) {
  if (!socket || !reelmId || !channelId || !payload) return
  socket.emit('vc:broadcast', { reelmId, channelId, payload })
}

// ── User profiles ─────────────────────────────────────────────────────────────

export async function userProfilePut(data) {
  await api('/api/v1/user/profile', { method: 'PUT', body: JSON.stringify({ data }) })
}

export async function userProfilePatch(data) {
  await api('/api/v1/user/profile', { method: 'PATCH', body: JSON.stringify({ data }) })
}

export async function userProfileGet() {
  const j = await api('/api/v1/user/profile')
  return j.data
}

export async function userProfileGetById(uid) {
  const j = await api(`/api/v1/user/profile/${encodeURIComponent(uid)}`)
  return j.data
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
  const j = await publicApi(`/api/v1/user/check-username/${encodeURIComponent(username)}`)
  return j.available
}

export async function userCheckEmail(email) {
  const j = await publicApi(`/api/v1/user/check-email/${encodeURIComponent(email)}`)
  return j.available
}

export async function usersList() {
  const j = await api('/api/v1/users')
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

export async function adminAllReelms() {
  const j = await api('/api/v1/admin/all-reelms')
  return j.data || []
}

// ── Media / Local Storage Sync ────────────────────────────────────────────────

// Register file metadata in AWS (after uploading to local storage)
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
