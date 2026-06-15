export interface ParsedCommand {
  command: string
  args: string
}

const SLASH_RE = /^\/(\S+)(?:\s+(.*))?$/
// @reelmsai is the current handle; @reelms-intelligence kept as a backwards-compat alias
const MENTION_CMD_RE = /^@(?:reelmsai|reelms-intelligence)\s+(.+)$/i
const MENTION_RE = /^@(?:reelmsai|reelms-intelligence)\s*$/i

export function parse(text: string): ParsedCommand | null {
  const t = text.trim()

  const slash = t.match(SLASH_RE)
  if (slash) {
    const cmd = slash[1].toLowerCase()
    // Only handle AI-specific commands; don't steal music bot commands
    if (['ai', 'summarize', 'digest', 'ai-reset', 'ai-help'].includes(cmd)) {
      return { command: cmd, args: (slash[2] ?? '').trim() }
    }
    return null
  }

  const mention = t.match(MENTION_CMD_RE)
  if (mention) return { command: 'ai', args: mention[1].trim() }

  if (MENTION_RE.test(t)) return { command: 'ai', args: '' }

  return null
}
