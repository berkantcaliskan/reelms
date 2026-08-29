import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { signToken } from '../../modules/auth/authService.js'
import { chanPk, getDoc, putDoc, queryDocs, reelmPk, userPk } from '../../modules/store/docStore.js'
import { authenticate } from '../middleware/authenticate.js'
import { isReelmMember } from '../../modules/reelms/access.js'
import { isAIConfigured, generateAIChatResponse, summarizeChannelConversation, moderateChannelMessages } from '../../modules/ai/aiService.js'

export const AI_BOT_UID = env.REELMS_AI_BOT_UID
const AI_BOT_USERNAME = 'reelmsai'
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

  // AI Service Status & Feature Tier Info
  router.get('/api/v1/ai/status', (_req, res) => {
    const configured = isAIConfigured()
    res.json({
      ok: true,
      configured,
      provider: env.OPENROUTER_API_KEY ? 'openrouter' : env.OPENAI_API_KEY ? 'openai' : 'none',
      model: env.OPENROUTER_API_KEY ? env.OPENROUTER_MODEL : 'gpt-4o-mini',
      botUsername: AI_BOT_USERNAME,
      botName: AI_BOT_NAME,
      features: {
        free: [
          { key: 'summarize', name: 'Kanal Mesaj Özeti (Tamamı veya Belirli Aralık)', tier: 'free' },
          { key: 'moderation', name: 'Kanal Güvenliği ve Akıllı Moderasyon', tier: 'free' }
        ],
        premium: [
          { key: 'chat', name: 'Yapay Zeka Sohbet & Danışman (Chat Modu)', tier: 'premium', status: 'active_in_beta' },
          { key: 'generators', name: 'Yaratıcı İçerik Üreticileri', tier: 'premium', status: 'active_in_beta' }
        ]
      }
    })
  })

  // Direct AI Chat Endpoint (Premium Feature - currently unlocked in Beta)
  router.post('/api/v1/ai/chat', authenticate, async (req, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(503).json({ error: 'ai_not_configured', message: 'OpenRouter AI API key is not configured.' })
      }
      const { messages = [], prompt, systemPrompt, temperature, maxTokens, model } = req.body || {}
      if (!prompt && (!Array.isArray(messages) || !messages.length)) {
        return res.status(400).json({ error: 'missing_prompt_or_messages' })
      }
      const result = await generateAIChatResponse({
        messages,
        prompt,
        systemPrompt,
        temperature: Number(temperature) || 0.7,
        maxTokens: Number(maxTokens) || 1000,
        model
      })
      res.json({ ok: true, text: result.text, model: result.model, tier: 'premium' })
    } catch (err: any) {
      console.error('[AI API] Chat error:', err)
      res.status(500).json({ error: 'ai_chat_failed', message: err?.message || 'AI request failed' })
    }
  })

  // Direct AI Summarize Endpoint (FREE Feature: can read all messages or specific range)
  router.post('/api/v1/ai/summarize', authenticate, async (req, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(503).json({ error: 'ai_not_configured', message: 'OpenRouter AI API key is not configured.' })
      }
      const { msgKey, messages: inputMessages, channelName, limit = 50, since, language = 'auto', rangeDescription } = req.body || {}
      let messagesToSummarize = Array.isArray(inputMessages) ? inputMessages : []

      if (!messagesToSummarize.length && msgKey) {
        const items = await queryDocs<any>(chanPk(String(msgKey)), 'MSG#').catch(() => [])
        let raw: any[] = items.map((item) => item.data).filter(Boolean)

        if (since && Number(since) > 0) {
          raw = raw.filter((m: any) => Number(m?.time) >= Number(since))
        }

        if (limit === 'all' || limit === 0 || limit === -1) {
          messagesToSummarize = raw
        } else {
          const numLimit = Math.min(Number(limit) || 50, 500)
          messagesToSummarize = raw.slice(-numLimit)
        }
      }

      if (!messagesToSummarize.length) {
        return res.json({ ok: true, summary: 'Bu aralıkta veya kanalda özetlenecek mesaj bulunmuyor.' })
      }

      const calculatedRangeDesc = rangeDescription || (limit === 'all' ? 'Tüm kanal geçmişi' : `Son ${messagesToSummarize.length} mesaj`)
      const summary = await summarizeChannelConversation({
        messages: messagesToSummarize,
        channelName,
        rangeDescription: calculatedRangeDesc,
        language
      })

      res.json({ ok: true, summary, messageCount: messagesToSummarize.length, tier: 'free' })
    } catch (err: any) {
      console.error('[AI API] Summarize error:', err)
      res.status(500).json({ error: 'ai_summarize_failed', message: err?.message || 'Summarization failed' })
    }
  })

  // Direct AI Channel Moderation Endpoint (FREE Feature)
  router.post('/api/v1/ai/moderate', authenticate, async (req, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(503).json({ error: 'ai_not_configured' })
      }
      const { msgKey, messages: inputMessages, channelName, serverRules, limit = 50 } = req.body || {}
      let messagesToScan = Array.isArray(inputMessages) ? inputMessages : []

      if (!messagesToScan.length && msgKey) {
        const items = await queryDocs<any>(chanPk(String(msgKey)), 'MSG#').catch(() => [])
        const raw: any[] = items.map((item) => item.data).filter(Boolean)
        messagesToScan = raw.slice(-Math.min(Number(limit) || 50, 100))
      }

      const moderationResult = await moderateChannelMessages({
        messages: messagesToScan,
        channelName,
        serverRules
      })

      res.json({ ok: true, ...moderationResult, scannedCount: messagesToScan.length, tier: 'free' })
    } catch (err: any) {
      console.error('[AI API] Moderation error:', err)
      res.status(500).json({ error: 'ai_moderation_failed', message: err?.message || 'Moderation scan failed' })
    }
  })

  // Direct AI Generation Helper (bio, rules, topic, welcome)
  router.post('/api/v1/ai/generate', authenticate, async (req, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(503).json({ error: 'ai_not_configured' })
      }
      const { type = 'bio', context = '', language = 'tr' } = req.body || {}
      let prompt = ''
      if (type === 'bio') {
        prompt = `Kullanıcı için ilgi çekici, havalı ve özgün bir profil biyografisi yaz. Bilgiler/İlgi alanları: "${context || 'müzik, yazılım, oyun, sohbet'}". Maksimum 150 karakter olsun, emoji içerebilir.`
      } else if (type === 'reelm_rules') {
        prompt = `"${context || 'Genel Topluluk'}" isimli Reelm topluluğu için 5 maddelik net, adil ve modern sunucu kuralları oluştur.`
      } else if (type === 'channel_topic') {
        prompt = `"${context || 'Sohbet'}" kanalı için 3 adet yaratıcı sohbet başlatıcı soru / konu başlığı öner.`
      } else {
        prompt = `Şu konuda kısa ve yaratıcı bir metin oluştur: ${context}`
      }

      const result = await generateAIChatResponse({
        prompt,
        temperature: 0.8,
        maxTokens: 400
      })
      res.json({ ok: true, result: result.text })
    } catch (err: any) {
      res.status(500).json({ error: 'ai_generate_failed', message: err?.message || 'Generation failed' })
    }
  })

  // Internal Bot Auth
  router.post('/internal/ai-bot-auth', async (req, res) => {
    try {
      const { secret } = req.body || {}
      if (!secret || secret !== env.REELMS_AI_BOT_SECRET) return res.status(401).json({ error: 'invalid_bot_secret' })
      if (!isAIConfigured()) return res.status(503).json({ error: 'ai_not_configured' })
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
      if (!isAIConfigured()) return res.status(503).json({ error: 'ai_not_configured' })

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
        bio: 'Reelms Intelligence — @reelmsai / @reelmsintelligence ile sohbet et, /ai veya /summarize kullan',
        activity: 'Reelms Intelligence', profileTheme: null, roleIds: [], isBot: true, joinedAt: Date.now()
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
