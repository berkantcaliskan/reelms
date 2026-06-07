import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Server } from 'socket.io'
import { corsOrigins, env } from '../config/env.js'
import { healthRouter } from './routes/health.routes.js'
import { authRouter } from './routes/auth.routes.js'
import { realtimeRouter } from './routes/realtime.routes.js'
import { createReelmsDataRouter } from './routes/reelms-data.routes.js'
import { createSocialRouter } from './routes/social.routes.js'
import { moderationRouter } from './routes/moderation.routes.js'
import { createSpotifyRouter } from './routes/spotify.routes.js'
import { debugRouter } from './routes/debug.routes.js'
import { clientRouter } from './routes/client.routes.js'
import { botRouter } from './routes/bot.routes.js'
import { requestContext } from './middleware/requestContext.js'
import { requestLogger } from './middleware/requestLogger.js'
import { apiRateLimit, authRateLimit } from './middleware/rateLimit.js'
import { errorHandler, notFoundHandler } from './utils/errors.js'

export function createApp(io?: Server) {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(requestLogger)
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
  }))
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }))
  app.use(express.urlencoded({ extended: true, limit: env.JSON_BODY_LIMIT }))
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (corsOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true
  }))

  app.use('/health', healthRouter)
  app.use(botRouter)
  app.use('/auth', authRateLimit, authRouter)
  app.use('/realtime', realtimeRouter)
  app.use('/api/v1/debug', debugRouter)
  app.use('/api/v1/client', apiRateLimit, clientRouter)
  app.use(apiRateLimit, moderationRouter)

  if (io) {
    app.use(createSpotifyRouter(io))
    // /api/v1 routers authenticate first, then apply apiRateLimit internally.
    // This keeps normal app traffic user-based instead of proxy/IP-based.
    app.use('/api/v1/social', createSocialRouter(io))
    app.use('/api/v1', createReelmsDataRouter(io))
  }

  // Compatibility: old web client calls /google/login and /callback/google.
  // Must come AFTER Spotify/API routers — those respond and stop the chain,
  // so /spotify/* and /api/v1/* never reach authRateLimit here.
  app.use(authRateLimit, authRouter)

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'Reelms API', message: 'Reelms Server Ready' })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
