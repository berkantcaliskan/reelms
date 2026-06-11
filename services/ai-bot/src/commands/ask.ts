import { chatWithAI, type ChatMessage } from '../ai/openai.js'
import { config } from '../config.js'
import type { CommandContext } from './index.js'

const channelHistories = new Map<string, ChatMessage[]>()

function getHistory(msgKey: string): ChatMessage[] {
  if (!channelHistories.has(msgKey)) channelHistories.set(msgKey, [])
  return channelHistories.get(msgKey)!
}

function appendHistory(msgKey: string, userMsg: string, assistantMsg: string, senderName: string) {
  const history = getHistory(msgKey)
  history.push({ role: 'user', content: `${senderName}: ${userMsg}` })
  history.push({ role: 'assistant', content: assistantMsg })
  const maxTurns = config.MAX_HISTORY_TURNS * 2
  if (history.length > maxTurns) history.splice(0, history.length - maxTurns)
}

export function clearHistory(msgKey: string) {
  channelHistories.delete(msgKey)
}

export async function handleAsk(ctx: CommandContext): Promise<string> {
  const { args, msgKey, senderName } = ctx

  if (!args.trim()) {
    return [
      '👋 Merhaba! Ben Reelms Intelligence.',
      '`@reelms-intelligence <soru>` veya `/ai <soru>` ile bana soru sorabilirsin.',
      '`/summarize [n]` ile son N mesajı özetleyebilirsin.',
      '`/digest` ile günün özetini alabilirsin.',
      '`/ai-reset` ile sohbet geçmişini temizleyebilirsin.'
    ].join('\n')
  }

  const history = getHistory(msgKey)

  try {
    const reply = await chatWithAI(history, args, senderName)
    appendHistory(msgKey, args, reply, senderName)
    return reply
  } catch (err) {
    console.error('[AI/ask] hata:', err)
    return '❌ AI ile iletişimde sorun oluştu. Lütfen tekrar dene.'
  }
}
