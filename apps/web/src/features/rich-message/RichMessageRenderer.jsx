import React, { useState, useCallback } from 'react'
import {
  tokenizeCode,
  getLanguageName,
  isValidLinkUrl,
  SEMANTIC_COLOR_MAP
} from './richMessageTokens'
import './richMessage.css'

// ── CodeBlock Component ─────────────────────────────────────────
export function CodeBlock({ code, language = 'text', onHeightChange }) {
  const [copied, setCopied] = useState(false)
  const tokens = tokenizeCode(code, language)
  const lines = code.split('\n')

  const handleCopy = useCallback((e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [code])

  return (
    <div className="msg-code-block" onClick={e => e.stopPropagation()}>
      <div className="msg-code-header">
        <span className="msg-code-lang">{getLanguageName(language)}</span>
        <button
          className={`msg-code-copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          title="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="msg-code-content">
        <div className="msg-code-lines" aria-hidden="true">
          {lines.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre className="msg-code-pre">
          <code>
            {tokens.map((tok, i) => (
              <span key={i} className={tok.type !== 'plain' ? `tok-${tok.type.slice(0, 3)}` : undefined}>
                {tok.text}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}

// ── SpoilerText Component ───────────────────────────────────────
export function SpoilerText({ children, onHeightChange }) {
  const [revealed, setRevealed] = useState(false)

  const handleToggle = (e) => {
    e.stopPropagation()
    setRevealed(v => {
      const next = !v
      if (onHeightChange) setTimeout(onHeightChange, 50)
      return next
    })
  }

  return (
    <span
      className={`msg-spoiler-text${revealed ? ' is-revealed' : ''}`}
      onClick={handleToggle}
      onContextMenu={(e) => {
        if (revealed) {
          e.preventDefault()
          e.stopPropagation()
          setRevealed(false)
        }
      }}
      title={revealed ? 'Right-click to hide spoiler' : 'Click to reveal spoiler'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleToggle(e)
        }
      }}
    >
      {children}
    </span>
  )
}

// ── Linkify text helper ──────────────────────────────────────────
function linkifyRichText(text, keyBase) {
  if (!text) return []
  const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s])/gi
  const parts = text.split(urlRegex)
  if (parts.length <= 1) return [text]
  return parts.map((chunk, idx) => {
    if (!chunk) return null
    if (chunk.match(/^(?:https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s]$/i)) {
      const href = chunk.startsWith('www.') ? `https://${chunk}` : chunk
      return (
        <a
          key={`${keyBase}-lnk-${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
          onClick={e => e.stopPropagation()}
        >
          {chunk}
        </a>
      )
    }
    return chunk
  }).filter(Boolean)
}

// ── Mentions Parser ─────────────────────────────────────────────
function parseMentions(text, uid, members, roles, keyBase) {
  if (!text) return []
  return text.split(/(@\w+)/g).flatMap((part, i) => {
    const key = `${keyBase}-m${i}`
    if (!part.startsWith('@')) return linkifyRichText(part, key)
    const lower = part.slice(1).toLowerCase()
    if (lower === 'everyone') {
      return [<span key={key} className="mention mention--everyone">{part}</span>]
    }
    const role = roles?.find(r => r.name?.toLowerCase() === lower)
    if (role) {
      return [<span key={key} className="mention mention--role" style={{ color: role.color }}>{part}</span>]
    }
    const member = members?.find(m => m.userName?.toLowerCase() === lower || m.username?.toLowerCase() === lower)
    if (member) {
      const isMe = String(member.userId) === String(uid)
      return [<span key={key} className={`mention mention--user${isMe ? ' mention--me' : ''}`}>{part}</span>]
    }
    return linkifyRichText(part, key)
  })
}

// ── Inline Rich Parser ──────────────────────────────────────────
function parseInlineRich(text, opts) {
  const { uid, members, roles, onHeightChange, keyPrefix } = opts
  const nodes = []
  let buf = ''
  let i = 0
  let n = 0

  const flush = () => {
    if (!buf) return
    parseMentions(buf, uid, members, roles, `${keyPrefix}-m${n++}`).forEach(x => nodes.push(x))
    buf = ''
  }

  while (i < text.length) {
    // 1. Spoilers: ||text||
    if (text.startsWith('||', i)) {
      const close = text.indexOf('||', i + 2)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + 2, close)
        nodes.push(
          <SpoilerText key={`${keyPrefix}-sp-${n++}`} onHeightChange={onHeightChange}>
            {parseInlineRich(inner, { ...opts, keyPrefix: `${keyPrefix}-sp${n}` })}
          </SpoilerText>
        )
        i = close + 2
        continue
      }
    }

    // 2. Semantic Colors: [color:red]...[/color], [color:#ff0000]...[/color], [#ff0000]...[/c]
    const colorMatch = text.slice(i).match(/^\[color:([a-zA-Z0-9_#-]+)\]/i) || text.slice(i).match(/^\[#([0-9a-fA-F]{3,8})\]/i)
    if (colorMatch) {
      const isToken = text.slice(i).toLowerCase().startsWith('[color:')
      const closeTag = isToken ? '[/color]' : '[/c]'
      const close = text.toLowerCase().indexOf(closeTag.toLowerCase(), i + colorMatch[0].length)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + colorMatch[0].length, close)
        const rawKey = colorMatch[1]
        let colorVal = rawKey
        if (rawKey.startsWith('#')) {
          colorVal = rawKey
        } else if (SEMANTIC_COLOR_MAP.has(rawKey.toLowerCase())) {
          colorVal = SEMANTIC_COLOR_MAP.get(rawKey.toLowerCase()) || rawKey
        } else if (/^[0-9a-fA-F]{3,8}$/.test(rawKey)) {
          colorVal = `#${rawKey}`
        }
        nodes.push(
          <span key={`${keyPrefix}-col-${n++}`} style={{ color: colorVal, fontWeight: 500 }}>
            {parseInlineRich(inner, { ...opts, keyPrefix: `${keyPrefix}-col${n}` })}
          </span>
        )
        i = close + closeTag.length
        continue
      }
    }

    // 2b. Inline Quote Tag: [quote]...[/quote]
    if (text.toLowerCase().startsWith('[quote]', i)) {
      const close = text.toLowerCase().indexOf('[/quote]', i + 7)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + 7, close)
        nodes.push(
          <div key={`${keyPrefix}-q-${n++}`} className="msg-quote-block msg-quote-inline">
            {parseInlineRich(inner, { ...opts, keyPrefix: `${keyPrefix}-qi${n}` })}
          </div>
        )
        i = close + 8
        continue
      }
    }

    // 3. Formatted Links: [text](url)
    const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^\)]+)\)/)
    if (linkMatch) {
      flush()
      const linkText = linkMatch[1]
      let linkUrl = linkMatch[2].trim()
      if (!/^https?:\/\//i.test(linkUrl) && !linkUrl.startsWith('mailto:')) {
        linkUrl = `https://${linkUrl}`
      }
      const isSafe = isValidLinkUrl(linkUrl)
      nodes.push(
        <a
          key={`${keyPrefix}-lnk-${n++}`}
          href={isSafe ? linkUrl : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
          onClick={e => e.stopPropagation()}
        >
          {linkText}
        </a>
      )
      i += linkMatch[0].length
      continue
    }

    // 4. Angle Bracket Links: <https://...>
    const angleLinkMatch = text.slice(i).match(/^<((?:https?:\/\/|www\.)[^>]+)>/i)
    if (angleLinkMatch) {
      flush()
      const rawUrl = angleLinkMatch[1].trim()
      const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl
      nodes.push(
        <a
          key={`${keyPrefix}-alnk-${n++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
          onClick={e => e.stopPropagation()}
        >
          {rawUrl}
        </a>
      )
      i += angleLinkMatch[0].length
      continue
    }

    // 5. Auto Links (https://... or http://... or www....)
    const autoLinkMatch = text.slice(i).match(/^((?:https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s])/i)
    if (autoLinkMatch) {
      flush()
      const rawUrl = autoLinkMatch[1]
      const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl
      nodes.push(
        <a
          key={`${keyPrefix}-alnk-${n++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
          onClick={e => e.stopPropagation()}
        >
          {rawUrl}
        </a>
      )
      i += autoLinkMatch[0].length
      continue
    }

    // 5. Bold (**), Underline (__), Strike (~~)
    const two = text.substr(i, 2)
    if (two === '**' || two === '__' || two === '~~') {
      const close = text.indexOf(two, i + 2)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + 2, close)
        const child = parseInlineRich(inner, { ...opts, keyPrefix: `${keyPrefix}-fmt${n}` })
        const key = `${keyPrefix}-two-${n++}`
        nodes.push(
          two === '**' ? <strong key={key}>{child}</strong>
          : two === '__' ? <u key={key}>{child}</u>
          : <s key={key}>{child}</s>
        )
        i = close + 2
        continue
      }
    }

    // 6. Italic (*) and Inline Code (`)
    const ch = text[i]
    if (ch === '*' || ch === '`') {
      const close = text.indexOf(ch, i + 1)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + 1, close)
        const key = `${keyPrefix}-one-${n++}`
        if (ch === '*') {
          nodes.push(<em key={key}>{parseInlineRich(inner, { ...opts, keyPrefix: `${keyPrefix}-em${n}` })}</em>)
        } else {
          nodes.push(
            <code key={key} className="msg-inline-code">
              {inner}
            </code>
          )
        }
        i = close + 1
        continue
      }
    }

    buf += ch
    i++
  }

  flush()
  return nodes
}

