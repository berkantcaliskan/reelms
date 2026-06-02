import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { corsOrigins, env } from '../config/env.js'
import { verifyIdToken } from '../modules/auth/authService.js'
import { logger } from '../lib/logger.js'

type ReelmsSocket = Socket & { uid?: string; _vcRoom?: string | null; _vcReelmId?: string | null; _vcChannelId?: string | null }

export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true, methods: ['GET', 'POST'] }
  })

  if (env.REDIS_URL) {
    const pubClient = new Redis(env.REDIS_URL)
    const subClient = pubClient.duplicate()
    io.adapter(createAdapter(pubClient, subClient))
    logger.info('socket redis adapter enabled')
  } else {
    logger.warn('socket redis adapter disabled; single-node realtime only')
  }

  io.use(async (socket: ReelmsSocket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (token) { socket.uid = await verifyIdToken(String(token)); return next() }
      if (process.env.NODE_ENV !== 'production' && process.env.REELMS_DEV_UID && socket.handshake.auth?.devUid === process.env.REELMS_DEV_UID) {
        socket.uid = process.env.REELMS_DEV_UID
        return next()
      }
      return next(new Error('unauthorized'))
    } catch { return next(new Error('unauthorized')) }
  })

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as ReelmsSocket
    if (!socket.uid) { socket.disconnect(); return }
    logger.info('socket connected', socket.id, 'uid', socket.uid)
    socket.join(`u:${socket.uid}`)
    socket.join('app')

    socket.on('joinReelm', (reelmId) => { if (typeof reelmId === 'string' && reelmId) socket.join(`reelm:${reelmId}`) })
    socket.on('leaveReelm', (reelmId) => { if (typeof reelmId === 'string') socket.leave(`reelm:${reelmId}`) })
    socket.on('joinChannel', (msgKey) => { if (typeof msgKey === 'string' && msgKey) socket.join(`chan:${msgKey}`) })
    socket.on('leaveChannel', (msgKey) => { if (typeof msgKey === 'string') socket.leave(`chan:${msgKey}`) })

    socket.on('voicePosition', ({ reelmId, channelId, x, y }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
      if (typeof x !== 'number' || typeof y !== 'number') return
      const msgKey = `${reelmId}_vc_${channelId}`
      io.to(`chan:${msgKey}`).emit('voicePosition', { userId: socket.uid, reelmId, channelId, x, y })
    })

    socket.on('vc:join', ({ reelmId, channelId, userName, userPhoto }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
      const room = `vc:${reelmId}_${channelId}`
      socket.to(room).emit('vc:event', { type: 'join', from: socket.uid, userName, userPhoto })
      socket.join(room)
      socket._vcRoom = room; socket._vcReelmId = reelmId; socket._vcChannelId = channelId
      const count = io.sockets.adapter.rooms.get(room)?.size || 0
      io.to(`reelm:${reelmId}`).emit('vc:count', { channelId, count })
    })

    socket.on('vc:leave', ({ reelmId, channelId }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
      const room = `vc:${reelmId}_${channelId}`
      socket.to(room).emit('vc:event', { type: 'leave', from: socket.uid })
      socket.leave(room)
      socket._vcRoom = null
      const count = io.sockets.adapter.rooms.get(room)?.size || 0
      io.to(`reelm:${reelmId}`).emit('vc:count', { channelId, count })
      socket._vcReelmId = null; socket._vcChannelId = null
    })

    socket.on('vc:counts', ({ reelmId }) => {
      if (typeof reelmId !== 'string') return
      const prefix = `vc:${reelmId}_`
      const counts: Record<string, number> = {}
      for (const [roomName, room] of io.sockets.adapter.rooms) {
        if (roomName.startsWith(prefix)) counts[roomName.slice(prefix.length)] = room.size
      }
      socket.emit('vc:counts', { reelmId, counts })
    })

    socket.on('vc:signal', ({ to, payload }) => {
      if (typeof to !== 'string' || !payload || typeof payload !== 'object') return
      io.to(`u:${to}`).emit('vc:event', { ...payload, from: socket.uid })
    })

    socket.on('vc:broadcast', ({ reelmId, channelId, payload }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string' || !payload || typeof payload !== 'object') return
      socket.to(`vc:${reelmId}_${channelId}`).emit('vc:event', { ...payload, from: socket.uid })
    })

    socket.on('disconnect', () => {
      if (socket._vcRoom) {
        socket.to(socket._vcRoom).emit('vc:event', { type: 'leave', from: socket.uid })
        const count = Math.max(0, (io.sockets.adapter.rooms.get(socket._vcRoom)?.size || 1) - 1)
        if (socket._vcReelmId && socket._vcChannelId) io.to(`reelm:${socket._vcReelmId}`).emit('vc:count', { channelId: socket._vcChannelId, count })
      }
      logger.info('socket disconnected', socket.id)
    })
  })

  return io
}
