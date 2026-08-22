import { getDoc, putDoc, reelmPk } from '../store/docStore.js'
import { getUserPublicProfile } from './access.js'

export type ReelmAuditActionType =
  | 'MEMBER_BAN'
  | 'MEMBER_UNBAN'
  | 'MEMBER_KICK'
  | 'MEMBER_TIMEOUT'
  | 'MEMBER_TIMEOUT_REMOVE'
  | 'MEMBER_ROLE_UPDATE'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_UPDATE'
  | 'CHANNEL_SLOWMODE_UPDATE'
  | 'CHANNEL_DELETE'
  | 'MESSAGE_DELETE'
  | 'MESSAGE_PIN'
  | 'MESSAGE_UNPIN'
  | 'REELM_UPDATE'

export interface ReelmAuditLogEntry {
  id: string
  reelmId: string
  action: ReelmAuditActionType
  actor: {
    id: string
    name: string
    username?: string
    photo?: string | null
  }
  target?: {
    id?: string
    name?: string
    type?: 'user' | 'channel' | 'role' | 'reelm' | 'message' | 'integration'
  }
  reason?: string | null
  timestamp: number
  details?: {
    summary?: string
    diff?: {
      field?: string
      before?: any
      after?: any
    }
    extra?: Record<string, any>
  }
}

export interface AuditLogQueryFilter {
  action?: string
  actorId?: string
  search?: string
  startDate?: number
  endDate?: number
  limit?: number
  before?: string
}

function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function recordReelmAuditLog(
  reelmId: string,
  entry: {
    action: ReelmAuditActionType
    actor: {
      id: string
      name?: string
      username?: string
      photo?: string | null
    }
    target?: {
      id?: string
      name?: string
      type?: 'user' | 'channel' | 'role' | 'reelm' | 'message' | 'integration'
    }
    reason?: string | null
    details?: {
      summary?: string
      diff?: {
        field?: string
        before?: any
        after?: any
      }
      extra?: Record<string, any>
    }
  },
  io?: any
): Promise<ReelmAuditLogEntry | null> {
  if (!reelmId || !entry || !entry.action || !entry.actor?.id) return null
  try {
    const actorProfile = await getUserPublicProfile(entry.actor.id).catch(() => null)
    const actorName = entry.actor.name || actorProfile?.name || actorProfile?.username || 'Moderator'
    const actorUsername = entry.actor.username || actorProfile?.username || ''
    const actorPhoto = entry.actor.photo ?? actorProfile?.photo ?? null

    const logRecord: ReelmAuditLogEntry = {
      id: generateAuditId(),
      reelmId,
      action: entry.action,
      actor: {
        id: entry.actor.id,
        name: actorName,
        username: actorUsername,
        photo: actorPhoto
      },
      target: entry.target ? {
        id: entry.target.id ? String(entry.target.id) : undefined,
        name: entry.target.name ? String(entry.target.name) : undefined,
        type: entry.target.type
      } : undefined,
      reason: entry.reason ? String(entry.reason).slice(0, 320) : null,
      timestamp: Date.now(),
      details: entry.details || {}
    }

    const pk = reelmPk(reelmId)
    const existingLogs = (await getDoc<ReelmAuditLogEntry[]>(pk, 'audit_log').catch(() => [])) || []
    const updatedLogs = [logRecord, ...existingLogs].slice(0, 3000)
    await putDoc(pk, 'audit_log', updatedLogs)

    if (io) {
      io.to(`reelm:${reelmId}`).emit('reelm:audit-log-entry', logRecord)
    }

    return logRecord
  } catch (err) {
    console.error('Failed to record reelm audit log:', err)
    return null
  }
}

export async function getReelmAuditLogs(
  reelmId: string,
  filter?: AuditLogQueryFilter
): Promise<{ entries: ReelmAuditLogEntry[]; total: number }> {
  if (!reelmId) return { entries: [], total: 0 }
  const pk = reelmPk(reelmId)
  const logs = (await getDoc<ReelmAuditLogEntry[]>(pk, 'audit_log').catch(() => [])) || []

  let filtered = [...logs]

  if (filter?.action && filter.action !== 'all') {
    filtered = filtered.filter((entry) => entry.action === filter.action)
  }

  if (filter?.actorId) {
    filtered = filtered.filter((entry) => String(entry.actor?.id) === String(filter.actorId))
  }

  if (filter?.startDate) {
    filtered = filtered.filter((entry) => entry.timestamp >= Number(filter.startDate))
  }

  if (filter?.endDate) {
    filtered = filtered.filter((entry) => entry.timestamp <= Number(filter.endDate))
  }

  if (filter?.search) {
    const q = String(filter.search).toLowerCase().trim()
    filtered = filtered.filter((entry) => {
      const actorMatch = entry.actor?.name?.toLowerCase().includes(q) || entry.actor?.username?.toLowerCase().includes(q)
      const targetMatch = entry.target?.name?.toLowerCase().includes(q)
      const reasonMatch = entry.reason?.toLowerCase().includes(q)
      const summaryMatch = entry.details?.summary?.toLowerCase().includes(q)
      return actorMatch || targetMatch || reasonMatch || summaryMatch
    })
  }

  const total = filtered.length
  const limit = Math.max(1, Math.min(100, Number(filter?.limit || 50)))
  const entries = filtered.slice(0, limit)

  return { entries, total }
}
