import { Router } from 'express'
import { trackEvents, type TrackedEvent } from '../../lib/tracker.js'
import { verifyIdToken } from '../../modules/auth/authService.js'

export const trackRouter = Router()

function clean(value: unknown, max = 160) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

function safeKey(value: unknown, fallback = 'event') {
  return clean(value, 80).toLowerCase().replace(/[^a-z0-9_.:-]+/g, '_').replace(/^_+|_+$/g, '') || fallback
}

function safeMetadata(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, unknown> = {}
  for (const [rawKey, rawValue] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) {
    const key = safeKey(rawKey, '')
    if (!key) continue
    if (rawValue == null) out[key] = null
    else if (typeof rawValue === 'string') out[key] = clean(rawValue, 160)
    else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) out[key] = rawValue
    else if (typeof rawValue === 'boolean') out[key] = rawValue
  }
  return Object.keys(out).length ? out : null
}

async function resolveAuthorizedUid(req: any) {
  const auth = String(req.headers.authorization || '')
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return null
  try {
    const verifiedUid = await verifyIdToken(token)
    return verifiedUid ? String(verifiedUid) : null
  } catch {
    return null
  }
}

trackRouter.post('/', async (req, res) => {
  try {
    const uid = await resolveAuthorizedUid(req)
    if (!uid) return res.json({ ok: true, accepted: 0 })

    const rawEvents = Array.isArray(req.body?.events) ? req.body.events : []
    if (!rawEvents.length) return res.json({ ok: true, accepted: 0 })

    const ip = clean(String(req.ip || '').replace('::ffff:', ''), 80)
    const userAgent = clean(req.headers['user-agent'] || '', 200)

    const safe: TrackedEvent[] = rawEvents.slice(0, 50).map((e: any) => ({
      uid,
      session_id: clean(e?.session_id, 100) || null,
      event_type: safeKey(e?.event_type, 'unknown'),
      category: e?.category ? safeKey(e.category, 'ui') : null,
      page: e?.page ? clean(e.page, 160) : null,
      element: e?.element ? clean(e.element, 120) : null,
      metadata: safeMetadata(e?.metadata),
      ip,
      user_agent: userAgent,
      occurred_at: typeof e?.occurred_at === 'string' ? clean(e.occurred_at, 40) : new Date().toISOString(),
    }))

    trackEvents(safe).catch(() => {})
    return res.json({ ok: true, accepted: safe.length })
  } catch {
    // Tracking must never break app UX.
    return res.json({ ok: false, accepted: 0 })
  }
})
