import { skip, current, isPlaying, setPlaying, stop } from '../music/MusicQueue.js'
import { formatDuration } from '../music/search.js'
import type { CommandContext } from './index.js'

export function handleSkip(ctx: CommandContext): string {
  const { msgKey } = ctx

  if (!isPlaying(msgKey)) return '⏭️ Nothing is currently playing.'

  const next = skip(msgKey)

  if (!next) {
    stop(msgKey)
    return '⏭️ Skipped. Queue is empty.'
  }

  return [
    `⏭️ Skipped. **Now playing:** ${next.title}`,
    `👤 ${next.artist}  •  ⏱️ ${formatDuration(next.durationSec)}`,
    `🔗 ${next.url}`
  ].join('\n')
}
