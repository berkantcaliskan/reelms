import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { corsOrigins, env } from '../config/env.js'
import { verifyIdToken } from '../modules/auth/authService.js'
import { getMessageKeyAccess, getReelmChannel, getUserPublicProfile, isReelmMember } from '../modules/reelms/access.js'
import { getDoc, reelmPk } from '../modules/store/docStore.js'
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
      if (token) {
        socket.uid = await verifyIdToken(String(token))
        socket.data.uid = socket.uid
        return next()
      }
      if (process.env.NODE_ENV !== 'production' && process.env.REELMS_DEV_UID && socket.handshake.auth?.devUid === process.env.REELMS_DEV_UID) {
        socket.uid = process.env.REELMS_DEV_UID
        socket.data.uid = socket.uid
        return next()
      }
      return next(new Error('unauthorized'))
    } catch { return next(new Error('unauthorized')) }
  })

  const getRoomCount = async (room: string) => (await io.in(room).fetchSockets()).length

  const emitVcCount = async (reelmId: string, channelId: string, room: string) => {
    const count = await getRoomCount(room)
    io.to(`reelm:${reelmId}`).emit('vc:count', { channelId, count })
  }

  const getVoiceChannelIds = async (reelmId: string): Promise<string[]> => {
    const structure = await getDoc<any>(reelmPk(reelmId), 'structure').catch(() => null)
    const categories = Array.isArray(structure?.categories) ? structure.categories : []
    return categories.flatMap((category: any) => Array.isArray(category?.channels) ? category.channels : [])
      .filter((channel: any) => String(channel?.type || '') === 'voice' && channel?.id)
      .map((channel: any) => String(channel.id))
  }

  const leaveCurrentVc = async (socket: ReelmsSocket) => {
    if (!socket._vcRoom) return
    const room = socket._vcRoom
    const reelmId = socket._vcReelmId
    const channelId = socket._vcChannelId
    socket.to(room).emit('vc:event', { type: 'leave', from: socket.uid })
    socket.leave(room)
    socket._vcRoom = null
    socket._vcReelmId = null
    socket._vcChannelId = null
    if (reelmId && channelId) await emitVcCount(reelmId, channelId, room).catch((err) => logger.warn('vc:count emit failed', err))
  }

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as ReelmsSocket
    if (!socket.uid) { socket.disconnect(); return }
    socket.data.uid = socket.uid
    logger.info('socket connected', socket.id, 'uid', socket.uid)
    socket.join(`u:${socket.uid}`)
    socket.join('app')

    socket.on('joinReelm', async (reelmId) => {
      try {
        if (typeof reelmId !== 'string' || !reelmId) return
        if (!await isReelmMember(String(socket.uid), reelmId)) return
        socket.join(`reelm:${reelmId}`)
      } catch (err) { logger.warn('joinReelm denied', err) }
    })

    socket.on('leaveReelm', (reelmId) => { if (typeof reelmId === 'string') socket.leave(`reelm:${reelmId}`) })

    socket.on('joinChannel', async (msgKey) => {
      try {
        if (typeof msgKey !== 'string' || !msgKey) return
        const access = await getMessageKeyAccess(String(socket.uid), msgKey)
        if (!access.ok) return
        socket.join(`chan:${msgKey}`)
      } catch (err) { logger.warn('joinChannel denied', err) }
    })

    socket.on('leaveChannel', (msgKey) => { if (typeof msgKey === 'string') socket.leave(`chan:${msgKey}`) })

    socket.on('voicePosition', ({ reelmId, channelId, x, y }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
      if (typeof x !== 'number' || typeof y !== 'number') return
      if (socket._vcReelmId !== reelmId || socket._vcChannelId !== channelId) return
      const msgKey = `${reelmId}_vc_${channelId}`
      io.to(`chan:${msgKey}`).emit('voicePosition', { userId: socket.uid, reelmId, channelId, x, y })
    })

    socket.on('vc:join', async ({ reelmId, channelId }) => {
      try {
        if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
        if (!await isReelmMember(String(socket.uid), reelmId)) return
        const channel = await getReelmChannel(reelmId, channelId)
        if (!channel || String(channel.type || '') !== 'voice') return

        const room = `vc:${reelmId}_${channelId}`
        if (socket._vcRoom && socket._vcRoom !== room) await leaveCurrentVc(socket)
        if (socket._vcRoom === room) return

        const capacity = Number(channel.capacity || 0)
        const current = await getRoomCount(room)
        if (capacity > 0 && current >= capacity) {
          socket.emit('vc:error', { reelmId, channelId, error: 'channel_full' })
          return
        }

        const profile = await getUserPublicProfile(String(socket.uid))
        socket.join(room)
        socket._vcRoom = room
        socket._vcReelmId = reelmId
        socket._vcChannelId = channelId
        socket.to(room).emit('vc:event', { type: 'join', from: socket.uid, userName: profile.name || profile.username || 'Member', userPhoto: profile.photo || null })
        await emitVcCount(reelmId, channelId, room)
      } catch (err) { logger.warn('vc:join denied', err) }
    })

    socket.on('vc:leave', async ({ reelmId, channelId }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
      if (socket._vcReelmId !== reelmId || socket._vcChannelId !== channelId) return
      await leaveCurrentVc(socket)
    })

    socket.on('vc:counts', async ({ reelmId }) => {
      try {
        if (typeof reelmId !== 'string') return
        if (!await isReelmMember(String(socket.uid), reelmId)) return
        const voiceChannelIds = await getVoiceChannelIds(reelmId)
        const counts: Record<string, number> = {}
        await Promise.all(voiceChannelIds.map(async (channelId) => {
          counts[channelId] = await getRoomCount(`vc:${reelmId}_${channelId}`)
        }))
        socket.emit('vc:counts', { reelmId, counts })
      } catch (err) { logger.warn('vc:counts denied', err) }
    })

    socket.on('vc:signal', async ({ to, payload }) => {
      try {
        if (typeof to !== 'string' || !payload || typeof payload !== 'object') return
        if (!socket._vcRoom) return
        const peers = await io.in(socket._vcRoom).fetchSockets()
        if (!peers.some((peer) => String(peer.data?.uid || '') === to)) return
        io.to(`u:${to}`).emit('vc:event', { ...payload, from: socket.uid })
      } catch (err) { logger.warn('vc:signal denied', err) }
    })

    socket.on('vc:broadcast', ({ reelmId, channelId, payload }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string' || !payload || typeof payload !== 'object') return
      const room = `vc:${reelmId}_${channelId}`
      if (socket._vcRoom !== room) return
      socket.to(room).emit('vc:event', { ...payload, from: socket.uid })
    })

    socket.on('disconnecting', () => {
      if (socket._vcRoom) socket.to(socket._vcRoom).emit('vc:event', { type: 'leave', from: socket.uid })
    })

    socket.on('disconnect', () => {
      if (socket._vcRoom && socket._vcReelmId && socket._vcChannelId) {
        void emitVcCount(socket._vcReelmId, socket._vcChannelId, socket._vcRoom).catch((err) => logger.warn('vc:disconnect count failed', err))
      }
      logger.info('socket disconnected', socket.id)
    })
  })

  return io
}
