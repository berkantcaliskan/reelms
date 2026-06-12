import { stop, isPlaying } from '../music/MusicQueue.js'
import type { CommandContext } from './index.js'

export function handleStop(ctx: CommandContext): string {
  const { msgKey } = ctx

  if (!isPlaying(msgKey)) return '⏹️ Nothing is currently playing.'

  stop(msgKey)
  return '⏹️ Stopped. Queue cleared.'
}
