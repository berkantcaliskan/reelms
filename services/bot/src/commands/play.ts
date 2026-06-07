import { searchYouTube, formatDuration } from '../music/search.js'
import { enqueue, current, setPlaying } from '../music/MusicQueue.js'
import type { CommandContext } from './index.js'

export async function handlePlay(ctx: CommandContext): Promise<string> {
  const { args, msgKey, senderName } = ctx

  if (!args) return '🎵 Ne çalmamı istiyorsun? Örnek: `/play bohemian rhapsody`'

  const track = await searchYouTube(args, senderName)
  if (!track) return '❌ Şarkı bulunamadı. Farklı bir arama dene.'

  const { position } = enqueue(msgKey, track)
  const wasEmpty = position === 1

  if (wasEmpty) {
    setPlaying(msgKey, true)
    return [
      `🎵 **Şimdi çalıyor:** ${track.title}`,
      `👤 ${track.artist}  •  ⏱️ ${formatDuration(track.durationSec)}`,
      `🔗 ${track.url}`,
      `📥 İsteyen: ${senderName}`
    ].join('\n')
  }

  return [
    `📥 Kuyruğa eklendi (#${position}): **${track.title}**`,
    `👤 ${track.artist}  •  ⏱️ ${formatDuration(track.durationSec)}`,
    `İsteyen: ${senderName}`
  ].join('\n')
}
