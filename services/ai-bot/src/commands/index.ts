import { handleAsk, clearHistory } from './ask.js'
import { handleSummarize, handleDigest, type FetchMessages } from './summarize.js'

export interface CommandContext {
  command: string
  args: string
  msgKey: string
  senderName: string
  senderId: string
  reelmId?: string
}

const HELP_TEXT = [
  '🤖 **Reelms Intelligence komutları:**',
  '`@reelms-intelligence <soru>` veya `/ai <soru>` — AI ile sohbet et',
  '`/summarize [n]` — Son N mesajı özetle (varsayılan: 30)',
  '`/digest` — Son 24 saatin özeti',
  '`/ai-reset` — Sohbet geçmişini temizle'
].join('\n')

export async function dispatch(
  ctx: CommandContext,
  fetchMessages: FetchMessages,
  channelRefs: Array<{ channelId: string; msgKey: string; name?: string }>
): Promise<string | null> {
  switch (ctx.command) {
    case 'ai':       return handleAsk(ctx)
    case 'summarize': return handleSummarize(ctx, fetchMessages)
    case 'digest':   return handleDigest(ctx, fetchMessages, channelRefs)
    case 'ai-reset': {
      clearHistory(ctx.msgKey)
      return '🔄 Sohbet geçmişi temizlendi.'
    }
    case 'ai-help':  return HELP_TEXT
    default:         return null
  }
}
