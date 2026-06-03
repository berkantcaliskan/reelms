import type { NextFunction, Request, Response } from 'express'
import { logger } from '../../lib/logger.js'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    const log = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    }
    if (res.statusCode >= 500) logger.error('http_request', log)
    else if (res.statusCode >= 400) logger.warn('http_request', log)
    else logger.info('http_request', log)
  })
  next()
}
