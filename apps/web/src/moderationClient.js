/**
 * OpenAI Moderation API via backend POST /moderate (see backend/index.js).
 * Fail-open if the server is down or OPENAI_API_KEY is missing.
 */
import { getApiBaseUrl } from './config/api'
import { getIdToken } from './reelmsAwsClient'

function backendBase() {
  return getApiBaseUrl()
}

/**
 * @param {string} text
 * @returns {Promise<{ allowed: boolean, message?: string, categories?: string[] }>}
 */
export async function moderateText(text) {
  const t = (text || '').trim()
  if (!t) return { allowed: true }
  try {
    const token = await getIdToken().catch(() => null)
    const res = await fetch(`${backendBase()}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text: t }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.flagged) {
      const categories = Array.isArray(data.categories) ? data.categories : []
      return {
        allowed: false,
        categories,
        message: categories.length
          ? `Message blocked: ${categories.join(', ')}.`
          : 'Message blocked by content policy.',
      }
    }
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}
