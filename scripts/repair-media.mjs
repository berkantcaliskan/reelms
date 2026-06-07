#!/usr/bin/env node
import fs from 'node:fs'

function parseEnvFile(file) {
  const out = {}
  const text = fs.readFileSync(file, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    out[key] = value
  }
  return out
}

const envArg = process.argv.find((arg) => arg.startsWith('--env='))
if (envArg) Object.assign(process.env, parseEnvFile(envArg.slice('--env='.length)))

const SUPABASE_URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
}

const rawMedia = (value) => {
  const text = String(value || '').trim()
  return /^data:image\//i.test(text) || (text.length > 4096 && /^[A-Za-z0-9+/=\r\n]+$/.test(text))
}
const safeUrl = (value) => {
  const text = String(value || '').trim()
  if (!text || rawMedia(text)) return null
  if (/^https?:\/\//i.test(text)) return text
  return null
}

function cleanProfile(data) {
  if (!data || typeof data !== 'object') return { data, changed: false }
  let changed = false
  const next = { ...data }
  for (const key of ['photo', 'profilePhoto', 'photoURL', 'avatar', 'image', 'imageUrl', 'userPhoto', 'cover', 'coverImage', 'coverUrl', 'headerImage', 'banner', 'bannerImage', 'backgroundCover', 'bgImage', 'backgroundImage', 'backgroundUrl']) {
    if (rawMedia(next[key])) { next[key] = null; changed = true }
  }
  return { data: next, changed }
}

function cleanCustomization(data) {
  if (!data || typeof data !== 'object') return { data, changed: false }
  let changed = false
  const next = { ...data }
  const bg = next.bgImage ?? next.bg_image ?? next.backgroundImage ?? next.backgroundUrl
  if (rawMedia(bg)) {
    delete next.bgImage; delete next.bg_image; delete next.backgroundImage; delete next.backgroundUrl
    changed = true
  }
  return { data: next, changed }
}

function cleanReelmList(data) {
  if (!Array.isArray(data)) return { data, changed: false }
  let changed = false
  const next = data.map((item) => {
    if (!item || typeof item !== 'object') return item
    if (!rawMedia(item.image)) return item
    changed = true
    return { ...item, image: null }
  })
  return { data: next, changed }
}

function cleanValue(sk, data) {
  if (sk === 'profile') return cleanProfile(data)
  if (sk === 'customization') return cleanCustomization(data)
  if (sk === 'bg_image') return rawMedia(data) ? { data: null, changed: true } : { data, changed: false }
  if (sk === 'reelms') return cleanReelmList(data)
  if (sk === 'meta' && data && typeof data === 'object' && rawMedia(data.image)) return { data: { ...data, image: null }, changed: true }
  return { data, changed: false }
}

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${res.status}: ${await res.text()}`)
  if (res.status === 204) return null
  return res.json()
}

const query = 'reelms_docs?select=pk,sk,data&or=(sk.eq.profile,sk.eq.customization,sk.eq.bg_image,sk.eq.reelms,sk.eq.meta)&limit=5000'
const rows = await request(query, { headers: { Prefer: 'return=representation' } })
let changedCount = 0
let scanned = 0
for (const row of rows || []) {
  scanned += 1
  const { data, changed } = cleanValue(row.sk, row.data)
  if (!changed) continue
  await request(`reelms_docs?pk=eq.${encodeURIComponent(row.pk)}&sk=eq.${encodeURIComponent(row.sk)}`, {
    method: 'PATCH',
    body: JSON.stringify({ data })
  })
  changedCount += 1
  console.log(`cleaned ${row.pk} ${row.sk}`)
}
console.log(JSON.stringify({ ok: true, scanned, changed: changedCount }, null, 2))
