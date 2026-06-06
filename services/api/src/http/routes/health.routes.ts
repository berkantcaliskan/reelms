import { Router } from 'express'
import { env } from '../../config/env.js'
import { objectStorageConfigured } from '../../modules/storage/objectStorage.js'
import { getDocStoreStatus } from '../../modules/store/docStore.js'

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
  const docStore = getDocStoreStatus()
  const checks = {
    http: true,
    storageDriver: env.REELMS_STORAGE_DRIVER,
    docStore,
    supabaseConfigured: env.REELMS_STORAGE_DRIVER !== 'supabase' || Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    s3Configured: objectStorageConfigured(),
    emailConfigured: env.EMAIL_PROVIDER === 'console' || Boolean(env.RESEND_API_KEY),
    turnConfigured: !env.TURN_URLS || Boolean(env.TURN_USERNAME && env.TURN_CREDENTIAL)
  }
  const ok = checks.http && checks.supabaseConfigured && checks.emailConfigured && checks.turnConfigured && docStore.ready
  res.status(ok ? 200 : 503).json({ ok, checks, time: new Date().toISOString() })
})
