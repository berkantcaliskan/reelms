export interface ParsedCommand {
  command: string
  args: string
}

const SLASH_RE = /^\/(\S+)(?:\s+(.*))?$/
const MENTION_ANYWHERE_RE = /@(?:reelms\s*intelligence|reelmsintelligence|reelms-intelligence|reelmsai|intelligence)\b/i

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

  if (MENTION_ANYWHERE_RE.test(t)) {
    const cleanArgs = t.replace(new RegExp(MENTION_ANYWHERE_RE.source, 'gi'), '').trim()
    return { command: 'ai', args: cleanArgs }
  }

  return null
}
