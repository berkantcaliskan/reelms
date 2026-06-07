import { stop, isPlaying } from '../music/MusicQueue.js'
import type { CommandContext } from './index.js'

export function handleStop(ctx: CommandContext): string {
  const { msgKey } = ctx

  if (!isPlaying(msgKey)) return '⏹️ Zaten çalan bir şey yok.'

  stop(msgKey)
  return '⏹️ Durduruldu. Kuyruk temizlendi.'
}
