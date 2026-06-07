import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
let lastSweepAt = 0

function firstForwardedFor(req: Request) {
  const raw = req.headers['x-forwarded-for']
  if (Array.isArray(raw)) return raw[0]?.split(',')[0]?.trim()
  return String(raw || '').split(',')[0]?.trim()
}

function clientKey(req: Request) {
  // Authenticated /api/v1 traffic reaches this middleware after authenticate(),
  // so req.userId is stable and avoids punishing all users behind the same proxy/IP.
  const userId = String(req.userId || '').trim()
  if (userId) return `u:${userId}`
  return `ip:${req.ip || firstForwardedFor(req) || 'anonymous'}`
}

export function createRateLimit(options: { name: string; max: number; windowMs?: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.NODE_ENV === 'test' || env.RATE_LIMIT_DISABLED) return next()

    const now = Date.now()
    const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS

    // Cheap periodic cleanup so long-running API processes do not retain old IP/user buckets forever.
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
export const apiRateLimit = createRateLimit({ name: 'api', max: env.RATE_LIMIT_API_MAX })
