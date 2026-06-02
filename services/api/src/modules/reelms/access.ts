import { env } from '../../config/env.js'
import { getDoc, reelmPk, userPk } from '../store/docStore.js'

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

export function publicProfileFromStored(uid: string, profile: any = {}) {
  return {
    id: uid,
    uid,
    name: profile.name || profile.displayName || profile.username || 'Member',
    displayName: profile.displayName || profile.name || profile.username || 'Member',
    username: profile.username || '',
    photo: profile.photo || profile.photoURL || profile.avatar || null
  }
}

export async function getUserPublicProfile(uid: string) {
  const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || {}
  return publicProfileFromStored(uid, profile)
}

export async function isReelmMember(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true

  const pk = reelmPk(reelmId)
  const meta = await getDoc<any>(pk, 'meta').catch(() => null)
  if (String(meta?.ownerId || '') === uid) return true

  const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
  return members.some((member) => String(member?.userId) === uid)
}

export async function canManageReelm(uid: string, reelmId: string) {
  if (!uid || !reelmId) return false
  if (uid === env.REELMS_MODERATION_UID) return true

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
  return (roles || []).some((role) => roleIds.has(String(role?.id)) && /admin|owner|founder|moderator/i.test(String(role?.name || '')))
}

export async function getReelmChannel(reelmId: string, channelId: string) {
  const structure = await getDoc<any>(reelmPk(reelmId), 'structure').catch(() => null)
  const categories = Array.isArray(structure?.categories) ? structure.categories : []
  for (const category of categories) {
    const channels = Array.isArray(category?.channels) ? category.channels : []
    const channel = channels.find((item: any) => String(item?.id) === String(channelId))
    if (channel) return channel
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
