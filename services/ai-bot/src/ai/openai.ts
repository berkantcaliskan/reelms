import { config } from '../config.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `Sen "Reelms Intelligence" adında, Reelms topluluğunda sohbet eden samimi, zeki, esprili ve doğal bir kullanıcısın (arkadaşsın).
Kullanıcılar @Reelms Intelligence veya @intelligence diye sana seslendiğinde tıpkı bir arkadaş gibi sohbete katılırsın.
Kullanıcının yazdığı dilde yanıt ver (Türkçe ise Türkçe, İngilizce ise İngilizce).
Asla robotik veya kurumsal olma. Samimi, akıcı ve kafa dengi bir kullanıcı gibi konuş. Markdown ve uygun emojiler kullanabilirsin.`

function getAIConfig(forSummarize = false) {
  const isOpenRouter = !!config.OPENROUTER_API_KEY
  const apiKey = config.OPENROUTER_API_KEY || config.OPENAI_API_KEY || ''
  const endpoint = isOpenRouter
    ? `${config.OPENROUTER_BASE_URL.replace(/\/+$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions'
  const model = isOpenRouter
    ? (forSummarize ? config.OPENROUTER_SUMMARIZE_MODEL : config.OPENROUTER_MODEL)
    : (forSummarize ? config.OPENAI_SUMMARIZE_MODEL : config.OPENAI_MODEL)
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  }
  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://reelms.app'
    headers['X-Title'] = 'Reelms'
  }
  return { endpoint, apiKey, model, headers }
}

export async function chatWithAI(
  history: ChatMessage[],
  userMessage: string,
  senderName: string
): Promise<string> {
  const { endpoint, apiKey, model, headers } = getAIConfig(false)
  if (!apiKey) throw new Error('AI is not configured. OPENROUTER_API_KEY or OPENAI_API_KEY required.')

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: `${senderName}: ${userMessage}` }
  ]

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 800,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any
    throw new Error(`AI error ${response.status}: ${err?.error?.message || err?.message || 'unknown'}`)
  }

  const data = await response.json() as any
  return String(data.choices?.[0]?.message?.content || '').trim()
}

export async function summarizeMessages(
  messages: Array<{ sender?: any; text?: string; time?: number }>,
  channelName: string
): Promise<string> {
  if (!messages.length) return 'No messages to summarize in this channel.'

  const formatted = messages
    .filter((m) => m?.text)
    .map((m) => {
      const name = m.sender?.name || m.sender?.username || 'User'
      return `${name}: ${String(m.text).slice(0, 300)}`
    })
    .join('\n')

  if (!formatted.trim()) return 'No text to summarize.'

  const prompt = `Summarize the following conversation from the "${channelName}" channel in English.
List the key topics, decisions, and highlights as bullet points.
Maximum 10 bullets, 1-2 sentences each:

${formatted}`

  const { endpoint, apiKey, model, headers } = getAIConfig(true)
  if (!apiKey) throw new Error('AI is not configured. OPENROUTER_API_KEY or OPENAI_API_KEY required.')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any
    throw new Error(`OpenAI error ${response.status}: ${err?.error?.message || 'unknown'}`)
  }

  const data = await response.json() as any
  return String(data.choices?.[0]?.message?.content || '').trim()
}

export async function generateDigest(
  channels: Array<{ name: string; messages: Array<{ sender?: any; text?: string; time?: number }> }>
): Promise<string> {
  const parts: string[] = [`📊 **Daily Digest** — ${new Date().toLocaleDateString('en-US')}\n`]

  for (const ch of channels) {
    if (!ch.messages.length) continue
    try {
      const summary = await summarizeMessages(ch.messages, ch.name)
      parts.push(`**#${ch.name}**\n${summary}`)
    } catch {
      parts.push(`**#${ch.name}** — could not be summarized`)
    }
  }

  return parts.length > 1 ? parts.join('\n\n') : 'No messages to summarize for today.'
}
