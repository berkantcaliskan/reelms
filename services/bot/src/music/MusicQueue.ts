export interface Track {
  title: string
  artist: string
  url: string
  videoId: string
  durationSec: number
  thumbnail: string | null
  requestedBy: string
}

interface ChannelQueue {
  tracks: Track[]
  currentIndex: number
  playing: boolean
}

const queues = new Map<string, ChannelQueue>()

function getOrCreate(msgKey: string): ChannelQueue {
  if (!queues.has(msgKey)) queues.set(msgKey, { tracks: [], currentIndex: 0, playing: false })
  return queues.get(msgKey)!
}

export function enqueue(msgKey: string, track: Track): { position: number } {
  const q = getOrCreate(msgKey)
  q.tracks.push(track)
  return { position: q.tracks.length }
}

export function current(msgKey: string): Track | null {
  const q = queues.get(msgKey)
  if (!q || q.tracks.length === 0) return null
  return q.tracks[q.currentIndex] ?? null
}

export function skip(msgKey: string): Track | null {
  const q = queues.get(msgKey)
  if (!q) return null
  q.currentIndex = Math.min(q.currentIndex + 1, q.tracks.length)
  return current(msgKey)
}

export function stop(msgKey: string): void {
  const q = queues.get(msgKey)
  if (!q) return
  q.tracks = []
  q.currentIndex = 0
  q.playing = false
}

export function setPlaying(msgKey: string, playing: boolean): void {
  const q = getOrCreate(msgKey)
  q.playing = playing
}

export function isPlaying(msgKey: string): boolean {
  return queues.get(msgKey)?.playing ?? false
}

export function getQueue(msgKey: string): Track[] {
  return queues.get(msgKey)?.tracks ?? []
}

export function getUpcoming(msgKey: string): Track[] {
  const q = queues.get(msgKey)
  if (!q) return []
  return q.tracks.slice(q.currentIndex + 1)
}
