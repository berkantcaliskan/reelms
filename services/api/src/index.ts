import http from 'node:http'
import express from 'express'
import { env } from './config/env.js'
import { createApp } from './http/app.js'
import { attachSocketServer } from './socket/socket.js'
import { logger } from './lib/logger.js'
import { ensureDefaultReelm } from './modules/reelms/defaultReelm.js'
import { closeDocStore, initDocStore } from './modules/store/docStore.js'

const bootstrapApp = express()
const server = http.createServer(bootstrapApp)
const io = attachSocketServer(server)
const app = createApp(io)

server.removeAllListeners('request')
server.on('request', app)

await initDocStore()
await ensureDefaultReelm().catch((err) => logger.error('[DefaultReelm] startup error:', err))

server.listen(env.PORT, env.HOST, () => {
  logger.info(`API listening on ${env.PUBLIC_API_URL} host=${env.HOST} port=${env.PORT} env=${env.NODE_ENV}`)
})

async function shutdown(signal: string) {
  logger.info(`${signal} received; closing server`)
  server.close(async () => {
    await closeDocStore().catch((err) => logger.error('doc store close failed', err))
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('forced shutdown after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('unhandledRejection', (err) => logger.error('unhandled rejection', err))
process.on('uncaughtException', (err) => {
  logger.error('uncaught exception', err)
  void shutdown('uncaughtException')
})
