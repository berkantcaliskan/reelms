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
  '🎙️ **Reelm Radio komutları:**',
  '`/play <şarkı adı veya link>` — Çal veya kuyruğa ekle',
  '`/skip` — Sonraki şarkıya geç',
  '`/queue` — Kuyruğu göster',
  '`/stop` — Durdur ve kuyruğu temizle',
  '',
  'Mention ile de kullanabilirsin: `@reelmradio play <şarkı>`'
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
