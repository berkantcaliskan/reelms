import { handlePlay } from './play.js'
import { handleSkip } from './skip.js'
import { handleQueue } from './queue.js'
import { handleStop } from './stop.js'

export interface CommandContext {
  command: string
  args: string
  msgKey: string
  senderName: string
  senderId: string
}

const HELP_TEXT = [
  '🎙️ **Reelm Radio commands:**',
  '`/play <song name or link>` — Play or add to queue',
  '`/skip` — Skip to next song',
  '`/queue` — Show queue',
  '`/stop` — Stop and clear queue',
  '',
  'You can also use mention: `@reelmradio play <song>`'
].join('\n')

export async function dispatch(ctx: CommandContext): Promise<string | null> {
  switch (ctx.command) {
    case 'play':   return handlePlay(ctx)
    case 'skip':   return handleSkip(ctx)
    case 'queue':  return handleQueue(ctx)
    case 'stop':   return handleStop(ctx)
    case 'help':   return HELP_TEXT
    default:       return null
  }
}
