import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import { apiRateLimit } from '../middleware/rateLimit.js'
import { verifyIdToken } from '../../modules/auth/authService.js'
import { APP_PK, chanPk, deleteDoc, getDoc, putDoc, putDocIfAbsent, queryDocs, reelmPk, scanByPkPrefix, userPk } from '../../modules/store/docStore.js'
import { canManageReelm, canUseReelmPermission, getActiveReelmTimeout, getMessageKeyAccess, getUserPublicProfile as getStoredPublicProfile, isReelmMember, normalizeEmail, normalizeUsername, publicProfileFromStored } from '../../modules/reelms/access.js'
import { autoJoinDefaultReelm, DEFAULT_REELM_ID, hasLeftDefaultReelm, setDefaultReelmLeft } from '../../modules/reelms/defaultReelm.js'
import { isCommunityAdminUid, resolveCommunityAdminUids } from '../../modules/reelms/communityAdmins.js'
import { buildUserUploadKey, getObjectStorage } from '../../modules/storage/objectStorage.js'

const USER_BOOTSTRAP_KEYS = [
  'friends', 'friend_requests', 'friend_requests_out', 'notifications', 'message_requests', 'message_requests_out',
  'blocked', 'nicknames', 'unread_counts', 'customization', 'bg_image', 'feed_nav', 'landing_view', 'lpw', 'rpw',
  'sociallinks', 'socialorder', 'spotify_connected', 'sessions', 'environment', 'last_channels', 'reelms', 'chats',
  'pinned_items', 'bar_order', 'sounds', 'body_font'
]

