import { current, getUpcoming, isPlaying } from '../music/MusicQueue.js'
import { formatDuration } from '../music/search.js'
import type { CommandContext } from './index.js'

export function handleQueue(ctx: CommandContext): string {
  const { msgKey } = ctx
  const now = current(msgKey)
  const upcoming = getUpcoming(msgKey)

  if (!now && upcoming.length === 0) return '📭 Kuyruk boş. `/play <şarkı adı>` ile başlat.'

  const lines: string[] = []

  if (now) {
    const status = isPlaying(msgKey) ? '🎵 Şimdi çalıyor' : '⏸️ Duraklatıldı'
    lines.push(`${status}: **${now.title}** (${formatDuration(now.durationSec)})`)
  }

  if (upcoming.length > 0) {
    lines.push('')
    lines.push('**Sırada:**')
    upcoming.slice(0, 10).forEach((t, i) => {
      lines.push(`${i + 1}. ${t.title} — ${t.artist} (${formatDuration(t.durationSec)})`)
    })
    if (upcoming.length > 10) lines.push(`...ve ${upcoming.length - 10} şarkı daha`)
  }

  return lines.join('\n')
}
