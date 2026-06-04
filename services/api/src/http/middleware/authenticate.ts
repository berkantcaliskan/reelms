import type { NextFunction, Request, Response } from 'express'
import { verifyIdToken } from '../../modules/auth/authService.js'

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
    // JWT session id is the source of truth. Do not invalidate HTTP requests
    // only because the browser tab reloaded and received a new client id.
    // The previous active-client check made in-flight requests from an older
    // tab/reload return auth/session-replaced and the web client signed itself
    // out even though the JWT session was still valid.
    req.userId = await verifyIdToken(h.slice(7))
    return next()
  } catch (err: any) {
    const code = err?.code || err?.message
    if (code === 'auth/session-replaced' || code === 'session_replaced') {
      return res.status(401).json({ error: 'session_replaced', code: 'auth/session-replaced', message: 'This account was signed in somewhere else.' })
    }
    return res.status(401).json({ error: 'invalid_token', code: 'auth/invalid-token' })
  }
}
