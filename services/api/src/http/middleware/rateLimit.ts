import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
let lastSweepAt = 0

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex').slice(0, 24)
}

function firstForwardedFor(req: Request) {
  const raw = req.headers['x-forwarded-for']
  if (Array.isArray(raw)) return raw[0]?.split(',')[0]?.trim()
  return String(raw || '').split(',')[0]?.trim()
}

function clientKey(req: Request) {
  const userId = String(req.userId || '').trim()
  if (userId) return `u:${userId}`
  const auth = String(req.headers.authorization || '')
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (bearer) return `tok:${hashToken(bearer)}`
  return `ip:${req.ip || firstForwardedFor(req) || 'anonymous'}`
}

export function createRateLimit(options: { name: string; max: number; windowMs?: number; skip?: (req: Request) => boolean }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') return next()
    if (options.skip?.(req)) return next()
    if (env.NODE_ENV === 'test' || env.RATE_LIMIT_DISABLED) return next()

    const now = Date.now()
    const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS
    if (now - lastSweepAt > windowMs) {
      lastSweepAt = now
      for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) buckets.delete(key)
      }
    }

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
export const trackingRateLimit = createRateLimit({ name: 'track', max: Math.max(600, env.RATE_LIMIT_API_MAX), windowMs: env.RATE_LIMIT_WINDOW_MS })
export const apiRateLimit = createRateLimit({
  name: 'api',
  max: env.RATE_LIMIT_API_MAX,
  skip: (req) => {
    const originalPath = String(req.originalUrl || '').split('?')[0]
    return originalPath === '/api/v1/track' || req.path === '/track'
  }
})
