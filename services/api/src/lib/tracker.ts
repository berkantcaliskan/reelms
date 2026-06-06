import { APP_PK, getDoc, putDoc } from '../modules/store/docStore.js'

type JsonRecord = Record<string, unknown>

export async function trackRegistration(data: {
  uid: string
  email: string
  username?: string | null
  displayName?: string | null
  platform?: string | null
}) {
  if (!data.uid) return
  const sk = 'tracked_accounts'
  const now = new Date().toISOString()
  const current = (await getDoc<Record<string, JsonRecord>>(APP_PK, sk).catch(() => ({}))) || {}
  const next = {
    ...current,
    [String(data.uid)]: {
      uid: String(data.uid),
      email: String(data.email || ''),
      username: data.username ?? null,
      display_name: data.displayName ?? null,
      platform: data.platform ?? 'web',
      registered_at: (current[String(data.uid)]?.registered_at as string) || now,
      updated_at: now,
    }
  }
  await putDoc(APP_PK, sk, next).catch(() => {})
}

export interface TrackedEvent {
  uid?: string | null
  session_id?: string | null
  event_type: string
  category?: string | null
  page?: string | null
  element?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
  user_agent?: string | null
  occurred_at?: string
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function bump(map: Record<string, number>, key: string | null | undefined) {
  const clean = String(key || 'unknown').slice(0, 160)
  map[clean] = Number(map[clean] || 0) + 1
}

function trimObject(obj: Record<string, number>, maxEntries: number) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, maxEntries)
  )
}

export async function trackEvents(events: TrackedEvent[]) {
  if (!Array.isArray(events) || !events.length) return
  const sk = `tracking:${dayKey()}`
  const current = (await getDoc<any>(APP_PK, sk).catch(() => null)) || {}
  const next = {
    date: dayKey(),
    total: Number(current.total || 0),
    byEvent: { ...(current.byEvent || {}) },
    byCategory: { ...(current.byCategory || {}) },
    byPage: { ...(current.byPage || {}) },
    byUser: { ...(current.byUser || {}) },
    recent: Array.isArray(current.recent) ? current.recent.slice(-120) : [],
    updatedAt: Date.now(),
  }

  for (const event of events.slice(0, 50)) {
    const uid = event.uid ? String(event.uid).slice(0, 120) : 'anonymous'
    next.total += 1
    bump(next.byEvent, event.event_type)
    bump(next.byCategory, event.category)
    bump(next.byPage, event.page)
    bump(next.byUser, uid)
    next.recent.push({
      event_type: String(event.event_type || 'unknown').slice(0, 100),
      category: event.category ? String(event.category).slice(0, 100) : null,
      uid,
      session_id: event.session_id ? String(event.session_id).slice(0, 100) : null,
      page: event.page ? String(event.page).slice(0, 160) : null,
      element: event.element ? String(event.element).slice(0, 120) : null,
      occurred_at: event.occurred_at || new Date().toISOString(),
      metadata: event.metadata || null,
    })
  }

  next.recent = next.recent.slice(-120)
  next.byEvent = trimObject(next.byEvent, 80)
  next.byCategory = trimObject(next.byCategory, 40)
  next.byPage = trimObject(next.byPage, 120)
  next.byUser = trimObject(next.byUser, 500)

  await putDoc(APP_PK, sk, next).catch(() => {})
}
