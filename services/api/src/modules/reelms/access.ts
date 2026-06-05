import { env } from '../../config/env.js'
import { getDoc, putDoc, reelmPk, userPk } from '../store/docStore.js'
import { DEFAULT_REELM_ID, autoJoinDefaultReelm, hasLeftDefaultReelm } from './defaultReelm.js'
import { isCommunityAdminUid } from './communityAdmins.js'

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
  | 'manageReelm'

const REELM_ELEVATED_ROLE_RE = /admin|owner|founder|moderator/i

export function isElevatedReelmRole(role: any) {
  return role?.permissions?.manageReelm === true
}

export function roleHasReelmPermission(role: any, permission: ReelmPermissionKey) {
  if (!role) return false
  if (isElevatedReelmRole(role)) return true
  if (permission === 'viewSettings') return role?.permissions?.viewSettings === true || Object.values(role?.permissions || {}).some((value) => value === true)
  return role?.permissions?.[permission] === true
}

export async function canUseReelmPermission(uid: string, reelmId: string, permission: ReelmPermissionKey) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  if (await isBannedFromReelm(uid, reelmId).catch(() => false)) return false

  if (reelmId === DEFAULT_REELM_ID && await hasLeftDefaultReelm(uid).catch(() => false)) return false
  if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(uid).catch(() => false)) return true

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

export async function isReelmMember(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  if (await isBannedFromReelm(uid, reelmId).catch(() => false)) return false

  if (reelmId === DEFAULT_REELM_ID && await hasLeftDefaultReelm(uid).catch(() => false)) return false
  if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(uid).catch(() => false)) return true

  const pk = reelmPk(reelmId)
  const meta = await getDoc<any>(pk, 'meta').catch(() => null)
  if (String(meta?.ownerId || '') === uid) return true

  const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
  if (members.some((member) => String(member?.userId) === uid)) return true

  // Reelms Community is the global default community. If an older/local account
  // does not have its membership copy yet, heal it server-side instead of
  // denying sockets/messages until the user refreshes or logs in again.
  if (reelmId === DEFAULT_REELM_ID) {
    await autoJoinDefaultReelm(uid).catch(() => {})
    const healedMembers = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
    return healedMembers.some((member) => String(member?.userId) === uid)
  }

  return false
}

export async function canManageReelm(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  if (await isBannedFromReelm(uid, reelmId).catch(() => false)) return false

  if (reelmId === DEFAULT_REELM_ID && await hasLeftDefaultReelm(uid).catch(() => false)) return false
  if (reelmId === DEFAULT_REELM_ID && await isCommunityAdminUid(uid).catch(() => false)) return true

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

export async function getReelmChannel(reelmId: string, channelId: string) {
  const id = String(channelId || '')
  const structure = await getDoc<any>(reelmPk(reelmId), 'structure').catch(() => null)
  const categories = Array.isArray(structure?.categories) ? structure.categories : []
  for (const category of categories) {
    const channels = Array.isArray(category?.channels) ? category.channels : []
    const channel = channels.find((item: any) => String(item?.id) === id)
    if (channel) return channel
  }

  // Backward compatibility for older local beta data. Earlier community copies
  // used `ch-tumu` while the server default now uses `ch-rc-welcome`. Treat the
  // old id as a valid announcement channel so existing users do not get 400s.
  if (reelmId === DEFAULT_REELM_ID && ['ch-tumu', 'ch-general', 'general'].includes(id)) {
    return { id, name: 'general', type: 'announcement' }
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
