import { env } from '../../config/env.js'
import { getDoc, putDoc, reelmPk, userPk } from '../store/docStore.js'
import { DEFAULT_REELM_ID, autoJoinDefaultReelm, hasLeftDefaultReelm } from './defaultReelm.js'
import { isCommunityAdminUid, isSystemAdminUid } from './communityAdmins.js'

export type MessageKeyAccess =
  | { ok: true; kind: 'dm'; participants: string[] }
  | { ok: true; kind: 'group'; chatId: string }
  | { ok: true; kind: 'reelm'; reelmId: string; channelId: string }
  | { ok: true; kind: 'moderation' }
  | { ok: false; reason: 'forbidden' | 'invalid_key' }

export function normalizeUsername(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
}

export function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

const isGoogleDefaultAvatarUrl = (value: unknown) => {
  const url = String(value || '')
  return /(^|\.)googleusercontent\.com\//i.test(url) || /lh3\.googleusercontent\.com/i.test(url)
}

export function publicProfileFromStored(uid: string, profile: any = {}) {
  const rawPhoto = profile.photo || profile.profilePhoto || profile.photoURL || profile.avatar || profile.image || profile.imageUrl || profile.userPhoto || null
  const photo = isGoogleDefaultAvatarUrl(rawPhoto) ? null : rawPhoto
  const cover = profile.cover || profile.coverImage || profile.coverUrl || profile.headerImage || profile.banner || profile.bannerImage || profile.backgroundCover || null
  return {
    id: uid,
    uid,
    name: profile.name || profile.displayName || profile.username || 'Member',
    displayName: profile.displayName || profile.name || profile.username || 'Member',
    username: profile.username || '',
    photo,
    profilePhoto: photo,
    photoURL: photo,
    avatar: photo,
    image: photo,
    userPhoto: photo,
    cover,
    coverImage: cover,
    coverUrl: cover,
    headerImage: cover,
    bio: profile.bio || '',
    activity: profile.activity || null,
    sociallinks: profile.sociallinks || {},
    socialorder: Array.isArray(profile.socialorder) ? profile.socialorder : [],
    profileTheme: profile.profileTheme && typeof profile.profileTheme === 'object' ? profile.profileTheme : null
  }
}


export type ReelmPermissionKey =
  | 'viewSettings'
  | 'manageOverview'
  | 'manageChannels'
  | 'manageVoice'
  | 'manageRoles'
  | 'manageMembers'
  | 'manageInvites'
  | 'manageJoinRequests'
  | 'manageModeration'
  | 'pinMessages'
  | 'createVaporRoom'
  | 'viewAuditLog'
  | 'viewInsights'
  | 'bypassSlowMode'
  | 'manageReelm'

const REELM_ELEVATED_ROLE_RE = /admin|owner|founder|moderator/i

export function isElevatedReelmRole(role: any) {
  return role?.permissions?.manageReelm === true
}

export function roleHasReelmPermission(role: any, permission: ReelmPermissionKey) {
  if (!role) return false
  if (isElevatedReelmRole(role)) return true
  if (permission === 'viewSettings') return role?.permissions?.viewSettings === true || Object.values(role?.permissions || {}).some((value) => value === true)
  if (permission === 'viewAuditLog') {
    return role?.permissions?.viewAuditLog === true ||
      role?.permissions?.manageModeration === true ||
      role?.permissions?.manageRoles === true ||
      role?.permissions?.manageChannels === true ||
      role?.permissions?.manageOverview === true
  }
  if (permission === 'bypassSlowMode') {
    return role?.permissions?.bypassSlowMode === true ||
      role?.permissions?.manageModeration === true ||
      role?.permissions?.manageChannels === true
  }
  return role?.permissions?.[permission] === true
}

