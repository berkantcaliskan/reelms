import { Router } from 'express'
import { trackEvents, type TrackedEvent } from '../../lib/tracker.js'
import { verifyIdToken } from '../../modules/auth/authService.js'

export const trackRouter = Router()

trackRouter.post('/api/v1/track', async (req, res) => {
  const rawEvents = Array.isArray(req.body?.events) ? req.body.events : []
  if (!rawEvents.length) return void res.json({ ok: true })

  // UID: önce body'den, yoksa JWT'den çek
  let uid: string | null = req.body?.uid ?? null
  if (!uid) {
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (token) {
      try { uid = (await verifyIdToken(token))?.uid ?? null } catch {}
    }
  }

  const ip = (req.ip ?? '').replace('::ffff:', '')
  const userAgent = (req.headers['user-agent'] ?? '').slice(0, 200)

  const safe: TrackedEvent[] = rawEvents.slice(0, 100).map((e: any) => ({
    uid: uid ?? (e.uid ? String(e.uid).slice(0, 100) : null),
    session_id: e.session_id ? String(e.session_id).slice(0, 100) : null,
    event_type: String(e.event_type || 'unknown').slice(0, 100),
    category: e.category ? String(e.category).slice(0, 100) : null,
    page: e.page ? String(e.page).slice(0, 500) : null,
    element: e.element ? String(e.element).slice(0, 200) : null,
    metadata: e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata)
      ? e.metadata as Record<string, unknown>
      : null,
    ip,
    user_agent: userAgent,
    occurred_at: typeof e.occurred_at === 'string' ? e.occurred_at : new Date().toISOString(),
  }))

  trackEvents(safe).catch(() => {})
  res.json({ ok: true })
})
