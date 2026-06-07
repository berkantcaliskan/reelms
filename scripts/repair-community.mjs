#!/usr/bin/env node
import fs from 'node:fs'

const envFile = process.argv.find((arg) => arg.startsWith('--env='))?.slice(6)
if (envFile && fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const DEFAULT_REELM_ID = process.env.REELMS_DEFAULT_REELM_ID || 'reelms-community'
const ADMIN_UIDS = String(process.env.REELMS_COMMUNITY_ADMIN_UIDS || '').split(',').map((v) => v.trim()).filter(Boolean)
const SYSTEM_IDS = new Set([process.env.REELMS_MODERATION_UID, 'reelms-moderation', 'system', 'reelms-system'].filter(Boolean))

if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
}
const api = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/reelms_docs`
const enc = encodeURIComponent

async function req(path, options = {}) {
  const res = await fetch(`${api}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : null
}

const pk = `REELM#${DEFAULT_REELM_ID}`
const [membersRow] = await req(`?pk=eq.${enc(pk)}&sk=eq.members&select=data`)
const [banRow] = await req(`?pk=eq.${enc(pk)}&sk=eq.ban_list&select=data`)
const [rolesRow] = await req(`?pk=eq.${enc(pk)}&sk=eq.roles&select=data`)
const members = Array.isArray(membersRow?.data) ? membersRow.data : []
const bans = Array.isArray(banRow?.data) ? banRow.data : []
const roles = Array.isArray(rolesRow?.data) ? rolesRow.data : []
const banned = new Set(bans.map((b) => String(b?.userId || b?.id || '')).filter(Boolean))
const adminRole = roles.find((r) => String(r?.id || '') === 'role-admin-rc') || roles.find((r) => /admin|owner|founder|moderator/i.test(String(r?.name || '')))
const adminRoleId = String(adminRole?.id || 'role-admin-rc')

async function getProfile(uid) {
  const rows = await req(`?pk=eq.${enc(`USER#${uid}`)}&sk=eq.profile&select=data`)
  return rows?.[0]?.data || null
}

const seen = new Set()
const next = []
for (const raw of members) {
  const uid = String(raw?.userId || raw?.id || '').trim()
  if (!uid || seen.has(uid) || SYSTEM_IDS.has(uid) || banned.has(uid)) continue
  const profile = await getProfile(uid)
  if (!profile || profile.accountClosed === true || profile.deleted === true || profile.deletedAt) continue
  seen.add(uid)
  const roleIds = Array.isArray(raw.roleIds) ? raw.roleIds.map(String).filter(Boolean) : []
  next.push({
    ...raw,
    userId: uid,
    userName: raw.userName || profile.name || profile.displayName || profile.username || 'User',
    username: raw.username || profile.username || '',
    userPhoto: profile.photo || raw.userPhoto || raw.photo || null,
    photo: profile.photo || raw.photo || raw.userPhoto || null,
    cover: profile.cover || profile.coverImage || profile.coverUrl || raw.cover || null,
    coverImage: profile.coverImage || profile.cover || raw.coverImage || null,
    coverUrl: profile.coverUrl || profile.cover || raw.coverUrl || null,
    bio: profile.bio || raw.bio || '',
    activity: profile.activity || raw.activity || null,
    profileTheme: profile.profileTheme || raw.profileTheme || null,
    roleIds
  })
}

for (const uid of ADMIN_UIDS) {
  if (!uid || seen.has(uid) || SYSTEM_IDS.has(uid) || banned.has(uid)) continue
  const profile = await getProfile(uid)
  if (!profile || profile.accountClosed === true || profile.deleted === true || profile.deletedAt) continue
  seen.add(uid)
  next.unshift({
    userId: uid,
    userName: profile.name || profile.displayName || profile.username || 'User',
    username: profile.username || '',
    userPhoto: profile.photo || null,
    photo: profile.photo || null,
    cover: profile.cover || profile.coverImage || profile.coverUrl || null,
    coverImage: profile.coverImage || profile.cover || null,
    coverUrl: profile.coverUrl || profile.cover || null,
    bio: profile.bio || '',
    activity: profile.activity || null,
    profileTheme: profile.profileTheme || null,
    roleIds: [adminRoleId]
  })
}

await req(`?pk=eq.${enc(pk)}&sk=eq.members`, { method: 'PATCH', body: JSON.stringify({ data: next }) })
console.log(JSON.stringify({ ok: true, reelmId: DEFAULT_REELM_ID, before: members.length, after: next.length, adminRoleId }, null, 2))
