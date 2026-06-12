import { current, getUpcoming, isPlaying } from '../music/MusicQueue.js'
import { formatDuration } from '../music/search.js'
import type { CommandContext } from './index.js'

export function handleQueue(ctx: CommandContext): string {
  const { msgKey } = ctx
  const now = current(msgKey)
  const upcoming = getUpcoming(msgKey)

  if (!now && upcoming.length === 0) return '📭 Queue is empty. Start with `/play <song name>`.'

  const lines: string[] = []

  if (now) {
    const status = isPlaying(msgKey) ? '🎵 Now playing' : '⏸️ Paused'
    lines.push(`${status}: **${now.title}** (${formatDuration(now.durationSec)})`)
  }

  if (upcoming.length > 0) {
    lines.push('')
    lines.push('**Up next:**')
    upcoming.slice(0, 10).forEach((t, i) => {
      lines.push(`${i + 1}. ${t.title} — ${t.artist} (${formatDuration(t.durationSec)})`)
    })
    if (upcoming.length > 10) lines.push(`...and ${upcoming.length - 10} more songs`)
  }

  return lines.join('\n')
}
