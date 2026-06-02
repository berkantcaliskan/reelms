import { env } from '../../config/env.js'
import { chanPk, putDoc } from '../store/docStore.js'

const ALWAYS_BLOCK = new Set([
  'hate', 'hate/threatening',
  'harassment', 'harassment/threatening',
  'self-harm', 'self-harm/intent', 'self-harm/instructions'
])

export async function pushModEvent(event: Record<string, unknown>) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const ts = String(Date.now()).padStart(15, '0')
  const sk = `MSG#${ts}#${id}`
  await putDoc(chanPk('mod_inbox'), sk, { id, time: Date.now(), isModEvent: true, ...event })
}

export async function moderateText(text: string, ageRating?: string) {
  if (!text || typeof text !== 'string') return { flagged: false }
  if (!env.OPENAI_API_KEY) return { flagged: false, skipped: true }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ input: text })
    })

    if (!response.ok) return { flagged: false, error: 'api_error' }
    const data = await response.json() as any
    const result = data.results?.[0]
    if (!result) return { flagged: false }

    const isAdults = ageRating === 'adults'
    const categories = Object.entries(result.categories || {})
      .filter(([k, v]) => v && (isAdults ? ALWAYS_BLOCK.has(k) : true))
      .map(([k]) => k)
    const flagged = isAdults ? categories.length > 0 : Boolean(result.flagged)

    if (flagged) {
      await pushModEvent({
        type: 'auto_flag',
        text: text.slice(0, 400),
        categories,
        ageRating: ageRating || 'under18',
        actionTaken: true,
        needsReview: false
      }).catch(() => {})
    }

    return { flagged, categories }
  } catch {
    return { flagged: false, error: 'fetch_failed' }
  }
}
