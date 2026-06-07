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

async function request(path, options = {}) {
  const res = await fetch(`${restUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${res.status}: ${await res.text()}`)
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function scan(prefix) {
  const rows = []
  for (let offset = 0; offset < 20000; offset += 1000) {
    const path = `?select=pk,sk,data&pk=like.${encodeURIComponent(prefix + '%')}&order=pk.asc,sk.asc&limit=1000&offset=${offset}`
    const batch = await request(path)
    rows.push(...(Array.isArray(batch) ? batch : []))
    if (!batch || batch.length < 1000) break
  }
  return rows
}

function containsInlineImage(value) {
  try { return JSON.stringify(value).includes('data:image/') } catch { return false }
}

function cleanValue(value) {
  if (typeof value === 'string') {
    if (/^data:image\//i.test(value) || /^blob:/i.test(value)) return null
    return value
  }
  if (Array.isArray(value)) {
    const next = value.map(cleanValue).filter(v => v !== null && typeof v !== 'undefined')
    return next
  }
  if (value && typeof value === 'object') {
    const next = { ...value }
    for (const key of Object.keys(next)) {
      const cleaned = cleanValue(next[key])
      if (cleaned === null || typeof cleaned === 'undefined') delete next[key]
      else next[key] = cleaned
    }
    return next
  }
  return value
}

async function patchDoc(pk, sk, data) {
  if (args.dryRun) return
  await request(`?pk=eq.${encodeURIComponent(pk)}&sk=eq.${encodeURIComponent(sk)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ data, updated_at: Date.now() })
  })
}

async function deleteDoc(pk, sk) {
  if (args.dryRun) return
  await request(`?pk=eq.${encodeURIComponent(pk)}&sk=eq.${encodeURIComponent(sk)}`, { method: 'DELETE' })
}

const rows = [...await scan('USER#'), ...await scan('REELM#')]
let changed = 0
for (const row of rows) {
  if (!containsInlineImage(row.data)) continue
  const cleaned = cleanValue(row.data)
  if (cleaned === null || (typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0 && ['bg_image'].includes(String(row.sk)))) {
    await deleteDoc(row.pk, row.sk)
    console.log(`deleted ${row.pk} ${row.sk}`)
  } else {
    await patchDoc(row.pk, row.sk, cleaned)
    console.log(`cleaned ${row.pk} ${row.sk}`)
  }
  changed += 1
}
console.log(JSON.stringify({ ok: true, scanned: rows.length, changed, dryRun: Boolean(args.dryRun) }, null, 2))
