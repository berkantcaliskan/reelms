import { Router } from 'express'
import { env } from '../../config/env.js'
import { signToken } from '../../modules/auth/authService.js'
import { getDoc, putDoc, userPk } from '../../modules/store/docStore.js'

const BOT_USERNAME = 'reelm-radio'
const BOT_NAME = 'Reelm Radio'
const BOT_PHOTO = null

export const botRouter = Router()

async function ensureBotProfile() {
  const uid = env.REELMS_BOT_UID
  const existing = await getDoc<any>(userPk(uid), 'profile').catch(() => null)
  if (existing?.username === BOT_USERNAME) return
  await putDoc(userPk(uid), 'profile', {
    id: uid,
    uid,
    name: BOT_NAME,
    displayName: BOT_NAME,
    username: BOT_USERNAME,
    photo: BOT_PHOTO,
    isSystem: true,
    isBot: true,
    createdAt: Date.now()
  })
}

botRouter.post('/internal/bot-auth', async (req, res) => {
  try {
    const { secret } = req.body || {}
    if (!secret || secret !== env.REELMS_BOT_SECRET) {
      return res.status(401).json({ error: 'invalid_bot_secret' })
    }
    await ensureBotProfile()
    const token = signToken(env.REELMS_BOT_UID)
    res.json({ token, uid: env.REELMS_BOT_UID, name: BOT_NAME, username: BOT_USERNAME })
  } catch (err) {
    res.status(500).json({ error: 'bot_auth_failed' })
  }
})
