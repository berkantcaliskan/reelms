import { config } from '../config.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are Reelms Intelligence — the AI assistant of the Reelms community.
Help users, answer questions, and suggest content.
Keep your answers short and clear. You may use Markdown.
Always respond in English.`

export async function chatWithAI(
  history: ChatMessage[],
  userMessage: string,
  senderName: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: `${senderName}: ${userMessage}` }
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages,
      max_tokens: 800,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any
    throw new Error(`OpenAI error ${response.status}: ${err?.error?.message || 'unknown'}`)
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: config.OPENAI_SUMMARIZE_MODEL,
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
