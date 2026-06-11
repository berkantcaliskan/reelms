import { summarizeMessages } from '../ai/openai.js'
import { config } from '../config.js'
import type { CommandContext } from './index.js'

export async function handleSummarize(ctx: CommandContext, fetchMessages: FetchMessages): Promise<string> {
  const { args, msgKey } = ctx

  const n = Math.min(Math.max(parseInt(args) || 30, 5), 100)

  let messages: any[]
  try {
    messages = await fetchMessages(msgKey, n)
  } catch (err) {
    console.error('[AI/summarize] mesaj çekme hatası:', err)
    return '❌ Mesajlar alınamadı.'
  }

  if (!messages.length) return '📭 Özetlenecek mesaj bulunamadı.'

  try {
    const channelName = msgKey.split('_').slice(1).join('_') || msgKey
    const summary = await summarizeMessages(messages, channelName)
    return `📝 **Son ${messages.length} mesajın özeti:**\n\n${summary}`
  } catch (err) {
    console.error('[AI/summarize] özet hatası:', err)
    return '❌ Özet oluşturulurken hata oluştu.'
  }
}

export async function handleDigest(
  ctx: CommandContext,
  fetchMessages: FetchMessages,
  channelRefs: Array<{ channelId: string; msgKey: string; name?: string }>
): Promise<string> {
  if (!channelRefs.length) return '📭 Bu reelm\'de kanal bulunamadı.'

  const channels: Array<{ name: string; messages: any[] }> = []

  for (const ref of channelRefs.slice(0, 5)) {
    try {
      const messages = await fetchMessages(ref.msgKey, 50)
      const todayStart = Date.now() - 24 * 60 * 60 * 1000
      const todayMessages = messages.filter((m: any) => Number(m?.time || 0) > todayStart)
      if (todayMessages.length > 0) {
        channels.push({ name: ref.name || ref.channelId, messages: todayMessages })
      }
    } catch {
      // kanal atla
    }
  }

  if (!channels.length) return '📭 Son 24 saatte özetlenecek mesaj bulunamadı.'

  const { generateDigest } = await import('../ai/openai.js')
  try {
    const digest = await generateDigest(channels)
    return digest
  } catch (err) {
    console.error('[AI/digest] hata:', err)
    return '❌ Özet oluşturulurken hata oluştu.'
  }
}

export type FetchMessages = (msgKey: string, limit: number) => Promise<any[]>
