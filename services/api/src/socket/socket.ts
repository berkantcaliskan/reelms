import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { corsOrigins, env } from '../config/env.js'
import { claimActiveClient, verifyIdToken } from '../modules/auth/authService.js'
import { getActiveReelmTimeout, getMessageKeyAccess, getReelmChannel, getUserPublicProfile, isReelmMember } from '../modules/reelms/access.js'
import { getDoc, reelmPk } from '../modules/store/docStore.js'
import { logger } from '../lib/logger.js'

type ReelmsSocket = Socket & { uid?: string; clientId?: string | null; _vcRoom?: string | null; _vcReelmId?: string | null; _vcChannelId?: string | null; _vcUserName?: string | null; _vcUserPhoto?: string | null }

const STATUS_VALUES = new Set(['online', 'idle', 'busy', 'invisible', 'offline'])

export function attachSocketServer(httpServer?: HttpServer) {
  const io = new Server({
    cors: { origin: corsOrigins, credentials: true, methods: ['GET', 'POST'] },
    path: '/socket.io'
  })
  if (httpServer) io.attach(httpServer)

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
        const clientId = String(socket.handshake.auth?.clientId || '').trim()
        if (!clientId) throw new Error('missing_client_id')
        socket.clientId = clientId
        socket.data.uid = socket.uid
        socket.data.clientId = clientId
        await claimActiveClient(String(socket.uid), clientId, 'socket').catch(() => null)
        return next()
      }
      if (process.env.NODE_ENV !== 'production' && process.env.REELMS_DEV_UID && socket.handshake.auth?.devUid === process.env.REELMS_DEV_UID) {
        socket.uid = process.env.REELMS_DEV_UID
        socket.data.uid = socket.uid
        return next()
      }
      return next(new Error('unauthorized'))
    } catch (err: any) {
      const code = err?.code || err?.message
      const authError = new Error(code === 'auth/session-replaced' || code === 'session_replaced' ? 'session_replaced' : 'unauthorized') as any
      authError.data = { code: authError.message === 'session_replaced' ? 'auth/session-replaced' : 'auth/unauthorized' }
      return next(authError)
    }
  })

  const getRoomCount = async (room: string) => (await io.in(room).fetchSockets()).length

  const getVoiceCounts = async (reelmId: string) => {
    const voiceChannelIds = await getVoiceChannelIds(reelmId)
    const counts: Record<string, number> = {}
    await Promise.all(voiceChannelIds.map(async (channelId) => {
      counts[channelId] = await getRoomCount(`vc:${reelmId}_${channelId}`)
    }))
    return counts
  }

  const emitVcCount = async (reelmId: string, channelId: string, room: string, target?: ReelmsSocket) => {
    const count = await getRoomCount(room)
    const payload = { reelmId, channelId, count }
    io.to(`reelm:${reelmId}`).emit('vc:count', payload)
    target?.emit('vc:count', payload)
  }

  const emitVcCounts = async (socket: ReelmsSocket, reelmId: string) => {
    socket.emit('vc:counts', { reelmId, counts: await getVoiceCounts(reelmId) })
  }

  const getReelmPresence = async (reelmId: string) => {
    const peers = await io.in(`reelm:${reelmId}`).fetchSockets()
    const byUser = new Map<string, { userId: string; status: string; userName: string; userPhoto: any; sockets: number }>()
    for (const peer of peers) {
      const userId = String(peer.data?.uid || '')
      if (!userId) continue
      const status = String(peer.data?.presenceStatus || 'online')
      if (status === 'invisible' || status === 'offline') continue
      const existing = byUser.get(userId)
      if (existing) { existing.sockets += 1; continue }
      byUser.set(userId, {
        userId,
        status: STATUS_VALUES.has(status) ? status : 'online',
        userName: String(peer.data?.userName || 'Member'),
        userPhoto: peer.data?.userPhoto || null,
        sockets: 1
      })
    }
    return Array.from(byUser.values())
  }

  const emitPresence = async (reelmId: string, target?: ReelmsSocket) => {
    const payload = { reelmId, users: await getReelmPresence(reelmId) }
    if (target) target.emit('reelms:presence', payload)
    else io.to(`reelm:${reelmId}`).emit('reelms:presence:update', payload)
  }

  const emitPresenceLater = (reelmId: string) => {
    setTimeout(() => { void emitPresence(reelmId).catch((err) => logger.warn('presence emit failed', err)) }, 0)
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
    socket._vcUserName = null
    socket._vcUserPhoto = null
    if (reelmId && channelId) await emitVcCount(reelmId, channelId, room).catch((err) => logger.warn('vc:count emit failed', err))
  }

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as ReelmsSocket
    if (!socket.uid) { socket.disconnect(); return }
    socket.data.uid = socket.uid
    socket.data.presenceStatus = 'online'
    socket.data.joinedReelms = new Set<string>()
    getUserPublicProfile(String(socket.uid)).then((profile) => {
      socket.data.userName = profile.name || profile.username || 'Member'
      socket.data.userPhoto = profile.photo || null
    }).catch(() => {})
    logger.info('socket connected', socket.id, 'uid', socket.uid)
    socket.join(`u:${socket.uid}`)
    socket.join('app')
    void io.in(`u:${socket.uid}`).fetchSockets().then((peers) => {
      for (const peer of peers) {
        if (peer.id === socket.id) continue
        if (String(peer.data?.uid || '') !== String(socket.uid)) continue
        if (String(peer.data?.clientId || '') === String(socket.clientId || '')) continue
        peer.emit('auth:session-replaced', { code: 'auth/session-replaced', message: 'This account was opened in another tab or window.' })
        peer.disconnect(true)
      }
    }).catch((err) => logger.warn('socket session replacement check failed', err))

    socket.on('joinReelm', async (reelmId) => {
      try {
        if (typeof reelmId !== 'string' || !reelmId) return
        if (!await isReelmMember(String(socket.uid), reelmId)) return
        const profile = await getUserPublicProfile(String(socket.uid)).catch(() => null)
        if (profile) {
          socket.data.userName = profile.name || profile.username || 'Member'
          socket.data.userPhoto = profile.photo || null
        }
        socket.join(`reelm:${reelmId}`)
        socket.data.joinedReelms?.add(reelmId)
        await emitVcCounts(socket, reelmId).catch((err) => logger.warn('vc:counts emit failed', err))
        await emitPresence(reelmId, socket).catch((err) => logger.warn('presence state failed', err))
        emitPresenceLater(reelmId)
      } catch (err) { logger.warn('joinReelm denied', err) }
    })

    socket.on('leaveReelm', (reelmId) => {
      if (typeof reelmId !== 'string') return
      socket.leave(`reelm:${reelmId}`)
      socket.data.joinedReelms?.delete(reelmId)
      emitPresenceLater(reelmId)
    })

    socket.on('presence:setStatus', async ({ status }) => {
      const next = STATUS_VALUES.has(String(status)) ? String(status) : 'online'
      socket.data.presenceStatus = next
      const rooms = Array.from(socket.data.joinedReelms || []) as string[]
      rooms.forEach((reelmId) => emitPresenceLater(reelmId))
    })

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
        const timeout = await getActiveReelmTimeout(String(socket.uid), reelmId).catch(() => null)
        if (timeout) {
          socket.emit('vc:error', { reelmId, channelId, error: 'reelm_timeout', timeout })
          return
        }
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
        const displayName = profile.name || profile.username || 'Member'
        const displayPhoto = profile.photo || null
        socket.join(`reelm:${reelmId}`)
        socket.join(`chan:${reelmId}_vc_${channelId}`)
        socket.join(room)
        socket._vcRoom = room
        socket._vcReelmId = reelmId
        socket._vcChannelId = channelId
        socket._vcUserName = displayName
        socket._vcUserPhoto = displayPhoto
        socket.data.userName = displayName
        socket.data.userPhoto = displayPhoto
        socket.to(room).emit('vc:event', { type: 'join', from: socket.uid, userName: displayName, userPhoto: displayPhoto })
        const peers = await io.in(room).fetchSockets()
        socket.emit('vc:state', {
          reelmId,
          channelId,
          participants: peers.map((peer) => ({
            userId: String(peer.data?.uid || ''),
            userName: String(peer.data?.userName || 'Member'),
            userPhoto: peer.data?.userPhoto || null
          })).filter((peer) => peer.userId)
        })
        await emitVcCount(reelmId, channelId, room, socket)
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
        await emitVcCounts(socket, reelmId)
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
      const joinedReelms = Array.from(socket.data.joinedReelms || []) as string[]
      joinedReelms.forEach((reelmId) => emitPresenceLater(reelmId))
      if (socket._vcRoom && socket._vcReelmId && socket._vcChannelId) {
        void emitVcCount(socket._vcReelmId, socket._vcChannelId, socket._vcRoom).catch((err) => logger.warn('vc:disconnect count failed', err))
      }
      logger.info('socket disconnected', socket.id)
    })
  })

  return io
}
