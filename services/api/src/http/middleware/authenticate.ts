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
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' })
  try {
    req.userId = await verifyIdToken(h.slice(7))
    return next()
  } catch {
    return res.status(401).json({ error: 'invalid_token' })
  }
}
