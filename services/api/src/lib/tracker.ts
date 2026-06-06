import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

let _client: ReturnType<typeof createClient> | null = null

function sb() {
  if (!_client && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  }
  return _client
}

export async function trackRegistration(data: {
  uid: string
  email: string
  username?: string | null
  displayName?: string | null
  platform?: string | null
}) {
  const client = sb()
  if (!client) return
  const { error } = await client.from('tracked_accounts').upsert({
    uid: data.uid,
    email: data.email,
    username: data.username ?? null,
    display_name: data.displayName ?? null,
    platform: data.platform ?? 'web',
    registered_at: new Date().toISOString(),
  }, { onConflict: 'uid' })
  if (error) console.warn('[tracker] account upsert failed:', error.message)
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

export async function trackEvents(events: TrackedEvent[]) {
  const client = sb()
  if (!client || !events.length) return
  const { error } = await client.from('tracked_events').insert(
    events.map(e => ({
      uid: e.uid ?? null,
      session_id: e.session_id ?? null,
      event_type: e.event_type,
      category: e.category ?? null,
      page: e.page ?? null,
      element: e.element ?? null,
      metadata: e.metadata ?? null,
      ip: e.ip ?? null,
      user_agent: e.user_agent ?? null,
      occurred_at: e.occurred_at ?? new Date().toISOString(),
    }))
  )
  if (error) console.warn('[tracker] events insert failed:', error.message)
}
