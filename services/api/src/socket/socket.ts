import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
import { corsOrigins, env } from '../config/env.js'
import { claimActiveClient, verifyIdToken } from '../modules/auth/authService.js'
import { canUseReelmPermission, getActiveReelmTimeout, getMessageKeyAccess, getReelmChannel, getUserPublicProfile, isElevatedReelmRole, isReelmMember } from '../modules/reelms/access.js'
import { getDoc, putDoc, reelmPk, userPk } from '../modules/store/docStore.js'
import { logger } from '../lib/logger.js'

type ReelmsSocket = Socket & { uid?: string; clientId?: string | null; _vcRoom?: string | null; _vcReelmId?: string | null; _vcChannelId?: string | null; _vcUserName?: string | null; _vcUserPhoto?: string | null; _vcLastSeenAt?: number | null }

const STATUS_VALUES = new Set(['online', 'idle', 'busy', 'invisible', 'offline'])
const VOICE_HEARTBEAT_TIMEOUT_MS = 45_000
const VOICE_SWEEP_INTERVAL_MS = 15_000
const VOICE_INVITE_COOLDOWN_MS = 30_000
const voiceInviteCooldowns = new Map<string, number>()

export function attachSocketServer(httpServer?: HttpServer) {
  const io = new Server({
    cors: { origin: corsOrigins, credentials: true, methods: ['GET', 'POST'] },
    path: '/socket.io',
    // Discord-like realtime behavior: dead tabs are detected by Socket.IO, and
    // voice membership has its own shorter heartbeat so users cannot remain in
    // a voice room forever after a tab/browser crash or network drop.
    pingInterval: 25_000,
    pingTimeout: 20_000
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


  const canSendVoiceInviteNow = (actorUid: string, targetUid: string, reelmId: string, channelId: string) => {
    const key = `${actorUid}:${targetUid}:${reelmId}:${channelId}`
    const now = Date.now()
    const last = voiceInviteCooldowns.get(key) || 0
    if (now - last < VOICE_INVITE_COOLDOWN_MS) return false
    voiceInviteCooldowns.set(key, now)
    if (voiceInviteCooldowns.size > 5000) {
      for (const [itemKey, ts] of voiceInviteCooldowns) if (now - ts > VOICE_INVITE_COOLDOWN_MS * 4) voiceInviteCooldowns.delete(itemKey)
    }
    return true
  }

  const getVoiceCounts = async (reelmId: string) => {
    const voiceChannelIds = await getVoiceChannelIds(reelmId)
    const counts: Record<string, number> = {}
    await Promise.all(voiceChannelIds.map(async (channelId) => {
      counts[channelId] = await getRoomCount(`vc:${reelmId}_${channelId}`)
    }))
    return counts
  }

  const getVoiceParticipants = async (reelmId: string, channelId: string) => {
    const peers = await io.in(`vc:${reelmId}_${channelId}`).fetchSockets()
    const byUser = new Map<string, { userId: string; userName: string; userPhoto: any }>()
    for (const peer of peers) {
      const userId = String(peer.data?.uid || '')
      if (!userId || byUser.has(userId)) continue
      byUser.set(userId, {
        userId,
        userName: String(peer.data?.userName || (peer as any)._vcUserName || 'Member'),
        userPhoto: peer.data?.userPhoto || (peer as any)._vcUserPhoto || null
      })
    }
    return Array.from(byUser.values())
  }

  const getVoiceParticipantsByChannel = async (reelmId: string) => {
    const voiceChannelIds = await getVoiceChannelIds(reelmId)
    const channels: Record<string, { userId: string; userName: string; userPhoto: any }[]> = {}
    await Promise.all(voiceChannelIds.map(async (channelId) => {
      channels[channelId] = await getVoiceParticipants(reelmId, channelId)
    }))
    return channels
  }

  const emitVcParticipants = async (reelmId: string, channelId: string, target?: ReelmsSocket) => {
    const payload = { reelmId, channelId, participants: await getVoiceParticipants(reelmId, channelId) }
    io.to(`reelm:${reelmId}`).emit('vc:participants', payload)
    target?.emit('vc:participants', payload)
  }

  const emitVcParticipantsForReelm = async (socket: ReelmsSocket, reelmId: string) => {
    socket.emit('vc:participants', { reelmId, channels: await getVoiceParticipantsByChannel(reelmId) })
  }

  const emitVcCount = async (reelmId: string, channelId: string, room: string, target?: ReelmsSocket) => {
    const count = await getRoomCount(room)
    const payload = { reelmId, channelId, count }
    io.to(`reelm:${reelmId}`).emit('vc:count', payload)
    target?.emit('vc:count', payload)
    await emitVcParticipants(reelmId, channelId, target).catch((err) => logger.warn('vc:participants emit failed', err))
  }

  const emitVcCounts = async (socket: ReelmsSocket, reelmId: string) => {
    socket.emit('vc:counts', { reelmId, counts: await getVoiceCounts(reelmId) })
    await emitVcParticipantsForReelm(socket, reelmId).catch((err) => logger.warn('vc:participants state failed', err))
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


  const pushUserNotification = async (uid: string, text: string, link: any = null) => {
    if (!uid) return
    const pk = userPk(uid)
    const current = (await getDoc<any[]>(pk, 'notifications').catch(() => [])) || []
    const next = [{ id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, text, time: Date.now(), link }, ...current].slice(0, 80)
    await putDoc(pk, 'notifications', next)
    io.to(`u:${uid}`).emit('reelms:doc', { scope: 'user', sk: 'notifications' })
  }

  const isProtectedVoiceTarget = async (reelmId: string, targetUid: string) => {
    const pk = reelmPk(reelmId)
    const [meta, members, roles] = await Promise.all([
      getDoc<any>(pk, 'meta').catch(() => null),
      getDoc<any[]>(pk, 'members').catch(() => []),
      getDoc<any[]>(pk, 'roles').catch(() => [])
    ])
    if (String(meta?.ownerId || '') === String(targetUid)) return true
    const targetMember = (members || []).find((member: any) => String(member?.userId || member?.id || '') === String(targetUid))
    const targetRoleIds = new Set((targetMember?.roleIds || []).map(String))
    return (roles || []).some((role: any) => targetRoleIds.has(String(role?.id || '')) && isElevatedReelmRole(role))
  }

  const getVoiceChannelIds = async (reelmId: string): Promise<string[]> => {
    const structure = await getDoc<any>(reelmPk(reelmId), 'structure').catch(() => null)
    const categories = Array.isArray(structure?.categories) ? structure.categories : []
    return categories.flatMap((category: any) => Array.isArray(category?.channels) ? category.channels : [])
      .filter((channel: any) => ['voice', 'video', 'liveaction', 'stage'].includes(String(channel?.type || '')) && channel?.id)
      .map((channel: any) => String(channel.id))
  }

  const leaveCurrentVc = async (socket: ReelmsSocket, reason = 'left') => {
    if (!socket._vcRoom) return
    const room = socket._vcRoom
    const reelmId = socket._vcReelmId
    const channelId = socket._vcChannelId
    socket.to(room).emit('vc:event', { type: 'leave', from: socket.uid, reason })
    socket.leave(room)
    if (reelmId && channelId) socket.leave(`chan:${reelmId}_vc_${channelId}`)
    socket._vcRoom = null
    socket._vcReelmId = null
    socket._vcChannelId = null
    socket._vcUserName = null
    socket._vcUserPhoto = null
    socket._vcLastSeenAt = null
    if (reelmId && channelId) await emitVcCount(reelmId, channelId, room).catch((err) => logger.warn('vc:count emit failed', err))
  }

  const sweepStaleVoiceSockets = () => {
    const now = Date.now()
    for (const raw of io.of('/').sockets.values()) {
      const peer = raw as ReelmsSocket
      if (!peer._vcRoom) continue
      const lastSeen = Number(peer._vcLastSeenAt || 0)
      if (lastSeen && now - lastSeen <= VOICE_HEARTBEAT_TIMEOUT_MS) continue
      const staleReelmId = peer._vcReelmId || null
      const staleChannelId = peer._vcChannelId || null
      void leaveCurrentVc(peer, 'stale').catch((err) => logger.warn('stale voice cleanup failed', err))
      peer.emit('vc:error', { reelmId: staleReelmId, channelId: staleChannelId, error: 'voice_stale' })
    }
  }

  const voiceSweepTimer = setInterval(sweepStaleVoiceSockets, VOICE_SWEEP_INTERVAL_MS)
  if (typeof (voiceSweepTimer as any).unref === 'function') (voiceSweepTimer as any).unref()

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
        if (!channel || !['voice', 'video', 'liveaction', 'stage'].includes(String(channel.type || ''))) return

        const room = `vc:${reelmId}_${channelId}`
        if (socket._vcRoom && socket._vcRoom !== room) await leaveCurrentVc(socket, 'switch')
        if (socket._vcRoom === room) {
          socket._vcLastSeenAt = Date.now()
          return
        }

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
        socket._vcLastSeenAt = Date.now()
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
      await leaveCurrentVc(socket, 'left')
    })

    socket.on('vc:heartbeat', ({ reelmId, channelId }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string') return
      if (socket._vcReelmId !== reelmId || socket._vcChannelId !== channelId || !socket._vcRoom) return
      socket._vcLastSeenAt = Date.now()
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
        const targetSockets = peers.filter((peer) => String(peer.data?.uid || '') === to)
        if (!targetSockets.length) return
        for (const peer of targetSockets) peer.emit('vc:event', { ...payload, from: socket.uid })
      } catch (err) { logger.warn('vc:signal denied', err) }
    })

    socket.on('vc:kick', async ({ reelmId, channelId, targetUid }) => {
      try {
        if (typeof reelmId !== 'string' || typeof channelId !== 'string' || typeof targetUid !== 'string') return
        if (String(targetUid) === String(socket.uid)) return
        const channel = await getReelmChannel(reelmId, channelId)
        if (!channel || !['voice', 'video', 'liveaction', 'stage'].includes(String(channel.type || ''))) return
        const actorCanVoice = await canUseReelmPermission(String(socket.uid), reelmId, 'manageVoice').catch(() => false)
        const actorCanModerate = actorCanVoice || await canUseReelmPermission(String(socket.uid), reelmId, 'manageModeration').catch(() => false)
        const actorIsFull = await canUseReelmPermission(String(socket.uid), reelmId, 'manageReelm').catch(() => false)
        if (!actorCanModerate) {
          socket.emit('vc:event', { type: 'voice_kick_denied', message: 'You do not have permission to manage voice rooms.' })
          return
        }
        if (!actorIsFull && await isProtectedVoiceTarget(reelmId, targetUid).catch(() => true)) {
          socket.emit('vc:event', { type: 'voice_kick_denied', message: 'You cannot remove a protected admin from voice.' })
          return
        }
        const room = `vc:${reelmId}_${channelId}`
        const targets = Array.from(io.of('/').sockets.values())
          .map((raw) => raw as ReelmsSocket)
          .filter((peer) => peer._vcRoom === room && String(peer.data?.uid || peer.uid || '') === String(targetUid))
        if (!targets.length) {
          socket.emit('vc:event', { type: 'voice_kick_denied', message: 'That member is no longer in this voice room.' })
          return
        }
        for (const peer of targets) {
          peer.emit('vc:event', { type: 'force_leave', reelmId, channelId, by: socket.uid, reason: 'kicked' })
          await leaveCurrentVc(peer, 'kicked')
        }
        await emitVcCount(reelmId, channelId, room).catch((err) => logger.warn('vc:kick count failed', err))
      } catch (err) { logger.warn('vc:kick denied', err) }
    })

    socket.on('vc:moderator-mute', async ({ reelmId, channelId, targetUid }) => {
      try {
        if (typeof reelmId !== 'string' || typeof channelId !== 'string' || typeof targetUid !== 'string') return
        if (String(targetUid) === String(socket.uid)) return
        const channel = await getReelmChannel(reelmId, channelId)
        if (!channel || !['voice', 'video', 'liveaction', 'stage'].includes(String(channel.type || ''))) return
        const actorCanVoice = await canUseReelmPermission(String(socket.uid), reelmId, 'manageVoice').catch(() => false)
        const actorCanModerate = actorCanVoice || await canUseReelmPermission(String(socket.uid), reelmId, 'manageModeration').catch(() => false)
        const actorIsFull = await canUseReelmPermission(String(socket.uid), reelmId, 'manageReelm').catch(() => false)
        if (!actorCanModerate) {
          socket.emit('vc:event', { type: 'voice_mute_denied', message: 'You do not have permission to mute voice members.' })
          return
        }
        if (!actorIsFull && await isProtectedVoiceTarget(reelmId, targetUid).catch(() => true)) {
          socket.emit('vc:event', { type: 'voice_mute_denied', message: 'You cannot mute a protected admin.' })
          return
        }
        const room = `vc:${reelmId}_${channelId}`
        const targets = Array.from(io.of('/').sockets.values())
          .map((raw) => raw as ReelmsSocket)
          .filter((peer) => peer._vcRoom === room && String(peer.data?.uid || peer.uid || '') === String(targetUid))
        for (const peer of targets) peer.emit('vc:event', { type: 'moderator_mute', reelmId, channelId, by: socket.uid })
      } catch (err) { logger.warn('vc:moderator-mute denied', err) }
    })

    socket.on('vc:move', async ({ reelmId, channelId, targetUid }) => {
      try {
        if (typeof reelmId !== 'string' || typeof channelId !== 'string' || typeof targetUid !== 'string') return
        if (String(targetUid) === String(socket.uid)) return
        const channel = await getReelmChannel(reelmId, channelId)
        if (!channel || !['voice', 'video', 'liveaction', 'stage'].includes(String(channel.type || ''))) return
        const actorCanVoice = await canUseReelmPermission(String(socket.uid), reelmId, 'manageVoice').catch(() => false)
        const actorCanModerate = actorCanVoice || await canUseReelmPermission(String(socket.uid), reelmId, 'manageModeration').catch(() => false)
        const actorIsFull = await canUseReelmPermission(String(socket.uid), reelmId, 'manageReelm').catch(() => false)
        if (!actorCanModerate) {
          socket.emit('vc:event', { type: 'voice_move_denied', message: 'You do not have permission to move voice members.' })
          return
        }
        if (!actorIsFull && await isProtectedVoiceTarget(reelmId, targetUid).catch(() => true)) {
          socket.emit('vc:event', { type: 'voice_move_denied', message: 'You cannot move a protected admin.' })
          return
        }
        if (!await isReelmMember(String(targetUid), reelmId).catch(() => false)) {
          socket.emit('vc:event', { type: 'voice_move_denied', message: 'That member is not in this Reelm.' })
          return
        }
        const targetRoom = `vc:${reelmId}_${channelId}`
        const targetSockets = Array.from(io.of('/').sockets.values())
          .map((raw) => raw as ReelmsSocket)
          .filter((peer) => String(peer.data?.uid || peer.uid || '') === String(targetUid))
        const sameRoom = targetSockets.some((peer) => peer._vcRoom === targetRoom)
        if (sameRoom) {
          socket.emit('vc:event', { type: 'voice_move_denied', message: 'That member is already in this voice room.' })
          return
        }
        const actor = await getUserPublicProfile(String(socket.uid)).catch(() => null)
        const onlineVoiceTargets = targetSockets.filter((peer) => peer._vcRoom)
        if (!onlineVoiceTargets.length) {
          if (!canSendVoiceInviteNow(String(socket.uid), targetUid, reelmId, channelId)) {
            socket.emit('vc:event', { type: 'voice_move_denied', message: 'Voice invite was already sent recently.' })
            return
          }
          const meta = await getDoc<any>(reelmPk(reelmId), 'meta').catch(() => null)
          const text = `${actor?.name || actor?.username || 'Someone'} invited you to ${meta?.name ? `${meta.name} / ` : ''}${String(channel.name || 'a voice room')}.`
          await pushUserNotification(targetUid, text, { type: 'reelm', reelmId, channelId, inviteKind: 'voice' }).catch((err) => logger.warn('voice move fallback invite failed', err))
          io.to(`u:${targetUid}`).emit('vc:event', { type: 'voice_invite', reelmId, channelId, channelName: String(channel.name || 'Voice'), senderId: socket.uid, senderName: actor?.name || actor?.username || 'Someone' })
          socket.emit('vc:event', { type: 'voice_move_denied', message: 'Member is not in a voice room, so an invite was sent instead.' })
          return
        }
        const capacity = Number((channel as any).capacity || 0)
        const current = await getRoomCount(targetRoom)
        if (capacity > 0 && current >= capacity) {
          socket.emit('vc:event', { type: 'voice_move_denied', message: 'Target voice room is full.' })
          return
        }
        for (const peer of onlineVoiceTargets) {
          peer.emit('vc:event', {
            type: 'force_move',
            reelmId,
            channelId,
            channelName: String(channel.name || 'Voice'),
            by: socket.uid,
            byName: actor?.name || actor?.username || 'Someone'
          })
        }
      } catch (err) { logger.warn('vc:move denied', err) }
    })

    socket.on('vc:invite', async ({ reelmId, channelId, targetUid }) => {
      try {
        if (typeof reelmId !== 'string' || typeof channelId !== 'string' || typeof targetUid !== 'string') return
        if (String(targetUid) === String(socket.uid)) return
        if (!await isReelmMember(String(socket.uid), reelmId)) return
        if (!await isReelmMember(String(targetUid), reelmId)) {
          socket.emit('vc:event', { type: 'voice_invite_denied', message: 'That member is not in this Reelm.' })
          return
        }
        const channel = await getReelmChannel(reelmId, channelId)
        if (!channel || !['voice', 'video', 'liveaction', 'stage'].includes(String(channel.type || ''))) return
        const room = `vc:${reelmId}_${channelId}`
        const targetsInSameRoom = Array.from(io.of('/').sockets.values())
          .map((raw) => raw as ReelmsSocket)
          .some((peer) => peer._vcRoom === room && String(peer.data?.uid || peer.uid || '') === String(targetUid))
        if (targetsInSameRoom) {
          socket.emit('vc:event', { type: 'voice_invite_denied', message: 'That member is already in this voice room.' })
          return
        }
        if (!canSendVoiceInviteNow(String(socket.uid), targetUid, reelmId, channelId)) {
          socket.emit('vc:event', { type: 'voice_invite_denied', message: 'Voice invite already sent recently.' })
          return
        }
        const actor = await getUserPublicProfile(String(socket.uid)).catch(() => null)
        const meta = await getDoc<any>(reelmPk(reelmId), 'meta').catch(() => null)
        const text = `${actor?.name || actor?.username || 'Someone'} invited you to ${meta?.name ? `${meta.name} / ` : ''}${String(channel.name || 'a voice room')}.`
        const link = { type: 'reelm', reelmId, channelId, inviteKind: 'voice' }
        await pushUserNotification(targetUid, text, link).catch((err) => logger.warn('voice invite notification failed', err))
        io.to(`u:${targetUid}`).emit('vc:event', {
          type: 'voice_invite',
          reelmId,
          channelId,
          channelName: String(channel.name || 'Voice'),
          senderId: socket.uid,
          senderName: actor?.name || actor?.username || 'Someone'
        })
      } catch (err) { logger.warn('vc:invite denied', err) }
    })

    socket.on('vc:broadcast', ({ reelmId, channelId, payload }) => {
      if (typeof reelmId !== 'string' || typeof channelId !== 'string' || !payload || typeof payload !== 'object') return
      const room = `vc:${reelmId}_${channelId}`
      if (socket._vcRoom !== room) return
      socket.to(room).emit('vc:event', { ...payload, from: socket.uid })
    })

    socket.on('disconnecting', () => {
      if (socket._vcRoom) {
        const room = socket._vcRoom
        const reelmId = socket._vcReelmId
        const channelId = socket._vcChannelId
        socket.to(room).emit('vc:event', { type: 'leave', from: socket.uid, reason: 'disconnect' })
        if (reelmId && channelId) {
          setTimeout(() => { void emitVcCount(reelmId, channelId, room).catch((err) => logger.warn('vc:disconnecting count failed', err)) }, 0)
        }
      }
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