export async function canUseReelmPermission(uid: string, reelmId: string, permission: ReelmPermissionKey) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  // System admin (admin@reelms.io) has full permissions everywhere
  if (await isSystemAdminUid(uid).catch(() => false)) return true
  if (await isBannedFromReelm(uid, reelmId).catch(() => false)) return false

  if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(uid).catch(() => false)) return true
  if (reelmId === DEFAULT_REELM_ID && await hasLeftDefaultReelm(uid).catch(() => false)) return false

  const pk = reelmPk(reelmId)
  const meta = await getDoc<any>(pk, 'meta').catch(() => null)
  if (String(meta?.ownerId || '') === uid) return true

  const [members, roles] = await Promise.all([
    getDoc<any[]>(pk, 'members').catch(() => []),
    getDoc<any[]>(pk, 'roles').catch(() => [])
  ])
  const member = (members || []).find((item) => String(item?.userId || item?.id || '') === uid)
  if (!member) return false

  const roleIds = new Set((member.roleIds || []).map(String))
  return (roles || []).some((role) => roleIds.has(String(role?.id || '')) && roleHasReelmPermission(role, permission))
}

export function resolveChannelPermission(
  uid: string,
  reelm: any,
  channel: any,
  category: any,
  permission: ReelmPermissionKey | string
): boolean {
  if (!uid || !reelm) return false
  if (String(reelm.ownerId || reelm.meta?.ownerId || '') === uid) return true

  const members = Array.isArray(reelm.members) ? reelm.members : []
  const member = members.find((m: any) => String(m.userId || m.id) === uid)
  if (!member) return false
  const roleIds = new Set((member.roleIds || []).map(String))
  const roles = (Array.isArray(reelm.roles) ? reelm.roles : []).filter((r: any) => roleIds.has(String(r.id)))

  if (roles.some((r: any) => r?.permissions?.manageReelm === true)) return true

  const overrides = Array.isArray(channel?.permissionOverrides) && channel.permissionOverrides.length > 0
    ? channel.permissionOverrides
    : (channel?.syncWithCategory && Array.isArray(category?.permissionOverrides) ? category.permissionOverrides : [])

  const memberOverride = overrides.find((o: any) => o.type === 'member' && String(o.id) === uid)
  if (memberOverride) {
    if (memberOverride.deny?.includes(permission)) return false
    if (memberOverride.allow?.includes(permission)) return true
  }

  const allowedRoles = overrides.filter((o: any) => o.type === 'role' && roleIds.has(String(o.id)))
  if (allowedRoles.some((o: any) => o.deny?.includes(permission))) return false
  if (allowedRoles.some((o: any) => o.allow?.includes(permission))) return true

  const everyoneOverride = overrides.find((o: any) => o.type === 'role' && (o.id === '@everyone' || o.id === 'everyone'))
  if (everyoneOverride) {
    if (everyoneOverride.deny?.includes(permission)) return false
    if (everyoneOverride.allow?.includes(permission)) return true
  }

  return roles.some((r: any) => roleHasReelmPermission(r, permission as any))
}

export async function getUserPublicProfile(uid: string) {
  const [profile, customization] = await Promise.all([
    getDoc<any>(userPk(uid), 'profile').catch(() => null),
    getDoc<any>(userPk(uid), 'customization').catch(() => null)
  ])
  return publicProfileFromStored(uid, { ...(profile || {}), profileTheme: (profile as any)?.profileTheme || customization || null })
}

async function isBannedFromReelm(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  const banList = (await getDoc<any[]>(reelmPk(reelmId), 'ban_list').catch(() => [])) || []
  return banList.some((entry) => String(entry?.userId || entry?.id || '') === uid)
}


export async function getActiveReelmTimeout(uid: string, reelmId: string) {
  if (!uid || !reelmId) return null
  const now = Date.now()
  const list = (await getDoc<any[]>(reelmPk(reelmId), 'timeout_list').catch(() => [])) || []
  const active = list.filter((entry) => {
    const targetUid = String(entry?.userId || entry?.id || '')
    const expiresAt = Number(entry?.expiresAt || 0)
    return targetUid && expiresAt > now
  })
  if (active.length !== list.length) await putDoc(reelmPk(reelmId), 'timeout_list', active).catch(() => {})
  return active.find((entry) => String(entry?.userId || entry?.id || '') === uid) || null
}

