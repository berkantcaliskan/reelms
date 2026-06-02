import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message = code,
    public details?: unknown
  ) {
    super(message)
  }
}

export function asyncRoute<T extends Request = Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'not_found', `Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'validation_failed', issues: err.issues })
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message, details: err.details })
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  logger.error('unhandled error', req.method, req.originalUrl, message)
  return res.status(500).json({
    error: 'internal_server_error',
    message: env.NODE_ENV === 'production' ? 'Internal server error' : message
  })
}
