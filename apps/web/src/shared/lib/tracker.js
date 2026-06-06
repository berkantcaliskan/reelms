import { getWebEnv } from '../config/env.js'
import { getWebToken } from '../../webAuth.js'

const env = getWebEnv()
const SESSION_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

let _uid = null
let _queue = []
let _flushTimer = null

export function setTrackerUid(uid) {
  _uid = uid
}

function resolveUid() {
  if (_uid) return _uid
  try {
    const raw = sessionStorage.getItem('_wa')
    return raw ? (JSON.parse(raw)?.uid ?? null) : null
  } catch {
    return null
  }
}

function currentPage() {
  try { return window.location.hash || window.location.pathname } catch { return null }
}

function describeTarget(el) {
  if (!el) return null
  const parts = []
  if (el.id) parts.push(`#${el.id}`)
  if (el.dataset?.action) parts.push(`[${el.dataset.action}]`)
  const tag = el.tagName?.toLowerCase()
  if (tag && ['button', 'a', 'input', 'select', 'textarea'].includes(tag)) parts.push(tag)
  const text = el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50)
  if (text) parts.push(`"${text}"`)
  return parts.join(' ') || tag || null
}

function push(eventType, extra = {}) {
  _queue.push({
    event_type: eventType,
    uid: resolveUid(),
    session_id: SESSION_ID,
    page: currentPage(),
    occurred_at: new Date().toISOString(),
    ...extra,
  })
  if (_queue.length >= 20) flush()
}

async function flush() {
  if (!_queue.length) return
  const batch = _queue.splice(0)
  const token = getWebToken()
  try {
    await fetch(`${env.apiBaseUrl}/api/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ uid: resolveUid(), events: batch }),
      keepalive: true,
    })
  } catch {}
}

export function initTracker() {
  // Tıklama takibi
  document.addEventListener('click', (e) => {
    const target = e.target?.closest('button, a, [role="button"], [data-action], input[type="submit"]') || e.target
    push('click', { element: describeTarget(target), category: 'ui' })
  }, { passive: true })

  // Sayfa değişim takibi (hash router)
  window.addEventListener('hashchange', () => {
    push('page_view', { page: currentPage(), category: 'navigation' })
  })

  // Sekme kapanınca boşalt
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)

  // Her 10 saniyede otomatik gönder
  _flushTimer = setInterval(flush, 10_000)

  // İlk sayfa görüntüleme
  push('page_view', { page: currentPage(), category: 'navigation' })
}

export function trackAction(name, metadata) {
  push(name, { category: 'action', metadata: metadata ?? null })
}
