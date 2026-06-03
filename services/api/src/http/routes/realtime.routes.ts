import { Router } from 'express'
import { env } from '../../config/env.js'

export const realtimeRouter = Router()

function splitUrls(value: string) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

realtimeRouter.get('/status', (_req, res) => {
  res.json({ ok: true, transport: 'socket.io' })
})

realtimeRouter.get('/ice-servers', (_req, res) => {
  const iceServers: Array<Record<string, unknown>> = []
  const stunUrls = splitUrls(env.STUN_URLS)
  if (stunUrls.length) iceServers.push({ urls: stunUrls })
  const turnUrls = splitUrls(env.TURN_URLS)
  if (turnUrls.length && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    iceServers.push({ urls: turnUrls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL })
  }
  res.json({ ok: true, data: { iceServers } })
})
