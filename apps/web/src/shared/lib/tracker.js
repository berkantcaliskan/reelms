import { getWebEnv } from '../config/env.js'
import { getWebToken } from '../../webAuth.js'

const env = getWebEnv()
const SESSION_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
const MAX_QUEUE = 40
const MAX_BATCH = 10
const FLUSH_MS = 30_000
const COOLDOWN_MS = 60_000

let _uid = null
let _queue = []
let _flushTimer = null
let _initialized = false
let _lastClickKey = ''
let _lastClickAt = 0
let _pausedUntil = 0

export function setTrackerUid(uid) { _uid = uid || null }

function resolveUid() {
  if (_uid) return _uid
  try {
    const raw = sessionStorage.getItem('_wa')
    return raw ? (JSON.parse(raw)?.uid ?? null) : null
  } catch { return null }
}

function currentPage() {
  try { return (window.location.hash || window.location.pathname || '').slice(0, 160) } catch { return null }
}

function clean(value, max = 96) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

function safeKey(value, fallback = '') {
  return clean(value, 48).toLowerCase().replace(/[^a-z0-9_.:-]+/g, '_').replace(/^_+|_+$/g, '') || fallback
}

function describeTarget(el) {
  if (!el) return null
  const explicit = el.getAttribute?.('data-track') || el.getAttribute?.('data-action')
  if (explicit) return safeKey(explicit, 'action')
  const tag = clean(el.tagName || 'element', 24).toLowerCase()
  const role = el.getAttribute?.('role')
  const aria = el.getAttribute?.('aria-label') || el.getAttribute?.('title') || el.getAttribute?.('name')
  return [tag, role ? `role:${safeKey(role)}` : '', aria ? `label:${safeKey(aria)}` : ''].filter(Boolean).join('|').slice(0, 96) || null
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const out = {}
  for (const [rawKey, rawValue] of Object.entries(metadata).slice(0, 8)) {
    const key = safeKey(rawKey)
    if (!key) continue
    if (rawValue == null) out[key] = null
    else if (typeof rawValue === 'string') out[key] = clean(rawValue, 120)
    else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) out[key] = rawValue
    else if (typeof rawValue === 'boolean') out[key] = rawValue
  }
  return Object.keys(out).length ? out : null
}

function push(eventType, extra = {}) {
  if (Date.now() < _pausedUntil) return
  const token = getWebToken()
  const uid = resolveUid()
  if (!token || !uid) return
  _queue.push({
    event_type: safeKey(eventType, 'event'),
    uid,
    session_id: SESSION_ID,
    page: currentPage(),
    occurred_at: new Date().toISOString(),
    category: safeKey(extra.category, 'ui'),
    element: extra.element ? clean(extra.element, 96) : null,
    metadata: sanitizeMetadata(extra.metadata),
  })
  if (_queue.length > MAX_QUEUE) _queue = _queue.slice(-MAX_QUEUE)
  if (_queue.length >= MAX_BATCH) void flush()
}

export async function flush() {
  const token = getWebToken()
  const uid = resolveUid()
  if (!token || !uid || !_queue.length || Date.now() < _pausedUntil) return
  const batch = _queue.splice(0, MAX_BATCH)
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
    if (res.status === 404 || res.status === 405) { _queue = []; stopTrackerTimer() }
    if (res.status === 429) { _pausedUntil = Date.now() + COOLDOWN_MS; _queue = [] }
  } catch {
    _queue = [...batch, ..._queue].slice(0, MAX_QUEUE)
  }
}

function stopTrackerTimer() { if (_flushTimer) clearInterval(_flushTimer); _flushTimer = null }

export function initTracker() {
  if (_initialized || typeof window === 'undefined' || typeof document === 'undefined') return
  _initialized = true
  document.addEventListener('click', (event) => {
    const target = event.target?.closest?.('[data-track], [data-action], button, a, [role="button"], input[type="submit"]')
    if (!target) return
    const element = describeTarget(target)
    if (!element) return
    const now = Date.now()
    const clickKey = `${currentPage()}::${element}`
    if (clickKey === _lastClickKey && now - _lastClickAt < 1000) return
    _lastClickKey = clickKey
    _lastClickAt = now
    push('click', { element, category: 'ui' })
  }, { passive: true })
  window.addEventListener('hashchange', () => push('page_view', { page: currentPage(), category: 'navigation' }))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush() })
  window.addEventListener('pagehide', () => { void flush() })
  stopTrackerTimer()
  _flushTimer = setInterval(() => { void flush() }, FLUSH_MS)
  push('page_view', { page: currentPage(), category: 'navigation' })
}

export function trackAction(name, metadata) { push(name, { category: 'action', metadata }) }
