import { Router } from 'express'
import { logger } from '../../lib/logger.js'

export const clientRouter = Router()

clientRouter.post('/render-error', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  logger.warn('client_render_error', {
    boundary: String(body.boundary || '').slice(0, 80),
    name: String(body.name || '').slice(0, 120),
    message: String(body.message || '').slice(0, 800),
    route: String(body.route || '').slice(0, 300),
    componentStack: String(body.componentStack || '').slice(0, 2000),
    appVersion: body.appVersion || null,
    userAgent: String(body.userAgent || '').slice(0, 300),
    at: Number(body.at || Date.now())
  })
  res.json({ ok: true })
})