// In-memory membership & channel cache to eliminate redundant Supabase hits on every message/socket event
const memberCheckCache = new Map<string, { isMember: boolean; expiresAt: number }>()
const channelCache = new Map<string, { channel: any; expiresAt: number }>()

export async function isReelmMember(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  // System admin (admin@reelms.io) is member of all reelms
  if (await isSystemAdminUid(uid).catch(() => false)) return true

  // Fast path for the global default community: every authenticated user is a
  // member unless they explicitly left or were banned. Never flood DB with queries.
  if (reelmId === DEFAULT_REELM_ID) {
    if (await isBannedFromReelm(uid, reelmId).catch(() => false)) return false
    if (await hasLeftDefaultReelm(uid).catch(() => false)) return false
    return true
  }

  const cacheKey = `${reelmId}:${uid}`
  const cached = memberCheckCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.isMember

  if (await isBannedFromReelm(uid, reelmId).catch(() => false)) {
    memberCheckCache.set(cacheKey, { isMember: false, expiresAt: Date.now() + 60_000 })
    return false
  }

  const pk = reelmPk(reelmId)
  const meta = await getDoc<any>(pk, 'meta').catch(() => null)
  if (String(meta?.ownerId || '') === uid) {
    memberCheckCache.set(cacheKey, { isMember: true, expiresAt: Date.now() + 120_000 })
    return true
  }

  const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
  const isMember = members.some((member) => String(member?.userId || member?.id || '') === uid)
  memberCheckCache.set(cacheKey, { isMember, expiresAt: Date.now() + (isMember ? 120_000 : 15_000) })
  return isMember
}

export async function canManageReelm(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  // System admin (admin@reelms.io) can manage all reelms
  if (await isSystemAdminUid(uid).catch(() => false)) return true
  if (await isBannedFromReelm(uid, reelmId).catch(() => false)) return false

  if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(uid).catch(() => false)) return true
  if (reelmId === DEFAULT_REELM_ID && await hasLeftDefaultReelm(uid).catch(() => false)) return false

  const pk = reelmPk(reelmId)
  const meta = await getDoc<any>(pk, 'meta').catch(() => null)
  if (String(meta?.ownerId || '') === uid) return true

  const [members, roles] = await Promise.all([
    getDoc<any[]>(pk, 'members').catch(() => []),
    getDoc<any[]>(pk, 'roles').catch(() => [])
  ])
  const member = (members || []).find((item) => String(item?.userId) === uid)
  if (!member) return false

  const roleIds = new Set((member.roleIds || []).map(String))
  return (roles || []).some((role) => roleIds.has(String(role?.id || '')) && isElevatedReelmRole(role))
}

const KNOWN_DEFAULT_COMMUNITY_CHANNELS: Record<string, { id: string; name: string; type: string }> = {
  'ch-rc-welcome': { id: 'ch-rc-welcome', name: 'welcome', type: 'announcement' },
  'ch-rc-chat': { id: 'ch-rc-chat', name: 'chat', type: 'text' },
  'ch-rc-lounge': { id: 'ch-rc-lounge', name: 'Lounge', type: 'voice' },
  'ch-rc-stage': { id: 'ch-rc-stage', name: 'Stage', type: 'stage' },
  'ch-tumu': { id: 'ch-tumu', name: 'general', type: 'announcement' },
  'ch-general': { id: 'ch-general', name: 'chat', type: 'text' },
  'general': { id: 'general', name: 'general', type: 'text' },
  'chat': { id: 'chat', name: 'chat', type: 'text' },
  'welcome': { id: 'welcome', name: 'welcome', type: 'announcement' }
}

