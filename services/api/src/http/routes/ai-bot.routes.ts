import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { signToken } from '../../modules/auth/authService.js'
import { chanPk, getDoc, putDoc, queryDocs, reelmPk, userPk } from '../../modules/store/docStore.js'
import { authenticate } from '../middleware/authenticate.js'
import { isReelmMember } from '../../modules/reelms/access.js'

export const AI_BOT_UID = env.REELMS_AI_BOT_UID
const AI_BOT_USERNAME = 'reelms-intelligence'
const AI_BOT_NAME = 'Reelms Intelligence'

async function ensureAIBotProfile() {
  const existing = await getDoc<any>(userPk(AI_BOT_UID), 'profile').catch(() => null)
  if (existing?.username === AI_BOT_USERNAME) return
  await putDoc(userPk(AI_BOT_UID), 'profile', {
    id: AI_BOT_UID, uid: AI_BOT_UID,
    name: AI_BOT_NAME, displayName: AI_BOT_NAME, username: AI_BOT_USERNAME,
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

export function createAIBotRouter(io: Server) {
  const router = Router()

  router.post('/internal/ai-bot-auth', async (req, res) => {
    try {
      const { secret } = req.body || {}
      if (!secret || secret !== env.REELMS_AI_BOT_SECRET) return res.status(401).json({ error: 'invalid_bot_secret' })
      if (!env.OPENAI_API_KEY) return res.status(503).json({ error: 'openai_not_configured' })
      await ensureAIBotProfile()
      const token = signToken(AI_BOT_UID)
      res.json({ token, uid: AI_BOT_UID, name: AI_BOT_NAME, username: AI_BOT_USERNAME })
    } catch { res.status(500).json({ error: 'ai_bot_auth_failed' }) }
  })

  router.get('/internal/ai-bot/reelms', async (req, res) => {
    try {
      const secret = req.headers['x-bot-secret']
      if (!secret || secret !== env.REELMS_AI_BOT_SECRET) return res.status(401).json({ error: 'forbidden' })
      const botReelms = (await getDoc<any[]>(userPk(AI_BOT_UID), 'ai_bot_reelms').catch(() => [])) || []
      res.json({ reelms: botReelms })
    } catch { res.status(500).json({ error: 'fetch_failed' }) }
  })

  router.get('/internal/ai-bot/messages/:msgKey', async (req, res) => {
    try {
      const secret = req.headers['x-bot-secret']
      if (!secret || secret !== env.REELMS_AI_BOT_SECRET) return res.status(401).json({ error: 'forbidden' })
      const msgKey = decodeURIComponent(req.params.msgKey)
      const limit = Math.min(Number(req.query.limit) || 30, 100)
      const items = await queryDocs(chanPk(msgKey), 'MSG#')
      const messages = items.map((item) => item.data).filter(Boolean)
      const recent = messages.slice(-limit)
      res.json({ ok: true, messages: recent })
    } catch { res.status(500).json({ error: 'fetch_failed' }) }
  })

  router.post('/api/v1/reelms/:reelmId/add-ai-bot', authenticate, async (req, res) => {
    try {
      const actorUid = String(req.userId)
      const reelmId = String(req.params.reelmId || '')
      if (!reelmId) return res.status(400).json({ error: 'missing_reelm' })
      if (!env.OPENAI_API_KEY) return res.status(503).json({ error: 'ai_not_configured' })

      const isMember = await isReelmMember(actorUid, reelmId).catch(() => false)
      if (!isMember) return res.status(403).json({ error: 'forbidden' })

      const pk = reelmPk(reelmId)
      const [meta, structure, members] = await Promise.all([
        getDoc<any>(pk, 'meta').catch(() => null),
        getDoc<any>(pk, 'structure').catch(() => null),
        getDoc<any[]>(pk, 'members').catch(() => [])
      ])
      if (!meta?.id) return res.status(404).json({ error: 'reelm_not_found' })

      const safeMembers = Array.isArray(members) ? members : []
      if (safeMembers.some((m) => String(m?.userId) === AI_BOT_UID)) {
        return res.json({ ok: true, alreadyMember: true })
      }

      const botMember = {
        userId: AI_BOT_UID, userName: AI_BOT_NAME, username: AI_BOT_USERNAME,
        userPhoto: null, photo: null, cover: null, coverImage: null, coverUrl: null,
        bio: 'Reelms Intelligence — @reelms-intelligence ile konuş, /summarize ile özetle',
        activity: null, profileTheme: null, roleIds: [], isBot: true, joinedAt: Date.now()
      }
      await putDoc(pk, 'members', [botMember, ...safeMembers])

      const channels = textChannelsFromStructure(reelmId, structure)
      const botReelms = (await getDoc<any[]>(userPk(AI_BOT_UID), 'ai_bot_reelms').catch(() => [])) || []
      const entry = { id: reelmId, name: meta.name || reelmId, channels, addedAt: Date.now() }
      const updatedBotReelms = [entry, ...botReelms.filter((r: any) => String(r?.id) !== reelmId)]
      await putDoc(userPk(AI_BOT_UID), 'ai_bot_reelms', updatedBotReelms)

      io.to(`u:${AI_BOT_UID}`).emit('ai-bot:join-reelm', { reelmId, reelmName: meta.name, channels })
      io.to(`reelm:${reelmId}`).emit('reelms:doc', { scope: 'reelm', sk: 'members' })

      res.json({ ok: true, added: true, reelmId })
    } catch (err) {
      res.status(500).json({ error: 'add_bot_failed', details: err instanceof Error ? err.message : 'unknown' })
    }
  })

  router.get('/api/v1/reelms/:reelmId/ai-bot-status', authenticate, async (req, res) => {
    try {
      const reelmId = String(req.params.reelmId || '')
      const members = (await getDoc<any[]>(reelmPk(reelmId), 'members').catch(() => [])) || []
      const hasBot = members.some((m) => String(m?.userId) === AI_BOT_UID)
      res.json({ hasBot, botId: AI_BOT_UID })
    } catch { res.status(500).json({ error: 'status_failed' }) }
  })

  return router
}