const PUBLIC_PATHS = [/^\/user\/check-username\//, /^\/user\/check-email\//, /^\/sounds\/list$/]

export function createReelmsDataRouter(io: Server) {
  const router = Router()

  router.use(async (req, res, next) => {
    if (PUBLIC_PATHS.some((p) => p.test(req.path))) {
      req.userId = null
      const h = req.headers.authorization || ''
      if (h.startsWith('Bearer ')) {
        try { req.userId = await verifyIdToken(h.slice(7)) } catch { req.userId = null }
      }
      return next()
    }
    return authenticate(req, res, next)
  })
  // Rate-limit after optional/required auth so authenticated app traffic is keyed by uid, not by shared proxy IP.
  router.use(apiRateLimit)

  const syncVersion = () => Date.now()
  const CORE_DOC_KEYS = new Set(['meta', 'structure', 'roles', 'members', 'join_requests', 'ban_list', 'timeout_list'])
  const PUBLIC_CORE_DOC_KEYS = new Set(['meta', 'structure', 'roles', 'members'])
  const MANAGER_CORE_DOC_KEYS = new Set(['join_requests', 'ban_list', 'timeout_list'])
  const coreBroadcastTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const coreSnapshotCache = new Map<string, { value: any, expiresAt: number }>()
  const coreSnapshotInflight = new Map<string, Promise<any>>()

  const actorStateCache = new Map<string, { value: any, expiresAt: number }>()
  const actorStateInflight = new Map<string, Promise<any>>()
  const fastUserDocCache = new Map<string, { value: any, expiresAt: number }>()
  const fastUserDocInflight = new Map<string, Promise<any>>()
  const publicProfileCache = new Map<string, { value: any, expiresAt: number }>()
  const defaultJoinHealLast = new Map<string, number>()

  const actionLocks = new Map<string, Promise<unknown>>()
  const withActionLock = async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
    const normalizedKey = String(key || 'global')
    const previous = actionLocks.get(normalizedKey) || Promise.resolve()
    let run!: Promise<T>
    run = previous.catch(() => undefined).then(fn).finally(() => {
      if (actionLocks.get(normalizedKey) === run) actionLocks.delete(normalizedKey)
    }) as Promise<T>
    actionLocks.set(normalizedKey, run)
    return run
  }

  type SearchCacheEntry<T> = { value?: T, promise?: Promise<T>, expiresAt: number }
  const SEARCH_CACHE_TTL_MS = 30_000
  const searchProfileScanCache = new Map<string, SearchCacheEntry<any[]>>()
  const searchReelmMetaScanCache = new Map<string, SearchCacheEntry<any[]>>()
  const searchPendingJoinCache = new Map<string, { value: any[], expiresAt: number }>()

  const readSearchCache = async <T,>(cache: Map<string, SearchCacheEntry<T>>, key: string, loader: () => Promise<T>, ttlMs = SEARCH_CACHE_TTL_MS): Promise<T> => {
    const now = Date.now()
    const cached = cache.get(key)
    if (cached?.value && cached.expiresAt > now) return cached.value
    if (cached?.promise) return cached.promise
    const promise = loader().then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    }).catch((err) => {
      cache.delete(key)
      throw err
    })
    cache.set(key, { promise, expiresAt: now + ttlMs })
    return promise
  }

  const getSearchProfiles = () => readSearchCache(searchProfileScanCache, 'profiles', async () => {
    const items = await scanByPkPrefix<any>('USER#')
    return items
      .filter((item: any) => item.sk === 'profile' && item.data && !(item.data as any).isSystem)
      .map((item: any) => ({ uid: String(item.pk || '').replace(/^USER#/, ''), data: item.data as any }))
      .filter((row: any) => Boolean(row.uid))
  }, SEARCH_CACHE_TTL_MS)

  const getSearchReelmMetas = () => readSearchCache(searchReelmMetaScanCache, 'metas', async () => {
    const items = await scanByPkPrefix<any>('REELM#')
    return items
      .filter((item: any) => item.sk === 'meta' && item.data && (item.data as any).id)
      .map((item: any) => item.data as any)
  }, SEARCH_CACHE_TTL_MS)

  const getCachedPendingJoinRequests = async (reelmId: string): Promise<any[]> => {
    const id = String(reelmId || '')
    if (!id) return []
    const cached = searchPendingJoinCache.get(id)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const value = (await getDoc<any[]>(reelmPk(id), 'join_requests').catch(() => [])) || []
    const safe = Array.isArray(value) ? value : []
    searchPendingJoinCache.set(id, { value: safe, expiresAt: Date.now() + 10_000 })
    return safe
  }

  const scoreSearchText = (q: string, terms: string[], hayParts: string[], exactFields: string[] = []) => {
    const safeQ = String(q || '').toLowerCase()
    const hay = hayParts.join(' ')
    if (!safeQ) return 1
    let score = 0
    if (exactFields.some((part) => part === safeQ)) score += 100
    if (hayParts.some((part) => part.startsWith(safeQ))) score += 40
    if (hay.includes(safeQ)) score += 15
    for (const term of terms) if (hay.includes(term)) score += 5
    return score
  }

  const searchUsersForDiscover = async (rawQuery: string, limit = 50) => {
    const rawQ = String(rawQuery || '').trim()
    const q = rawQ.toLowerCase().replace(/^@+/, '')
    const normalizedUser = normalizeUsername(rawQ)
    const normalizedEmail = normalizeEmail(rawQ)
    const exact = new Map<string, any>()

    if (normalizedUser) {
      const foundUid = await getDoc<string>(`USERNAME#${normalizedUser}`, 'uid').catch(() => null)
      const profile = foundUid ? await getDoc<any>(userPk(foundUid), 'profile').catch(() => null) : null
      if (foundUid && profile && !profile.isSystem) exact.set(String(foundUid), publicProfileFromStored(String(foundUid), profile))
    }
    if (normalizedEmail && normalizedEmail.includes('@')) {
      const foundUid = await getDoc<string>(`EMAIL#${normalizedEmail}`, 'uid').catch(() => null)
      const profile = foundUid ? await getDoc<any>(userPk(foundUid), 'profile').catch(() => null) : null
      if (foundUid && profile && !profile.isSystem) exact.set(String(foundUid), publicProfileFromStored(String(foundUid), profile))
    }

    if (exact.size && (normalizedUser === q || normalizedEmail.includes('@'))) {
      return Array.from(exact.values()).slice(0, limit)
    }
    if (q && q.length < 2) return Array.from(exact.values()).slice(0, Math.min(limit, 20))

    const terms = q.split(/\s+/).map((value: string) => value.trim()).filter(Boolean).slice(0, 4)
    const profiles = await getSearchProfiles()
    const rows = profiles
      .map((row: any) => {
        const data = row.data as any
        const hayParts = [row.uid, data.name, data.displayName, data.username, data.contact, data.email].filter(Boolean).map((value: any) => String(value).toLowerCase())
        const exactFields = [data.username, data.name, data.displayName].filter(Boolean).map((value: any) => String(value).toLowerCase())
        return { uid: row.uid, data, score: scoreSearchText(q, terms, hayParts, exactFields) }
      })
      .filter((row: any) => !q || row.score > 0)
      .sort((a: any, b: any) => b.score - a.score || String((a.data as any).name || '').localeCompare(String((b.data as any).name || '')))
      .slice(0, q ? limit : Math.max(limit, 100))
      .map((row: any) => publicProfileFromStored(row.uid, row.data))

    for (const profile of rows) exact.set(String(profile.id || profile.uid), profile)
    return Array.from(exact.values()).slice(0, q ? limit : Math.max(limit, 100))
  }

  const searchReelmsForDiscover = async (rawQuery: string, uid: string, limit = 30) => {
    const q = String(rawQuery || '').trim().toLowerCase()
    if (q && q.length < 2) return []
    const metas = await getSearchReelmMetas()
    const mine = ((await getFastUserDoc(uid, 'reelms', [], 650).catch(() => [])) || []).map((reelm: any) => String(reelm?.id || ''))
    const mineSet = new Set(mine)
    const terms = q.split(/\s+/).map((value: string) => value.trim()).filter(Boolean).slice(0, 4)
    const candidates = metas
      .filter((meta: any) => {
        const id = String(meta.id || '')
        if (!id) return false
        if (id === DEFAULT_REELM_ID) return true
        return meta.showInDiscover === true || meta.ownerId === uid
      })
      .map((meta: any) => {
        const hayParts = [meta.id, meta.name, meta.code, meta.description].filter(Boolean).map((value: any) => String(value).toLowerCase())
        const score = scoreSearchText(q, terms, hayParts, [String(meta.code || '').toLowerCase(), String(meta.name || '').toLowerCase()])
        return { meta, score }
      })
      .filter((row: any) => !q || row.score > 0)
      .sort((a: any, b: any) => b.score - a.score || String(a.meta.name || '').localeCompare(String(b.meta.name || '')))
      .slice(0, limit)

    const rows = await Promise.all(candidates.map(async (row: any) => {
      const meta = row.meta as any
      const id = String(meta.id || '')
      if (await withDeadline(isBannedFromReelm(id, uid).catch(() => false), 500, false)) return null
      const pendingRequests = await withDeadline(getCachedPendingJoinRequests(id), 650, [])
      const pending = pendingRequests.some((request: any) => String(request?.userId || request?.id || '') === uid)
      return {
        id: meta.id,
        name: meta.name,
        code: meta.code,
        ownerId: meta.ownerId || null,
        image: sanitizeMediaUrl(meta.image) || null,
        joinMode: id === DEFAULT_REELM_ID ? 'open' : (meta.joinMode || 'request'),
        showInDiscover: id === DEFAULT_REELM_ID ? true : meta.showInDiscover === true,
        isDefault: id === DEFAULT_REELM_ID,
        joined: mineSet.has(id),
        pending
      }
    }))
    return rows.filter(Boolean)
  }

  const hiddenSystemMemberIds = () => new Set([String(env.REELMS_MODERATION_UID || ''), 'reelms-moderation', 'system', 'reelms-system'].filter(Boolean))
  const entryUserId = (entry: any) => String(entry?.userId || entry?.id || '').trim()
  const isSystemMemberEntry = (entry: any) => {
    const id = entryUserId(entry)
    const name = String(entry?.userName || entry?.name || entry?.username || '').trim().toLowerCase()
    return hiddenSystemMemberIds().has(id) || entry?.isSystem === true || entry?.system === true || name === 'reelms system' || name === 'reelms moderation'
  }
  const hiddenMemberIdsFromBanList = (banList: any[] = []) => new Set((Array.isArray(banList) ? banList : []).map(entryUserId).filter(Boolean))
  const filterMembersForClient = (members: any[] = [], banList: any[] = []) => {
    const hiddenIds = hiddenSystemMemberIds()
    hiddenMemberIdsFromBanList(banList).forEach((id) => hiddenIds.add(id))
    const seen = new Set<string>()
    return (Array.isArray(members) ? members : []).filter((member: any) => {
      const id = entryUserId(member)
      if (!id || hiddenIds.has(id) || seen.has(id) || isSystemMemberEntry(member)) return false
      seen.add(id)
      return true
    })
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const withDeadline = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms) })
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  const slimReelmForUserDoc = (reelm: any = {}) => {
    const members = Array.isArray(reelm?.members) ? reelm.members : []
    return {
      id: reelm?.id,
      name: reelm?.name || 'Untitled Reelm',
      code: reelm?.code,
      ownerId: reelm?.ownerId || null,
      announcementChannelId: reelm?.announcementChannelId || null,
      image: sanitizeMediaUrl(reelm?.image) || null,
      showInDiscover: reelm?.showInDiscover === true,
      joinMode: reelm?.joinMode || 'request',
      autoJoinOnInvite: reelm?.autoJoinOnInvite === true,
      memberInvitesEnabled: reelm?.memberInvitesEnabled !== false,
      memberInviteMode: reelm?.memberInviteMode === 'auto' ? 'auto' : 'request',
      ageRating: reelm?.ageRating || 'under18',
      isDefault: reelm?.isDefault === true,
      communityArtLocked: reelm?.communityArtLocked === true,
      joined: reelm?.joined !== false,
      createdAt: reelm?.createdAt || null,
      updatedAt: reelm?.updatedAt || null,
      memberCount: Number.isFinite(Number(reelm?.memberCount)) ? Number(reelm.memberCount) : members.length,
      categories: Array.isArray(reelm?.categories) ? reelm.categories : [],
      roles: Array.isArray(reelm?.roles) ? reelm.roles.slice(0, 20) : [],
      members: []
    }
  }

  const slimUserReelms = (items: any[] = []) => {
    const seen = new Set<string>()
    const out: any[] = []
    for (const item of Array.isArray(items) ? items : []) {
      const id = String(item?.id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(slimReelmForUserDoc(item))
      if (out.length >= 80) break
    }
    return out
  }

  const mergeReelmCopyPreserveOrder = (current: any[] = [], entry: any) => {
    if (!entry?.id) return Array.isArray(current) ? current : []
    const safeCurrent = Array.isArray(current) ? current : []
    const idx = safeCurrent.findIndex((r: any) => String(r?.id || '') === String(entry.id))
    if (idx < 0) return [...safeCurrent, entry]
    const next = [...safeCurrent]
    next[idx] = { ...(safeCurrent[idx] || {}), ...entry }
    return next
  }

  const cacheFastUserDoc = (uid: string, sk: string, value: any, ttlMs = 45_000) => {
    fastUserDocCache.set(`${uid}:${sk}`, { value, expiresAt: Date.now() + ttlMs })
  }

  const readFastUserDocCache = (uid: string, sk: string) => {
    const key = `${uid}:${sk}`
    const entry = fastUserDocCache.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) { fastUserDocCache.delete(key); return undefined }
    return entry.value
  }

  const getFastUserDoc = async (uid: string, sk: string, fallback: any = null, deadlineMs = 1200) => {
    const cached = readFastUserDocCache(uid, sk)
    if (typeof cached !== 'undefined') return cached
    const key = `${uid}:${sk}`
    const existing = fastUserDocInflight.get(key)
    if (existing) return withDeadline(existing, deadlineMs, fallback)
    const run = getDoc<any>(userPk(uid), sk)
      .then((value) => {
        const next = sk === 'reelms' ? slimUserReelms(Array.isArray(value) ? value : []) : value
        cacheFastUserDoc(uid, sk, next)
        return next
      })
      .finally(() => { fastUserDocInflight.delete(key) })
    fastUserDocInflight.set(key, run)
    return withDeadline(run, deadlineMs, typeof cached !== 'undefined' ? cached : fallback)
  }

  const scheduleDefaultCommunityHeal = (uid: string, name?: string, photo?: string | null, delayMs = 2500) => {
    const id = String(uid || '')
    if (!id) return
    const now = Date.now()
    const last = defaultJoinHealLast.get(id) || 0
    if (now - last < 5 * 60 * 1000) return
    defaultJoinHealLast.set(id, now)
    const timer = setTimeout(() => {
      void autoJoinDefaultReelm(id, name, photo).then(() => emitUser(id, 'reelms')).catch((err) => console.warn('default community background heal failed:', err))
    }, delayMs)
    if (typeof (timer as any).unref === 'function') (timer as any).unref()
  }

  const getCachedCoreSnapshot = (key: string) => {
    const cached = coreSnapshotCache.get(key)
    if (!cached) return null
    if (cached.expiresAt <= Date.now()) { coreSnapshotCache.delete(key); return null }
    return cached.value
  }
  const setCachedCoreSnapshot = (key: string, value: any, ttlMs = 2500) => {
    if (!value) return
    coreSnapshotCache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }
  const invalidateCoreSnapshotCache = (reelmId: string) => {
    const id = String(reelmId || '')
    const prefix = `${id}:`
    for (const key of Array.from(coreSnapshotCache.keys())) if (key.startsWith(prefix)) coreSnapshotCache.delete(key)
    for (const key of Array.from(actorStateCache.keys())) if (key.includes(`:${id}:`)) actorStateCache.delete(key)
  }

  const emitUser = (uid: string, sk: string, data?: any) => {
    const targetUid = String(uid || '')
    if (!targetUid || !sk) return
    const emit = (value: any, hasData = true) => io.to(`u:${targetUid}`).emit('reelms:doc', {
      scope: 'user',
      sk,
      ...(hasData ? { data: value } : {}),
      version: syncVersion(),
      at: Date.now()
    })
    if (typeof data !== 'undefined') { emit(data); return }
    void getDoc(userPk(targetUid), sk).then((value) => emit(value)).catch(() => emit(null, false))
  }

  const buildReelmCoreSnapshot = async (reelmId: string, extra: Record<string, unknown> = {}, options: { includeManagerDocs?: boolean, cacheKey?: string, ttlMs?: number } = {}) => {
    const id = String(reelmId || '')
    if (!id) return null
    const cacheKey = options.cacheKey || `${id}:${options.includeManagerDocs ? 'manager' : 'public'}`
    const cached = getCachedCoreSnapshot(cacheKey)
    if (cached) return cached
    const existing = coreSnapshotInflight.get(cacheKey)
    if (existing) return existing
    const run = (async () => {
      const pk = reelmPk(id)
      const [meta, structure, roles, members, rawBanList] = await Promise.all([
        getDoc<any>(pk, 'meta').catch(() => null),
        getDoc<any>(pk, 'structure').catch(() => null),
        getDoc<any[]>(pk, 'roles').catch(() => []),
        getDoc<any[]>(pk, 'members').catch(() => []),
        getDoc<any[]>(pk, 'ban_list').catch(() => [])
      ])
      if (!meta?.id) return null
      const safeBanList = Array.isArray(rawBanList) ? rawBanList : []
      const safeMembers = filterMembersForClient(members || [], safeBanList)
      const normalized = normalizeReelmCoreForClient(id, roles || [], safeMembers)
      normalized.members = await hydrateMembersForClient(normalized.members)
      const managerDocs = options.includeManagerDocs ? await Promise.all([
        getDoc<any[]>(pk, 'join_requests').catch(() => []),
        Promise.resolve(safeBanList),
        getDoc<any[]>(pk, 'timeout_list').catch(() => [])
      ]) : [[], [], []]
      const [joinRequests, banList, timeoutList] = managerDocs
      const value = toClientReelm(meta, structure || { categories: [] }, normalized.roles, normalized.members, {
        joinRequests: Array.isArray(joinRequests) ? joinRequests : [],
        banList: Array.isArray(banList) ? banList : [],
        timeoutList: Array.isArray(timeoutList) ? timeoutList : [],
        syncVersion: syncVersion(),
        ...extra
      })
      setCachedCoreSnapshot(cacheKey, value, options.ttlMs || 2500)
      return value
    })().finally(() => { coreSnapshotInflight.delete(cacheKey) })
    coreSnapshotInflight.set(cacheKey, run)
    return run
  }


  const emitReelmCoreSnapshot = async (reelmId: string, reason = 'update', extra: Record<string, unknown> = {}) => {
    const id = String(reelmId || '')
    if (!id) return
    const reelm = await buildReelmCoreSnapshot(id, extra).catch(() => null)
    if (!reelm?.id) return
    const payload = { reelmId: id, reelm, reason, version: Number((reelm as any).syncVersion || Date.now()), at: Date.now() }
    io.to(`reelm:${id}`).emit('reelm:core-snapshot', payload)
  }

  const scheduleReelmCoreBroadcast = (reelmId: string, reason = 'doc', delayMs = 80) => {
    const id = String(reelmId || '')
    if (!id) return
    const existing = coreBroadcastTimers.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      coreBroadcastTimers.delete(id)
      void emitReelmCoreSnapshot(id, reason).catch((err) => console.warn('reelm core snapshot emit failed:', err))
    }, delayMs)
    if (typeof (timer as any).unref === 'function') (timer as any).unref()
    coreBroadcastTimers.set(id, timer)
  }

  const emitReelm = (reelmId: string, sk: string, data?: any) => {
    const id = String(reelmId || '')
    if (!id || !sk) return
    const emit = (value: any, hasData = true) => io.to(`reelm:${id}`).emit('reelms:doc', {
      scope: 'reelm',
      reelmId: id,
      sk,
      ...(hasData ? { data: value } : {}),
      version: syncVersion(),
      at: Date.now()
    })
    if (typeof data !== 'undefined') emit(data)
    else void getDoc(reelmPk(id), sk).then((value) => emit(value)).catch(() => emit(null, false))
    if (CORE_DOC_KEYS.has(String(sk))) { invalidateCoreSnapshotCache(id); scheduleReelmCoreBroadcast(id, String(sk)) }
  }
  const isSystemInboxUid = (uid: string) => String(uid || '') === String(env.REELMS_MODERATION_UID || '')
  const isSystemInboxDmKey = (msgKey: string) => String(msgKey || '').startsWith('dm_') && String(msgKey || '').slice(3).split('_').filter(Boolean).some(isSystemInboxUid)
  const emitApp = (sk: string, data?: any) => {
    const emit = (value: any, hasData = true) => io.to('app').emit('reelms:doc', {
      scope: 'app',
      sk,
      ...(hasData ? { data: value } : {}),
      version: syncVersion(),
      at: Date.now()
    })
    if (typeof data !== 'undefined') { emit(data); return }
    void getDoc(APP_PK, sk).then((value) => emit(value)).catch(() => emit(null, false))
  }
  const isServerMessageLink = (link: any) => {
    const type = String(link?.type || '')
    return type === 'reelm' || type === 'server' || type === 'system' || type.startsWith('reelm_')
  }

  const pushUserNotification = async (uid: string, text: string, link: any = null, options: { inbox?: boolean } = {}) => {
    if (!uid) return
    const pk = userPk(uid)
    const current = (await getDoc<any[]>(pk, 'notifications').catch(() => [])) || []
    const next = [{ id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, text, time: Date.now(), link }, ...current].slice(0, 80)
    await putDoc(pk, 'notifications', next)
    emitUser(uid, 'notifications')
    if (options.inbox !== false && isServerMessageLink(link)) {
      await pushServerInboxMessage(uid, text, link).catch((err) => console.warn('server inbox mirror failed:', err))
    }
  }
  const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase()
  const isGoogleDefaultAvatarUrl = (value: unknown) => {
    const url = String(value || '')
    return /(^|\.)googleusercontent\.com\//i.test(url) || /lh3\.googleusercontent\.com/i.test(url)
  }
  const isRawMediaValue = (value: unknown) => {
    const text = String(value || '').trim()
    if (!text) return false
    if (/^data:image\//i.test(text)) return true
    if (text.length > 4096 && /^[A-Za-z0-9+/=\r\n]+$/.test(text)) return true
    return false
  }
  const safeMediaValue = (value: unknown) => {
    const text = String(value || '').trim()
    if (!text || isRawMediaValue(text)) return null
    return text
  }
  const getProfilePhoto = (profile: any = {}) => {
    const rawPhoto = profile.photo || profile.profilePhoto || profile.photoURL || profile.avatar || profile.image || profile.imageUrl || profile.userPhoto || null
    return isGoogleDefaultAvatarUrl(rawPhoto) ? null : safeMediaValue(rawPhoto)
  }
  const getProfileCover = (profile: any = {}) => safeMediaValue(profile.cover || profile.coverImage || profile.coverUrl || profile.headerImage || profile.banner || profile.bannerImage || profile.backgroundCover || null)
  const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj || {}, key)
  const MEDIA_CLEAR_VALUES = new Set<any>([null, '', false])
  const photoKeys = ['photo', 'profilePhoto', 'photoURL', 'avatar', 'image', 'imageUrl', 'userPhoto']
  const coverKeys = ['cover', 'coverImage', 'coverUrl', 'headerImage', 'banner', 'bannerImage', 'backgroundCover']
  const backgroundKeys = ['bgImage', 'bg_image', 'backgroundImage', 'backgroundUrl']
  const explicitMediaClear = (obj: any, keys: string[]) => keys.some((key) => hasOwn(obj, key) && MEDIA_CLEAR_VALUES.has(obj[key]))
  const imageMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  const mediaPurposeLimits: Record<string, number> = {
    avatar: 5 * 1024 * 1024,
    profile_photo: 5 * 1024 * 1024,
    banner: 8 * 1024 * 1024,
    cover: 8 * 1024 * 1024,
    background: 10 * 1024 * 1024,
    server_icon: 5 * 1024 * 1024,
    reelm_icon: 5 * 1024 * 1024,
    attachment: env.S3_MAX_UPLOAD_BYTES
  }
  const normalizeMediaPurpose = (value: unknown) => String(value || 'attachment').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'attachment'
  const maxUploadBytesForPurpose = (purpose: string) => Math.min(mediaPurposeLimits[purpose] || env.S3_MAX_UPLOAD_BYTES, env.S3_MAX_UPLOAD_BYTES)
  const isProfileImagePurpose = (purpose: string) => ['avatar', 'profile_photo', 'banner', 'cover', 'background', 'server_icon', 'reelm_icon'].includes(purpose)
  const sanitizeMediaUrl = (value: unknown) => {
    const safe = safeMediaValue(value)
    if (!safe) return null
    if (/^https?:\/\//i.test(safe)) return safe
    return null
  }
  const sanitizeCustomizationDoc = (value: any) => {
    if (!value || typeof value !== 'object') return value
    const next = { ...value }
    const bg = sanitizeMediaUrl(next.bgImage ?? next.bg_image ?? next.backgroundImage ?? next.backgroundUrl ?? null)
    if (bg) {
      next.bgImage = bg
      next.backgroundImage = bg
      next.backgroundUrl = bg
      delete next.bg_image
    } else {
      delete next.bgImage
      delete next.bg_image
      delete next.backgroundImage
      delete next.backgroundUrl
    }
    return next
  }
  const generateInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

  const USERNAME_RE = /^[a-z0-9._-]{3,30}$/
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const REELM_ID_RE = /^[a-zA-Z0-9._-]{1,80}$/


  const uniqueIndexPk = (kind: 'USERNAME' | 'EMAIL', value: string) => `${kind}#${value}`

  const reserveUniqueIndex = async (kind: 'USERNAME' | 'EMAIL', rawValue: unknown, uid: string) => {
    const value = kind === 'USERNAME' ? normalizeUsername(rawValue) : normalizeEmail(rawValue)
    if (!value) return { ok: true, value }

    const pk = uniqueIndexPk(kind, value)
    const existing = await getDoc<string>(pk, 'uid').catch(() => null)
    if (existing && String(existing) !== uid) return { ok: false, value }
    if (String(existing || '') === uid) return { ok: true, value }

    const inserted = await putDocIfAbsent(pk, 'uid', uid)
    if (inserted) return { ok: true, value }

    const owner = await getDoc<string>(pk, 'uid').catch(() => null)
    return { ok: String(owner || '') === uid, value }
  }

  const releaseUniqueIndex = async (kind: 'USERNAME' | 'EMAIL', rawValue: unknown, uid: string) => {
    const value = kind === 'USERNAME' ? normalizeUsername(rawValue) : normalizeEmail(rawValue)
    if (!value) return
    const pk = uniqueIndexPk(kind, value)
    const owner = await getDoc<string>(pk, 'uid').catch(() => null)
    if (String(owner || '') === uid) await deleteDoc(pk, 'uid').catch(() => {})
  }

  const prepareProfileWrite = async (uid: string, incoming: any, existing: any = {}, rawPatch: any = incoming) => {
    const rawIncoming = incoming && typeof incoming === 'object' ? incoming : {}
    const rawPatchObject = rawPatch && typeof rawPatch === 'object' ? rawPatch : rawIncoming
    const preservedEmail = existing?.contact || existing?.email || ''
    const next = { ...rawIncoming, id: uid, uid, updatedAt: Date.now() }
    if (next.contact == null && next.email == null && preservedEmail) next.contact = preservedEmail
    if (!next.createdAt) next.createdAt = existing?.createdAt || Date.now()

    const wantsPhotoClear = explicitMediaClear(rawPatchObject, photoKeys)
    const hasPhotoPatch = photoKeys.some((k) => hasOwn(rawPatchObject, k))
    const photo = wantsPhotoClear ? null : getProfilePhoto(next)
    if (hasPhotoPatch || photo) {
      const existingPhoto = getProfilePhoto(existing) || null
      next.photo = photo || null
      next.profilePhoto = photo || null
      next.photoURL = photo || null
      next.avatar = photo || null
      next.image = photo || null
      next.imageUrl = photo || null
      next.userPhoto = photo || null
      if (String(existingPhoto || '') !== String(photo || '')) {
        next.photoUpdatedAt = Date.now()
        next.avatarVersion = Date.now()
      } else {
        next.photoUpdatedAt = existing?.photoUpdatedAt || existing?.avatarVersion || next.updatedAt
        next.avatarVersion = existing?.avatarVersion || existing?.photoUpdatedAt || next.updatedAt
      }
    }

    const wantsCoverClear = explicitMediaClear(rawPatchObject, coverKeys)
    const hasCoverPatch = coverKeys.some((k) => hasOwn(rawPatchObject, k))
    const cover = wantsCoverClear ? null : getProfileCover(next)
    if (hasCoverPatch || cover) {
      next.cover = cover || null
      next.coverImage = cover || null
      next.coverUrl = cover || null
      next.headerImage = cover || null
      next.banner = cover || null
      next.bannerImage = cover || null
      next.backgroundCover = cover || null
      next.coverUpdatedAt = Date.now()
      next.coverVersion = Date.now()
    }

    const background = explicitMediaClear(rawPatchObject, backgroundKeys) ? null : sanitizeMediaUrl(next.bgImage || next.bg_image || next.backgroundImage || next.backgroundUrl || null)
    if (background || backgroundKeys.some((k) => hasOwn(rawPatchObject, k))) {
      next.bgImage = background
      next.bg_image = background
      next.backgroundImage = background
      next.backgroundUrl = background
    } else {
      for (const key of [...photoKeys, ...coverKeys, ...backgroundKeys]) {
        if (isRawMediaValue(next[key])) next[key] = null
      }
    }

    if (next.username != null) next.username = normalizeUsername(next.username)
    if (next.contact != null) next.contact = normalizeEmail(next.contact)
    if (next.email != null) next.email = normalizeEmail(next.email)

    const desiredUsername = next.username || ''
    const desiredContact = next.contact || next.email || ''
    if (desiredUsername && !USERNAME_RE.test(desiredUsername)) return { ok: false as const, status: 400, error: 'invalid_username', code: 'auth/invalid-username' }
    if (desiredContact && !EMAIL_RE.test(desiredContact)) return { ok: false as const, status: 400, error: 'invalid_email', code: 'auth/invalid-email' }

    const usernameReservation = await reserveUniqueIndex('USERNAME', desiredUsername, uid)
    if (!usernameReservation.ok) return { ok: false as const, status: 409, error: 'username_taken', code: 'auth/username-taken' }

    const emailReservation = await reserveUniqueIndex('EMAIL', desiredContact, uid)
    if (!emailReservation.ok) return { ok: false as const, status: 409, error: 'email_taken', code: 'auth/email-taken' }

    return { ok: true as const, profile: next, username: usernameReservation.value, email: emailReservation.value }
  }

  const getSenderProfile = async (uid: string) => {
    const profile = await getUserPublicProfile(uid)
    return { id: uid, name: profile.name || profile.displayName || profile.username || 'User', username: profile.username || '', photo: getProfilePhoto(profile) }
  }

  const compactPublicProfile = (uid: string, profile: any = {}) => {
    const photo = getProfilePhoto(profile)
    const cover = getProfileCover(profile)
    const background = sanitizeMediaUrl(profile.bgImage || profile.bg_image || profile.backgroundImage || profile.backgroundUrl || null)
    return {
      id: uid,
      uid,
      name: profile.name || profile.displayName || profile.username || 'User',
      displayName: profile.displayName || profile.name || profile.username || 'User',
      username: profile.username || '',
      photo,
      profilePhoto: photo,
      photoURL: photo,
      avatar: photo,
      image: photo,
      userPhoto: photo,
      cover,
      coverImage: cover,
      coverUrl: cover,
      headerImage: cover,
      banner: cover,
      bannerImage: cover,
      backgroundCover: cover,
      bgImage: background,
      bg_image: background,
      backgroundImage: background,
      backgroundUrl: background,
      bodyFont: typeof profile.bodyFont === 'string' ? profile.bodyFont : null,
      bio: profile.bio || '',
      activity: profile.activity || null,
      sociallinks: profile.sociallinks || {},
      socialorder: Array.isArray(profile.socialorder) ? profile.socialorder : [],
      profileTheme: profile.profileTheme && typeof profile.profileTheme === 'object' ? profile.profileTheme : null
    }
  }

  const emitProfileUpdated = async (uid: string, profile: any) => {
    const publicProfile = {
      ...compactPublicProfile(uid, profile),
      avatarVersion: Number(profile?.avatarVersion || profile?.photoUpdatedAt || profile?.updatedAt || Date.now()) || Date.now(),
      syncVersion: syncVersion()
    }
    const payload = { profile: publicProfile, userId: uid, version: publicProfile.syncVersion, at: Date.now() }
    io.to('app').emit('reelms:profile-updated', payload)
    io.to(`u:${uid}`).emit('reelms:profile-updated', payload)
    const sockets = await io.in(`u:${uid}`).fetchSockets().catch(() => [])
    for (const socket of (sockets as any[])) {
      socket.data.userName = publicProfile.name
      socket.data.userPhoto = publicProfile.photo
      const joinedReelms = Array.from(socket.data?.joinedReelms || []) as string[]
      joinedReelms.forEach((reelmId) => scheduleReelmCoreBroadcast(reelmId, 'profile-updated', 120))
    }
    return publicProfile
  }

  const syncProfileToRelationshipCaches = async (uid: string, profile: any) => {
    const publicProfile = compactPublicProfile(uid, profile)
    const myPk = userPk(uid)
    const [myFriends, myReelms] = await Promise.all([
      getDoc<any[]>(myPk, 'friends').catch(() => []),
      getDoc<any[]>(myPk, 'reelms').catch(() => [])
    ])

    await Promise.all((myFriends || []).map(async (friend: any) => {
      const fid = String(friend?.id || '')
      if (!fid) return
      const fPk = userPk(fid)
      const [friends, chats, blocked] = await Promise.all([
        getDoc<any[]>(fPk, 'friends').catch(() => []),
        getDoc<any[]>(fPk, 'chats').catch(() => []),
        getDoc<any[]>(fPk, 'blocked').catch(() => [])
      ])
      let changed = false
      const nextFriends = (friends || []).map((item) => {
        if (String(item?.id) !== uid) return item
        changed = true
        return { ...item, name: publicProfile.name, displayName: publicProfile.displayName, username: publicProfile.username, photo: publicProfile.photo, profilePhoto: publicProfile.photo, avatar: publicProfile.photo, image: publicProfile.photo, cover: publicProfile.cover, coverImage: publicProfile.coverImage, coverUrl: publicProfile.coverUrl, bio: publicProfile.bio, activity: publicProfile.activity, sociallinks: publicProfile.sociallinks, socialorder: publicProfile.socialorder, profileTheme: publicProfile.profileTheme }
      })
      if (changed) { await putDoc(fPk, 'friends', nextFriends); emitUser(fid, 'friends') }

      let chatsChanged = false
      const nextChats = (chats || []).map((chat) => {
        if (String(chat?.friendId || '') !== uid) return chat
        chatsChanged = true
        return { ...chat, name: publicProfile.name, displayName: publicProfile.displayName, username: publicProfile.username, photo: publicProfile.photo, profilePhoto: publicProfile.photo, avatar: publicProfile.photo, image: publicProfile.photo, cover: publicProfile.cover, coverImage: publicProfile.coverImage, coverUrl: publicProfile.coverUrl, bio: publicProfile.bio, activity: publicProfile.activity, sociallinks: publicProfile.sociallinks, socialorder: publicProfile.socialorder, profileTheme: publicProfile.profileTheme }
      })
      if (chatsChanged) { await putDoc(fPk, 'chats', nextChats); emitUser(fid, 'chats') }

      let blockedChanged = false
      const nextBlocked = (blocked || []).map((item) => {
        if (String(item?.id) !== uid) return item
        blockedChanged = true
        return { ...item, name: publicProfile.name, displayName: publicProfile.displayName, username: publicProfile.username, photo: publicProfile.photo, profilePhoto: publicProfile.photo, avatar: publicProfile.photo, image: publicProfile.photo, cover: publicProfile.cover, coverImage: publicProfile.coverImage, coverUrl: publicProfile.coverUrl, bio: publicProfile.bio, activity: publicProfile.activity, sociallinks: publicProfile.sociallinks, socialorder: publicProfile.socialorder, profileTheme: publicProfile.profileTheme }
      })
      if (blockedChanged) { await putDoc(fPk, 'blocked', nextBlocked); emitUser(fid, 'blocked') }
    }))

    await Promise.all((myReelms || []).map(async (reelm: any) => {
      const reelmId = String(reelm?.id || '')
      if (!reelmId) return
      const pk = reelmPk(reelmId)
      const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
      let changed = false
      const nextMembers = members.map((member) => {
        if (String(member?.userId || '') !== uid) return member
        changed = true
        return { ...member, userName: publicProfile.name, username: publicProfile.username, userPhoto: publicProfile.photo, photo: publicProfile.photo, cover: publicProfile.cover, coverImage: publicProfile.coverImage, coverUrl: publicProfile.coverUrl, bio: publicProfile.bio, activity: publicProfile.activity, profileTheme: publicProfile.profileTheme }
      })
      if (changed) {
        await putDoc(pk, 'members', nextMembers)
        emitReelm(reelmId, 'members')
      }
    }))

    await emitProfileUpdated(uid, profile).catch(() => null)
  }


  const dmConvId = (a: string, b: string) => `dm_${[String(a), String(b)].sort().join('_')}`

  const upsertDmChatForUser = async (ownerUid: string, peerUid: string, message: any, unreadDelta = 0) => {
    if (!ownerUid || !peerUid) return
    const pk = userPk(ownerUid)
    const convId = dmConvId(ownerUid, peerUid)
    const peer: any = String(peerUid) === String(env.REELMS_MODERATION_UID)
      ? getServerInboxProfile()
      : await getUserPublicProfile(peerUid).catch(() => ({ id: peerUid, name: 'User', displayName: 'User', username: '', photo: null, cover: null }))
    const photo = getProfilePhoto(peer) || null
    const cover = getProfileCover(peer) || null
    const now = Date.now()
    const currentChats = (await getDoc<any[]>(pk, 'chats').catch(() => [])) || []
    const existing = currentChats.find((chat) => String(chat?.id || chat?.convId || '') === convId || String(chat?.friendId || '') === peerUid)
    const preview = String(message?.text || message?.mediaType || 'New message').slice(0, 180)
    const entry = {
      ...(existing || {}),
      id: convId,
      convId,
      type: 'dm',
      friendId: peerUid,
      isSystem: String(peerUid) === String(env.REELMS_MODERATION_UID),
      system: String(peerUid) === String(env.REELMS_MODERATION_UID),
      systemLocked: String(peerUid) === String(env.REELMS_MODERATION_UID),
      readOnly: String(peerUid) === String(env.REELMS_MODERATION_UID),
      canReply: String(peerUid) !== String(env.REELMS_MODERATION_UID),
      canBlock: String(peerUid) !== String(env.REELMS_MODERATION_UID),
      canDelete: String(peerUid) !== String(env.REELMS_MODERATION_UID),
      name: peer.name || peer.displayName || peer.username || existing?.name || 'User',
      displayName: peer.displayName || peer.name || existing?.displayName || 'User',
      username: peer.username || existing?.username || '',
      photo,
      profilePhoto: photo,
      avatar: photo,
      image: photo,
      userPhoto: photo,
      cover,
      coverImage: cover,
      coverUrl: cover,
      lastMessage: preview,
      lastMessageAt: Number(message?.time || now) || now,
      updatedAt: now
    }
    const nextChats = [entry, ...currentChats.filter((chat) => String(chat?.id || chat?.convId || '') !== convId && String(chat?.friendId || '') !== peerUid)]
    await putDoc(pk, 'chats', nextChats)
    emitUser(ownerUid, 'chats')

    if (unreadDelta > 0) {
      const currentUnread: Record<string, number> = (await getDoc<Record<string, number>>(pk, 'unread_counts').catch(() => ({} as Record<string, number>))) || {}
      const nextUnread = { ...currentUnread, [convId]: Number(currentUnread[convId] || 0) + unreadDelta }
      await putDoc(pk, 'unread_counts', nextUnread)
      emitUser(ownerUid, 'unread_counts')
    }
  }

  const getServerInboxProfile = () => ({
    id: env.REELMS_MODERATION_UID,
    uid: env.REELMS_MODERATION_UID,
    name: 'Reelms System',
    displayName: 'Reelms System',
    username: 'reelms-system',
    photo: null,
    profilePhoto: null,
    photoURL: null,
    avatar: null,
    image: null,
    userPhoto: null,
    cover: null,
    coverImage: null,
    coverUrl: null
  })

  const pushServerInboxMessage = async (uid: string, text: string, link: any = null) => {
    const targetUid = String(uid || '')
    const systemUid = String(env.REELMS_MODERATION_UID || 'reelms-moderation')
    const body = String(text || '').trim().slice(0, 4000)
    if (!targetUid || !body || targetUid === systemUid) return

    const now = Date.now()
    const id = `sys_${now}_${Math.random().toString(36).slice(2, 9)}`
    const convId = dmConvId(targetUid, systemUid)
    const message = {
      id,
      text: body,
      sender: getServerInboxProfile(),
      userId: systemUid,
      authorId: systemUid,
      isSystem: true,
      system: true,
      type: 'system',
      link: link || null,
      time: now,
      createdAt: now
    }
    const sk = `MSG#${String(now).padStart(15, '0')}#${id}`
    await putDoc(chanPk(convId), sk, message)
    await upsertDmChatForUser(targetUid, systemUid, message, 1)
    io.to(`u:${targetUid}`).emit('reelms:message', { msgKey: convId, message })
  }

  const sanitizeMessageForWrite = async (uid: string, raw: any) => {
    const sender = await getSenderProfile(uid)
    const now = Date.now()
    const rawTime = Number(raw?.time || raw?.createdAt || now)
    const safeTime = Number.isFinite(rawTime) && Math.abs(rawTime - now) < 1000 * 60 * 60 * 24 ? rawTime : now
    const id = String(raw?.id || `${now}_${Math.random().toString(36).slice(2, 9)}`).slice(0, 96)
    const text = typeof raw?.text === 'string' ? raw.text.slice(0, 4000) : undefined

    return {
      ...raw,
      id,
      ...(text != null ? { text } : {}),
      sender,
      userId: uid,
      authorId: uid,
      isSystem: false,
      time: safeTime
    }
  }

  const getUserPublicProfile = getStoredPublicProfile

  async function hydrateMembersForClient(members: any[] = []) {
    const safeMembers = Array.isArray(members) ? members : []
    return Promise.all(safeMembers.map(async (member: any) => {
      const id = memberUserId(member)
      if (!id) return member
      const alreadyRich = member?.profileTheme && (member?.username || member?.userName) && (member?.cover || member?.coverImage || member?.coverUrl || member?.bio || member?.activity)
      if (alreadyRich) return member
      const profile = await withDeadline(getUserPublicProfile(id).catch(() => null), 750, null)
      if (!profile) return { ...member, userId: id, userName: member?.userName || member?.name || member?.username || 'User', username: member?.username || '', userPhoto: safeMediaValue(member?.userPhoto || member?.photo) || null, photo: safeMediaValue(member?.photo || member?.userPhoto) || null, cover: safeMediaValue(member?.cover || member?.coverImage || member?.coverUrl) || null }
      const photo = getProfilePhoto(profile) || member?.userPhoto || member?.photo || null
      const cover = getProfileCover(profile) || member?.cover || member?.coverImage || member?.coverUrl || null
      return {
        ...member,
        userId: id,
        userName: profile.name || profile.displayName || member?.userName || member?.name || profile.username || 'User',
        username: profile.username || member?.username || '',
        userPhoto: photo,
        photo,
        cover,
        coverImage: cover,
        coverUrl: cover,
        bio: profile.bio || member?.bio || '',
        activity: profile.activity || member?.activity || null,
        profileTheme: (profile.profileTheme && typeof profile.profileTheme === 'object') ? profile.profileTheme : (member?.profileTheme || null)
      }
    }))
  }

  const toClientReelm = (meta: any, structure: any, roles: any[], members: any[], extra: Record<string, unknown> = {}) => {
    const normalizedCore = normalizeReelmCoreForClient(meta?.id, roles, members)
    return {
      ...(meta || {}),
      ...extra,
      id: meta?.id,
      name: meta?.name || 'Untitled Reelm',
      code: meta?.code,
      ownerId: meta?.ownerId || null,
      announcementChannelId: meta?.announcementChannelId || null,
      image: meta?.image || null,
      showInDiscover: meta?.showInDiscover === true,
      joinMode: meta?.joinMode || 'request',
      autoJoinOnInvite: meta?.autoJoinOnInvite === true,
      memberInvitesEnabled: meta?.memberInvitesEnabled !== false,
      memberInviteMode: meta?.memberInviteMode === 'auto' ? 'auto' : 'request',
      ageRating: meta?.ageRating || 'under18',
      roles: normalizedCore.roles,
      members: normalizedCore.members,
      categories: Array.isArray(structure?.categories) ? structure.categories : [],
      joinRequests: Array.isArray((extra as any).joinRequests) ? (extra as any).joinRequests : undefined,
      banList: Array.isArray((extra as any).banList) ? (extra as any).banList : undefined,
      timeoutList: Array.isArray((extra as any).timeoutList) ? (extra as any).timeoutList : undefined,
      joined: (extra as any).joined === false ? false : true
    }
  }

  const upsertUserReelm = async (uid: string, reelm: any) => {
    const pk = userPk(uid)
    const current = (await getDoc<any[]>(pk, 'reelms').catch(() => [])) || []
    const existing = current.find((r: any) => String(r?.id || '') === String(reelm?.id || '')) || null
    const entry = slimReelmForUserDoc({
      ...(existing || {}),
      ...(reelm || {}),
      joined: true,
      updatedAt: existing?.updatedAt || reelm?.updatedAt || Date.now()
    })
    const next = mergeReelmCopyPreserveOrder(current.map(slimReelmForUserDoc), entry)
    await putDoc(pk, 'reelms', next)
    cacheFastUserDoc(uid, 'reelms', next)
    return next
  }

  const findReelmMetaByCode = async (codeValue: string) => {
    const code = normalizeCode(codeValue)
    if (!code) return null
    const indexedId = await getDoc<string>(`REELM_CODE#${code}`, 'id').catch(() => null)
    if (indexedId) {
      const indexedMeta = await getDoc<any>(reelmPk(String(indexedId)), 'meta').catch(() => null)
      if (indexedMeta?.id) return indexedMeta
    }
    const items = await scanByPkPrefix('REELM#')
    const found = items.find((i: any) => i.sk === 'meta' && normalizeCode((i.data as any)?.code) === code)
    if (found?.data && (found.data as any).id) await putDocIfAbsent(`REELM_CODE#${code}`, 'id', String((found.data as any).id)).catch(() => {})
    return found?.data as any | null
  }

  const ensureMember = async (reelmId: string, uid: string, roleIds: string[] = []) => withActionLock(`reelm:${reelmId}:members`, async () => {
    const userId = String(uid || '').trim()
    if (!userId || hiddenSystemMemberIds().has(userId)) throw new Error('invalid_member')
    const pk = reelmPk(reelmId)
    const profile = await getUserPublicProfile(userId)
    if ((profile as any)?.accountClosed === true || (profile as any)?.deletedAt) throw new Error('invalid_member')
    const members = filterMembersForClient((await getDoc<any[]>(pk, 'members').catch(() => [])) || [], await getBanList(reelmId).catch(() => []))
    const existing = members.find((m) => String(m.userId) === String(userId))
    const existingRoleIds = Array.isArray(existing?.roleIds) ? existing.roleIds.map(String).filter(Boolean) : []
    const fallbackRoleIds = Array.isArray(roleIds) ? roleIds.map(String).filter(Boolean) : []
    const member = {
      ...(existing || {}),
      userId,
      userName: existing?.userName || profile.name || profile.displayName || profile.username || 'User',
      username: existing?.username || profile.username || '',
      userPhoto: safeMediaValue(profile.photo || existing?.userPhoto || existing?.photo) || null,
      photo: safeMediaValue(profile.photo || existing?.photo || existing?.userPhoto) || null,
      cover: safeMediaValue(profile.cover || existing?.cover || existing?.coverImage || existing?.coverUrl) || null,
      coverImage: safeMediaValue(profile.coverImage || profile.cover || existing?.coverImage || existing?.cover) || null,
      coverUrl: safeMediaValue(profile.coverUrl || profile.cover || existing?.coverUrl || existing?.cover) || null,
      bio: profile.bio || existing?.bio || '',
      activity: profile.activity || existing?.activity || null,
      profileTheme: profile.profileTheme || existing?.profileTheme || null,
      roleIds: existingRoleIds.length ? existingRoleIds : fallbackRoleIds
    }
    const next = [member, ...members.filter((m) => String(m.userId) !== String(userId))]
    await putDoc(pk, 'members', next)
    return next
  })

  const memberUserId = (member: any) => String(member?.userId || member?.id || '').trim()

  const memberUserIds = (members: any[] = []) => Array.from(new Set((Array.isArray(members) ? members : []).map(memberUserId).filter(Boolean)))

  const ROLE_COLOR_RE = /^#[0-9a-fA-F]{6}$/
  const DEFAULT_ADMIN_ROLE_ID = 'role-admin-rc'
  const DEFAULT_CITIZEN_ROLE_ID = 'role-citizen-rc'
  const CUSTOM_ADMIN_ROLE_ID = 'role-admin'
  const CUSTOM_MEMBERS_ROLE_ID = 'role-members'
  const REELM_ELEVATED_ROLE_RE = /admin|owner|founder|moderator/i
  const REELM_PERMISSION_KEYS = [
    'viewSettings',
    'manageOverview',
    'manageChannels',
    'manageVoice',
    'manageRoles',
    'manageMembers',
    'manageInvites',
    'manageJoinRequests',
    'manageModeration',
    'manageReelm'
  ] as const
  type ReelmPermissionKey = typeof REELM_PERMISSION_KEYS[number]
  const FULL_MANAGER_PERMISSIONS: Record<ReelmPermissionKey, boolean> = {
    viewSettings: true,
    manageOverview: true,
    manageChannels: true,
    manageVoice: true,
    manageRoles: true,
    manageMembers: true,
    manageInvites: true,
    manageJoinRequests: true,
    manageModeration: true,
    manageReelm: true
  }
  const isManagerRole = (role: any) => role?.permissions?.manageReelm === true
  const isProtectedRole = (role: any) => isManagerRole(role)

  const roleNameKey = (role: any) => String(role?.name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const isStableAdminRoleId = (role: any) => {
    const rawId = String(role?.id || '')
    return rawId === DEFAULT_ADMIN_ROLE_ID || rawId === CUSTOM_ADMIN_ROLE_ID || /^role-admin-/i.test(rawId)
  }
  const isStableMemberRoleId = (role: any) => {
    const rawId = String(role?.id || '')
    return rawId === DEFAULT_CITIZEN_ROLE_ID || rawId === CUSTOM_MEMBERS_ROLE_ID || /^role-(members|member|citizen)-/i.test(rawId)
  }
  // A role name is user-editable and must not decide whether the role is an
  // admin/member role. Earlier builds used names such as Admin/Members/Citizen
  // as identifiers, so name matching is now only used as a legacy fallback when
  // no stable id/permission exists at all.
  const isLegacyAdminNameLikeRole = (role: any) => REELM_ELEVATED_ROLE_RE.test(String(role?.name || '')) || /community admin/i.test(String(role?.name || ''))
  const isAdminLikeRole = (role: any) => isManagerRole(role) || isStableAdminRoleId(role)
  const isDefaultMemberLikeRole = (role: any) => isStableMemberRoleId(role) || /^(members|member|citizen|user|regular)$/i.test(String(role?.name || '').trim())

  const normalizeRoleIdListForClient = (roleIds: any[] = [], roleIdMap: Map<string, string>, validRoleIds: Set<string>, fallbackRoleId = '') => {
    const next = Array.from(new Set((Array.isArray(roleIds) ? roleIds : [])
      .map((id: any) => roleIdMap.get(String(id)) || String(id))
      .filter((id: string) => id && validRoleIds.has(id))))
    if (!next.length && fallbackRoleId) next.push(fallbackRoleId)
    return next
  }

  function normalizeReelmCoreForClient(reelmId: any, rolesInput: any[] = [], membersInput: any[] = []) {
    const id = String(reelmId || '')
    const isDefaultCommunity = id === DEFAULT_REELM_ID
    const rawRoles = Array.isArray(rolesInput) ? rolesInput : []
    const rawMembers = filterMembersForClient(Array.isArray(membersInput) ? membersInput : [])
    const roleIdMap = new Map<string, string>()

    if (isDefaultCommunity) {
      const adminSource = rawRoles.find((role: any) => String(role?.id || '') === DEFAULT_ADMIN_ROLE_ID)
        || rawRoles.find(isAdminLikeRole)
        || { id: DEFAULT_ADMIN_ROLE_ID, name: 'Community Admin', color: '#a3e635', position: 0, permissions: { ...FULL_MANAGER_PERMISSIONS } }
      const citizenSource = rawRoles.find((role: any) => String(role?.id || '') === DEFAULT_CITIZEN_ROLE_ID)
        || rawRoles.find((role: any) => !isAdminLikeRole(role) && isDefaultMemberLikeRole(role))
        || rawRoles.find((role: any) => !isAdminLikeRole(role))
        || { id: DEFAULT_CITIZEN_ROLE_ID, name: 'Citizen', color: '#b99887', position: 1, permissions: {} }

      rawRoles.forEach((role: any) => {
        const rawId = String(role?.id || '')
        if (!rawId) return
        if (rawId === DEFAULT_ADMIN_ROLE_ID || isManagerRole(role) || isAdminLikeRole(role)) roleIdMap.set(rawId, DEFAULT_ADMIN_ROLE_ID)
        else if (rawId === DEFAULT_CITIZEN_ROLE_ID || isDefaultMemberLikeRole(role)) roleIdMap.set(rawId, DEFAULT_CITIZEN_ROLE_ID)
      })

      const adminRole = sanitizeRole({
        ...adminSource,
        id: DEFAULT_ADMIN_ROLE_ID,
        name: String(adminSource?.name || '').trim() || 'Community Admin',
        color: /^#[0-9a-fA-F]{6}$/.test(String(adminSource?.color || '')) ? adminSource.color : '#a3e635',
        position: 0,
        permissions: { ...FULL_MANAGER_PERMISSIONS }
      }, DEFAULT_ADMIN_ROLE_ID, { allowManageReelm: true, forceManager: true })
      const citizenRole = sanitizeRole({
        ...citizenSource,
        id: DEFAULT_CITIZEN_ROLE_ID,
        name: String(citizenSource?.name || '').trim() || 'Citizen',
        color: /^#[0-9a-fA-F]{6}$/.test(String(citizenSource?.color || '')) ? citizenSource.color : '#b99887',
        position: 1,
        permissions: {}
      }, DEFAULT_CITIZEN_ROLE_ID, { allowManageReelm: true })

      const customRoles = rawRoles
        .filter((role: any) => {
          const rawId = String(role?.id || '')
          if (!rawId || rawId === DEFAULT_ADMIN_ROLE_ID || rawId === DEFAULT_CITIZEN_ROLE_ID) return false
          if (isAdminLikeRole(role) || isDefaultMemberLikeRole(role)) return false
          return true
        })
        .map((role: any, index: number) => sanitizeRole({ ...role, position: Number(role?.position ?? role?.order ?? index + 2) }, `role-custom-${index}`, { allowManageReelm: true }))

      const seenRoleIds = new Set<string>()
      const roles = [adminRole, citizenRole, ...customRoles]
        .filter((role: any) => {
          const rawId = String(role?.id || '')
          if (!rawId || seenRoleIds.has(rawId)) return false
          seenRoleIds.add(rawId)
          return true
        })
        .sort((a: any, b: any) => (Number(a?.position ?? a?.order ?? 0) - Number(b?.position ?? b?.order ?? 0)))
      const validRoleIds = new Set(roles.map((role: any) => String(role.id)))
      const members = rawMembers
        .map((member: any) => {
          const existingIds = Array.isArray(member?.roleIds) ? member.roleIds : []
          const hadAdmin = existingIds.map(String).some((roleId: string) => roleIdMap.get(roleId) === DEFAULT_ADMIN_ROLE_ID || roleId === DEFAULT_ADMIN_ROLE_ID)
          const fallback = hadAdmin ? DEFAULT_ADMIN_ROLE_ID : DEFAULT_CITIZEN_ROLE_ID
          return {
            ...member,
            userId: memberUserId(member),
            roleIds: normalizeRoleIdListForClient(existingIds, roleIdMap, validRoleIds, fallback)
          }
        })
        .filter((member: any) => member.userId)
      return { roles, members }
    }

    const rawAdminSource = rawRoles.find((role: any) => String(role?.id || '') === CUSTOM_ADMIN_ROLE_ID)
      || rawRoles.find(isAdminLikeRole)
      || rawRoles.find(isManagerRole)
      || { id: CUSTOM_ADMIN_ROLE_ID, name: 'Admin', color: '#f87171', position: 0, permissions: { ...FULL_MANAGER_PERMISSIONS } }
    const rawMembersSource = rawRoles.find((role: any) => String(role?.id || '') === CUSTOM_MEMBERS_ROLE_ID)
      || rawRoles.find((role: any) => !isAdminLikeRole(role) && isDefaultMemberLikeRole(role))
      || rawRoles.find((role: any) => !isManagerRole(role) && !isAdminLikeRole(role))
      || { id: CUSTOM_MEMBERS_ROLE_ID, name: 'Members', color: '#60a5fa', position: 1, permissions: {} }

    rawRoles.forEach((role: any) => {
      const rawId = String(role?.id || '')
      if (!rawId) return
      if (rawId === CUSTOM_ADMIN_ROLE_ID || isManagerRole(role) || isAdminLikeRole(role) || /^role-admin-/i.test(rawId)) {
        roleIdMap.set(rawId, CUSTOM_ADMIN_ROLE_ID)
      } else if (rawId === CUSTOM_MEMBERS_ROLE_ID || isDefaultMemberLikeRole(role) || /^role-(member|members|citizen)-/i.test(rawId) || rawId === DEFAULT_CITIZEN_ROLE_ID) {
        roleIdMap.set(rawId, CUSTOM_MEMBERS_ROLE_ID)
      }
    })

    const adminRole = sanitizeRole({
      ...rawAdminSource,
      id: CUSTOM_ADMIN_ROLE_ID,
      name: String(rawAdminSource?.name || '').trim() || 'Admin',
      color: ROLE_COLOR_RE.test(String(rawAdminSource?.color || '')) ? rawAdminSource.color : '#f87171',
      position: 0,
      permissions: { ...FULL_MANAGER_PERMISSIONS }
    }, CUSTOM_ADMIN_ROLE_ID, { allowManageReelm: true, forceManager: true })

    const membersRole = sanitizeRole({
      ...rawMembersSource,
      id: CUSTOM_MEMBERS_ROLE_ID,
      name: String(rawMembersSource?.name || '').trim() || 'Members',
      color: ROLE_COLOR_RE.test(String(rawMembersSource?.color || '')) ? rawMembersSource.color : '#60a5fa',
      position: 1,
      permissions: {}
    }, CUSTOM_MEMBERS_ROLE_ID, { allowManageReelm: true })

    const seenCustomKeys = new Set<string>()
    const customRoles = rawRoles
      .filter((role: any) => {
        const rawId = String(role?.id || '')
        if (!rawId || roleIdMap.has(rawId) || rawId === CUSTOM_ADMIN_ROLE_ID || rawId === CUSTOM_MEMBERS_ROLE_ID) return false
        if (isAdminLikeRole(role) || isDefaultMemberLikeRole(role) || isManagerRole(role)) return false
        const key = roleNameKey(role) || rawId
        if (seenCustomKeys.has(key)) return false
        seenCustomKeys.add(key)
        return true
      })
      .map((role: any, index: number) => sanitizeRole({ ...role, position: Number(role?.position ?? role?.order ?? index + 2) }, `role-custom-${index}`, { allowManageReelm: true }))
      .filter((role: any) => String(role?.id || '') !== CUSTOM_ADMIN_ROLE_ID && String(role?.id || '') !== CUSTOM_MEMBERS_ROLE_ID)

    const seenRoleIds = new Set<string>()
    const roles = [adminRole, membersRole, ...customRoles]
      .filter((role: any) => {
        const rawId = String(role?.id || '')
        if (!rawId || seenRoleIds.has(rawId)) return false
        seenRoleIds.add(rawId)
        return true
      })
      .sort((a: any, b: any) => (Number(a?.position ?? a?.order ?? 0) - Number(b?.position ?? b?.order ?? 0)))

    const validRoleIds = new Set(roles.map((role: any) => String(role.id)))
    const members = rawMembers
      .map((member: any) => {
        const existingIds = Array.isArray(member?.roleIds) ? member.roleIds : []
        const mappedIds = existingIds.map(String).map((roleId: string) => roleIdMap.get(roleId) || roleId)
        const hadAdmin = mappedIds.includes(CUSTOM_ADMIN_ROLE_ID)
        return {
          ...member,
          userId: memberUserId(member),
          roleIds: normalizeRoleIdListForClient(mappedIds, roleIdMap, validRoleIds, hadAdmin ? CUSTOM_ADMIN_ROLE_ID : CUSTOM_MEMBERS_ROLE_ID)
        }
      })
      .filter((member: any) => member.userId)
    return { roles, members }
  }

  const coreChanged = (roles: any[], members: any[], normalized: { roles: any[]; members: any[] }) => {
    try { return JSON.stringify(roles || []) !== JSON.stringify(normalized.roles || []) || JSON.stringify(members || []) !== JSON.stringify(normalized.members || []) }
    catch { return true }
  }

  const persistCanonicalCoreIfNeeded = async (reelmId: string, roles: any[] = [], members: any[] = []) => {
    const normalized = normalizeReelmCoreForClient(reelmId, roles, members)
    if (!coreChanged(roles, members, normalized)) return normalized
    const pk = reelmPk(reelmId)
    await Promise.all([
      putDoc(pk, 'roles', normalized.roles),
      putDoc(pk, 'members', normalized.members)
    ])
    emitReelm(reelmId, 'roles')
    emitReelm(reelmId, 'members')
    return normalized
  }

  const getDefaultManagerRole = (roles: any[] = []) => (roles || []).find((role: any) => String(role?.id || '') === DEFAULT_ADMIN_ROLE_ID) || (roles || []).find(isManagerRole) || (roles || [])[0]
  const getDefaultMemberRole = (roles: any[] = []) => (roles || []).find((role: any) => String(role?.id || '') === DEFAULT_CITIZEN_ROLE_ID) || (roles || []).find((role: any) => String(role?.id || '').includes('member')) || (roles || []).find((role: any) => !isManagerRole(role)) || (roles || [])[0]

  const sanitizePermissions = (permissions: any = {}, options: { allowManageReelm?: boolean; forceManager?: boolean } = {}) => {
    const src = permissions && typeof permissions === 'object' ? permissions : {}
    const next: Record<string, boolean> = {}
    for (const key of REELM_PERMISSION_KEYS) {
      if (key === 'manageReelm' && !options.allowManageReelm && !options.forceManager) continue
      if (src[key] === true) next[key] = true
    }
    if (options.forceManager || next.manageReelm === true) return { ...FULL_MANAGER_PERMISSIONS }
    if (Object.values(next).some(Boolean)) next.viewSettings = true
    return next
  }

  const sanitizeRole = (role: any, fallbackId = '', options: { allowManageReelm?: boolean; forceManager?: boolean } = {}) => {
    const id = String(role?.id || fallbackId || `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 80)
    const name = String(role?.name || 'Role').trim().replace(/\s+/g, ' ').slice(0, 32) || 'Role'
    const color = ROLE_COLOR_RE.test(String(role?.color || '')) ? String(role.color) : '#60a5fa'
    const forceManager = options.forceManager === true || (options.allowManageReelm === true && role?.permissions?.manageReelm === true)
    const position = Number.isFinite(Number(role?.position ?? role?.order)) ? Number(role.position ?? role.order) : 0
    return {
      ...role,
      id,
      name,
      color,
      position,
      permissions: sanitizePermissions(role?.permissions || {}, { allowManageReelm: options.allowManageReelm, forceManager })
    }
  }

  const sanitizeRoles = (rolesInput: any[] = [], existingRoles: any[] = [], options: { actorCanManageFullRoles?: boolean, reelmId?: string } = {}) => {
    const actorCanManageFullRoles = options.actorCanManageFullRoles === true
    const isDefaultCommunityRoles = String(options.reelmId || '') === DEFAULT_REELM_ID
    const fallbackAdminRoleId = isDefaultCommunityRoles ? DEFAULT_ADMIN_ROLE_ID : CUSTOM_ADMIN_ROLE_ID
    const fallbackAdminRoleName = isDefaultCommunityRoles ? 'Community Admin' : 'Admin'
    const fallbackMemberRoleId = isDefaultCommunityRoles ? DEFAULT_CITIZEN_ROLE_ID : CUSTOM_MEMBERS_ROLE_ID
    const fallbackMemberRoleName = isDefaultCommunityRoles ? 'Citizen' : 'Members'
    const existingById = new Map((Array.isArray(existingRoles) ? existingRoles : []).map((role: any) => [String(role?.id || ''), sanitizeRole(role, '', { allowManageReelm: true })]))
    const protectedExistingIds = new Set(Array.from(existingById.values()).filter(isProtectedRole).map((role: any) => String(role?.id || '')).filter(Boolean))
    const seen = new Set<string>()
    const roles = (Array.isArray(rolesInput) ? rolesInput : [])
      .map((role: any, index: number) => {
        let id = String(role?.id || '')
        let existing = existingById.get(id) || null
        const defaultAdminExisting = existingById.get(fallbackAdminRoleId) || null
        // If a manager/admin role arrives without the stable id, treat it as an
        // edit of the stable admin role instead of creating a duplicate role.
        if (!existing && actorCanManageFullRoles && defaultAdminExisting && (role?.permissions?.manageReelm === true || isStableAdminRoleId(role))) {
          id = fallbackAdminRoleId
          existing = defaultAdminExisting
          role = { ...(role || {}), id }
        }
        if (existing && protectedExistingIds.has(id) && !actorCanManageFullRoles) return existing
        const merged = { ...(existing || {}), ...(role || {}) }
        if (!actorCanManageFullRoles) merged.permissions = existing?.permissions || {}
        return sanitizeRole(merged, `role-${index}`, { allowManageReelm: actorCanManageFullRoles, forceManager: Boolean(existing && isManagerRole(existing)) || (actorCanManageFullRoles && isManagerRole(merged)) })
      })
      .filter((role: any) => {
        if (!role.id || seen.has(role.id)) return false
        seen.add(role.id)
        return true
      })
      .filter((role: any) => {
        if (String(role?.id || '') === fallbackAdminRoleId) return true
        if (role?.permissions?.manageReelm === true && seen.has(fallbackAdminRoleId)) return false
        return true
      })
      .slice(0, 12)

    for (const role of existingById.values()) {
      if (protectedExistingIds.has(String(role?.id || '')) && !seen.has(String(role?.id || ''))) {
        roles.unshift(role)
        seen.add(String(role.id))
      }
    }
    if (!roles.some(isManagerRole)) {
      roles.unshift({ id: fallbackAdminRoleId, name: fallbackAdminRoleName, color: isDefaultCommunityRoles ? '#a3e635' : '#f87171', position: 0, permissions: { ...FULL_MANAGER_PERMISSIONS } })
    }
    if (!roles.some((role: any) => !isManagerRole(role))) {
      roles.push({ id: fallbackMemberRoleId, name: fallbackMemberRoleName, color: isDefaultCommunityRoles ? '#b99887' : '#60a5fa', position: roles.length, permissions: {} })
    }
    return roles.slice(0, 12)
  }

  const getActorRoleState = async (uid: string, reelmId: string) => {
    const actorId = String(uid || '')
    const id = String(reelmId || '')
    const cacheKey = `${actorId}:${id}:role-state`
    const cached = actorStateCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const existing = actorStateInflight.get(cacheKey)
    if (existing) return existing
    const run = (async () => {
      const pk = reelmPk(id)
      const [meta, members, roles] = await Promise.all([
        getDoc<any>(pk, 'meta').catch(() => null),
        getDoc<any[]>(pk, 'members').catch(() => []),
        getDoc<any[]>(pk, 'roles').catch(() => [])
      ])
      const isBanned = actorId ? await isBannedFromReelm(id, actorId).catch(() => false) : false
      const hasLeftDefault = id === DEFAULT_REELM_ID && actorId ? await hasLeftDefaultReelm(actorId).catch(() => false) : false
      const isOwner = Boolean(actorId && String(meta?.ownerId || '') === actorId)
      const isSystem = Boolean(actorId && actorId === env.REELMS_MODERATION_UID)
      const isCommunityAdmin = !isBanned && !hasLeftDefault && id === DEFAULT_REELM_ID && actorId ? await isCommunityAdminUid(actorId).catch(() => false) : false
      const member = (members || []).find((item: any) => memberUserId(item) === actorId)
      const roleIds = new Set(Array.isArray(member?.roleIds) ? member.roleIds.map(String) : [])
      const actorRoles = (roles || []).filter((role: any) => roleIds.has(String(role?.id || '')))
      const isFullManager = !isBanned && !hasLeftDefault && (isOwner || isSystem || isCommunityAdmin || actorRoles.some(isManagerRole))
      const canManageFullRoles = !isBanned && !hasLeftDefault && (isOwner || isSystem || isCommunityAdmin)
      const permissions = new Set<string>()
      if (isFullManager) REELM_PERMISSION_KEYS.forEach((key) => permissions.add(key))
      for (const role of actorRoles) {
        const rolePermissions = role?.permissions && typeof role.permissions === 'object' ? role.permissions : {}
        for (const key of REELM_PERMISSION_KEYS) if (rolePermissions[key] === true) permissions.add(key)
        if (Object.values(rolePermissions).some((value) => value === true)) permissions.add('viewSettings')
      }
      const value = { meta, members: members || [], roles: roles || [], actorRoles, isOwner, isFullManager, canManageFullRoles, permissions }
      actorStateCache.set(cacheKey, { value, expiresAt: Date.now() + 3000 })
      return value
    })().finally(() => { actorStateInflight.delete(cacheKey) })
    actorStateInflight.set(cacheKey, run)
    return run
  }

  const actorHasPermission = (state: any, permission: ReelmPermissionKey) => state?.isFullManager === true || state?.permissions?.has?.(permission) === true

  const sanitizeMetaUpdate = (incoming: any, existing: any, actorState: any) => {
    const src = incoming && typeof incoming === 'object' ? incoming : {}
    const base = existing && typeof existing === 'object' ? existing : {}
    const next = actorState?.isFullManager
      ? { ...base, ...src }
      : {
          ...base,
          name: Object.prototype.hasOwnProperty.call(src, 'name') ? String(src.name || base.name || 'Reelm').trim().slice(0, 80) || base.name : base.name,
          image: Object.prototype.hasOwnProperty.call(src, 'image') ? sanitizeMediaUrl(src.image) : sanitizeMediaUrl(base.image),
          showInDiscover: Object.prototype.hasOwnProperty.call(src, 'showInDiscover') ? src.showInDiscover === true : base.showInDiscover,
          joinMode: Object.prototype.hasOwnProperty.call(src, 'joinMode') ? (['open', 'request', 'closed'].includes(String(src.joinMode)) ? String(src.joinMode) : base.joinMode) : base.joinMode,
          autoJoinOnInvite: Object.prototype.hasOwnProperty.call(src, 'autoJoinOnInvite') ? src.autoJoinOnInvite === true : base.autoJoinOnInvite,
          memberInvitesEnabled: Object.prototype.hasOwnProperty.call(src, 'memberInvitesEnabled') ? src.memberInvitesEnabled !== false : base.memberInvitesEnabled,
          memberInviteMode: Object.prototype.hasOwnProperty.call(src, 'memberInviteMode') ? (String(src.memberInviteMode) === 'auto' ? 'auto' : 'request') : base.memberInviteMode,
          ageRating: Object.prototype.hasOwnProperty.call(src, 'ageRating') ? (String(src.ageRating) === 'adults' ? 'adults' : 'under18') : base.ageRating,
          announcementChannelId: Object.prototype.hasOwnProperty.call(src, 'announcementChannelId') ? String(src.announcementChannelId || '') : base.announcementChannelId
        }
    next.image = Object.prototype.hasOwnProperty.call(src, 'image') ? sanitizeMediaUrl(src.image) : sanitizeMediaUrl(base.image)
    return {
      ...next,
      id: base.id,
      code: base.code,
      ownerId: base.ownerId || null,
      createdAt: base.createdAt || next.createdAt || Date.now(),
      isDefault: base.isDefault === true,
      communityArtLocked: base.communityArtLocked === true,
      updatedAt: Date.now()
    }
  }

  const removeUserReelmCopy = async (uid: string, reelmId: string) => {
    if (!uid || !reelmId) return false
    const pk = userPk(uid)
    const current = (await getDoc<any[]>(pk, 'reelms').catch(() => [])) || []
    const next = current.filter((r: any) => String(r?.id || '') !== String(reelmId))
    if (next.length !== current.length) {
      await putDoc(pk, 'reelms', next)
      emitUser(uid, 'reelms')
      return true
    }
    emitUser(uid, 'reelms')
    return false
  }

  const cleanupJoinRequest = async (reelmId: string, uid: string) => {
    if (!reelmId || !uid) return false
    const pk = reelmPk(reelmId)
    const current = (await getDoc<any[]>(pk, 'join_requests').catch(() => [])) || []
    const next = current.filter((r: any) => String(r?.userId || r?.id || '') !== uid)
    if (next.length === current.length) return false
    await putDoc(pk, 'join_requests', next)
    emitReelm(reelmId, 'join_requests')
    await emitReelmManagers(reelmId, 'join_requests').catch(() => {})
    return true
  }

  const getPendingInvite = async (reelmId: string, uid: string) => {
    if (!reelmId || !uid) return null
    const invites = (await getDoc<any[]>(reelmPk(reelmId), 'invites').catch(() => [])) || []
    return invites.find((invite: any) => String(invite?.targetUid || invite?.userId || invite?.id || '') === String(uid)) || null
  }

  const cleanupInvite = async (reelmId: string, uid: string) => {
    if (!reelmId || !uid) return false
    const pk = reelmPk(reelmId)
    const current = (await getDoc<any[]>(pk, 'invites').catch(() => [])) || []
    const next = current.filter((invite: any) => String(invite?.targetUid || invite?.userId || invite?.id || '') !== String(uid))
    if (next.length === current.length) return false
    await putDoc(pk, 'invites', next)
    return true
  }


  const acceptInviteForUser = async (reelmId: string, uid: string) => {
    const pk = reelmPk(reelmId)
    const [meta, pendingInvite, alreadyMember, banned] = await Promise.all([
      getDoc<any>(pk, 'meta').catch(() => null),
      getPendingInvite(reelmId, uid).catch(() => null),
      isReelmMember(uid, reelmId).catch(() => false),
      isBannedFromReelm(reelmId, uid).catch(() => false)
    ])
    if (!meta?.id) return { status: 404, data: { error: 'reelm_not_found' } }
    if (banned) return { status: 403, data: { error: 'reelm_banned', code: 'reelm/banned', ban: await getBanEntry(reelmId, uid).catch(() => null) } }
    if (!pendingInvite && !alreadyMember) return { status: 404, data: { error: 'invite_not_found', code: 'reelm/invite-not-found' } }
    if (alreadyMember) {
      void cleanupInvite(reelmId, uid).catch(() => {})
      return { status: 200, data: { alreadyMember: true, joined: true, pending: false, reelmId } }
    }

    const [rawRoles, structure] = await Promise.all([
      getDoc<any[]>(pk, 'roles').catch(() => []),
      getDoc<any>(pk, 'structure').catch(() => null)
    ])
    const inviteCanAutoJoin = pendingInvite?.bypassApproval === true
    const canJoinNow = meta.joinMode === 'open' || meta.autoJoinOnInvite === true || inviteCanAutoJoin
    if (canJoinNow) {
      const normalizedBeforeJoin = normalizeReelmCoreForClient(reelmId, rawRoles || [], [])
      const memberRole = getDefaultMemberRole(normalizedBeforeJoin.roles)
      const membersAfterJoin = await ensureMember(reelmId, uid, memberRole?.id ? [memberRole.id] : [])
      const normalized = await persistCanonicalCoreIfNeeded(reelmId, rawRoles || [], membersAfterJoin).catch(() => normalizeReelmCoreForClient(reelmId, rawRoles || [], membersAfterJoin))
      const full = toClientReelm(meta, structure || { categories: [] }, normalized.roles, normalized.members)
      await upsertUserReelm(uid, full)

      void (async () => {
        await Promise.all([
          cleanupJoinRequest(reelmId, uid).catch(() => {}),
          cleanupInvite(reelmId, uid).catch(() => {})
        ])
        void syncReelmMemberCopies(reelmId).catch(() => {})
        const joinedProfile = await getSenderProfile(uid).catch(() => ({ name: 'Someone' }))
        if (meta.ownerId && String(meta.ownerId) !== uid) {
          await pushUserNotification(String(meta.ownerId), `${joinedProfile.name || 'Someone'} joined ${meta.name}.`, { type: 'reelm', reelmId }).catch(() => {})
        }
      })().catch(() => {})

      emitUser(uid, 'reelms')
      emitReelm(reelmId, 'members')
      emitReelm(reelmId, 'roles')
      io.to(`reelm:${reelmId}`).emit('reelm:member-joined', { reelmId, userId: uid })
      return { status: 200, data: { joined: true, pending: false, reelm: full } }
    }

    const profile = await getUserPublicProfile(uid)
    const reqEntry = { id: uid, userId: uid, name: profile.name || profile.username || 'User', username: profile.username || '', photo: getProfilePhoto(profile), requestedAt: Date.now(), invitedBy: pendingInvite?.invitedBy || null }
    const current = (await getDoc<any[]>(pk, 'join_requests').catch(() => [])) || []
    const next = [reqEntry, ...current.filter((r: any) => String(r?.userId || r?.id || '') !== uid)].slice(0, 200)
    await putDoc(pk, 'join_requests', next)
    emitReelm(reelmId, 'join_requests')
    void (async () => {
      await emitReelmManagers(reelmId, 'join_requests').catch(() => {})
      await cleanupInvite(reelmId, uid).catch(() => {})
      if (meta.ownerId) await pushUserNotification(String(meta.ownerId), `${reqEntry.name} accepted an invite and wants to join ${meta.name}.`, { type: 'reelm_join_requests', reelmId }).catch(() => {})
    })().catch(() => {})
    return { status: 200, data: { joined: false, pending: true, reelmId, name: meta.name } }
  }


  const getBanList = async (reelmId: string) => ((await getDoc<any[]>(reelmPk(reelmId), 'ban_list').catch(() => [])) || [])

  const getTimeoutList = async (reelmId: string) => {
    const pk = reelmPk(reelmId)
    const now = Date.now()
    const current = (await getDoc<any[]>(pk, 'timeout_list').catch(() => [])) || []
    const active = current.filter((entry: any) => String(entry?.userId || entry?.id || '') && Number(entry?.expiresAt || 0) > now)
    if (active.length !== current.length) {
      await putDoc(pk, 'timeout_list', active).catch(() => {})
      emitReelm(reelmId, 'timeout_list')
      await emitReelmManagers(reelmId, 'timeout_list').catch(() => {})
    }
    return active
  }

  const getBanEntry = async (reelmId: string, uid: string) => {
    if (!reelmId || !uid) return null
    const banList = await getBanList(reelmId)
    return banList.find((entry: any) => String(entry?.userId || entry?.id || '') === String(uid)) || null
  }

  const isBannedFromReelm = async (reelmId: string, uid: string) => Boolean(await getBanEntry(reelmId, uid).catch(() => null))

  const emitReelmManagers = async (reelmId: string, sk: string) => {
    const pk = reelmPk(reelmId)
    const [meta, members, roles] = await Promise.all([
      getDoc<any>(pk, 'meta').catch(() => null),
      getDoc<any[]>(pk, 'members').catch(() => []),
      getDoc<any[]>(pk, 'roles').catch(() => [])
    ])
    const adminRoleIds = new Set((roles || [])
      .filter((role: any) => isManagerRole(role) || role?.permissions?.viewSettings === true || Object.values(role?.permissions || {}).some((value) => value === true))
      .map((role: any) => String(role?.id || ''))
      .filter(Boolean))
    const managerIds = new Set<string>([String(meta?.ownerId || ''), env.REELMS_MODERATION_UID].filter(Boolean))
    for (const member of (members || [])) {
      const memberId = memberUserId(member)
      if (!memberId) continue
      const roleIds = Array.isArray(member?.roleIds) ? member.roleIds.map(String) : []
      if (roleIds.some((roleId: string) => adminRoleIds.has(roleId))) managerIds.add(memberId)
    }
    if (reelmId === DEFAULT_REELM_ID) {
      for (const member of (members || [])) {
        const memberId = memberUserId(member)
        if (memberId && await isCommunityAdminUid(memberId).catch(() => false)) managerIds.add(memberId)
      }
      const resolvedCommunityAdmins = await resolveCommunityAdminUids().catch(() => [])
      resolvedCommunityAdmins.forEach((id) => { if (id) managerIds.add(String(id)) })
    }
    const data = await getDoc<any>(pk, sk).catch(() => null)
    const bannedIds = hiddenMemberIdsFromBanList(await getBanList(reelmId).catch(() => []))
    for (const id of managerIds) {
      if (!id || bannedIds.has(id)) continue
      if (reelmId === DEFAULT_REELM_ID && id !== env.REELMS_MODERATION_UID && await hasLeftDefaultReelm(id).catch(() => false)) continue
      io.to(`u:${id}`).emit('reelms:doc', { scope: 'reelm', reelmId, sk, data, version: syncVersion(), at: Date.now() })
      io.to(`u:${id}`).emit('reelms:manager-doc', { reelmId, sk, data, version: syncVersion(), at: Date.now() })
    }
  }


  const emitReelmPresence = async (reelmId: string) => {
    const sockets = await io.in(`reelm:${reelmId}`).fetchSockets().catch(() => [])
    const byUser = new Map<string, { userId: string; status: string; userName: string; userPhoto: any }>()
    for (const socket of sockets as any[]) {
      const userId = String(socket.data?.uid || '')
      if (!userId || byUser.has(userId)) continue
      const status = String(socket.data?.presenceStatus || 'online')
      if (status === 'invisible' || status === 'offline') continue
      byUser.set(userId, {
        userId,
        status: ['online', 'idle', 'busy'].includes(status) ? status : 'online',
        userName: String(socket.data?.userName || 'User'),
        userPhoto: socket.data?.userPhoto || null
      })
    }
    io.to(`reelm:${reelmId}`).emit('reelms:presence:update', { reelmId, users: Array.from(byUser.values()) })
  }

  const ejectUserFromReelmRooms = async (reelmId: string, uid: string, reason: 'left' | 'removed' | 'revoked' | 'banned' = 'revoked', name?: string) => {
    if (!reelmId || !uid) return
    const sockets = await io.in(`u:${uid}`).fetchSockets().catch(() => [])
    await Promise.all((sockets as any[]).map(async (socket: any) => {
      const vcRoom = socket._vcRoom
      const vcChannelId = socket._vcChannelId
      const inThisVc = socket._vcReelmId && String(socket._vcReelmId) === String(reelmId)
      if (inThisVc && vcRoom) {
        socket.to(vcRoom).emit('vc:event', { type: 'leave', from: uid })
      }

      for (const room of Array.from(socket.rooms || []) as string[]) {
        if (room === `reelm:${reelmId}` || room.startsWith(`chan:${reelmId}_`) || room.startsWith(`vc:${reelmId}_`)) {
          socket.leave(room)
        }
      }

      if (inThisVc) {
        socket._vcRoom = null
        socket._vcReelmId = null
        socket._vcChannelId = null
        socket._vcUserName = null
        socket._vcUserPhoto = null
        if (vcRoom && vcChannelId) {
          const peers = await io.in(vcRoom).fetchSockets().catch(() => [])
          const count = (peers as any[]).length
          const participants = (peers as any[]).map((peer) => ({
            userId: String(peer.data?.uid || ''),
            userName: String(peer.data?.userName || 'User'),
            userPhoto: peer.data?.userPhoto || null
          })).filter((peer) => peer.userId)
          io.to(`reelm:${reelmId}`).emit('vc:count', { reelmId, channelId: vcChannelId, count })
          io.to(`reelm:${reelmId}`).emit('vc:participants', { reelmId, channelId: vcChannelId, participants })
        }
      }

      socket.data?.joinedReelms?.delete?.(reelmId)
      socket.emit('reelm:access-revoked', { reelmId, reason, name: name || null })
    }))
    await emitReelmPresence(reelmId).catch(() => {})
  }

  const ejectUserFromReelmVoiceRooms = async (reelmId: string, uid: string, reason = 'timeout') => {
    if (!reelmId || !uid) return
    const sockets = await io.in(`u:${uid}`).fetchSockets().catch(() => [])
    await Promise.all((sockets as any[]).map(async (socket: any) => {
      const vcRoom = socket._vcRoom
      const vcChannelId = socket._vcChannelId
      const inThisVc = socket._vcReelmId && String(socket._vcReelmId) === String(reelmId)
      if (!inThisVc || !vcRoom) return
      socket.to(vcRoom).emit('vc:event', { type: 'leave', from: uid, reason })
      socket.leave(vcRoom)
      if (vcChannelId) socket.leave(`chan:${reelmId}_vc_${vcChannelId}`)
      socket._vcRoom = null
      socket._vcReelmId = null
      socket._vcChannelId = null
      socket._vcUserName = null
      socket._vcUserPhoto = null
      if (vcChannelId) {
        const peers = await io.in(vcRoom).fetchSockets().catch(() => [])
        const count = (peers as any[]).length
        const participants = (peers as any[]).map((peer) => ({
          userId: String(peer.data?.uid || ''),
          userName: String(peer.data?.userName || 'User'),
          userPhoto: peer.data?.userPhoto || null
        })).filter((peer) => peer.userId)
        io.to(`reelm:${reelmId}`).emit('vc:count', { reelmId, channelId: vcChannelId, count })
        io.to(`reelm:${reelmId}`).emit('vc:participants', { reelmId, channelId: vcChannelId, participants })
      }
      socket.emit('vc:error', { reelmId, channelId: vcChannelId || null, error: 'reelm_timeout' })
    }))
  }

  const revokeReelmAccess = async (reelmId: string, uid: string, reason: 'left' | 'removed' | 'revoked' | 'banned' = 'revoked', name?: string) => {
    if (!reelmId || !uid) return
    await removeUserReelmCopy(uid, reelmId).catch(() => {})
    await cleanupJoinRequest(reelmId, uid).catch(() => {})
    if (reelmId === DEFAULT_REELM_ID) {
      await setDefaultReelmLeft(uid, true).catch(() => {})
      await putDoc(userPk(uid), 'joined_default_reelm', false).catch(() => {})
    }
    await ejectUserFromReelmRooms(reelmId, uid, reason, name).catch(() => {})
    if (reason === 'removed' || reason === 'revoked') {
      const serverName = name || 'this Reelm'
      const text = reason === 'removed' ? `You were removed from ${serverName}.` : `Your access to ${serverName} was revoked.`
      await pushUserNotification(uid, text, { type: reason === 'removed' ? 'reelm_removed' : 'reelm_access_revoked', reelmId, reason }).catch(() => {})
    }
  }

  const syncReelmMemberCopies = async (reelmId: string) => {
    const pk = reelmPk(reelmId)
    const meta = await getDoc<any>(pk, 'meta')
    if (!meta) return
    const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
    const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
    const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
    const summary = slimReelmForUserDoc(toClientReelm(meta, structure, roles, members))
    await Promise.all(members.map((m) => memberUserId(m) ? upsertUserReelm(memberUserId(m), summary).catch(() => null) : Promise.resolve(null)))
    members.forEach((m) => { const mid = memberUserId(m); if (mid) emitUser(mid, 'reelms') })
    scheduleReelmCoreBroadcast(reelmId, 'member-copy-sync', 40)
  }

  router.get('/user/bootstrap', async (req, res) => {
    try {
      const uid = String(req.userId)
      scheduleDefaultCommunityHeal(uid)
      const pk = userPk(uid)
      const rowsPromise = queryDocs<any>(pk).catch(() => [])
      const rows = await withDeadline(rowsPromise, 3500, [] as any[])
      const wanted = new Set(USER_BOOTSTRAP_KEYS)
      const data: Record<string, any> = {}
      for (const row of Array.isArray(rows) ? rows : []) {
        if (!wanted.has(String(row?.sk || ''))) continue
        data[String(row.sk)] = row.data
      }
      if (!Array.isArray(data.reelms)) data.reelms = await getFastUserDoc(uid, 'reelms', [], 900).catch(() => [])
      else data.reelms = slimUserReelms(data.reelms)
      for (const sk of ['customization', 'bg_image', 'body_font', 'environment', 'chats', 'friends', 'friend_requests', 'notifications', 'message_requests', 'unread_counts']) {
        if (typeof data[sk] !== 'undefined') cacheFastUserDoc(uid, sk, data[sk])
      }
      cacheFastUserDoc(uid, 'reelms', Array.isArray(data.reelms) ? data.reelms : [])
      res.json({ data, partial: !Array.isArray(rows) || rows.length === 0 })
    } catch (e) { console.error(e); res.status(500).json({ error: 'bootstrap_failed' }) }
  })


  router.post('/user/session/record', async (req, res) => {
    try {
      const uid = String(req.userId)
      const pk = userPk(uid)
      const ua = String(req.headers['user-agent'] || req.body?.ua || '').slice(0, 500)
      const device = String(req.body?.device || 'Unknown device').slice(0, 120)
      const notifyNewDevice = req.body?.notifyNewDevice !== false
      const now = Date.now()
      const sessionId = `${now}_${Math.random().toString(36).slice(2, 9)}`
      const currentSessions = (await getDoc<any[]>(pk, 'sessions').catch(() => [])) || []
      const list = Array.isArray(currentSessions) ? currentSessions : []
      const isNewDevice = list.length > 0 && ua && !list.some((s) => String(s?.ua || '') === ua)
      const entry = { id: sessionId, loginTime: now, lastActivity: now, ua, device }
      const nextSessions = [entry, ...list.filter((s) => String(s?.id || '') !== sessionId)].slice(0, 10)
      await putDoc(pk, 'sessions', nextSessions)
      emitUser(uid, 'sessions')

      if (isNewDevice && notifyNewDevice) {
        const notifs = (await getDoc<any[]>(pk, 'notifications').catch(() => [])) || []
        const text = `New sign-in detected from ${device}`
        const already = notifs.slice(0, 20).some((n) => String(n?.text || '') === text)
        if (!already) {
          await putDoc(pk, 'notifications', [{ id: `${now}_${Math.random().toString(36).slice(2, 11)}`, text, time: now }, ...notifs].slice(0, 100))
          emitUser(uid, 'notifications')
        }
      }

      res.json({ data: { sessionId, sessions: nextSessions } })
    } catch (err) {
      console.error('/api/v1/user/session/record error:', err)
      res.status(500).json({ error: 'session_record_failed' })
    }
  })

  router.post('/user/session/touch', async (req, res) => {
    try {
      const uid = String(req.userId)
      const sessionId = String(req.body?.sessionId || '')
      if (!sessionId) return res.json({ ok: true })
      const pk = userPk(uid)
      const currentSessions = (await getDoc<any[]>(pk, 'sessions').catch(() => [])) || []
      const list = Array.isArray(currentSessions) ? currentSessions : []
      let changed = false
      const now = Date.now()
      const nextSessions = list.map((session) => {
        if (String(session?.id || '') !== sessionId) return session
        const last = Number(session?.lastActivity || 0)
        if (Number.isFinite(last) && now - last < 4 * 60 * 1000) return session
        changed = true
        return { ...session, lastActivity: now }
      })
      if (changed) {
        await putDoc(pk, 'sessions', nextSessions)
        emitUser(uid, 'sessions')
      }
      res.json({ ok: true })
    } catch (err) {
      console.error('/api/v1/user/session/touch error:', err)
      res.status(500).json({ error: 'session_touch_failed' })
    }
  })

  router.get('/user/doc/:sk', async (req, res) => {
    try {
      const uid = String(req.userId)
      const sk = decodeURIComponent(req.params.sk)
      if (sk === 'reelms') {
        scheduleDefaultCommunityHeal(uid, undefined, null, 5000)
        const data = await getFastUserDoc(uid, 'reelms', [], 1200).catch(() => [])
        return res.json({ data: Array.isArray(data) ? data : [] })
      }
      if (['customization', 'bg_image', 'body_font', 'environment', 'chats', 'friends', 'friend_requests', 'notifications', 'message_requests', 'unread_counts'].includes(sk)) {
        return res.json({ data: await getFastUserDoc(uid, sk, sk === 'body_font' ? null : (sk === 'bg_image' ? null : undefined), 1200) })
      }
      res.json({ data: await getDoc(userPk(uid), sk) })
    }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.put('/user/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      const uid = String(req.userId)
      if (sk === 'profile') return res.status(400).json({ error: 'use_profile_endpoint', code: 'profile/use-profile-endpoint' })
      if (sk === 'blocked') {
        const incoming = Array.isArray(req.body?.data) ? req.body.data : []
        const filtered = incoming.filter((entry: any) => !isSystemInboxUid(String(entry?.id || entry?.userId || '')))
        await putDoc(userPk(uid), sk, filtered)
        emitUser(uid, sk)
        return res.json({ ok: true })
      }
      if (sk === 'chats') {
        const incoming = Array.isArray(req.body?.data) ? req.body.data : []
        const existing = (await getDoc<any[]>(userPk(uid), 'chats').catch(() => [])) || []
        const existingSystem = existing.find((chat: any) => isSystemInboxUid(String(chat?.friendId || chat?.userId || '')) || chat?.systemLocked === true || String(chat?.username || '').toLowerCase() === 'reelms-system')
        const normalizedIncoming = incoming.filter((chat: any) => !isSystemInboxUid(String(chat?.friendId || chat?.userId || '')) && chat?.systemLocked !== true && String(chat?.username || '').toLowerCase() !== 'reelms-system')
        const next = existingSystem ? [
          { ...existingSystem, isSystem: true, system: true, systemLocked: true, readOnly: true, canReply: false, canBlock: false, canDelete: false },
          ...normalizedIncoming
        ] : normalizedIncoming
        await putDoc(userPk(uid), sk, next)
        emitUser(uid, sk)
        return res.json({ ok: true })
      }
      if (sk === 'reelms') {
        // Server-owned membership copies must not be overwritten by client
        // snapshots. Accept old clients without doing heavy canonical rebuilds.
        const current = await getDoc<any[]>(userPk(uid), 'reelms').catch(() => [])
        return res.json({ ok: true, ignored: true, data: Array.isArray(current) ? current : [] })
      }
      let nextData = req.body?.data
      if (sk === 'bg_image') {
        if (nextData == null || nextData === '') nextData = null
        else {
          const url = sanitizeMediaUrl(nextData)
          if (!url) return res.status(400).json({ error: 'media_must_be_uploaded', code: 'media/upload-required' })
          nextData = url
        }
        publicProfileCache.delete(uid)
      } else if (sk === 'customization') {
        nextData = sanitizeCustomizationDoc(nextData)
        publicProfileCache.delete(uid)
      }
      await putDoc(userPk(uid), sk, nextData)
      emitUser(uid, sk)
      res.json({ ok: true, data: nextData })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  const getPublicProfileForRoute = async (requestedUid: string, requesterUid: string) => {
    const uid = String(requestedUid || '')
    if (!uid || isSystemInboxUid(uid)) {
      return {
        id: uid || env.REELMS_MODERATION_UID,
        uid: uid || env.REELMS_MODERATION_UID,
        isSystem: true,
        name: 'Reelms System',
        displayName: 'Reelms System',
        username: 'reelms-system',
        photo: null,
        profilePhoto: null,
        avatar: null,
        image: null,
        cover: null,
        coverImage: null,
        coverUrl: null,
        profileTheme: null,
        sociallinks: {},
        socialorder: []
      }
    }
    const cached = publicProfileCache.get(uid)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const [profile, sociallinks, socialorder, customization, bgImage, bodyFont] = await Promise.all([
      withDeadline(getDoc<any>(userPk(uid), 'profile').catch(() => null), 1500, null),
      withDeadline(getDoc<any>(userPk(uid), 'sociallinks').catch(() => ({})), 900, {}),
      withDeadline(getDoc<any>(userPk(uid), 'socialorder').catch(() => []), 900, []),
      withDeadline(getDoc<any>(userPk(uid), 'customization').catch(() => null), 900, null),
      withDeadline(getDoc<any>(userPk(uid), 'bg_image').catch(() => null), 900, null),
      withDeadline(getDoc<any>(userPk(uid), 'body_font').catch(() => null), 900, null)
    ])
    if (!profile) return cached?.value || null
    const safeBg = typeof bgImage === 'string' ? sanitizeMediaUrl(bgImage) : null
    const safeCustomization = sanitizeCustomizationDoc(customization || {}) || {}
    const profileTheme = profile.profileTheme || {
      ...(safeCustomization || {}),
      bgImage: safeBg || (safeCustomization as any).bgImage || null
    }
    const value = publicProfileFromStored(uid, {
      ...profile,
      sociallinks: sociallinks || profile.sociallinks || {},
      socialorder: Array.isArray(socialorder) ? socialorder : (profile.socialorder || []),
      bgImage: safeBg || profile.bgImage || null,
      bodyFont: typeof bodyFont === 'string' ? bodyFont : null,
      profileTheme
    })
    publicProfileCache.set(uid, { value, expiresAt: Date.now() + 60_000 })
    return value
  }

  router.put('/user/profile', async (req, res) => {
    try {
      const data = req.body?.data
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'invalid_data' })
      const uid = String(req.userId)
      const existing = (await getDoc<Record<string, unknown>>(userPk(uid), 'profile').catch(() => null)) || {}
      const prepared = await prepareProfileWrite(uid, data, existing, data)
      if (!prepared.ok) return res.status(prepared.status).json({ error: prepared.error, code: prepared.code })

      await putDoc(userPk(uid), 'profile', prepared.profile)
      publicProfileCache.delete(uid)
      scheduleDefaultCommunityHeal(uid, prepared.profile.name || prepared.profile.displayName || prepared.profile.username || '', getProfilePhoto(prepared.profile), 5000)
      await delay(0)
      // keep default community membership repair off the request critical path
      //
      // legacy: autoJoinDefaultReelm(uid, prepared.profile.name || prepared.profile.displayName || prepared.profile.username || '', getProfilePhoto(prepared.profile)).catch(() => {})

      if (existing && normalizeUsername((existing as any).username) !== prepared.username) await releaseUniqueIndex('USERNAME', (existing as any).username, uid)
      const existingEmail = normalizeEmail((existing as any).contact || (existing as any).email || '')
      if (existingEmail !== prepared.email) await releaseUniqueIndex('EMAIL', existingEmail, uid)

      emitUser(uid, 'profile')
      await syncProfileToRelationshipCaches(uid, prepared.profile).catch((err) => console.error('profile sync failed:', err))
      res.json({ ok: true, data: await getPublicProfileForRoute(uid, uid).catch(() => compactPublicProfile(uid, prepared.profile)) })
    } catch (err) {
      console.error('/api/v1/user/profile put error:', err)
      res.status(500).json({ error: 'put_failed' })
    }
  })

  router.get('/user/profile', async (req, res) => {
    try { res.json({ data: await getDoc(userPk(String(req.userId)), 'profile') }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.get('/user/profile/:uid', async (req, res) => {
    try {
      const requestedUid = String(req.params.uid)
      const data = await getPublicProfileForRoute(requestedUid, String(req.userId))
      return res.json({ data })
    } catch (err) {
      console.error('/api/v1/user/profile/:uid get error:', err)
      res.status(200).json({ data: null, partial: true })
    }
  })

  router.patch('/user/profile', async (req, res) => {
    try {
      const uid = String(req.userId)
      const existing = (await getDoc<Record<string, unknown>>(userPk(uid), 'profile')) || {}
      const patch = (req.body?.data && typeof req.body.data === 'object') ? req.body.data : {}
      const data = { ...existing, ...patch }
      const prepared = await prepareProfileWrite(uid, data, existing, patch)
      if (!prepared.ok) return res.status(prepared.status).json({ error: prepared.error, code: prepared.code })

      await putDoc(userPk(uid), 'profile', prepared.profile)
      publicProfileCache.delete(uid)
      scheduleDefaultCommunityHeal(uid, prepared.profile.name || prepared.profile.displayName || prepared.profile.username || '', getProfilePhoto(prepared.profile), 5000)

      if (normalizeUsername((existing as any).username) !== prepared.username) await releaseUniqueIndex('USERNAME', (existing as any).username, uid)
      const existingEmail = normalizeEmail((existing as any).contact || (existing as any).email || '')
      if (existingEmail !== prepared.email) await releaseUniqueIndex('EMAIL', existingEmail, uid)

      emitUser(uid, 'profile')
      await syncProfileToRelationshipCaches(uid, prepared.profile).catch((err) => console.error('profile sync failed:', err))
      res.json({ ok: true, data: await getPublicProfileForRoute(uid, uid).catch(() => compactPublicProfile(uid, prepared.profile)) })
    } catch (err) {
      console.error('/api/v1/user/profile patch error:', err)
      res.status(500).json({ error: 'patch_failed' })
    }
  })

  router.delete('/user/profile', async (req, res) => {
    try {
      const uid = String(req.userId)
      const existing = await getDoc<any>(userPk(uid), 'profile').catch(() => null)
      const now = Date.now()
      const tombstone = {
        ...(existing || {}),
        id: uid,
        uid,
        accountClosed: true,
        deletedAt: now,
        updatedAt: now,
        name: 'Deleted user',
        displayName: 'Deleted user',
        username: '',
        bio: '',
        activity: null,
        photo: null,
        profilePhoto: null,
        photoURL: null,
        avatar: null,
        image: null,
        imageUrl: null,
        userPhoto: null,
        cover: null,
        coverImage: null,
        coverUrl: null,
        headerImage: null,
        banner: null,
        bannerImage: null,
        backgroundCover: null,
        sociallinks: {},
        socialorder: [],
        profileTheme: null
      }
      await putDoc(userPk(uid), 'profile', tombstone)
      publicProfileCache.delete(uid)
      if (existing?.username) await releaseUniqueIndex('USERNAME', existing.username, uid)
      if (existing?.contact || existing?.email) await releaseUniqueIndex('EMAIL', existing.contact || existing.email, uid)
      emitUser(uid, 'profile')
      await emitProfileUpdated(uid, tombstone).catch(() => {})
      res.json({ ok: true, closed: true })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.get('/user/by-username/:username', async (req, res) => {
    try {
      const uid = await getDoc<string>(`USERNAME#${normalizeUsername(req.params.username)}`, 'uid')
      const profile = uid ? await getDoc<any>(userPk(uid), 'profile') : null
      res.json({ data: uid && profile ? publicProfileFromStored(String(uid), profile) : null })
    } catch { res.status(500).json({ error: 'lookup_failed' }) }
  })

  router.get('/user/by-email/:email', async (req, res) => {
    try {
      const uid = await getDoc<string>(`EMAIL#${normalizeEmail(req.params.email)}`, 'uid')
      const profile = uid ? await getDoc<any>(userPk(uid), 'profile') : null
      res.json({ data: uid && profile ? publicProfileFromStored(String(uid), profile) : null })
    } catch { res.status(500).json({ error: 'lookup_failed' }) }
  })

  router.get('/user/check-username/:username', async (req, res) => {
    try {
      const username = normalizeUsername(req.params.username)
      if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'invalid_username', code: 'auth/invalid-username', available: false, exists: false })
      const uid = await getDoc<string>(`USERNAME#${username}`, 'uid')
      const available = !uid || String(uid) === String(req.userId || '')
      res.json({ available, exists: !available })
    }
    catch { res.status(500).json({ error: 'check_failed' }) }
  })

  router.get('/user/check-email/:email', async (req, res) => {
    try {
      const email = normalizeEmail(req.params.email)
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email', code: 'auth/invalid-email', available: false, exists: false })
      const uid = await getDoc<string>(`EMAIL#${email}`, 'uid')
      const available = !uid || String(uid) === String(req.userId || '')
      res.json({ available, exists: !available })
    }
    catch { res.status(500).json({ error: 'check_failed' }) }
  })

  router.get('/users', async (req, res) => {
    try {
      const rawQ = String(req.query.q || '').trim()
      const data = await searchUsersForDiscover(rawQ, 50)
      res.json({ data })
    } catch (err) {
      console.error('/api/v1/users error:', err)
      res.status(500).json({ error: 'list_failed' })
    }
  })

  router.get('/admin/all-reelms', async (req, res) => {
    if (req.userId !== env.REELMS_MODERATION_UID) return res.status(403).json({ error: 'forbidden' })
    try {
      const items = await scanByPkPrefix('REELM#')
      const map: Record<string, unknown> = {}
      for (const item of items) if (item.sk === 'meta' && item.data && (item.data as any).id) map[(item.data as any).id] = item.data
      res.json({ data: Object.values(map) })
    } catch { res.status(500).json({ error: 'scan_failed' }) }
  })

  router.get('/discovery/search', async (req, res) => {
    try {
      const uid = String(req.userId || '')
      const rawQ = String(req.query.q || '').trim()
      const q = rawQ.toLowerCase().replace(/^@+/, '')
      if (q && q.length < 2) return res.json({ data: { users: await searchUsersForDiscover(rawQ, 20), reelms: [] } })
      const [users, reelms] = await Promise.all([
        searchUsersForDiscover(rawQ, 50),
        searchReelmsForDiscover(rawQ, uid, 30)
      ])
      res.json({ data: { users, reelms } })
    } catch (err) {
      console.error('/api/v1/discovery/search error:', err)
      res.status(500).json({ error: 'discovery_search_failed' })
    }
  })

  router.get('/reelms/discover', async (req, res) => {
    try {
      const uid = String(req.userId || '')
      const rawQ = String(req.query.q || '').trim()
      const data = await searchReelmsForDiscover(rawQ, uid, 30)
      res.json({ data })
    } catch (err) {
      console.error('/api/v1/reelms/discover error:', err)
      res.status(500).json({ error: 'discover_failed' })
    }
  })

  router.post('/reelms/:reelmId/request-join', async (req, res) => {
    try {
      const uid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })
      if (await isBannedFromReelm(reelmId, uid).catch(() => false)) return res.status(403).json({ error: 'reelm_banned', code: 'reelm/banned', ban: await getBanEntry(reelmId, uid).catch(() => null) })
      if (reelmId === DEFAULT_REELM_ID) {
        await autoJoinDefaultReelm(uid, undefined, undefined, { force: true })
        const reelm = ((await getDoc<any[]>(userPk(uid), 'reelms').catch(() => [])) || []).find((r: any) => String(r?.id) === DEFAULT_REELM_ID) || null
        emitUser(uid, 'reelms')
        emitReelm(DEFAULT_REELM_ID, 'members')
        return res.json({ data: { joined: true, reelm } })
      }
      const pk = reelmPk(reelmId)
      const meta = await getDoc<any>(pk, 'meta')
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (await isBannedFromReelm(reelmId, uid).catch(() => false)) return res.status(403).json({ error: 'reelm_banned', code: 'reelm/banned', ban: await getBanEntry(reelmId, uid).catch(() => null) })
      if (await isReelmMember(uid, reelmId)) return res.json({ data: { joined: true, pending: false } })
      const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
      const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
      const joinMode = meta.joinMode || 'request'
      const pendingInvite = await getPendingInvite(reelmId, uid).catch(() => null)
      const inviteCanAutoJoin = pendingInvite?.bypassApproval === true
      if (joinMode === 'open' || meta.autoJoinOnInvite === true || inviteCanAutoJoin) {
        const memberRole = getDefaultMemberRole(roles)
        const members = await ensureMember(reelmId, uid, memberRole?.id ? [memberRole.id] : [])
        const full = toClientReelm(meta, structure, roles, members)
        await upsertUserReelm(uid, full)
        await cleanupJoinRequest(reelmId, uid).catch(() => {})
        await cleanupInvite(reelmId, uid).catch(() => {})
        void syncReelmMemberCopies(reelmId).catch(() => {})
        emitUser(uid, 'reelms'); emitReelm(reelmId, 'members')
        io.to(`reelm:${reelmId}`).emit('reelm:member-joined', { reelmId, userId: uid })
        const joinedProfile = await getSenderProfile(uid).catch(() => ({ name: 'Someone' }))
        if (meta.ownerId && String(meta.ownerId) !== uid) await pushUserNotification(String(meta.ownerId), `${joinedProfile.name || 'Someone'} joined ${meta.name}.`, { type: 'reelm', reelmId })
        return res.json({ data: { joined: true, pending: false, reelm: full } })
      }
      const profile = await getUserPublicProfile(uid)
      const reqEntry = { id: uid, userId: uid, name: profile.name || profile.username || 'User', username: profile.username || '', photo: getProfilePhoto(profile), requestedAt: Date.now(), invitedBy: pendingInvite?.invitedBy || null }
      const current = (await getDoc<any[]>(pk, 'join_requests').catch(() => [])) || []
      const alreadyPending = current.some((r: any) => String(r?.userId || r?.id || '') === uid)
      const next = [reqEntry, ...current.filter((r: any) => String(r?.userId || r?.id || '') !== uid)].slice(0, 200)
      await putDoc(pk, 'join_requests', next)
      emitReelm(reelmId, 'join_requests')
      await emitReelmManagers(reelmId, 'join_requests').catch(() => {})
      await cleanupInvite(reelmId, uid).catch(() => {})
      const requestSuffix = pendingInvite?.invitedBy ? ' after accepting an invite' : ''
      if (!alreadyPending && meta.ownerId) await pushUserNotification(String(meta.ownerId), `${reqEntry.name} wants to join ${meta.name}${requestSuffix}.`, { type: 'reelm_join_requests', reelmId })
      res.json({ data: { joined: false, pending: true, reelmId, name: meta.name } })
    } catch (err) { console.error('/api/v1/reelms/request-join error:', err); res.status(500).json({ error: 'request_join_failed' }) }
  })

  router.post('/reelms/:reelmId/approve-join', async (req, res) => {
    try {
      const ownerUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!await canUseReelmPermission(ownerUid, reelmId, 'manageJoinRequests')) return res.status(403).json({ error: 'forbidden' })
      const requesterId = String(req.body?.requesterId || '')
      if (!requesterId || requesterId === ownerUid) return res.status(400).json({ error: 'invalid_requester' })
      const pk = reelmPk(reelmId)
      const meta = await getDoc<any>(pk, 'meta')
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (await isBannedFromReelm(reelmId, requesterId).catch(() => false)) return res.status(403).json({ error: 'reelm_banned', code: 'reelm/banned', ban: await getBanEntry(reelmId, requesterId).catch(() => null) })
      const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
      const memberRole = getDefaultMemberRole(roles)
      const members = await ensureMember(reelmId, requesterId, memberRole?.id ? [memberRole.id] : [])
      const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
      const full = toClientReelm(meta, structure, roles, members)
      await upsertUserReelm(requesterId, full)
      const current = (await getDoc<any[]>(pk, 'join_requests').catch(() => [])) || []
      const nextRequests = current.filter((r: any) => String(r?.userId || r?.id || '') !== requesterId)
      await putDoc(pk, 'join_requests', nextRequests)
      await cleanupInvite(reelmId, requesterId).catch(() => {})
      void syncReelmMemberCopies(reelmId).catch(() => {})
      emitUser(requesterId, 'reelms'); emitReelm(reelmId, 'members'); emitReelm(reelmId, 'join_requests')
      await emitReelmManagers(reelmId, 'join_requests').catch(() => {})
      io.to(`u:${requesterId}`).emit('reelm:join-request-approved', { reelmId, name: meta.name || null })
      io.to(`reelm:${reelmId}`).emit('reelm:member-joined', { reelmId, userId: requesterId })
      await pushUserNotification(requesterId, `Your request to join ${meta.name} was accepted.`, { type: 'reelm', reelmId, channelId: full.announcementChannelId || full.categories?.[0]?.channels?.[0]?.id })
      res.json({ data: { joined: true, reelm: { ...full, joinRequests: nextRequests } } })
    } catch (err) { console.error('/api/v1/reelms/approve-join error:', err); res.status(500).json({ error: 'approve_join_failed' }) }
  })

  router.post('/reelms/:reelmId/reject-join', async (req, res) => {
    try {
      const ownerUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!await canUseReelmPermission(ownerUid, reelmId, 'manageJoinRequests')) return res.status(403).json({ error: 'forbidden' })
      const requesterId = String(req.body?.requesterId || '')
      const pk = reelmPk(reelmId)
      const current = (await getDoc<any[]>(pk, 'join_requests').catch(() => [])) || []
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      await putDoc(pk, 'join_requests', current.filter((r: any) => String(r?.userId || r?.id || '') !== requesterId))
      emitReelm(reelmId, 'join_requests')
      await emitReelmManagers(reelmId, 'join_requests').catch(() => {})
      if (requesterId) {
        io.to(`u:${requesterId}`).emit('reelm:join-request-rejected', { reelmId, name: meta?.name || null })
        await pushUserNotification(requesterId, `Your request to join ${meta?.name || 'this Reelm'} was rejected.`, { type: 'reelm_join_request_rejected', reelmId }).catch(() => {})
      }
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'reject_join_failed' }) }
  })

  router.post('/reelms/:reelmId/invite', async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      const targetUid = String(req.body?.targetUid || req.body?.userId || '')
      if (!targetUid) return res.status(400).json({ error: 'missing_target' })
      if (targetUid === actorUid) return res.status(400).json({ error: 'cannot_invite_self' })
      const pk = reelmPk(reelmId)
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      const actorCanManage = await canManageReelm(actorUid, reelmId).catch(() => false)
      const actorCanInvite = actorCanManage || await canUseReelmPermission(actorUid, reelmId, 'manageInvites').catch(() => false)
      const actorIsMember = actorCanInvite || await isReelmMember(actorUid, reelmId).catch(() => false)
      if (!actorCanInvite && (!actorIsMember || meta.memberInvitesEnabled === false)) return res.status(403).json({ error: 'forbidden' })
      if (await isBannedFromReelm(reelmId, targetUid).catch(() => false)) return res.status(403).json({ error: 'reelm_banned', code: 'reelm/banned', ban: await getBanEntry(reelmId, targetUid).catch(() => null) })
      if (await isReelmMember(targetUid, reelmId).catch(() => false)) return res.json({ data: { alreadyMember: true } })

      const actor = await getSenderProfile(actorUid).catch(() => ({ name: 'Someone' }))
      const now = Date.now()
      const bypassApproval = actorCanManage || meta.autoJoinOnInvite === true || meta.memberInviteMode === 'auto'
      const current = (await getDoc<any[]>(pk, 'invites').catch(() => [])) || []
      const invite = {
        id: targetUid,
        userId: targetUid,
        targetUid,
        invitedBy: actorUid,
        invitedByName: actor.name || 'Someone',
        bypassApproval,
        createdAt: now
      }
      const next = [invite, ...current.filter((item: any) => String(item?.targetUid || item?.userId || item?.id || '') !== targetUid)].slice(0, 500)
      await putDoc(pk, 'invites', next)

      const approvalNote = bypassApproval ? '' : ' The server owner/admin will approve it after you accept.'
      await pushUserNotification(targetUid, `${actor.name || 'Someone'} invited you to ${meta.name}.${approvalNote}`, { type: 'reelm_invite', reelmId, invitedBy: actorUid, bypassApproval })
      emitUser(targetUid, 'notifications')
      res.json({ data: { invited: true, reelmId, targetUid, bypassApproval } })
    } catch (err) {
      console.error('/api/v1/reelms/invite error:', err)
      res.status(500).json({ error: 'invite_failed' })
    }
  })


  router.post('/reelms/:reelmId/accept-invite', async (req, res) => {
    try {
      const uid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })
      const result = await acceptInviteForUser(reelmId, uid)
      if (result.status >= 400) return res.status(result.status).json(result.data)
      res.status(result.status).json({ data: result.data })
    } catch (err) {
      console.error('/api/v1/reelms/accept-invite error:', err)
      res.status(500).json({ error: 'accept_invite_failed' })
    }
  })

  router.post('/reelms/:reelmId/reject-invite', async (req, res) => {
    try {
      const uid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })
      await cleanupInvite(reelmId, uid).catch(() => {})
      res.json({ data: { rejected: true, reelmId } })
    } catch (err) {
      console.error('/api/v1/reelms/reject-invite error:', err)
      res.status(500).json({ error: 'reject_invite_failed' })
    }
  })

  router.get('/reelms/:reelmId/ban-list', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId || '')
      if (!await canUseReelmPermission(String(req.userId), reelmId, 'manageModeration')) return res.status(403).json({ error: 'forbidden' })
      res.json({ data: await getBanList(reelmId) })
    } catch { res.status(500).json({ error: 'ban_list_failed' }) }
  })

  router.post('/reelms/:reelmId/ban', async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      const targetUid = String(req.body?.targetUid || req.body?.userId || '')
      const reason = String(req.body?.reason || req.body?.message || '').trim().slice(0, 320)
      let banMessage = reason
      if (!targetUid) return res.status(400).json({ error: 'missing_target' })
      if (targetUid === actorUid) return res.status(400).json({ error: 'cannot_ban_self' })
      if (!await canUseReelmPermission(actorUid, reelmId, 'manageModeration')) return res.status(403).json({ error: 'forbidden' })
      const pk = reelmPk(reelmId)
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (!banMessage) banMessage = `You were banned from ${meta.name || 'this Reelm'}.`
      if (String(meta.ownerId || '') === targetUid) return res.status(409).json({ error: 'cannot_ban_owner' })
      if (targetUid === env.REELMS_MODERATION_UID) return res.status(409).json({ error: 'cannot_ban_protected' })
      if (!await canManageReelm(actorUid, reelmId).catch(() => false)) {
        const [membersForGuard, rolesForGuard] = await Promise.all([
          getDoc<any[]>(pk, 'members').catch(() => []),
          getDoc<any[]>(pk, 'roles').catch(() => [])
        ])
        const protectedRoleIds = new Set((rolesForGuard || []).filter(isProtectedRole).map((role: any) => String(role?.id || '')).filter(Boolean))
        const targetMember = (membersForGuard || []).find((member: any) => memberUserId(member) === targetUid)
        if (Array.isArray(targetMember?.roleIds) && targetMember.roleIds.map(String).some((id: string) => protectedRoleIds.has(id))) return res.status(409).json({ error: 'cannot_ban_protected' })
      }

      const profile = await getUserPublicProfile(targetUid).catch(() => ({ name: 'User', username: '', photo: null }))
      const currentBanList = await getBanList(reelmId)
      const banEntry = {
        id: targetUid,
        userId: targetUid,
        name: profile.name || profile.username || 'User',
        username: profile.username || '',
        photo: getProfilePhoto(profile),
        reason,
        message: banMessage,
        serverName: meta.name || 'Reelm',
        bannedBy: actorUid,
        bannedAt: Date.now()
      }
      const nextBanList = [banEntry, ...currentBanList.filter((entry: any) => String(entry?.userId || entry?.id || '') !== targetUid)].slice(0, 2000)
      await putDoc(pk, 'ban_list', nextBanList)
      const nextTimeoutList = (await getTimeoutList(reelmId)).filter((entry: any) => String(entry?.userId || entry?.id || '') !== targetUid)
      await putDoc(pk, 'timeout_list', nextTimeoutList).catch(() => {})

      const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
      const nextMembers = members.filter((member: any) => memberUserId(member) !== targetUid)
      if (nextMembers.length !== members.length) await putDoc(pk, 'members', nextMembers)
      await revokeReelmAccess(reelmId, targetUid, 'banned', meta.name || undefined)
      void syncReelmMemberCopies(reelmId).catch(() => {})
      emitReelm(reelmId, 'members')
      emitReelm(reelmId, 'ban_list')
      emitReelm(reelmId, 'timeout_list')
      await emitReelmManagers(reelmId, 'ban_list').catch(() => {})
      await emitReelmManagers(reelmId, 'timeout_list').catch(() => {})
      await emitReelmManagers(reelmId, 'join_requests').catch(() => {})
      io.to(`reelm:${reelmId}`).emit('reelm:member-removed', { reelmId, userId: targetUid, banned: true })
      io.to(`u:${targetUid}`).emit('reelm:banned', { reelmId, name: meta.name || null, message: banMessage })
      await pushUserNotification(targetUid, banMessage, { type: 'reelm_banned', reelmId, message: banMessage }).catch(() => {})
      res.json({ data: { banned: true, banList: nextBanList } })
    } catch (err) {
      console.error('/api/v1/reelms/ban error:', err)
      res.status(500).json({ error: 'ban_failed' })
    }
  })


  router.post('/reelms/:reelmId/remove-member', async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      const targetUid = String(req.body?.targetUid || req.body?.userId || '')
      const reason = String(req.body?.reason || req.body?.message || '').trim().slice(0, 320)
      if (!targetUid) return res.status(400).json({ error: 'missing_target' })
      if (targetUid === actorUid) return res.status(400).json({ error: 'cannot_remove_self' })
      if (!await canUseReelmPermission(actorUid, reelmId, 'manageMembers')) return res.status(403).json({ error: 'forbidden' })
      const pk = reelmPk(reelmId)
      const [meta, members, roles] = await Promise.all([
        getDoc<any>(pk, 'meta').catch(() => null),
        getDoc<any[]>(pk, 'members').catch(() => []),
        getDoc<any[]>(pk, 'roles').catch(() => [])
      ])
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (String(meta.ownerId || '') === targetUid) return res.status(409).json({ error: 'cannot_remove_owner' })
      if (targetUid === env.REELMS_MODERATION_UID) return res.status(409).json({ error: 'cannot_remove_protected' })

      const actorState = await getActorRoleState(actorUid, reelmId)
      const targetMember = (members || []).find((member: any) => memberUserId(member) === targetUid)
      if (!targetMember) return res.json({ data: { removed: true, members: filterMembersForClient(members || [], await getBanList(reelmId)) } })
      const protectedRoleIds = new Set((roles || []).filter(isProtectedRole).map((role: any) => String(role?.id || '')).filter(Boolean))
      const targetProtected = Array.isArray(targetMember?.roleIds) && targetMember.roleIds.map(String).some((id: string) => protectedRoleIds.has(id))
      if (targetProtected && actorState?.canManageFullRoles !== true) return res.status(409).json({ error: 'cannot_remove_protected' })

      const nextMembers = (members || []).filter((member: any) => memberUserId(member) !== targetUid)
      await putDoc(pk, 'members', nextMembers)
      await revokeReelmAccess(reelmId, targetUid, 'removed', meta.name || undefined)
      void syncReelmMemberCopies(reelmId).catch(() => {})
      emitReelm(reelmId, 'members')
      io.to(`reelm:${reelmId}`).emit('reelm:member-removed', { reelmId, userId: targetUid, reason: reason || null })
      res.json({ data: { removed: true, members: filterMembersForClient(nextMembers, await getBanList(reelmId)) } })
    } catch (err) {
      console.error('/api/v1/reelms/remove-member error:', err)
      res.status(500).json({ error: 'remove_member_failed' })
    }
  })

  router.post('/reelms/:reelmId/unban', async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      const targetUid = String(req.body?.targetUid || req.body?.userId || '')
      if (!targetUid) return res.status(400).json({ error: 'missing_target' })
      if (!await canUseReelmPermission(actorUid, reelmId, 'manageModeration')) return res.status(403).json({ error: 'forbidden' })
      const pk = reelmPk(reelmId)
      const currentBanList = await getBanList(reelmId)
      const nextBanList = currentBanList.filter((entry: any) => String(entry?.userId || entry?.id || '') !== targetUid)
      await putDoc(pk, 'ban_list', nextBanList)
      emitReelm(reelmId, 'ban_list')
      emitReelm(reelmId, 'timeout_list')
      await emitReelmManagers(reelmId, 'ban_list').catch(() => {})
      await emitReelmManagers(reelmId, 'timeout_list').catch(() => {})
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      io.to(`u:${targetUid}`).emit('reelm:ban-removed', { reelmId, name: meta?.name || null })
      await pushUserNotification(targetUid, `You were unbanned from ${meta?.name || 'this Reelm'}.`, { type: 'reelm_unban', reelmId }).catch(() => {})
      res.json({ data: { unbanned: true, banList: nextBanList } })
    } catch { res.status(500).json({ error: 'unban_failed' }) }
  })



  router.get('/reelms/:reelmId/timeout-list', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId || '')
      if (!await canUseReelmPermission(String(req.userId), reelmId, 'manageModeration')) return res.status(403).json({ error: 'forbidden' })
      res.json({ data: await getTimeoutList(reelmId) })
    } catch { res.status(500).json({ error: 'timeout_list_failed' }) }
  })

  router.post('/reelms/:reelmId/timeout', async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      const targetUid = String(req.body?.targetUid || req.body?.userId || '')
      const rawDurationMs = Number(req.body?.durationMs || 0)
      const rawMinutes = Number(req.body?.minutes || 0)
      const durationMs = Math.max(60_000, Math.min(1000 * 60 * 60 * 24 * 28, Number.isFinite(rawDurationMs) && rawDurationMs > 0 ? rawDurationMs : (Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes * 60_000 : 10 * 60_000)))
      const reason = String(req.body?.reason || req.body?.message || '').trim().slice(0, 320)
      if (!targetUid) return res.status(400).json({ error: 'missing_target' })
      if (targetUid === actorUid) return res.status(400).json({ error: 'cannot_timeout_self' })
      if (!await canUseReelmPermission(actorUid, reelmId, 'manageModeration')) return res.status(403).json({ error: 'forbidden' })
      const pk = reelmPk(reelmId)
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (String(meta.ownerId || '') === targetUid) return res.status(409).json({ error: 'cannot_timeout_owner' })
      if (targetUid === env.REELMS_MODERATION_UID) return res.status(409).json({ error: 'cannot_timeout_protected' })
      if (!await isReelmMember(targetUid, reelmId).catch(() => false)) return res.status(404).json({ error: 'member_not_found' })
      if (!await canManageReelm(actorUid, reelmId).catch(() => false)) {
        const [membersForGuard, rolesForGuard] = await Promise.all([
          getDoc<any[]>(pk, 'members').catch(() => []),
          getDoc<any[]>(pk, 'roles').catch(() => [])
        ])
        const protectedRoleIds = new Set((rolesForGuard || []).filter(isProtectedRole).map((role: any) => String(role?.id || '')).filter(Boolean))
        const targetMember = (membersForGuard || []).find((member: any) => memberUserId(member) === targetUid)
        if (Array.isArray(targetMember?.roleIds) && targetMember.roleIds.map(String).some((id: string) => protectedRoleIds.has(id))) return res.status(409).json({ error: 'cannot_timeout_protected' })
      }

      const profile = await getUserPublicProfile(targetUid).catch(() => ({ name: 'User', username: '', photo: null }))
      const now = Date.now()
      const expiresAt = now + durationMs
      const timeoutMessage = reason || `You are timed out in ${meta.name || 'this Reelm'} until ${new Date(expiresAt).toLocaleString('en-US')}.`
      const entry = {
        id: targetUid,
        userId: targetUid,
        name: profile.name || profile.username || 'User',
        username: profile.username || '',
        photo: getProfilePhoto(profile),
        reason,
        message: timeoutMessage,
        serverName: meta.name || 'Reelm',
        timedOutBy: actorUid,
        createdAt: now,
        expiresAt,
        durationMs
      }
      const current = await getTimeoutList(reelmId)
      const next = [entry, ...current.filter((item: any) => String(item?.userId || item?.id || '') !== targetUid)].slice(0, 2000)
      await putDoc(pk, 'timeout_list', next)
      await ejectUserFromReelmVoiceRooms(reelmId, targetUid, 'timeout').catch(() => {})
      emitReelm(reelmId, 'timeout_list')
      await emitReelmManagers(reelmId, 'timeout_list').catch(() => {})
      io.to(`u:${targetUid}`).emit('reelm:timeout', { reelmId, name: meta.name || null, timeout: entry })
      await pushUserNotification(targetUid, timeoutMessage, { type: 'reelm_timeout', reelmId, expiresAt, message: timeoutMessage }).catch(() => {})
      res.json({ data: { timedOut: true, timeoutList: next, timeout: entry } })
    } catch (err) {
      console.error('/api/v1/reelms/timeout error:', err)
      res.status(500).json({ error: 'timeout_failed' })
    }
  })

  router.post('/reelms/:reelmId/untimeout', async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      const targetUid = String(req.body?.targetUid || req.body?.userId || '')
      if (!targetUid) return res.status(400).json({ error: 'missing_target' })
      if (!await canUseReelmPermission(actorUid, reelmId, 'manageModeration')) return res.status(403).json({ error: 'forbidden' })
      const pk = reelmPk(reelmId)
      const current = await getTimeoutList(reelmId)
      const next = current.filter((entry: any) => String(entry?.userId || entry?.id || '') !== targetUid)
      await putDoc(pk, 'timeout_list', next)
      emitReelm(reelmId, 'timeout_list')
      await emitReelmManagers(reelmId, 'timeout_list').catch(() => {})
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      io.to(`u:${targetUid}`).emit('reelm:timeout-removed', { reelmId, name: meta?.name || null })
      await pushUserNotification(targetUid, `Your timeout in ${meta?.name || 'this Reelm'} was removed.`, { type: 'reelm_timeout_removed', reelmId }).catch(() => {})
      res.json({ data: { removed: true, timeoutList: next } })
    } catch { res.status(500).json({ error: 'untimeout_failed' }) }
  })

  router.post('/reelms/:reelmId/close', async (req, res) => {
    try {
      const uid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })
      if (reelmId === DEFAULT_REELM_ID) return res.status(403).json({ error: 'forbidden' })
      const pk = reelmPk(reelmId)
      const [meta, members] = await Promise.all([
        getDoc<any>(pk, 'meta').catch(() => null),
        getDoc<any[]>(pk, 'members').catch(() => [])
      ])
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      const actorState = await getActorRoleState(uid, reelmId)
      if (actorState?.isFullManager !== true) return res.status(403).json({ error: 'forbidden' })
      const confirmName = String(req.body?.confirmName || '').trim()
      const confirmed = req.body?.confirmed === true || req.body?.cooldownConfirmed === true
      if (!confirmed && (!confirmName || confirmName !== String(meta.name || '').trim())) return res.status(400).json({ error: 'confirmation_required', code: 'confirmation_required' })

      const memberIds = memberUserIds(members || [])
      await Promise.all(memberIds.map(memberId => removeUserReelmCopy(memberId, reelmId).catch(() => false)))
      await Promise.all([
        deleteDoc(pk, 'meta').catch(() => {}),
        deleteDoc(pk, 'structure').catch(() => {}),
        deleteDoc(pk, 'roles').catch(() => {}),
        deleteDoc(pk, 'members').catch(() => {}),
        deleteDoc(pk, 'join_requests').catch(() => {}),
        deleteDoc(pk, 'ban_list').catch(() => {}),
        deleteDoc(pk, 'timeout_list').catch(() => {}),
        deleteDoc(pk, 'invites').catch(() => {}),
        meta.code ? deleteDoc(`REELM_CODE#${normalizeCode(meta.code)}`, 'id').catch(() => {}) : Promise.resolve()
      ])
      io.to(`reelm:${reelmId}`).emit('reelm:closed', { reelmId, name: meta.name || null })
      for (const memberId of memberIds) {
        emitUser(memberId, 'reelms')
        if (memberId !== uid) await pushUserNotification(memberId, `${meta.name || 'A Reelm'} was closed by the server admin.`, { type: 'reelm_closed', reelmId }).catch(() => {})
      }
      res.json({ data: { closed: true, reelmId } })
    } catch (err) {
      console.error('/api/v1/reelms/close error:', err)
      res.status(500).json({ error: 'close_reelm_failed' })
    }
  })

  router.post('/reelms/:reelmId/leave', async (req, res) => {
    try {
      const uid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })
      const pk = reelmPk(reelmId)
      const meta = await getDoc<any>(pk, 'meta').catch(() => null)
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (String(meta.ownerId || '') === uid && reelmId !== DEFAULT_REELM_ID) return res.status(409).json({ error: 'owner_cannot_leave' })

      const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
      const nextMembers = members.filter((m: any) => memberUserId(m) !== uid)
      await putDoc(pk, 'members', nextMembers)

      await revokeReelmAccess(reelmId, uid, 'left', meta.name || undefined)
      void syncReelmMemberCopies(reelmId).catch(() => {})
      emitReelm(reelmId, 'members')
      io.to(`reelm:${reelmId}`).emit('reelm:member-left', { reelmId, userId: uid })
      res.json({ data: { left: true, reelmId } })
    } catch (err) {
      console.error('/api/v1/reelms/leave error:', err)
      res.status(500).json({ error: 'leave_reelm_failed' })
    }
  })

  router.get('/reelm/by-code/:code', async (req, res) => {
    try {
      const meta = await findReelmMetaByCode(req.params.code)
      if (!meta?.id) return res.json({ data: null })
      const structure = (await getDoc<any>(reelmPk(meta.id), 'structure').catch(() => null)) || { categories: [] }
      const roles = (await getDoc<any[]>(reelmPk(meta.id), 'roles').catch(() => [])) || []
      const members = (await getDoc<any[]>(reelmPk(meta.id), 'members').catch(() => [])) || []
      res.json({ data: toClientReelm(meta, structure, roles, members, { joined: false }) })
    } catch { res.status(500).json({ error: 'lookup_failed' }) }
  })

  router.post('/reelms/create', async (req, res) => {
    let reservedCodeForCleanup = ''
    try {
      const uid = String(req.userId)
      const input = req.body?.reelm || {}
      const id = String(input.id || Date.now()).trim()
      const name = String(input.name || '').trim().slice(0, 80)
      if (!id || !name) return res.status(400).json({ error: 'missing_fields' })
      if (!REELM_ID_RE.test(id)) return res.status(400).json({ error: 'invalid_reelm_id' })

      let code = normalizeCode(input.code || generateInviteCode())
      if (!/^[A-Z0-9-]{3,16}$/.test(code)) return res.status(400).json({ error: 'invalid_invite_code' })
      let codeReserved = await putDocIfAbsent(`REELM_CODE#${code}`, 'id', id)
      if (codeReserved) reservedCodeForCleanup = code
      if (!codeReserved && input.code) return res.status(409).json({ error: 'invite_code_exists' })
      for (let i = 0; !codeReserved && i < 8; i += 1) {
        code = generateInviteCode()
        codeReserved = await putDocIfAbsent(`REELM_CODE#${code}`, 'id', id)
        if (codeReserved) reservedCodeForCleanup = code
      }
      if (!codeReserved) return res.status(409).json({ error: 'invite_code_exists' })

      const requestedRoles = Array.isArray(input.roles) && input.roles.length ? input.roles : [
        { id: CUSTOM_ADMIN_ROLE_ID, name: 'Admin', color: '#f87171', position: 0, permissions: { ...FULL_MANAGER_PERMISSIONS } },
        { id: CUSTOM_MEMBERS_ROLE_ID, name: 'Members', color: '#60a5fa', position: 1, permissions: {} }
      ]
      const creator = await getUserPublicProfile(uid)
      const creatorMember = {
        userId: uid,
        userName: creator.name || creator.username || 'Owner',
        userPhoto: creator.photo || null,
        roleIds: [CUSTOM_ADMIN_ROLE_ID]
      }
      const membersInput = Array.isArray(input.members) ? input.members : []
      const requestedMembers = [creatorMember, ...membersInput.filter((m: any) => String(m?.userId) !== uid)]
      const canonicalCore = normalizeReelmCoreForClient(id, requestedRoles, requestedMembers)
      const roles = canonicalCore.roles
      const members = canonicalCore.members.map((member: any) => memberUserId(member) === uid ? { ...member, roleIds: [CUSTOM_ADMIN_ROLE_ID] } : member)
      const categories = Array.isArray(input.categories) ? input.categories : []
      const meta = {
        id,
        name,
        code,
        ownerId: uid,
        createdAt: Number(input.createdAt || Date.now()),
        updatedAt: Date.now(),
        announcementChannelId: input.announcementChannelId || null,
        image: sanitizeMediaUrl(input.image) || null,
        showInDiscover: input.showInDiscover === true,
        joinMode: input.joinMode === 'open' ? 'open' : 'request',
        autoJoinOnInvite: input.autoJoinOnInvite === true,
        memberInvitesEnabled: input.memberInvitesEnabled !== false,
        memberInviteMode: input.memberInviteMode === 'auto' ? 'auto' : 'request',
        ageRating: input.ageRating === 'adults' ? 'adults' : 'under18'
      }
      const pk = reelmPk(id)
      const createdMeta = await putDocIfAbsent(pk, 'meta', meta)
      if (!createdMeta) {
        await deleteDoc(`REELM_CODE#${code}`, 'id').catch(() => {})
        reservedCodeForCleanup = ''
        return res.status(409).json({ error: 'reelm_id_exists' })
      }
      await putDoc(pk, 'roles', roles)
      await putDoc(pk, 'members', members)
      await putDoc(pk, 'structure', { categories })

      const full = toClientReelm(meta, { categories }, roles, members)
      reservedCodeForCleanup = ''
      await upsertUserReelm(uid, full)
      emitUser(uid, 'reelms')
      ;['meta', 'roles', 'members', 'structure'].forEach((sk) => emitReelm(id, sk))
      res.json({ data: full })
    } catch (err) {
      if (reservedCodeForCleanup) await deleteDoc(`REELM_CODE#${reservedCodeForCleanup}`, 'id').catch(() => {})
      console.error('/api/v1/reelms/create error:', err)
      res.status(500).json({ error: 'create_reelm_failed' })
    }
  })

  router.post('/reelms/join', async (req, res) => {
    try {
      const uid = String(req.userId)
      const code = normalizeCode(req.body?.code)
      if (!code) return res.status(400).json({ error: 'missing_code' })
      const meta = await findReelmMetaByCode(code)
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })
      if (await isBannedFromReelm(String(meta.id), uid).catch(() => false)) return res.status(403).json({ error: 'reelm_banned', code: 'reelm/banned', ban: await getBanEntry(String(meta.id), uid).catch(() => null) })
      if (String(meta.id) === DEFAULT_REELM_ID) await setDefaultReelmLeft(uid, false).catch(() => {})
      const pk = reelmPk(meta.id)
      const pendingInvite = await getPendingInvite(String(meta.id), uid).catch(() => null)
      const inviteCanAutoJoin = pendingInvite?.bypassApproval === true
      if (String(meta.id) !== DEFAULT_REELM_ID && meta.joinMode !== 'open' && meta.autoJoinOnInvite !== true && !inviteCanAutoJoin && !await isReelmMember(uid, String(meta.id))) {
        const profile = await getUserPublicProfile(uid)
        const reqEntry = { id: uid, userId: uid, name: profile.name || profile.username || 'User', username: profile.username || '', photo: getProfilePhoto(profile), requestedAt: Date.now(), invitedBy: pendingInvite?.invitedBy || null }
        const current = (await getDoc<any[]>(pk, 'join_requests').catch(() => [])) || []
        const next = [reqEntry, ...current.filter((r: any) => String(r?.userId || r?.id || '') !== uid)].slice(0, 200)
        await putDoc(pk, 'join_requests', next)
        emitReelm(String(meta.id), 'join_requests')
        await emitReelmManagers(String(meta.id), 'join_requests').catch(() => {})
        await cleanupInvite(String(meta.id), uid).catch(() => {})
        const requestSuffix = pendingInvite?.invitedBy ? ' after accepting an invite' : ''
        if (meta.ownerId) await pushUserNotification(String(meta.ownerId), `${reqEntry.name} wants to join ${meta.name}${requestSuffix}.`, { type: 'reelm_join_requests', reelmId: meta.id })
        return res.json({ data: { pending: true, reelmId: meta.id, name: meta.name } })
      }
      const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
      const memberRole = getDefaultMemberRole(roles)
      const members = await ensureMember(meta.id, uid, memberRole?.id ? [memberRole.id] : [])
      const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
      const full = toClientReelm(meta, structure, roles, members)
      await upsertUserReelm(uid, full)
      await cleanupJoinRequest(String(meta.id), uid).catch(() => {})
      await cleanupInvite(String(meta.id), uid).catch(() => {})
      void syncReelmMemberCopies(meta.id).catch(() => {})
      emitUser(uid, 'reelms')
      emitReelm(meta.id, 'members')
      io.to(`reelm:${meta.id}`).emit('reelm:member-joined', { reelmId: meta.id, userId: uid })
      const joinedProfile = await getSenderProfile(uid).catch(() => ({ name: 'Someone' }))
      if (meta.ownerId && String(meta.ownerId) !== uid) await pushUserNotification(String(meta.ownerId), `${joinedProfile.name || 'Someone'} joined ${meta.name}.`, { type: 'reelm', reelmId: meta.id })
      res.json({ data: full })
    } catch (err) {
      console.error('/api/v1/reelms/join error:', err)
      res.status(500).json({ error: 'join_reelm_failed' })
    }
  })

  router.get('/reelm/:reelmId/core', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId)
      const uid = String(req.userId)
      const isMember = await isReelmMember(uid, reelmId)
      if (!isMember) return res.status(403).json({ error: 'forbidden' })

      const actorState = await getActorRoleState(uid, reelmId).catch(() => null)
      const canReadJoinRequests = actorHasPermission(actorState, 'manageJoinRequests')
      const canReadModeration = actorHasPermission(actorState, 'manageModeration')
      const pk = reelmPk(reelmId)
      const [joinRequests, rawBanList, timeoutList] = await Promise.all([
        canReadJoinRequests ? getDoc<any[]>(pk, 'join_requests').catch(() => []) : Promise.resolve([]),
        getDoc<any[]>(pk, 'ban_list').catch(() => []),
        canReadModeration ? getDoc<any[]>(pk, 'timeout_list').catch(() => []) : Promise.resolve([])
      ])
      const meta = actorState?.meta || null
      if (!meta) return res.status(404).json({ error: 'not_found' })
      const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
      const safeBanList = Array.isArray(rawBanList) ? rawBanList : []
      const visibleMembers = filterMembersForClient(actorState?.members || [], safeBanList)
      const normalized = normalizeReelmCoreForClient(reelmId, actorState?.roles || [], visibleMembers)
      normalized.members = await hydrateMembersForClient(normalized.members)
      res.json({
        data: toClientReelm(meta, structure, normalized.roles, normalized.members, {
          joinRequests: Array.isArray(joinRequests) ? joinRequests : [],
          banList: canReadModeration ? safeBanList : [],
          timeoutList: Array.isArray(timeoutList) ? timeoutList : []
        })
      })
    } catch (err) {
      console.error('/api/v1/reelm/:reelmId/core error:', err)
      res.status(500).json({ error: 'get_core_failed' })
    }
  })

  router.get('/reelm/:reelmId/doc/:sk', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId)
      const uid = String(req.userId)
      const sk = decodeURIComponent(req.params.sk)
      const pk = reelmPk(reelmId)
      if (MANAGER_CORE_DOC_KEYS.has(sk)) {
        const permission = sk === 'join_requests' ? 'manageJoinRequests' : 'manageModeration'
        const actorState = await getActorRoleState(uid, reelmId).catch(() => null)
        if (!actorHasPermission(actorState, permission as ReelmPermissionKey)) return res.status(403).json({ error: 'forbidden' })
        return res.json({ data: await getDoc(pk, sk) })
      }
      if (PUBLIC_CORE_DOC_KEYS.has(sk)) {
        const actorState = await getActorRoleState(uid, reelmId).catch(() => null)
        const isMember = Boolean(actorState?.isOwner || actorState?.isFullManager || (actorState?.members || []).some((m: any) => memberUserId(m) === uid))
        if (!isMember) return res.status(403).json({ error: 'forbidden' })
        if (sk === 'roles' || sk === 'members') {
          const rawBanList = await getDoc<any[]>(pk, 'ban_list').catch(() => [])
          const visibleMembers = filterMembersForClient(actorState?.members || [], Array.isArray(rawBanList) ? rawBanList : [])
          const normalized = normalizeReelmCoreForClient(reelmId, actorState?.roles || [], visibleMembers)
          if (sk === 'members') normalized.members = await hydrateMembersForClient(normalized.members)
          return res.json({ data: sk === 'roles' ? normalized.roles : normalized.members })
        }
        return res.json({ data: await getDoc(pk, sk) })
      }
      if (!await isReelmMember(uid, reelmId)) return res.status(403).json({ error: 'forbidden' })
      res.json({ data: await getDoc(pk, sk) })
    } catch (err) {
      console.error('/api/v1/reelm/:reelmId/doc/:sk get error:', err)
      res.status(500).json({ error: 'get_failed' })
    }
  })


  router.put('/reelm/:reelmId/doc/:sk', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId)
      const sk = decodeURIComponent(req.params.sk)
      const isCoreDoc = ['meta', 'structure', 'roles', 'members'].includes(sk)
      const permissionByDoc: Record<string, ReelmPermissionKey> = {
        meta: 'manageOverview',
        structure: 'manageChannels',
        roles: 'manageRoles',
        members: 'manageMembers',
        join_requests: 'manageJoinRequests',
        ban_list: 'manageModeration',
        timeout_list: 'manageModeration'
      }
      const managerOnlyDoc = isCoreDoc || ['join_requests', 'ban_list', 'timeout_list'].includes(sk)
      const actorState = managerOnlyDoc ? await getActorRoleState(String(req.userId), reelmId) : null
      const allowed = managerOnlyDoc
        ? actorHasPermission(actorState, permissionByDoc[sk] || 'manageReelm') || (sk === 'members' && actorHasPermission(actorState, 'manageRoles'))
        : await isReelmMember(String(req.userId), reelmId)
      if (!allowed) return res.status(403).json({ error: 'forbidden' })
      if (!managerOnlyDoc) {
        const timeout = await getActiveReelmTimeout(String(req.userId), reelmId).catch(() => null)
        if (timeout) return res.status(403).json({ error: 'reelm_timeout', code: 'reelm/timeout', timeout })
      }

      const pk = reelmPk(reelmId)
      const existingMeta = actorState?.meta || (await getDoc<any>(pk, 'meta').catch(() => null)) || {}
      const previousMembers = sk === 'members' ? ((actorState?.members || await getDoc<any[]>(pk, 'members').catch(() => [])) || []) : []
      let incomingData = req.body?.data
      const allowMemberRemoval = req.body?.allowMemberRemoval === true
      if (reelmId === DEFAULT_REELM_ID && sk === 'meta') {
        const hasIncomingImage = incomingData && Object.prototype.hasOwnProperty.call(incomingData, 'image')
        incomingData = {
          ...existingMeta,
          ...incomingData,
          id: DEFAULT_REELM_ID,
          name: 'Reelms Community',
          code: 'REELMS',
          isDefault: true,
          image: hasIncomingImage ? sanitizeMediaUrl(incomingData?.image) : sanitizeMediaUrl(existingMeta.image),
          communityArtLocked: existingMeta.communityArtLocked === true
        }
      }
      if (sk === 'meta') {
        incomingData = sanitizeMetaUpdate(incomingData, existingMeta, actorState)
      }
      if (sk === 'roles') {
        const existingRoles = (actorState?.roles || await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
        incomingData = sanitizeRoles(Array.isArray(incomingData) ? incomingData : [], existingRoles, { actorCanManageFullRoles: actorState?.canManageFullRoles === true, reelmId })
      }
      if (sk === 'members') {
        const availableRoles = (actorState?.roles || await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
        const validRoleIds = new Set(availableRoles.map((role: any) => String(role?.id || '')).filter(Boolean))
        const protectedRoleIds = new Set(availableRoles.filter(isProtectedRole).map((role: any) => String(role?.id || '')).filter(Boolean))
        const managerRole = availableRoles.find(isManagerRole) || availableRoles[0] || null
        const managerRoleId = managerRole?.id ? String(managerRole.id) : ''
        const actorCanManageRoles = actorHasPermission(actorState, 'manageRoles')
        const actorCanManageMembers = actorHasPermission(actorState, 'manageMembers')
        const actorCanManageFullRoles = actorState?.canManageFullRoles === true
        const previousById = new Map<string, any>(previousMembers.map((member: any) => [memberUserId(member), member]))
        const memberHasProtectedRole = (member: any) => Array.isArray(member?.roleIds) && member.roleIds.map(String).some((id: string) => protectedRoleIds.has(id))
        const seen = new Set<string>()
        incomingData = (Array.isArray(incomingData) ? incomingData : [])
          .map((member: any) => ({
            ...member,
            userId: memberUserId(member),
            userName: String(member?.userName || member?.name || 'User').slice(0, 80),
            userPhoto: member?.userPhoto || member?.photo || null,
            roleIds: Array.isArray(member?.roleIds) ? Array.from(new Set(member.roleIds.map((id: any) => String(id)).filter((id: string) => !validRoleIds.size || validRoleIds.has(id)))) : []
          }))
          .filter((member: any) => {
            if (!member.userId || seen.has(member.userId)) return false
            seen.add(member.userId)
            return true
          })
          .slice(0, 2000)

        if (!actorCanManageMembers) {
          const incomingById = new Map<string, any>(incomingData.map((member: any) => [memberUserId(member), member]))
          incomingData = previousMembers.map((previous: any) => {
            const incoming = incomingById.get(memberUserId(previous))
            return incoming ? { ...previous, roleIds: (incoming as any).roleIds || [] } : previous
          })
        }

        if (!actorCanManageRoles) {
          incomingData = incomingData.map((member: any) => {
            const previous = previousById.get(memberUserId(member))
            return previous ? { ...member, roleIds: Array.isArray(previous?.roleIds) ? previous.roleIds : [] } : member
          })
        } else if (!actorCanManageFullRoles) {
          incomingData = incomingData.map((member: any) => {
            const previous = previousById.get(memberUserId(member))
            const previousProtected = Array.isArray(previous?.roleIds) ? previous.roleIds.map(String).filter((id: string) => protectedRoleIds.has(id)) : []
            const safeRoleIds = Array.isArray(member?.roleIds) ? member.roleIds.map(String).filter((id: string) => !protectedRoleIds.has(id)) : []
            return { ...member, roleIds: Array.from(new Set([...previousProtected, ...safeRoleIds])) }
          })
        }

        if (!actorCanManageFullRoles) {
          const protectedMemberIds = new Set<string>([String(existingMeta?.ownerId || ''), env.REELMS_MODERATION_UID].filter(Boolean))
          for (const previous of previousMembers) {
            const previousId = memberUserId(previous)
            if (!previousId) continue
            if (memberHasProtectedRole(previous)) protectedMemberIds.add(previousId)
            if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(previousId).catch(() => false)) protectedMemberIds.add(previousId)
          }
          const incomingIds = new Set(memberUserIds(incomingData))
          for (const previous of previousMembers) {
            const previousId = memberUserId(previous)
            if (!previousId || !protectedMemberIds.has(previousId) || incomingIds.has(previousId)) continue
            incomingData.unshift(previous)
            incomingIds.add(previousId)
          }
        }

        const ownerId = String(existingMeta?.ownerId || '')
        if (ownerId && reelmId !== DEFAULT_REELM_ID && !incomingData.some((member: any) => memberUserId(member) === ownerId)) {
          const ownerMember = previousMembers.find((member: any) => memberUserId(member) === ownerId)
          const ownerProfile = await getUserPublicProfile(ownerId).catch(() => null)
          incomingData.unshift(ownerMember ? {
            ...ownerMember,
            roleIds: managerRoleId ? Array.from(new Set([...(Array.isArray(ownerMember.roleIds) ? ownerMember.roleIds : []), managerRoleId].map(String))) : (Array.isArray(ownerMember.roleIds) ? ownerMember.roleIds : [])
          } : {
            userId: ownerId,
            userName: ownerProfile?.name || ownerProfile?.username || 'Owner',
            userPhoto: getProfilePhoto(ownerProfile || {}),
            roleIds: managerRoleId ? [managerRoleId] : []
          })
        }

        if (ownerId && managerRoleId) {
          incomingData = incomingData.map((member: any) => {
            if (memberUserId(member) !== ownerId) return member
            return { ...member, roleIds: Array.from(new Set([...(member.roleIds || []), managerRoleId].map(String))) }
          })
        }

        if (reelmId === DEFAULT_REELM_ID) {
          const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
          const adminRole = getDefaultManagerRole(roles)
          const adminRoleId = adminRole?.id ? String(adminRole.id) : ''

          if (adminRoleId) {
            incomingData = await Promise.all(incomingData.map(async (member: any) => {
              const memberUid = memberUserId(member)
              if (!memberUid || !await isCommunityAdminUid(memberUid).catch(() => false)) return member
              return {
                ...member,
                roleIds: Array.from(new Set([...(member.roleIds || []), adminRoleId].map(String)))
              }
            }))
          }
        }

        const previousIdsSet = new Set(memberUserIds(previousMembers))
        const ownerIdForInviteGuard = String(existingMeta?.ownerId || '')
        const attemptedAddedIds = memberUserIds(incomingData).filter((id) => !previousIdsSet.has(id))
        const directAddedIds = [] as string[]
        for (const addedId of attemptedAddedIds) {
          if (!addedId || addedId === ownerIdForInviteGuard || addedId === env.REELMS_MODERATION_UID) continue
          if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(addedId).catch(() => false)) continue
          directAddedIds.push(addedId)
        }
        if (directAddedIds.length) {
          incomingData = incomingData.filter((member: any) => !directAddedIds.includes(memberUserId(member)))
          const actor = await getSenderProfile(String(req.userId)).catch(() => ({ name: 'Someone' }))
          for (const addedId of directAddedIds) {
            if (await isBannedFromReelm(reelmId, addedId).catch(() => false)) continue
            await pushUserNotification(addedId, `${actor.name || 'Someone'} invited you to ${existingMeta?.name || 'this Reelm'}.`, { type: 'reelm_invite', reelmId, invitedBy: String(req.userId) }).catch(() => {})
          }
        }

        const bannedIds = new Set((await getBanList(reelmId)).map((entry: any) => String(entry?.userId || entry?.id || '')).filter(Boolean))
        hiddenSystemMemberIds().forEach((id) => bannedIds.add(id))
        if (reelmId === DEFAULT_REELM_ID) {
          for (const incomingId of memberUserIds(incomingData)) {
            if (incomingId && await hasLeftDefaultReelm(incomingId).catch(() => false)) bannedIds.add(incomingId)
          }
        }
        if (!allowMemberRemoval) {
          const incomingIds = new Set(memberUserIds(incomingData))
          for (const previous of previousMembers) {
            const previousId = memberUserId(previous)
            if (!previousId || incomingIds.has(previousId) || bannedIds.has(previousId)) continue
            incomingData.push(previous)
            incomingIds.add(previousId)
          }
        }
        if (bannedIds.size) {
          incomingData = incomingData.filter((member: any) => !bannedIds.has(memberUserId(member)))
        }
      }
      const emittedCoreKeys = [] as string[]
      if (sk === 'roles') {
        // Roles are edited by id. Never let a concurrent/stale members PUT write
        // an older roles document back over the freshly edited role names/colors.
        // Existing roles are read fresh from the store because actorState is
        // intentionally short-cached for fast permission checks.
        const existingRolesForWrite = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
        const existingMembersForWrite = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
        const sanitizedRoles = sanitizeRoles(Array.isArray(incomingData) ? incomingData : [], existingRolesForWrite, {
          actorCanManageFullRoles: actorState?.canManageFullRoles === true,
          reelmId
        })
        const normalizedCore = normalizeReelmCoreForClient(reelmId, sanitizedRoles, existingMembersForWrite)
        await putDoc(pk, 'roles', normalizedCore.roles)
        incomingData = normalizedCore.roles
        emittedCoreKeys.push('roles')
        // Only migrate member roleIds when the canonical ids actually changed.
        // This keeps member writes separate from role edits while still repairing
        // old role ids such as role-admin-<id> or role-member-<id> safely.
        if (JSON.stringify(existingMembersForWrite || []) !== JSON.stringify(normalizedCore.members || [])) {
          await putDoc(pk, 'members', normalizedCore.members)
          emittedCoreKeys.push('members')
        }
      } else if (sk === 'members') {
        // Member changes must not rewrite roles. That old cross-write was the
        // source of “role name/color saves then returns to old value” when the
        // client saved roles and members close together.
        const freshRolesForMembers = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
        const normalizedCore = normalizeReelmCoreForClient(reelmId, freshRolesForMembers, Array.isArray(incomingData) ? incomingData : [])
        await putDoc(pk, 'members', normalizedCore.members)
        incomingData = normalizedCore.members
        emittedCoreKeys.push('members')
      } else {
        await putDoc(pk, sk, incomingData)
      }
      if (isCoreDoc) void syncReelmMemberCopies(reelmId).catch(() => {})
      if (sk === 'members') {
        const previousIds = new Set(memberUserIds(previousMembers))
        const nextIds = new Set(memberUserIds(incomingData))
        const protectedIds = new Set([String(existingMeta?.ownerId || ''), env.REELMS_MODERATION_UID].filter(Boolean))
        const removedIds = Array.from(previousIds).filter((id) => !nextIds.has(id) && !protectedIds.has(id))
        const addedIds = Array.from(nextIds).filter((id) => !previousIds.has(id))
        await Promise.all(addedIds.map((id) => cleanupJoinRequest(reelmId, id).catch(() => null)))
        await Promise.all(removedIds.map((id) => revokeReelmAccess(reelmId, id, 'removed', existingMeta?.name || undefined).catch(() => null)))
        removedIds.forEach((id) => io.to(`reelm:${reelmId}`).emit('reelm:member-removed', { reelmId, userId: id }))
      }
      if (emittedCoreKeys.length) emittedCoreKeys.forEach((key) => emitReelm(reelmId, key))
      else emitReelm(reelmId, sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.get('/app/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      if (sk === 'reports' && req.userId !== env.REELMS_MODERATION_UID) return res.json({ data: [] })
      res.json({ data: await getDoc(APP_PK, sk) })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.put('/app/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      if (sk === 'reports' && req.userId !== env.REELMS_MODERATION_UID) return res.status(403).json({ error: 'forbidden' })
      await putDoc(APP_PK, sk, req.body?.data)
      emitApp(sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.get('/messages/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (access.ok === false) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      res.json({ data: items.map((i: any) => i.data).filter(Boolean) })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.post('/messages/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (access.ok === false) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      if (access.kind === 'moderation') return res.status(403).json({ error: 'forbidden' })
      if (access.kind === 'dm' && isSystemInboxDmKey(msgKey)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })
      if (access.kind === 'reelm') {
        const timeout = await getActiveReelmTimeout(String(req.userId), access.reelmId).catch(() => null)
        if (timeout) return res.status(403).json({ error: 'reelm_timeout', code: 'reelm/timeout', timeout })
      }

      if (access.kind === 'dm') {
        const me = String(req.userId)
        const other = access.participants.find((participant) => participant !== me) || ''
        const [myBlocked, otherBlocked] = await Promise.all([
          getDoc<any[]>(userPk(me), 'blocked').catch(() => []),
          getDoc<any[]>(userPk(other), 'blocked').catch(() => [])
        ])
        if ((myBlocked || []).some((b) => String(b?.id) === other) || (otherBlocked || []).some((b) => String(b?.id) === me)) {
          return res.status(403).json({ error: 'blocked' })
        }
      }

      const rawMessage = req.body?.message
      if (!rawMessage || typeof rawMessage !== 'object') return res.status(400).json({ error: 'invalid_message' })
      const message = await sanitizeMessageForWrite(String(req.userId), rawMessage)
      const ts = String(message.time || Date.now()).padStart(15, '0')
      const sk = `MSG#${ts}#${message.id}`
      await putDoc(chanPk(msgKey), sk, message)
      const payload = { msgKey, message }
      if (access.kind === 'reelm') {
        // Chained rooms are emitted as a union, so a client joined to both the
        // channel and the reelm receives this message once, not twice.
        io.to(`chan:${msgKey}`).to(`reelm:${access.reelmId}`).emit('reelms:message', payload)
      } else if (access.kind === 'dm') {
        const senderUid = String(req.userId)
        const participants = access.participants.map(String)
        await Promise.all(participants.map(async (participantUid) => {
          const peerUid = participants.find((id) => id !== participantUid) || senderUid
          await upsertDmChatForUser(participantUid, peerUid, message, participantUid === senderUid ? 0 : 1)
          io.to(`u:${participantUid}`).emit('reelms:message', payload)
        }))
        const recipientUid = participants.find((id) => id !== senderUid)
        if (recipientUid) {
          const sender = message.sender || await getUserPublicProfile(senderUid).catch(() => null)
          const senderName = sender?.name || sender?.displayName || sender?.username || 'Someone'
          const preview = String(message.text || message.mediaType || 'sent you a message').slice(0, 120)
          await pushUserNotification(recipientUid, `${senderName}: ${preview}`, { type: 'dm', chatId: msgKey, userId: senderUid }).catch(() => {})
        }
      } else {
        io.to(`chan:${msgKey}`).emit('reelms:message', payload)
      }
      res.json({ ok: true, data: message })
    } catch { res.status(500).json({ error: 'send_failed' }) }
  })


  router.delete('/messages/:msgKey', async (req, res) => {
    try {
      const uid = String(req.userId)
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(uid, msgKey)
      if (access.ok === false) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      if (access.kind === 'moderation') return res.status(403).json({ error: 'forbidden' })
      if (access.kind === 'dm' && isSystemInboxDmKey(msgKey)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      await Promise.all(items.map((item: any) => deleteDoc(chanPk(msgKey), item.sk)))
      const payload = { msgKey }
      io.to(`chan:${msgKey}`).emit('reelms:messages-cleared', payload)
      if (access.kind === 'reelm') io.to(`reelm:${access.reelmId}`).emit('reelms:messages-cleared', payload)
      res.json({ ok: true, deleted: items.length })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.delete('/messages/:msgKey/:msgId', async (req, res) => {
    try {
      const uid = String(req.userId)
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(uid, msgKey)
      if (access.ok === false) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      if (access.kind === 'dm' && isSystemInboxDmKey(msgKey)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })

      const msgId = req.params.msgId
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      const target = items.find((i: any) => (i.data as any)?.id == msgId)
      if (!target) return res.json({ ok: true })
      const data = target.data as any
      const authorId = String(data?.userId || data?.authorId || data?.sender?.id || '')
      if (uid !== env.REELMS_MODERATION_UID && authorId !== uid) return res.status(403).json({ error: 'forbidden' })

      await deleteDoc(chanPk(msgKey), target.sk)
      const payload = { msgKey, msgId }
      io.to(`chan:${msgKey}`).emit('reelms:message-deleted', payload)
      if (access.kind === 'reelm') io.to(`reelm:${access.reelmId}`).emit('reelms:message-deleted', payload)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.get('/reactions/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (access.ok === false) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      res.json({ data: (await getDoc(chanPk(msgKey), 'REACTIONS')) || {} })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.post('/reactions/:msgKey/:msgId', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (access.ok === false) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      if (access.kind === 'dm' && isSystemInboxDmKey(msgKey)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })
      if (access.kind === 'reelm') {
        const timeout = await getActiveReelmTimeout(String(req.userId), access.reelmId).catch(() => null)
        if (timeout) return res.status(403).json({ error: 'reelm_timeout', code: 'reelm/timeout', timeout })
      }

      const msgId = String(req.params.msgId)
      const emoji = String(req.body?.emoji || '').slice(0, 32)
      const userId = String(req.userId)
      if (!emoji) return res.status(400).json({ error: 'missing_fields' })
      const all = (await getDoc<Record<string, Record<string, string[]>>>(chanPk(msgKey), 'REACTIONS')) || {}
      const mr = { ...(all[msgId] || {}) }
      const users = [...(mr[emoji] || [])].map(String).filter((id) => id !== userId)
      if ((mr[emoji] || []).map(String).includes(userId)) {
        if (users.length) mr[emoji] = users; else delete mr[emoji]
      } else {
        users.push(userId)
        mr[emoji] = users
      }
      if (Object.keys(mr).length) all[msgId] = mr; else delete all[msgId]
      await putDoc(chanPk(msgKey), 'REACTIONS', all)
      const payload = { msgKey, msgId, emoji, users: mr[emoji] || [] }
      io.to(`chan:${msgKey}`).emit('reelms:reaction', payload)
      if (access.kind === 'reelm') io.to(`reelm:${access.reelmId}`).emit('reelms:reaction', payload)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'reaction_failed' }) }
  })

  router.post('/media/upload-url', async (req, res) => {
    try {
      const uid = String(req.userId)
      const fileName = String(req.body?.fileName || '').trim()
      const fileSize = Number(req.body?.fileSize || 0)
      const mimeType = String(req.body?.mimeType || 'application/octet-stream').trim().toLowerCase() || 'application/octet-stream'
      const purpose = normalizeMediaPurpose(req.body?.purpose)
      if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0) return res.status(400).json({ error: 'missing_fields' })
      const maxBytes = maxUploadBytesForPurpose(purpose)
      if (fileSize > maxBytes) return res.status(413).json({ error: 'file_too_large', maxBytes, purpose })
      if (isProfileImagePurpose(purpose) && !imageMimeTypes.has(mimeType)) return res.status(415).json({ error: 'unsupported_image_type', allowed: Array.from(imageMimeTypes) })
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const objectKey = buildUserUploadKey(uid, fileName)
      const storage = getObjectStorage()
      const presigned = await storage.createPresignedPut({ key: objectKey, contentType: mimeType })
      const metadata = {
        id: fileId,
        fileName,
        fileSize,
        mimeType,
        purpose,
        objectKey,
        url: presigned.url,
        uploadedAt: null,
        createdAt: Date.now(),
        isPublic: false,
        status: 'pending_upload',
        userId: uid
      }
      await putDoc(userPk(uid), `MEDIA#${fileId}`, metadata)
      emitUser(uid, `MEDIA#${fileId}`)
      res.json({ data: { ...metadata, upload: presigned } })
    } catch (err: any) {
      const message = String(err?.message || '')
      if (message.includes('object_storage_not_configured')) return res.status(503).json({ error: 'object_storage_not_configured' })
      console.error('/media/upload-url error:', err)
      res.status(500).json({ error: 'upload_url_failed' })
    }
  })

  router.post('/media/:mediaId/complete', async (req, res) => {
    try {
      const uid = String(req.userId)
      const sk = `MEDIA#${req.params.mediaId}`
      const metadata = await getDoc<any>(userPk(uid), sk)
      if (!metadata) return res.status(404).json({ error: 'not_found' })
      const storage = getObjectStorage()
      const publicUrl = metadata.objectKey ? storage.getPublicUrl(String(metadata.objectKey)) : (metadata.url || null)
      const next = { ...metadata, url: publicUrl, publicUrl, mediaUrl: publicUrl, status: 'uploaded', uploadedAt: Date.now(), etag: req.body?.etag || metadata.etag || null }
      await putDoc(userPk(uid), sk, next)
      emitUser(uid, sk)
      res.json({ data: next })
    } catch { res.status(500).json({ error: 'complete_failed' }) }
  })

  router.post('/media/upload', async (req, res) => {
    try {
      const { fileName, fileSize, mimeType, localFileId, objectKey, url } = req.body
      if (!fileName || (!localFileId && !objectKey)) return res.status(400).json({ error: 'missing_fields' })
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const metadata = { id: fileId, fileName, fileSize: Number(fileSize) || 0, mimeType: mimeType || 'application/octet-stream', localFileId: localFileId || null, objectKey: objectKey || null, url: url || null, uploadedAt: Date.now(), isPublic: false, status: objectKey ? 'uploaded' : 'metadata_only', userId: req.userId }
      await putDoc(userPk(String(req.userId)), `MEDIA#${fileId}`, metadata)
      emitUser(String(req.userId), `MEDIA#${fileId}`)
      res.json({ data: metadata })
    } catch { res.status(500).json({ error: 'upload_failed' }) }
  })

  router.get('/media/list', async (req, res) => {
    try { res.json({ data: (await queryDocs(userPk(String(req.userId)), 'MEDIA#')).map((i: any) => i.data).filter(Boolean) }) }
    catch { res.status(500).json({ error: 'list_failed' }) }
  })

  router.delete('/media/:mediaId', async (req, res) => {
    try {
      const uid = String(req.userId)
      const sk = `MEDIA#${req.params.mediaId}`
      const metadata = await getDoc<any>(userPk(uid), sk).catch(() => null)
      if (metadata?.objectKey) await getObjectStorage().deleteObject(String(metadata.objectKey)).catch((err) => console.warn('/media delete object failed:', err))
      await deleteDoc(userPk(uid), sk)
      emitUser(uid, sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.put('/media/:mediaId/share', async (req, res) => {
    try {
      const sk = `MEDIA#${req.params.mediaId}`
      const metadata = await getDoc<any>(userPk(String(req.userId)), sk)
      if (!metadata) return res.status(404).json({ error: 'not_found' })
      metadata.isPublic = Boolean(req.body?.isPublic)
      metadata.sharedAt = metadata.isPublic ? Date.now() : null
      await putDoc(userPk(String(req.userId)), sk, metadata)
      emitUser(String(req.userId), sk)
      res.json({ data: metadata })
    } catch { res.status(500).json({ error: 'share_failed' }) }
  })

  router.get('/sounds/list', (_req, res) => {
    const candidates = [
      path.resolve(process.cwd(), 'apps/web/public/sounds'),
      path.resolve(process.cwd(), 'apps/desktop/public/sounds')
    ]
    for (const dir of candidates) {
      try {
        const files = fs.readdirSync(dir).filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f)).sort()
        return res.json({ files })
      } catch {}
    }
    res.json({ files: [] })
  })

  router.post('/feedback', async (req, res) => {
    const { name, email, message } = req.body
    if (!name || !email || !message) return res.status(400).json({ error: 'missing_fields' })
    // Professional placeholder: store first; optional SES/SMTP worker can be attached later.
    await putDoc(APP_PK, `FEEDBACK#${Date.now()}#${Math.random().toString(36).slice(2, 8)}`, { name, email, message, createdAt: Date.now() })
    res.json({ ok: true })
  })

  return router
}