export async function getReelmChannel(reelmId: string, channelId: string) {
  const id = String(channelId || '')
  if (!id) return null

  // Fast path for default community channels: zero DB lookups
  if (reelmId === DEFAULT_REELM_ID && KNOWN_DEFAULT_COMMUNITY_CHANNELS[id]) {
    return KNOWN_DEFAULT_COMMUNITY_CHANNELS[id]
  }

  const cacheKey = `${reelmId}:${id}`
  const cached = channelCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.channel

  const structure = await getDoc<any>(reelmPk(reelmId), 'structure').catch(() => null)
  const categories = Array.isArray(structure?.categories) ? structure.categories : []
  for (const category of categories) {
    const channels = Array.isArray(category?.channels) ? category.channels : []
    const channel = channels.find((item: any) => String(item?.id) === id)
    if (channel) {
      channelCache.set(cacheKey, { channel, expiresAt: Date.now() + 300_000 })
      return channel
    }
  }

  if (reelmId === DEFAULT_REELM_ID && KNOWN_DEFAULT_COMMUNITY_CHANNELS[id]) {
    return KNOWN_DEFAULT_COMMUNITY_CHANNELS[id]
  }

  // Fallback: if it looks like a valid channel id in default community, don't block
  if (reelmId === DEFAULT_REELM_ID) {
    const fallback = { id, name: id.replace(/^ch-/, ''), type: 'text' }
    channelCache.set(cacheKey, { channel: fallback, expiresAt: Date.now() + 60_000 })
    return fallback
  }

  return null
}

async function userHasChat(uid: string, chatId: string) {
  const chats = (await getDoc<any[]>(userPk(uid), 'chats').catch(() => [])) || []
  return chats.some((chat) => String(chat?.id) === chatId || String(chat?.convId) === chatId)
}

async function inferUserReelmFromMessageKey(uid: string, msgKey: string) {
  const userReelms = (await getDoc<any[]>(userPk(uid), 'reelms').catch(() => [])) || []
  const sorted = userReelms
    .filter((item) => item?.id)
    .map((item) => String(item.id))
    .sort((a, b) => b.length - a.length)

  for (const reelmId of sorted) {
    const voicePrefix = `${reelmId}_vc_`
    if (msgKey.startsWith(voicePrefix)) return { reelmId, channelId: msgKey.slice(voicePrefix.length) }

    const prefix = `${reelmId}_`
    if (msgKey.startsWith(prefix)) return { reelmId, channelId: msgKey.slice(prefix.length) }
  }

  const voiceSplit = msgKey.indexOf('_vc_')
  if (voiceSplit > 0) return { reelmId: msgKey.slice(0, voiceSplit), channelId: msgKey.slice(voiceSplit + 4) }

  const splitAt = msgKey.indexOf('_')
  if (splitAt > 0) return { reelmId: msgKey.slice(0, splitAt), channelId: msgKey.slice(splitAt + 1) }
  return null
}

export async function getMessageKeyAccess(uid: string, msgKey: string): Promise<MessageKeyAccess> {
  if (!uid || !msgKey || msgKey.length > 240) return { ok: false, reason: 'invalid_key' }

  if (msgKey === 'mod_inbox') {
    return uid === env.REELMS_MODERATION_UID ? { ok: true, kind: 'moderation' } : { ok: false, reason: 'forbidden' }
  }

  if (msgKey.startsWith('dm_')) {
    const participants = msgKey.slice(3).split('_').filter(Boolean)
    if (participants.length !== 2 || !participants.includes(uid)) return { ok: false, reason: 'forbidden' }
    return { ok: true, kind: 'dm', participants }
  }

  if (msgKey.startsWith('group_')) {
    if (await userHasChat(uid, msgKey)) return { ok: true, kind: 'group', chatId: msgKey }
    return { ok: false, reason: 'forbidden' }
  }

  const parsed = await inferUserReelmFromMessageKey(uid, msgKey)
  if (!parsed?.reelmId || !parsed.channelId) return { ok: false, reason: 'invalid_key' }
  if (!await isReelmMember(uid, parsed.reelmId)) return { ok: false, reason: 'forbidden' }

  const channel = await getReelmChannel(parsed.reelmId, parsed.channelId)
  if (!channel) return { ok: false, reason: 'invalid_key' }

  return { ok: true, kind: 'reelm', reelmId: parsed.reelmId, channelId: parsed.channelId }
}
