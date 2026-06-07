import play from 'play-dl'
import type { Track } from './MusicQueue.js'

export async function searchYouTube(query: string, requestedBy: string): Promise<Track | null> {
  try {
    const results = await play.search(query, { source: { youtube: 'video' }, limit: 1 })
    const video = results[0]
    if (!video) return null

    return {
      title: video.title ?? 'Unknown',
      artist: video.channel?.name ?? 'Unknown',
      url: video.url,
      videoId: video.id ?? '',
      durationSec: video.durationInSec ?? 0,
      thumbnail: video.thumbnails?.[0]?.url ?? null,
      requestedBy
    }
  } catch {
    return null
  }
}

export function formatDuration(sec: number): string {
  if (!sec) return '?:??'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
