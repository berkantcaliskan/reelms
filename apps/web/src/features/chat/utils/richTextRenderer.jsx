import React from 'react'

export function extractYouTubeId(text) {
  if (!text) return null
  const m = String(text).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export function renderMentions(text, uid, members, roles) {
  if (!text) return null
  const parts = String(text).split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (!part.startsWith('@')) return part
    const raw = part.slice(1)
    const lower = raw.toLowerCase()
    if (lower === 'everyone') return <span key={i} className="mention mention--everyone">{part}</span>
    const role = roles?.find(r => r.name?.toLowerCase() === lower)
    if (role) return <span key={i} className="mention mention--role" style={{ color: role.color }}>{part}</span>
    const member = members?.find(m => m.userName?.toLowerCase() === lower || m.name?.toLowerCase() === lower)
    if (member) {
      const isMe = String(member.userId || member.id) === String(uid)
      return <span key={i} className={`mention mention--user${isMe ? ' mention--me' : ''}`}>{part}</span>
    }
    return part
  })
}

export const RICH_COLOR_OPEN = /^\[#([0-9a-fA-F]{3,8})\]/

export function rgbToHex(color) {
  if (!color) return null
  const c = String(color).trim()
  if (c.startsWith('#')) return c.length === 4 ? '#' + c.slice(1).split('').map(ch => ch + ch).join('') : c.slice(0, 7)
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return null
  const hex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')
  return '#' + hex(m[1]) + hex(m[2]) + hex(m[3])
}

export function serializeRichNode(node) {
  if (node.nodeType === 3) return node.nodeValue || ''
  if (node.nodeType !== 1) return ''
  const el = node
  const tag = el.tagName
  if (tag === 'BR') return '\n'
  let out = Array.from(el.childNodes).map(serializeRichNode).join('')
  if (!out && tag === 'DIV') return '\n'
  if (tag === 'A') {
    const href = el.getAttribute('href') || ''
    return out ? `[${out}](${href})` : href
  }
  const style = el.style || {}
  const deco = `${style.textDecoration || ''} ${style.textDecorationLine || ''}`
  const fontFamily = (style.fontFamily || '').toLowerCase()
  const isBold = tag === 'B' || tag === 'STRONG' || /bold|^[6-9]00/.test(style.fontWeight || '')
  const isItalic = tag === 'I' || tag === 'EM' || style.fontStyle === 'italic'
  const isUnderline = tag === 'U' || /underline/.test(deco)
  const isStrike = tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(deco)
  const isMono = tag === 'CODE' || /(^|\s)msg-mono(\s|$)/.test(el.className || '') || /mono|courier|consol/.test(fontFamily)
  const colorAttr = el.dataset?.color || (style.color || (tag === 'FONT' ? el.getAttribute('color') : ''))
  const isSpoiler = (el.className || '').includes('msg-spoiler-inline')
  const isQuote = (el.className || '').includes('msg-quote-inline')

  if (isBold) out = `**${out}**`
  if (isItalic) out = `*${out}*`
  if (isUnderline) out = `__${out}__`
  if (isStrike) out = `~~${out}~~`
  if (isMono) out = '`' + out + '`'
  if (isSpoiler) out = '||' + out.replace(/^\|+|\|+$/g, '') + '||'
  if (isQuote) out = '> ' + out.replace(/^>\s*/, '')
  if (colorAttr) {
    if (el.dataset?.color) {
      out = `[color:${el.dataset.color}]${out}[/color]`
    } else {
      const hex = rgbToHex(colorAttr)
      if (hex) out = `[${hex}]${out}[/c]`
    }
  }
  if (tag === 'DIV') out = '\n' + out
  return out
}

export function serializeRichEditor(root) {
  if (!root) return ''
  return Array.from(root.childNodes).map(serializeRichNode).join('').replace(/\n+$/, '')
}

export function editorHasFormatting(root) {
  return !!(root && (root.querySelector('b,strong,i,em,u,s,strike,del,code,font,span[style],span[data-color],span.msg-spoiler-inline,span.msg-quote-inline,a') || /[*_~`#|>]|\[color:/.test(root.innerText)))
}

export function linkifyLegacyText(text, keyBase) {
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

export function mentionNodes(text, uid, members, roles, keyBase) {
  if (!text) return []
  return text.split(/(@\w+)/g).flatMap((part, i) => {
    const key = `${keyBase}-m${i}`
    if (!part.startsWith('@')) return linkifyLegacyText(part, key)
    const lower = part.slice(1).toLowerCase()
    if (lower === 'everyone') return [<span key={key} className="mention mention--everyone">{part}</span>]
    const role = roles?.find(r => r.name?.toLowerCase() === lower)
    if (role) return [<span key={key} className="mention mention--role" style={{ color: role.color }}>{part}</span>]
    const member = members?.find(m => m.userName?.toLowerCase() === lower || m.name?.toLowerCase() === lower)
    if (member) {
      const isMe = String(member.userId || member.id) === String(uid)
      return [<span key={key} className={`mention mention--user${isMe ? ' mention--me' : ''}`}>{part}</span>]
    }
    return linkifyLegacyText(part, key)
  })
}

export function parseRich(text, uid, members, roles, keyBase) {
  const nodes = []
  let buf = ''
  let i = 0
  let n = 0
  const flush = () => {
    if (!buf) return
    mentionNodes(buf, uid, members, roles, `${keyBase}-t${n++}`).forEach(x => nodes.push(x))
    buf = ''
  }
  while (i < text.length) {
    const cm = text.slice(i).match(RICH_COLOR_OPEN)
    if (cm) {
      const close = text.indexOf('[/c]', i + cm[0].length)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + cm[0].length, close)
        nodes.push(<span key={`${keyBase}-c${n++}`} style={{ color: '#' + cm[1] }}>{parseRich(inner, uid, members, roles, `${keyBase}-c${n}`)}</span>)
        i = close + 4; continue
      }
    }
    const two = text.substr(i, 2)
    if (two === '**' || two === '__' || two === '~~') {
      const close = text.indexOf(two, i + 2)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + 2, close)
        const child = parseRich(inner, uid, members, roles, `${keyBase}-${n}`)
        const key = `${keyBase}-f${n++}`
        nodes.push(two === '**' ? <strong key={key}>{child}</strong> : two === '__' ? <u key={key}>{child}</u> : <s key={key}>{child}</s>)
        i = close + 2; continue
      }
    }
    const ch = text[i]
    if (ch === '*' || ch === '`') {
      const close = text.indexOf(ch, i + 1)
      if (close !== -1) {
        flush()
        const inner = text.slice(i + 1, close)
        const key = `${keyBase}-f${n++}`
        nodes.push(ch === '*'
          ? <em key={key}>{parseRich(inner, uid, members, roles, `${keyBase}-${n}`)}</em>
          : <code key={key} className="msg-mono">{mentionNodes(inner, uid, members, roles, `${keyBase}-mono${n}`)}</code>)
        i = close + 1; continue
      }
    }
    buf += ch; i++
  }
  flush()
  return nodes
}

export function renderRichMessage(content, uid, members, roles, isRich) {
  if (!content) return null
  return parseRich(String(content), uid, members, roles, 'r')
}
