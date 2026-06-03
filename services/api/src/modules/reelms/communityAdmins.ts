import { env } from '../../config/env.js'
import { getDoc, userPk } from '../store/docStore.js'

function listFromEnv(value: unknown) {
  const raw = String(value || '').trim()
  const items = raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : []
  return Array.from(new Set(items.map((item) => item.toLowerCase()).filter(Boolean)))
}

function allowUnverifiedAdminIdentifiers() {
  // E-mail/username grants are useful in local development, but unsafe for an
  // internet beta unless e-mail ownership is verified. Production should use UID
  // grants via REELMS_COMMUNITY_ADMIN_UIDS.
  return env.NODE_ENV !== 'production' || env.REELMS_ALLOW_UNVERIFIED_ADMIN_IDENTIFIERS
}

export function normalizeAdminEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeAdminUsername(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '')
}

export function getCommunityAdminUids() {
  return listFromEnv(env.REELMS_COMMUNITY_ADMIN_UIDS)
}

export function getCommunityAdminEmails() {
  return listFromEnv(env.REELMS_COMMUNITY_ADMIN_EMAILS)
}

export function getCommunityAdminUsernames() {
  return listFromEnv(env.REELMS_COMMUNITY_ADMIN_USERNAMES)
}

export function isCommunityAdminEmail(value: unknown) {
  if (!allowUnverifiedAdminIdentifiers()) return false
  const email = normalizeAdminEmail(value)
  return Boolean(email && getCommunityAdminEmails().includes(email))
}

export function isCommunityAdminUsername(value: unknown) {
  if (!allowUnverifiedAdminIdentifiers()) return false
  const username = normalizeAdminUsername(value)
  return Boolean(username && getCommunityAdminUsernames().includes(username))
}

export async function isCommunityAdminUid(uid: string) {
  if (!uid) return false
  if (uid === env.REELMS_MODERATION_UID) return true
  if (getCommunityAdminUids().includes(String(uid).toLowerCase())) return true
  if (!allowUnverifiedAdminIdentifiers()) return false

  const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || {}
  return isCommunityAdminEmail(profile.contact || profile.email) || isCommunityAdminUsername(profile.username)
}

export async function resolveCommunityAdminUids() {
  const resolved = new Set<string>()

  getCommunityAdminUids().forEach((uid) => { if (uid) resolved.add(String(uid)) })
  if (!allowUnverifiedAdminIdentifiers()) return Array.from(resolved)

  for (const email of getCommunityAdminEmails()) {
    const uid = await getDoc<string>(`EMAIL#${email}`, 'uid').catch(() => null)
    if (uid) resolved.add(String(uid))
  }

  for (const username of getCommunityAdminUsernames()) {
    const uid = await getDoc<string>(`USERNAME#${username}`, 'uid').catch(() => null)
    if (uid) resolved.add(String(uid))
  }

  return Array.from(resolved)
}
