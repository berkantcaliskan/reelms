import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import { verifyIdToken } from '../../modules/auth/authService.js'
import { APP_PK, chanPk, deleteDoc, getDoc, putDoc, putDocIfAbsent, queryDocs, reelmPk, scanByPkPrefix, userPk } from '../../modules/store/docStore.js'
import { canManageReelm, getMessageKeyAccess, getUserPublicProfile as getStoredPublicProfile, isReelmMember, normalizeEmail, normalizeUsername, publicProfileFromStored } from '../../modules/reelms/access.js'

const USER_BOOTSTRAP_KEYS = [
  'friends', 'friend_requests', 'friend_requests_out', 'notifications', 'message_requests', 'message_requests_out',
  'blocked', 'nicknames', 'unread_counts', 'customization', 'bg_image', 'feed_nav', 'landing_view', 'lpw', 'rpw',
  'sociallinks', 'socialorder', 'spotify_connected', 'sessions', 'environment', 'last_channels', 'reelms', 'chats',
  'pinned_items', 'sounds', 'body_font'
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

  const emitUser = (uid: string, sk: string) => io.to(`u:${uid}`).emit('reelms:doc', { scope: 'user', sk })
  const emitReelm = (reelmId: string, sk: string) => io.to(`reelm:${reelmId}`).emit('reelms:doc', { scope: 'reelm', reelmId, sk })
  const emitApp = (sk: string) => io.to('app').emit('reelms:doc', { scope: 'app', sk })
  const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase()
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

  const prepareProfileWrite = async (uid: string, incoming: any, existing: any = {}) => {
    const preservedEmail = existing?.contact || existing?.email || ''
    const next = { ...(incoming || {}), id: uid, uid, updatedAt: Date.now() }
    if (next.contact == null && next.email == null && preservedEmail) next.contact = preservedEmail
    if (!next.createdAt) next.createdAt = existing?.createdAt || Date.now()

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
    return { id: uid, name: profile.name || profile.displayName || profile.username || 'Member', username: profile.username || '', photo: profile.photo || null }
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

  const toClientReelm = (meta: any, structure: any, roles: any[], members: any[], extra: Record<string, unknown> = {}) => ({
    ...(meta || {}),
    ...extra,
    id: meta?.id,
    name: meta?.name || 'Untitled Reelm',
    code: meta?.code,
    ownerId: meta?.ownerId || null,
    announcementChannelId: meta?.announcementChannelId || null,
    image: meta?.image || null,
    roles: Array.isArray(roles) ? roles : [],
    members: Array.isArray(members) ? members : [],
    categories: Array.isArray(structure?.categories) ? structure.categories : [],
    joined: true
  })

  const upsertUserReelm = async (uid: string, reelm: any) => {
    const pk = userPk(uid)
    const current = (await getDoc<any[]>(pk, 'reelms').catch(() => [])) || []
    const entry = {
      id: reelm.id,
      name: reelm.name,
      code: reelm.code,
      ownerId: reelm.ownerId || null,
      announcementChannelId: reelm.announcementChannelId || null,
      image: reelm.image || null,
      roles: Array.isArray(reelm.roles) ? reelm.roles : [],
      members: Array.isArray(reelm.members) ? reelm.members : [],
      categories: Array.isArray(reelm.categories) ? reelm.categories : [],
      joined: true,
      updatedAt: Date.now()
    }
    const next = [entry, ...current.filter((r) => String((r as any)?.id) !== String(reelm.id))]
    await putDoc(pk, 'reelms', next)
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
    const found = items.find((i) => i.sk === 'meta' && normalizeCode((i.data as any)?.code) === code)
    if (found?.data && (found.data as any).id) await putDocIfAbsent(`REELM_CODE#${code}`, 'id', String((found.data as any).id)).catch(() => {})
    return found?.data as any | null
  }

  const ensureMember = async (reelmId: string, uid: string, roleIds: string[] = []) => {
    const pk = reelmPk(reelmId)
    const profile = await getUserPublicProfile(uid)
    const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
    const existing = members.find((m) => String(m.userId) === String(uid))
    const member = {
      ...(existing || {}),
      userId: uid,
      userName: existing?.userName || profile.name || profile.username || 'Member',
      userPhoto: existing?.userPhoto || profile.photo || null,
      roleIds: existing?.roleIds || roleIds
    }
    const next = [member, ...members.filter((m) => String(m.userId) !== String(uid))]
    await putDoc(pk, 'members', next)
    return next
  }

  const syncReelmMemberCopies = async (reelmId: string) => {
    const pk = reelmPk(reelmId)
    const meta = await getDoc<any>(pk, 'meta')
    if (!meta) return
    const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
    const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
    const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
    const full = toClientReelm(meta, structure, roles, members)
    await Promise.all(members.map((m) => m?.userId ? upsertUserReelm(String(m.userId), full).catch(() => null) : Promise.resolve(null)))
    members.forEach((m) => { if (m?.userId) emitUser(String(m.userId), 'reelms') })
  }

  router.get('/user/bootstrap', async (req, res) => {
    try {
      const pk = userPk(String(req.userId))
      const entries = await Promise.all(USER_BOOTSTRAP_KEYS.map(async (sk) => [sk, await getDoc(pk, sk)]))
      res.json({ data: Object.fromEntries(entries) })
    } catch (e) { console.error(e); res.status(500).json({ error: 'bootstrap_failed' }) }
  })

  router.get('/user/doc/:sk', async (req, res) => {
    try { res.json({ data: await getDoc(userPk(String(req.userId)), decodeURIComponent(req.params.sk)) }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.put('/user/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      if (sk === 'profile') return res.status(400).json({ error: 'use_profile_endpoint', code: 'profile/use-profile-endpoint' })
      await putDoc(userPk(String(req.userId)), sk, req.body?.data)
      emitUser(String(req.userId), sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.put('/user/profile', async (req, res) => {
    try {
      const data = req.body?.data
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'invalid_data' })
      const uid = String(req.userId)
      const existing = (await getDoc<Record<string, unknown>>(userPk(uid), 'profile').catch(() => null)) || {}
      const prepared = await prepareProfileWrite(uid, data, existing)
      if (!prepared.ok) return res.status(prepared.status).json({ error: prepared.error, code: prepared.code })

      await putDoc(userPk(uid), 'profile', prepared.profile)

      if (existing && normalizeUsername((existing as any).username) !== prepared.username) await releaseUniqueIndex('USERNAME', (existing as any).username, uid)
      const existingEmail = normalizeEmail((existing as any).contact || (existing as any).email || '')
      if (existingEmail !== prepared.email) await releaseUniqueIndex('EMAIL', existingEmail, uid)

      emitUser(uid, 'profile')
      res.json({ ok: true })
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
      const profile = await getDoc<any>(userPk(requestedUid), 'profile')
      if (!profile) return res.json({ data: null })
      if (requestedUid === String(req.userId)) return res.json({ data: profile })
      return res.json({ data: publicProfileFromStored(requestedUid, profile) })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.patch('/user/profile', async (req, res) => {
    try {
      const uid = String(req.userId)
      const existing = (await getDoc<Record<string, unknown>>(userPk(uid), 'profile')) || {}
      const data = { ...existing, ...(req.body?.data || {}) }
      const prepared = await prepareProfileWrite(uid, data, existing)
      if (!prepared.ok) return res.status(prepared.status).json({ error: prepared.error, code: prepared.code })

      await putDoc(userPk(uid), 'profile', prepared.profile)

      if (normalizeUsername((existing as any).username) !== prepared.username) await releaseUniqueIndex('USERNAME', (existing as any).username, uid)
      const existingEmail = normalizeEmail((existing as any).contact || (existing as any).email || '')
      if (existingEmail !== prepared.email) await releaseUniqueIndex('EMAIL', existingEmail, uid)

      emitUser(uid, 'profile')
      res.json({ ok: true })
    } catch (err) {
      console.error('/api/v1/user/profile patch error:', err)
      res.status(500).json({ error: 'patch_failed' })
    }
  })

  router.delete('/user/profile', async (req, res) => {
    try {
      const existing = await getDoc<any>(userPk(String(req.userId)), 'profile')
      await deleteDoc(userPk(String(req.userId)), 'profile')
      if (existing?.username) await releaseUniqueIndex('USERNAME', existing.username, String(req.userId))
      if (existing?.contact || existing?.email) await releaseUniqueIndex('EMAIL', existing.contact || existing.email, String(req.userId))
      emitUser(String(req.userId), 'profile')
      res.json({ ok: true })
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

  router.get('/users', async (_req, res) => {
    try {
      const items = await scanByPkPrefix<any>('USER#')
      res.json({ data: items.filter((i) => i.sk === 'profile' && i.data && !(i.data as any).isSystem).map((i) => publicProfileFromStored(i.pk.replace(/^USER#/, ''), i.data)) })
    } catch { res.status(500).json({ error: 'list_failed' }) }
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

      const roles = Array.isArray(input.roles) && input.roles.length ? input.roles : [
        { id: `role-admin-${id}`, name: 'Admin', color: '#f87171' },
        { id: `role-member-${id}`, name: 'Member', color: '#60a5fa' }
      ]
      const adminRole = roles.find((r: any) => String(r.name).toLowerCase() === 'admin') || roles[0]
      const creator = await getUserPublicProfile(uid)
      const creatorMember = {
        userId: uid,
        userName: creator.name || creator.username || 'Owner',
        userPhoto: creator.photo || null,
        roleIds: adminRole?.id ? [adminRole.id] : []
      }
      const membersInput = Array.isArray(input.members) ? input.members : []
      const members = [creatorMember, ...membersInput.filter((m: any) => String(m?.userId) !== uid)]
      const categories = Array.isArray(input.categories) ? input.categories : []
      const meta = {
        id,
        name,
        code,
        ownerId: uid,
        createdAt: Number(input.createdAt || Date.now()),
        updatedAt: Date.now(),
        announcementChannelId: input.announcementChannelId || null,
        image: input.image || null
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
      const pk = reelmPk(meta.id)
      const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
      const memberRole = roles.find((r: any) => String(r.name).toLowerCase() === 'member') || roles[0]
      const members = await ensureMember(meta.id, uid, memberRole?.id ? [memberRole.id] : [])
      const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || { categories: [] }
      const full = toClientReelm(meta, structure, roles, members)
      await upsertUserReelm(uid, full)
      await syncReelmMemberCopies(meta.id).catch(() => {})
      emitUser(uid, 'reelms')
      emitReelm(meta.id, 'members')
      io.to(`reelm:${meta.id}`).emit('reelm:member-joined', { reelmId: meta.id, userId: uid })
      res.json({ data: full })
    } catch (err) {
      console.error('/api/v1/reelms/join error:', err)
      res.status(500).json({ error: 'join_reelm_failed' })
    }
  })

  router.get('/reelm/:reelmId/doc/:sk', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId)
      if (!await isReelmMember(String(req.userId), reelmId)) return res.status(403).json({ error: 'forbidden' })
      res.json({ data: await getDoc(reelmPk(reelmId), decodeURIComponent(req.params.sk)) })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.put('/reelm/:reelmId/doc/:sk', async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId)
      const sk = decodeURIComponent(req.params.sk)
      const isCoreDoc = ['meta', 'structure', 'roles', 'members'].includes(sk)
      const allowed = isCoreDoc ? await canManageReelm(String(req.userId), reelmId) : await isReelmMember(String(req.userId), reelmId)
      if (!allowed) return res.status(403).json({ error: 'forbidden' })

      await putDoc(reelmPk(reelmId), sk, req.body?.data)
      if (isCoreDoc) await syncReelmMemberCopies(reelmId).catch(() => {})
      emitReelm(reelmId, sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.get('/app/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      if (sk === 'reports' && req.userId !== env.REELMS_MODERATION_UID) return res.status(403).json({ error: 'forbidden' })
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
      if (!access.ok) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      res.json({ data: items.map((i) => i.data).filter(Boolean) })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.post('/messages/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (!access.ok) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      if (access.kind === 'moderation') return res.status(403).json({ error: 'forbidden' })

      const rawMessage = req.body?.message
      if (!rawMessage || typeof rawMessage !== 'object') return res.status(400).json({ error: 'invalid_message' })
      const message = await sanitizeMessageForWrite(String(req.userId), rawMessage)
      const ts = String(message.time || Date.now()).padStart(15, '0')
      const sk = `MSG#${ts}#${message.id}`
      await putDoc(chanPk(msgKey), sk, message)
      io.to(`chan:${msgKey}`).emit('reelms:message', { msgKey, message })
      res.json({ ok: true, data: message })
    } catch { res.status(500).json({ error: 'send_failed' }) }
  })

  router.delete('/messages/:msgKey/:msgId', async (req, res) => {
    try {
      const uid = String(req.userId)
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(uid, msgKey)
      if (!access.ok) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })

      const msgId = req.params.msgId
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      const target = items.find((i) => (i.data as any)?.id == msgId)
      if (!target) return res.json({ ok: true })
      const data = target.data as any
      const authorId = String(data?.userId || data?.authorId || data?.sender?.id || '')
      if (uid !== env.REELMS_MODERATION_UID && authorId !== uid) return res.status(403).json({ error: 'forbidden' })

      await deleteDoc(chanPk(msgKey), target.sk)
      io.to(`chan:${msgKey}`).emit('reelms:message-deleted', { msgKey, msgId })
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.get('/reactions/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (!access.ok) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })
      res.json({ data: (await getDoc(chanPk(msgKey), 'REACTIONS')) || {} })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.post('/reactions/:msgKey/:msgId', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const access = await getMessageKeyAccess(String(req.userId), msgKey)
      if (!access.ok) return res.status(access.reason === 'invalid_key' ? 400 : 403).json({ error: access.reason })

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
      io.to(`chan:${msgKey}`).emit('reelms:reaction', { msgKey, msgId, emoji, users: mr[emoji] || [] })
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'reaction_failed' }) }
  })

  router.post('/media/upload', async (req, res) => {
    try {
      const { fileName, fileSize, mimeType, localFileId } = req.body
      if (!fileName || !localFileId) return res.status(400).json({ error: 'missing_fields' })
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const metadata = { id: fileId, fileName, fileSize: Number(fileSize) || 0, mimeType: mimeType || 'application/octet-stream', localFileId, uploadedAt: Date.now(), isPublic: false, userId: req.userId }
      await putDoc(userPk(String(req.userId)), `MEDIA#${fileId}`, metadata)
      emitUser(String(req.userId), `MEDIA#${fileId}`)
      res.json({ data: metadata })
    } catch { res.status(500).json({ error: 'upload_failed' }) }
  })

  router.get('/media/list', async (req, res) => {
    try { res.json({ data: (await queryDocs(userPk(String(req.userId)), 'MEDIA#')).map((i) => i.data).filter(Boolean) }) }
    catch { res.status(500).json({ error: 'list_failed' }) }
  })

  router.delete('/media/:mediaId', async (req, res) => {
    try { await deleteDoc(userPk(String(req.userId)), `MEDIA#${req.params.mediaId}`); emitUser(String(req.userId), `MEDIA#${req.params.mediaId}`); res.json({ ok: true }) }
    catch { res.status(500).json({ error: 'delete_failed' }) }
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
