import { Router } from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { env } from '../../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import { getUserPublicProfile } from '../../modules/reelms/access.js'

export function createVoiceRouter() {
  const router = Router()
  router.use(authenticate)

  router.post('/token', async (req, res) => {
    try {
      const { room, canPublish = true } = req.body
      if (!room || typeof room !== 'string') {
        return res.status(400).json({ error: 'room_required', message: 'Room name is required' })
      }

      const uid = req.userId
      if (!uid) return res.status(401).json({ error: 'unauthorized' })

      const livekitUrl = env.LIVEKIT_URL
      const apiKey = env.LIVEKIT_API_KEY
      const apiSecret = env.LIVEKIT_API_SECRET

      // If LiveKit credentials are not configured, return sfuEnabled: false so client falls back to P2P mesh
      if (!livekitUrl || !apiKey || !apiSecret) {
        return res.json({
          sfuEnabled: false,
          message: 'LiveKit SFU not configured on server. Falling back to P2P Mesh.',
        })
      }

      const profile = await getUserPublicProfile(uid).catch(() => null)
      const participantName = profile?.name || profile?.username || `User_${uid.slice(0, 6)}`

      const at = new AccessToken(apiKey, apiSecret, {
        identity: String(uid),
        name: participantName,
        ttl: '6h',
      })

      at.addGrant({
        room: String(room),
        roomJoin: true,
        canPublish: Boolean(canPublish),
        canSubscribe: true,
        canPublishData: true,
      })

      const token = await at.toJwt()

      return res.json({
        sfuEnabled: true,
        token,
        url: livekitUrl,
        room: String(room),
        identity: String(uid),
        name: participantName,
      })
    } catch (err: any) {
      return res.status(500).json({ error: 'token_generation_failed', message: err?.message || 'Failed to generate voice token' })
    }
  })

  return router
}
