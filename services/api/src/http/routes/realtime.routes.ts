import { Router } from 'express'

export const realtimeRouter = Router()

realtimeRouter.get('/status', (_req, res) => {
  res.json({ ok: true, transport: 'socket.io' })
})
