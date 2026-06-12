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
  '🤖 **Reelms Intelligence commands:**',
  '`@reelms-intelligence <question>` or `/ai <question>` — Chat with AI',
  '`/summarize [n]` — Summarize the last N messages (default: 30)',
  '`/digest` — Digest of the last 24 hours',
  '`/ai-reset` — Clear chat history'
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
      return '🔄 Chat history cleared.'
    }
    case 'ai-help':  return HELP_TEXT
    default:         return null
  }
}
