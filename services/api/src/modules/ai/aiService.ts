import { env } from '../../config/env.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function getAIConfig(customModel?: string) {
  const isOpenRouter = !!env.OPENROUTER_API_KEY
  const apiKey = env.OPENROUTER_API_KEY || env.OPENAI_API_KEY || ''
  const endpoint = isOpenRouter
    ? `${env.OPENROUTER_BASE_URL.replace(/\/+$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions'
  const model = customModel || (isOpenRouter ? env.OPENROUTER_MODEL : 'gpt-4o-mini')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  }
  if (isOpenRouter) {
    headers['HTTP-Referer'] = env.OPENROUTER_SITE_URL || 'https://reelms.app'
    headers['X-Title'] = env.OPENROUTER_SITE_NAME || 'Reelms'
  }
  return { isOpenRouter, apiKey, endpoint, model, headers }
}

export function isAIConfigured(): boolean {
  return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY)
}

const DEFAULT_SYSTEM_PROMPT = `Sen Reelms AI'sın — Reelms platformunun içine entegre edilmiş güçlü ve samimi AI asistanı.
Reelms, modern bir topluluk, ses ve mesajlaşma platformudur.
Kullanıcının yazdığı dilde yanıt ver (Türkçe ise Türkçe, İngilizce ise İngilizce).
Markdown formatlaması (başlıklar, listeler, kod blokları vb.) kullanabilirsin.
Yanıtların akıcı, yardımsever ve anlaşılır olsun.`

export async function generateAIChatResponse({
  messages = [],
  prompt,
  systemPrompt,
  model,
  temperature = 0.7,
  maxTokens = 1000
}: {
  messages?: ChatMessage[]
  prompt?: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
}): Promise<{ text: string; model: string }> {
  const { endpoint, apiKey, model: resolvedModel, headers } = getAIConfig(model)
  if (!apiKey) {
    throw new Error('AI is not configured. Please set OPENROUTER_API_KEY.')
  }

  const conversation: ChatMessage[] = [
    { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT }
  ]

  if (messages.length) {
    conversation.push(...messages)
  }

  if (prompt) {
    conversation.push({ role: 'user', content: prompt })
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: resolvedModel,
      messages: conversation,
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`AI API error (${res.status}): ${err?.error?.message || err?.message || 'unknown'}`)
  }

  const data = await res.json() as any
  const text = String(data.choices?.[0]?.message?.content || '').trim()
  return { text, model: resolvedModel }
}

export async function summarizeChannelConversation({
  messages,
  channelName,
  language = 'auto'
}: {
  messages: Array<{ sender?: any; text?: string; time?: number; name?: string }>
  channelName?: string
  language?: string
}): Promise<string> {
  if (!messages || !messages.length) {
    return 'Bu kanalda özetlenecek mesaj bulunmuyor.'
  }

  const formatted = messages
    .filter((m) => m?.text && String(m.text).trim().length > 0)
    .map((m) => {
      const name = m.sender?.name || m.sender?.username || m.name || 'User'
      return `${name}: ${String(m.text).slice(0, 300)}`
    })
    .join('\n')

  if (!formatted.trim()) {
    return 'Özetlenebilecek mesaj içeriği bulunamadı.'
  }

  const prompt = `Aşağıdaki "${channelName || 'Sohbet'}" kanalındaki mesajlaşmaları analiz et ve özetle.
Kurallar:
- Önemli konuları, alınan kararları ve öne çıkan başlıkları maddeler halinde listele.
- Kullanıcıların konuştuğu ana dilde (${language === 'auto' ? 'mesajların dili' : language}) yanıtla.
- Maksimum 8-10 madde olsun. Net ve temiz olsun.

Mesajlar:
${formatted}`

  const result = await generateAIChatResponse({
    prompt,
    temperature: 0.3,
    maxTokens: 800
  })

  return result.text
}
