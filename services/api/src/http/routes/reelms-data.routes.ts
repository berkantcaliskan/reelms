import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import { APP_PK, chanPk, deleteDoc, getDoc, putDoc, queryDocs, reelmPk, scanByPkPrefix, userPk } from '../../modules/store/docStore.js'

const USER_BOOTSTRAP_KEYS = [
  'friends', 'friend_requests', 'friend_requests_out', 'notifications', 'message_requests', 'message_requests_out',
  'blocked', 'nicknames', 'unread_counts', 'customization', 'bg_image', 'feed_nav', 'landing_view', 'lpw', 'rpw',
  'sociallinks', 'socialorder', 'spotify_connected', 'sessions', 'environment', 'last_channels', 'reelms', 'chats'
]

const PUBLIC_PATHS = [/^\/user\/check-username\//, /^\/user\/check-email\//, /^\/sounds\/list$/]

export function createReelmsDataRouter(io: Server) {
  const router = Router()

  router.use((req, res, next) => {
    if (PUBLIC_PATHS.some((p) => p.test(req.path))) { req.userId = null; return next() }
    return authenticate(req, res, next)
  })

  const emitUser = (uid: string, sk: string) => io.to(`u:${uid}`).emit('reelms:doc', { scope: 'user', sk })
  const emitReelm = (reelmId: string, sk: string) => io.to(`reelm:${reelmId}`).emit('reelms:doc', { scope: 'reelm', reelmId, sk })
  const emitApp = (sk: string) => io.to('app').emit('reelms:doc', { scope: 'app', sk })

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
      await putDoc(userPk(String(req.userId)), sk, req.body?.data)
      emitUser(String(req.userId), sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.put('/user/profile', async (req, res) => {
    try {
      const data = req.body?.data
      if (!data || typeof data !== 'object') return res.status(400).json({ error: 'invalid_data' })
      const profile = { ...data, id: req.userId }
      await putDoc(userPk(String(req.userId)), 'profile', profile)
      if (profile.username) await putDoc(`USERNAME#${String(profile.username).toLowerCase()}`, 'uid', req.userId)
      if (profile.contact) await putDoc(`EMAIL#${String(profile.contact).toLowerCase()}`, 'uid', req.userId)
      emitUser(String(req.userId), 'profile')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.get('/user/profile', async (req, res) => {
    try { res.json({ data: await getDoc(userPk(String(req.userId)), 'profile') }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.get('/user/profile/:uid', async (req, res) => {
    try { res.json({ data: await getDoc(userPk(req.params.uid), 'profile') }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.patch('/user/profile', async (req, res) => {
    try {
      const existing = (await getDoc<Record<string, unknown>>(userPk(String(req.userId)), 'profile')) || {}
      const updated = { ...existing, ...(req.body?.data || {}), id: req.userId }
      await putDoc(userPk(String(req.userId)), 'profile', updated)
      if ((updated as any).username) await putDoc(`USERNAME#${String((updated as any).username).toLowerCase()}`, 'uid', req.userId)
      if ((updated as any).contact) await putDoc(`EMAIL#${String((updated as any).contact).toLowerCase()}`, 'uid', req.userId)
      emitUser(String(req.userId), 'profile')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'patch_failed' }) }
  })

  router.delete('/user/profile', async (req, res) => {
    try {
      const existing = await getDoc<any>(userPk(String(req.userId)), 'profile')
      await deleteDoc(userPk(String(req.userId)), 'profile')
      if (existing?.username) await deleteDoc(`USERNAME#${String(existing.username).toLowerCase()}`, 'uid').catch(() => {})
      if (existing?.contact) await deleteDoc(`EMAIL#${String(existing.contact).toLowerCase()}`, 'uid').catch(() => {})
      emitUser(String(req.userId), 'profile')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.get('/user/by-username/:username', async (req, res) => {
    try {
      const uid = await getDoc<string>(`USERNAME#${req.params.username.toLowerCase()}`, 'uid')
      res.json({ data: uid ? await getDoc(userPk(uid), 'profile') : null })
    } catch { res.status(500).json({ error: 'lookup_failed' }) }
  })

  router.get('/user/by-email/:email', async (req, res) => {
    try {
      const uid = await getDoc<string>(`EMAIL#${req.params.email.toLowerCase()}`, 'uid')
      res.json({ data: uid ? await getDoc(userPk(uid), 'profile') : null })
    } catch { res.status(500).json({ error: 'lookup_failed' }) }
  })

  router.get('/user/check-username/:username', async (req, res) => {
    try { const uid = await getDoc(`USERNAME#${req.params.username.toLowerCase()}`, 'uid'); res.json({ available: !uid || uid === req.userId }) }
    catch { res.status(500).json({ error: 'check_failed' }) }
  })

  router.get('/user/check-email/:email', async (req, res) => {
    try { const uid = await getDoc(`EMAIL#${req.params.email.toLowerCase()}`, 'uid'); res.json({ available: !uid || uid === req.userId }) }
    catch { res.status(500).json({ error: 'check_failed' }) }
  })

  router.get('/users', async (_req, res) => {
    try {
      const items = await scanByPkPrefix('USER#')
      res.json({ data: items.filter((i) => i.sk === 'profile' && i.data && !(i.data as any).isSystem).map((i) => i.data) })
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

  // Compatibility: client declares reelmByCode but old backend did not implement it.
  router.get('/reelm/by-code/:code', async (req, res) => {
    try {
      const code = req.params.code.toLowerCase()
      const items = await scanByPkPrefix('REELM#')
      const found = items.find((i) => i.sk === 'meta' && String((i.data as any)?.code || '').toLowerCase() === code)
      res.json({ data: found?.data || null })
    } catch { res.status(500).json({ error: 'lookup_failed' }) }
  })

  router.get('/reelm/:reelmId/doc/:sk', async (req, res) => {
    try { res.json({ data: await getDoc(reelmPk(req.params.reelmId), decodeURIComponent(req.params.sk)) }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.put('/reelm/:reelmId/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      await putDoc(reelmPk(req.params.reelmId), sk, req.body?.data)
      emitReelm(req.params.reelmId, sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.get('/app/doc/:sk', async (req, res) => {
    try { res.json({ data: await getDoc(APP_PK, decodeURIComponent(req.params.sk)) }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.put('/app/doc/:sk', async (req, res) => {
    try {
      const sk = decodeURIComponent(req.params.sk)
      await putDoc(APP_PK, sk, req.body?.data)
      emitApp(sk)
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'put_failed' }) }
  })

  router.get('/messages/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      if (msgKey === 'mod_inbox' && req.userId !== env.REELMS_MODERATION_UID) return res.status(403).json({ error: 'forbidden' })
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      res.json({ data: items.map((i) => i.data).filter(Boolean) })
    } catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.post('/messages/:msgKey', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      if (msgKey === 'mod_inbox') return res.status(403).json({ error: 'forbidden' })
      const message = req.body?.message
      if (!message?.id) return res.status(400).json({ error: 'invalid_message' })
      const ts = String(message.time || Date.now()).padStart(15, '0')
      const sk = `MSG#${ts}#${message.id}`
      await putDoc(chanPk(msgKey), sk, message)
      io.to(`chan:${msgKey}`).emit('reelms:message', { msgKey, message })
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'send_failed' }) }
  })

  router.delete('/messages/:msgKey/:msgId', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const msgId = req.params.msgId
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      const target = items.find((i) => (i.data as any)?.id == msgId)
      if (target) await deleteDoc(chanPk(msgKey), target.sk)
      io.to(`chan:${msgKey}`).emit('reelms:message-deleted', { msgKey, msgId })
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'delete_failed' }) }
  })

  router.get('/reactions/:msgKey', async (req, res) => {
    try { res.json({ data: (await getDoc(chanPk(decodeURIComponent(req.params.msgKey)), 'REACTIONS')) || {} }) }
    catch { res.status(500).json({ error: 'get_failed' }) }
  })

  router.post('/reactions/:msgKey/:msgId', async (req, res) => {
    try {
      const msgKey = decodeURIComponent(req.params.msgKey)
      const msgId = String(req.params.msgId)
      const { emoji, userId } = req.body
      if (!emoji || !userId) return res.status(400).json({ error: 'missing_fields' })
      const all = (await getDoc<Record<string, Record<string, string[]>>>(chanPk(msgKey), 'REACTIONS')) || {}
      const mr = { ...(all[msgId] || {}) }
      const users = [...(mr[emoji] || [])]
      const idx = users.indexOf(String(userId))
      if (idx >= 0) users.splice(idx, 1); else users.push(String(userId))
      if (users.length) mr[emoji] = users; else delete mr[emoji]
      if (Object.keys(mr).length) all[msgId] = mr; else delete all[msgId]
      await putDoc(chanPk(msgKey), 'REACTIONS', all)
      io.to(`chan:${msgKey}`).emit('reelms:reaction', { msgKey, msgId, emoji, users })
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
