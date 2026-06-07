export interface ParsedCommand {
  command: string
  args: string
  raw: string
}

const COMMAND_RE = /^\/(\w+)(?:\s+(.*))?$/
const MENTION_COMMAND_RE = /^@reelm-radio\s+(\w+)(?:\s+(.*))?$/i
const MENTION_RE = /^@reelm-radio\s*$/i

export function parse(text: string): ParsedCommand | null {
  const trimmed = text.trim()

  const slashMatch = trimmed.match(COMMAND_RE)
  if (slashMatch) {
    return { command: slashMatch[1].toLowerCase(), args: (slashMatch[2] ?? '').trim(), raw: trimmed }
  }

  const mentionCmdMatch = trimmed.match(MENTION_COMMAND_RE)
  if (mentionCmdMatch) {
    return { command: mentionCmdMatch[1].toLowerCase(), args: (mentionCmdMatch[2] ?? '').trim(), raw: trimmed }
  }

  if (MENTION_RE.test(trimmed)) {
    return { command: 'help', args: '', raw: trimmed }
  }

  return null
}
