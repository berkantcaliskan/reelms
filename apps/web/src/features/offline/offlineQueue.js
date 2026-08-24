// ─────────────────────────────────────────────────────────────
// REELMS OFFLINE SYNC & OUTBOX QUEUE MANAGER
// ─────────────────────────────────────────────────────────────

const MSG_CACHE_PREFIX = 'reelms:msg_cache:'
const OUTBOX_KEY = 'reelms:outbox_queue'
const MAX_CACHED_MESSAGES_PER_CHANNEL = 120

export function isAppOnline() {
  if (typeof navigator === 'undefined') return true
  return Boolean(navigator.onLine)
}

// ── Message Cache (Read while offline) ────────────────────────

export function getCachedMessages(msgKey) {
  if (!msgKey || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${MSG_CACHE_PREFIX}${msgKey}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCachedMessages(msgKey, messages) {
  if (!msgKey || typeof localStorage === 'undefined' || !Array.isArray(messages)) return
  try {
    // Keep the latest 120 messages to prevent excessive storage consumption
    const slice = messages.slice(-MAX_CACHED_MESSAGES_PER_CHANNEL)
    localStorage.setItem(`${MSG_CACHE_PREFIX}${msgKey}`, JSON.stringify(slice))
  } catch (err) {
    console.warn('[OfflineCache] Could not save messages to storage:', err)
  }
}

// ── Outbox Queue (Write while offline & Flush when online) ─────

export function getQueuedMessages() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function enqueueOutboxMessage(msgKey, message) {
  if (!msgKey || !message || typeof localStorage === 'undefined') return
  try {
    const queue = getQueuedMessages()
    // Avoid duplicate queueing
    if (!queue.some(item => item.message?.id === message.id)) {
      const next = [...queue, { id: message.id, msgKey, message, queuedAt: Date.now() }]
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(next))
    }
  } catch (err) {
    console.warn('[Outbox] Failed to enqueue message:', err)
  }
}

export function removeQueuedMessage(messageId) {
  if (!messageId || typeof localStorage === 'undefined') return
  try {
    const queue = getQueuedMessages()
    const next = queue.filter(item => item.id !== messageId && item.message?.id !== messageId)
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(next))
  } catch { /* noop */ }
}

export async function flushOutbox(sendFn, onMessageSent) {
  if (!isAppOnline()) return
  const queue = getQueuedMessages()
  if (queue.length === 0) return

  for (const item of queue) {
    try {
      if (!isAppOnline()) break
      await sendFn(item.msgKey, item.message)
      removeQueuedMessage(item.id)
      onMessageSent?.(item.msgKey, item.id)
    } catch (err) {
      console.warn('[Outbox] Failed to send queued message:', item.id, err)
      // If error is permanent (e.g. 400/403/404), remove it to avoid blocking queue
      if (err?.status && err.status >= 400 && err.status < 500) {
        removeQueuedMessage(item.id)
      }
      break
    }
  }
}
