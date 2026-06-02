import { Router } from 'express'
import { env } from '../../config/env.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'api',
    environment: env.NODE_ENV,
    version: process.env.npm_package_version ?? '0.1.0',
    time: new Date().toISOString()
  })
})

healthRouter.get('/ready', (_req, res) => {
  // Later: check Postgres, Redis, S3, required envs.
  res.json({ ok: true, checks: { http: true } })
})
