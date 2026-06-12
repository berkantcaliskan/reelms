import { searchYouTube, formatDuration } from '../music/search.js'
import { enqueue, current, setPlaying } from '../music/MusicQueue.js'
import type { CommandContext } from './index.js'

export async function handlePlay(ctx: CommandContext): Promise<string> {
  const { args, msgKey, senderName } = ctx

  if (!args) return '🎵 What do you want to play? Example: `/play bohemian rhapsody`'

  const track = await searchYouTube(args, senderName)
  if (!track) return '❌ Song not found. Try a different search.'

  const { position } = enqueue(msgKey, track)
  const wasEmpty = position === 1

  if (wasEmpty) {
    setPlaying(msgKey, true)
    return [
      `🎵 **Now playing:** ${track.title}`,
      `👤 ${track.artist}  •  ⏱️ ${formatDuration(track.durationSec)}`,
      `🔗 ${track.url}`,
      `📥 Requested by: ${senderName}`
    ].join('\n')
  }

  return [
    `📥 Added to queue (#${position}): **${track.title}**`,
    `👤 ${track.artist}  •  ⏱️ ${formatDuration(track.durationSec)}`,
    `Requested by: ${senderName}`
  ].join('\n')
}
