import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex').slice(0, 24)
}

function clientKey(req: Request) {
  const auth = String(req.headers.authorization || '')
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (req.userId) return `u:${String(req.userId)}`
  if (bearer) return `tok:${hashToken(bearer)}`
  return `ip:${String(req.ip || req.headers['x-forwarded-for'] || 'anonymous')}`
}

export function createRateLimit(options: { name: string; max: number; windowMs?: number; skip?: (req: Request) => boolean }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') return next()
    if (options.skip?.(req)) return next()
    if (env.NODE_ENV === 'test' || env.RATE_LIMIT_DISABLED) return next()

    const now = Date.now()
    const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS
    const key = `${options.name}:${clientKey(req)}`
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    bucket.count += 1
    if (bucket.count > options.max) {
      res.setHeader('retry-after', Math.ceil((bucket.resetAt - now) / 1000))
      return res.status(429).json({ error: 'rate_limited' })
    }

    return next()
  }
}

export const authRateLimit = createRateLimit({ name: 'auth', max: env.RATE_LIMIT_AUTH_MAX })
export const trackingRateLimit = createRateLimit({ name: 'track', max: Math.max(120, Math.floor(env.RATE_LIMIT_API_MAX / 2)), windowMs: env.RATE_LIMIT_WINDOW_MS })
export const apiRateLimit = createRateLimit({
  name: 'api',
  max: env.RATE_LIMIT_API_MAX,
  // Client-side analytics must never consume the normal API bucket.
  // It has its own lightweight route-level limiter in app.ts.
  skip: (req) => {
    const originalPath = String(req.originalUrl || '').split('?')[0]
    return originalPath === '/api/v1/track' || req.path === '/track'
  }
})