// ── AST Rich Parser & Renderer ──────────────────────────────────
export function parseRichText(content, { uid, members, roles, onHeightChange, keyPrefix = 'r' } = {}) {
  if (!content) return null
  const text = String(content)

  const nodes = []
  let seq = 0

  const lines = text.split('\n')
  let lineIdx = 0

  while (lineIdx < lines.length) {
    const line = lines[lineIdx]

    // 1. Code Block start (```lang)
    if (line.trim().startsWith('```')) {
      const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/)
      const lang = langMatch ? langMatch[1] : 'text'
      const codeLines = []
      lineIdx++
      while (lineIdx < lines.length) {
        if (lines[lineIdx].trim() === '```') {
          lineIdx++
          break
        }
        codeLines.push(lines[lineIdx])
        lineIdx++
      }
      const code = codeLines.join('\n')
      nodes.push(
        <CodeBlock
          key={`${keyPrefix}-cb-${seq++}`}
          code={code}
          language={lang}
          onHeightChange={onHeightChange}
        />
      )
      continue
    }

    // 2. Blockquote (> text or >>> text)
    if (line.startsWith('> ') || line === '>' || line.startsWith('>>> ') || line === '>>>') {
      const isMulti = line.startsWith('>>> ') || line === '>>>'
      const quoteLines = []
      if (isMulti) {
        if (line.startsWith('>>> ')) quoteLines.push(line.slice(4))
        lineIdx++
        while (lineIdx < lines.length) {
          quoteLines.push(lines[lineIdx])
          lineIdx++
        }
      } else {
        while (lineIdx < lines.length && (lines[lineIdx].startsWith('> ') || lines[lineIdx] === '>')) {
          quoteLines.push(lines[lineIdx].startsWith('> ') ? lines[lineIdx].slice(2) : '')
          lineIdx++
        }
      }
      const quoteContent = quoteLines.join('\n')
      nodes.push(
        <div key={`${keyPrefix}-qb-${seq++}`} className="msg-quote-block">
          {parseInlineRich(quoteContent, { uid, members, roles, onHeightChange, keyPrefix: `${keyPrefix}-q${seq}` })}
        </div>
      )
      continue
    }

    // 3. Regular inline line
    if (lineIdx > 0 && nodes.length > 0) {
      nodes.push(<br key={`${keyPrefix}-br-${seq++}`} />)
    }
    nodes.push(
      ...parseInlineRich(line, { uid, members, roles, onHeightChange, keyPrefix: `${keyPrefix}-l${lineIdx}-${seq++}` })
    )
    lineIdx++
  }

  return nodes
}

export function RichMessageRenderer({
  content,
  uid,
  members,
  roles,
  onHeightChange
}) {
  if (!content) return null
  return (
    <div className="msg-rich-container">
      {parseRichText(content, { uid, members, roles, onHeightChange })}
    </div>
  )
}
