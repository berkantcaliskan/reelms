import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id']
  req.requestId = typeof incoming === 'string' && incoming.length < 128 ? incoming : crypto.randomUUID()
  res.setHeader('x-request-id', req.requestId)
  next()
}
