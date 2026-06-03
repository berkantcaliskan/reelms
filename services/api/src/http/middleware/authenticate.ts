import type { NextFunction, Request, Response } from 'express'
import { assertActiveClient, verifyIdToken } from '../../modules/auth/authService.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string | null
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token', code: 'auth/missing-token' })
  try {
    req.userId = await verifyIdToken(h.slice(7))
    await assertActiveClient(req.userId, String(req.headers['x-reelms-client-id'] || ''))
    return next()
  } catch (err: any) {
    const code = err?.code || err?.message
    if (code === 'auth/session-replaced' || code === 'session_replaced') {
      return res.status(401).json({ error: 'session_replaced', code: 'auth/session-replaced', message: 'This account was signed in somewhere else.' })
    }
    return res.status(401).json({ error: 'invalid_token', code: 'auth/invalid-token' })
  }
}
