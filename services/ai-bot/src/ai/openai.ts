import { config } from '../config.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `Sen Reelms Intelligence'sın — Reelms topluluğunun AI asistanı.
Kullanıcılara yardımcı ol, soru cevapla, içerik öner.
Kısa ve net cevaplar ver. Markdown kullanabilirsin.
Türkçe konuşanlarla Türkçe, İngilizce konuşanlarla İngilizce yanıt ver.`

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
  if (!messages.length) return 'Bu kanalda özetlenecek mesaj yok.'

  const formatted = messages
    .filter((m) => m?.text)
    .map((m) => {
      const name = m.sender?.name || m.sender?.username || 'Kullanıcı'
      return `${name}: ${String(m.text).slice(0, 300)}`
    })
    .join('\n')

  if (!formatted.trim()) return 'Özetlenecek metin bulunamadı.'

  const prompt = `Aşağıdaki "${channelName}" kanal konuşmasını Türkçe olarak özetle.
Önemli konuları, kararları ve öne çıkan noktaları maddeler halinde listele.
Maksimum 10 madde, her madde 1-2 cümle:

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
  const parts: string[] = [`📊 **Günlük Özet** — ${new Date().toLocaleDateString('tr-TR')}\n`]

  for (const ch of channels) {
    if (!ch.messages.length) continue
    try {
      const summary = await summarizeMessages(ch.messages, ch.name)
      parts.push(`**#${ch.name}**\n${summary}`)
    } catch {
      parts.push(`**#${ch.name}** — özetlenemedi`)
    }
  }

  return parts.length > 1 ? parts.join('\n\n') : 'Bugün özet oluşturulacak mesaj bulunamadı.'
}
