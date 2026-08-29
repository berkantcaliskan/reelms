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

const DEFAULT_SYSTEM_PROMPT = `Sen "Reelms Intelligence" adında, Reelms topluluğunda sohbet eden samimi, zeki, esprili ve doğal bir kullanıcısın (arkadaşsın).

Konuşma Tarzın ve Kuralların:
1. Tıpkı Discord veya Reelms sunucusunda takılan gerçek bir kullanıcı / arkadaş gibi doğal, akıcı ve samimi konuş.
2. Kesinlikle robotik, yapay veya kurumsal olma. "Ben bir yapay zeka asistanıyım", "Size nasıl yardımcı olabilirim efendim" gibi basmakalıp kalıplar kullanma.
3. Kullanıcının yazdığı dilde yanıt ver (Türkçe yazana samimi Türkçe, İngilizce yazana doğal İngilizce).
4. Günlük sohbet dilini, internet kültürünü, oyunları, yazılımı, müziği ve gündelik konuları iyi bilirsin. İlgili konularda kendi samimi fikrini belirtebilir, şakalaşabilir, keyifle sohbet edebilirsin.
5. Mesajlaşma ortamına uygun uzunlukta yaz. Gereksiz laf kalabalığı yapma, gerektiğinde kısa ve vurucu, gerektiğinde detaylı ve açıklayıcı ol.
6. Markdown formatlaması (kalın, italik, liste, kod blokları vb.) ve yerinde doğal emojiler kullanabilirsin.
7. Kanalın önceki mesajlarını ve sohbetin bağlamını dikkate alarak cevap ver.`

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
  rangeDescription = 'Son mesajlar',
  language = 'auto'
}: {
  messages: Array<{ sender?: any; text?: string; time?: number; name?: string }>
  channelName?: string
  rangeDescription?: string
  language?: string
}): Promise<string> {
  if (!messages || !messages.length) {
    return 'Bu aralıkta veya kanalda özetlenecek mesaj bulunmuyor.'
  }

  const formatted = messages
    .filter((m) => m?.text && String(m.text).trim().length > 0)
    .map((m) => {
      const name = m.sender?.name || m.sender?.username || m.name || 'User'
      return `${name}: ${String(m.text).slice(0, 300)}`
    })
    .join('\n')

  if (!formatted.trim()) {
    return 'Özetlenebilecek mesaj metni bulunamadı.'
  }

  const prompt = `Aşağıdaki "${channelName || 'Sohbet'}" kanalındaki ${rangeDescription} mesajlaşmalarını analiz et ve kapsamlı bir özet hazırla.
Kurallar:
- Tartışılan ana konuları, alınan kararları, paylaşılan önemli fikir veya bağlantıları maddeler halinde listele.
- Kullanıcıların konuştuğu ana dilde (${language === 'auto' ? 'mesajların dili' : language}) yanıtla.
- Maksimum 8-12 madde olsun.
- Başlık: 📊 **#${channelName || 'Kanal'} Özeti (${rangeDescription})**

Mesajlar:
${formatted}`

  const result = await generateAIChatResponse({
    prompt,
    temperature: 0.3,
    maxTokens: 900
  })

  return result.text
}

export async function moderateChannelMessages({
  messages,
  channelName,
  serverRules
}: {
  messages: Array<{ id?: string; sender?: any; text?: string; time?: number; name?: string }>
  channelName?: string
  serverRules?: string
}): Promise<{
  safe: boolean
  summary: string
  flaggedMessages: Array<{ id?: string; senderName: string; text: string; reason: string; severity: 'low' | 'medium' | 'high' }>
  moderationAdvice: string
}> {
  if (!messages || !messages.length) {
    return {
      safe: true,
      summary: 'Kanalda incelenecek mesaj bulunmuyor.',
      flaggedMessages: [],
      moderationAdvice: 'Herhangi bir ihlal tespit edilmedi.'
    }
  }

  const formatted = messages
    .filter((m) => m?.text && String(m.text).trim().length > 0)
    .map((m, idx) => {
      const name = m.sender?.name || m.sender?.username || m.name || 'User'
      return `[ID: ${m.id || idx}] ${name}: ${String(m.text).slice(0, 300)}`
    })
    .join('\n')

  const prompt = `Sen Reelms Intelligence moderasyon asistanısın. Aşağıdaki "${channelName || 'Genel'}" kanalındaki mesajları denetle.
Sunucu Kuralları: "${serverRules || 'Saygılı olun, nefret söylemi, spam, hakaret, kişisel saldırı ve zararlı içerik yasaktır.'}"

Lütfen geçerli bir JSON nesnesi döndür:
{
  "safe": boolean,
  "summary": "Kanal genel durum özeti (1-2 cümle)",
  "flaggedMessages": [
    {
      "id": "mesaj_id",
      "senderName": "kullanıcı adı",
      "text": "mesaj metni",
      "reason": "kural ihlali gerekçesi (küfür, spam, saldırı vs.)",
      "severity": "low" | "medium" | "high"
    }
  ],
  "moderationAdvice": "Yöneticiye moderasyon tavsiyesi"
}

Mesajlar:
${formatted}`

  try {
    const result = await generateAIChatResponse({
      prompt,
      temperature: 0.2,
      maxTokens: 1000
    })

    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        safe: Boolean(parsed.safe),
        summary: String(parsed.summary || 'Kanal analizi tamamlandı.'),
        flaggedMessages: Array.isArray(parsed.flaggedMessages) ? parsed.flaggedMessages : [],
        moderationAdvice: String(parsed.moderationAdvice || 'Topluluk kurallarına uygun sohbet devam ediyor.')
      }
    }
  } catch (err) {
    console.error('[AI Moderation Error]:', err)
  }

  return {
    safe: true,
    summary: 'Kanal incelendi, kritik bir ihlal tespit edilmedi.',
    flaggedMessages: [],
    moderationAdvice: 'Topluluk sağlıklı bir şekilde sohbete devam ediyor.'
  }
}
