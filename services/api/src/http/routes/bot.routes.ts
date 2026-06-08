import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { signToken } from '../../modules/auth/authService.js'
import { getDoc, putDoc, reelmPk, userPk } from '../../modules/store/docStore.js'
import { authenticate } from '../middleware/authenticate.js'
import { isReelmMember } from '../../modules/reelms/access.js'

export const BOT_UID = env.REELMS_BOT_UID
const BOT_USERNAME = 'reelmradio'
const BOT_NAME = 'Reelm Radio'

async function ensureBotProfile() {
  const existing = await getDoc<any>(userPk(BOT_UID), 'profile').catch(() => null)
  if (existing?.username === BOT_USERNAME) return
  await putDoc(userPk(BOT_UID), 'profile', {
    id: BOT_UID, uid: BOT_UID,
    name: BOT_NAME, displayName: BOT_NAME, username: BOT_USERNAME,
    photo: null, isSystem: true, isBot: true, createdAt: Date.now()
  })
}

function textChannelsFromStructure(reelmId: string, structure: any): Array<{ channelId: string; msgKey: string }> {
  const categories: any[] = Array.isArray(structure?.categories) ? structure.categories : []
  const channels: Array<{ channelId: string; msgKey: string }> = []
  for (const cat of categories) {
    for (const ch of Array.isArray(cat?.channels) ? cat.channels : []) {
      if (ch?.type === 'text' && ch?.id) {
        channels.push({ channelId: ch.id, msgKey: `${reelmId}_${ch.id}` })
      }
    }
  }
  return channels
}

export function createBotRouter(io: Server) {
  const router = Router()

  router.post('/internal/bot-auth', async (req, res) => {
    try {
      const { secret } = req.body || {}
      if (!secret || secret !== env.REELMS_BOT_SECRET) return res.status(401).json({ error: 'invalid_bot_secret' })
      await ensureBotProfile()
      const token = signToken(BOT_UID)
      res.json({ token, uid: BOT_UID, name: BOT_NAME, username: BOT_USERNAME })
    } catch { res.status(500).json({ error: 'bot_auth_failed' }) }
  })

  router.get('/internal/bot/reelms', async (req, res) => {
    try {
      const secret = req.headers['x-bot-secret']
      if (!secret || secret !== env.REELMS_BOT_SECRET) return res.status(401).json({ error: 'forbidden' })
      const botReelms = (await getDoc<any[]>(userPk(BOT_UID), 'bot_reelms').catch(() => [])) || []
      res.json({ reelms: botReelms })
    } catch { res.status(500).json({ error: 'fetch_failed' }) }
  })

  router.post('/api/v1/reelms/:reelmId/add-bot', authenticate, async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      console.log('[bot/add-bot] Starting for reelmId:', reelmId, 'userId:', actorUid)
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })

      const isMember = await isReelmMember(actorUid, reelmId).catch((err) => {
        console.log('[bot/add-bot] isReelmMember error:', err?.message)
        return false
      })
      console.log('[bot/add-bot] isMember:', isMember)
      if (!isMember) return res.status(403).json({ error: 'forbidden' })

      const pk = reelmPk(reelmId)
      const [meta, structure, members] = await Promise.all([
        getDoc<any>(pk, 'meta').catch((err) => { console.log('[bot/add-bot] meta error:', err?.message); return null }),
        getDoc<any>(pk, 'structure').catch((err) => { console.log('[bot/add-bot] structure error:', err?.message); return null }),
        getDoc<any[]>(pk, 'members').catch((err) => { console.log('[bot/add-bot] members error:', err?.message); return [] })
      ])
      console.log('[bot/add-bot] meta:', !!meta, 'members count:', Array.isArray(members) ? members.length : 0)
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })

      const safeMembers = Array.isArray(members) ? members : []
      if (safeMembers.some((m) => String(m?.userId) === BOT_UID)) {
        return res.json({ ok: true, alreadyMember: true })
      }

      const botMember = {
        userId: BOT_UID,
        userName: BOT_NAME,
        username: BOT_USERNAME,
        userPhoto: null,
        photo: null,
        cover: null,
        coverImage: null,
        coverUrl: null,
        bio: 'Reelms müzik botu',
        activity: null,
        profileTheme: null,
        roleIds: [],
        isBot: true,
        joinedAt: Date.now()
      }
      await putDoc(pk, 'members', [botMember, ...safeMembers])

      const channels = textChannelsFromStructure(reelmId, structure)
      const botReelms = (await getDoc<any[]>(userPk(BOT_UID), 'bot_reelms').catch(() => [])) || []
      const entry = { id: reelmId, name: meta.name || reelmId, channels, addedAt: Date.now() }
      const updatedBotReelms = [entry, ...botReelms.filter((r: any) => String(r?.id) !== reelmId)]
      await putDoc(userPk(BOT_UID), 'bot_reelms', updatedBotReelms)

      io.to(`u:${BOT_UID}`).emit('bot:join-reelm', { reelmId, reelmName: meta.name, channels })
      io.to(`reelm:${reelmId}`).emit('reelms:doc', { scope: 'reelm', sk: 'members' })

      res.json({ ok: true, added: true, reelmId })
    } catch (err) {
      console.error('[bot/add-bot] error:', err instanceof Error ? err.message : String(err), err)
      res.status(500).json({ error: 'add_bot_failed', details: err instanceof Error ? err.message : 'unknown' })
    }
  })

  router.get('/api/v1/reelms/:reelmId/bot-status', authenticate, async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId || '')
      const members = (await getDoc<any[]>(reelmPk(reelmId), 'members').catch(() => [])) || []
      const hasBot = members.some((m) => String(m?.userId) === BOT_UID)
      res.json({ hasBot, botId: BOT_UID })
    } catch { res.status(500).json({ error: 'status_failed' }) }
  })

  return router
}
