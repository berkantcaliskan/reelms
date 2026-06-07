#!/usr/bin/env node
import fs from 'node:fs'

function parseArgs() {
  const out = {}
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--env=')) out.env = arg.slice(6)
    if (arg === '--dry-run') out.dryRun = true
  }
  return out
}
function loadEnv(path) {
  if (!path || !fs.existsSync(path)) return
  const text = fs.readFileSync(path, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}
const args = parseArgs()
loadEnv(args.env)
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
if (!SUPABASE_URL || !KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
const restUrl = `${SUPABASE_URL}/rest/v1/reelms_docs`
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const DEFAULT_REELM_ID = process.env.REELMS_DEFAULT_REELM_ID || 'reelms-community'
const MOD_UID = process.env.REELMS_MODERATION_UID || 'reelms-moderation'
const ADMIN_UIDS = String(process.env.REELMS_COMMUNITY_ADMIN_UIDS || '')
  .split(',').map(s => s.trim()).filter(Boolean)

async function request(path, options = {}) {
  const res = await fetch(`${restUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${res.status}: ${await res.text()}`)
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}
async function getDoc(pk, sk) {
  const rows = await request(`?select=data&pk=eq.${encodeURIComponent(pk)}&sk=eq.${encodeURIComponent(sk)}&limit=1`)
  return Array.isArray(rows) && rows[0] ? rows[0].data : null
}
async function putDoc(pk, sk, data) {
  if (args.dryRun) return
  await request('', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ pk, sk, data, updated_at: Date.now() }) })
}
const reelmPk = (id) => `REELM#${id}`
const userPk = (id) => `USER#${id}`
const uidOf = (m) => String(m?.userId || m?.id || '').trim()
const isBadUid = (id) => !id || id === 'admin-user-uid-buraya' || id === 'member' || id === 'undefined' || id === 'null' || id === MOD_UID
const isSystemLike = (m) => m?.isSystem === true || m?.system === true || /reelms[-_ ]?(system|moderation)/i.test(String(m?.username || m?.userName || m?.name || ''))
const getManagerRole = (roles) => (roles || []).find(r => r?.permissions?.manageReelm === true || /admin|owner|founder|moderator/i.test(String(r?.name || '')))
const getMemberRole = (roles) => (roles || []).find(r => /member|citizen|everyone/i.test(String(r?.name || ''))) || roles?.[0]

const pk = reelmPk(DEFAULT_REELM_ID)
const [meta, rolesRaw, membersRaw, banRaw] = await Promise.all([
  getDoc(pk, 'meta'),
  getDoc(pk, 'roles'),
  getDoc(pk, 'members'),
  getDoc(pk, 'ban_list')
])
if (!meta) throw new Error(`default community ${DEFAULT_REELM_ID} not found`)
const roles = Array.isArray(rolesRaw) ? rolesRaw : []
const banned = new Set((Array.isArray(banRaw) ? banRaw : []).map(e => String(e?.userId || e?.id || '')).filter(Boolean))
const before = Array.isArray(membersRaw) ? membersRaw : []
const seen = new Set()
let after = []
for (const member of before) {
  const id = uidOf(member)
  if (isBadUid(id) || isSystemLike(member) || banned.has(id) || seen.has(id)) continue
  seen.add(id)
  after.push({ ...member, userId: id, id: undefined })
}
const adminRole = getManagerRole(roles)
const memberRole = getMemberRole(roles)
for (const adminUid of ADMIN_UIDS) {
  if (!adminUid || banned.has(adminUid)) continue
  const profile = await getDoc(userPk(adminUid), 'profile').catch(() => null)
  if (!profile?.uid && !profile?.id && !profile?.username && !profile?.name) continue
  const existing = after.find(m => uidOf(m) === adminUid)
  const roleIds = new Set([...(Array.isArray(existing?.roleIds) ? existing.roleIds.map(String) : []), ...(adminRole?.id ? [String(adminRole.id)] : []), ...(memberRole?.id ? [String(memberRole.id)] : [])])
  const photo = profile.photo || profile.profilePhoto || profile.avatar || profile.image || profile.imageUrl || null
  const adminMember = {
    ...(existing || {}),
    userId: adminUid,
    userName: existing?.userName || profile.name || profile.displayName || profile.username || 'Admin',
    username: existing?.username || profile.username || '',
    userPhoto: existing?.userPhoto || photo || null,
    photo: existing?.photo || photo || null,
    profileTheme: existing?.profileTheme || profile.profileTheme || null,
    roleIds: [...roleIds].filter(Boolean)
  }
  after = [adminMember, ...after.filter(m => uidOf(m) !== adminUid)]
}
if (JSON.stringify(before) !== JSON.stringify(after)) await putDoc(pk, 'members', after)
console.log(JSON.stringify({ ok: true, reelmId: DEFAULT_REELM_ID, before: before.length, after: after.length, adminRoleId: adminRole?.id || null, dryRun: Boolean(args.dryRun) }, null, 2))
