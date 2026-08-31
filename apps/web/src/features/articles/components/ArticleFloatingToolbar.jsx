import React from 'react'

export function ArticleFloatingToolbar({ x, y, onExec, onHeading, onLink, onClose }) {
  const btn = (label, action, title) => (
    <button className="aft-btn" title={title} onMouseDown={e => { e.preventDefault(); action(); onClose() }}>{label}</button>
  )
  return (
    <div className="article-float-toolbar" style={{ left: x, top: y - 52, transform: 'translateX(-50%)' }}>
      {btn('H1', () => onHeading('h1'), 'Heading 1')}
      {btn('H2', () => onHeading('h2'), 'Heading 2')}
      <span className="aft-sep" />
      {btn(<b>B</b>, () => onExec('bold'), 'Bold')}
      {btn(<i>I</i>, () => onExec('italic'), 'Italic')}
      {btn(<u>U</u>, () => onExec('underline'), 'Underline')}
      <span className="aft-sep" />
      {btn(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="7" fontSize="5" fill="currentColor" stroke="none">1.</text><text x="2" y="13" fontSize="5" fill="currentColor" stroke="none">2.</text><text x="2" y="19" fontSize="5" fill="currentColor" stroke="none">3.</text></svg>, () => onExec('insertOrderedList'), 'Ordered list')}
      {btn(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>, () => onExec('insertUnorderedList'), 'Unordered list')}
      <span className="aft-sep" />
      {btn('❝', () => onExec('formatBlock', 'blockquote'), 'Quote')}
      {btn('🔗', onLink, 'Add link')}
      <span className="aft-sep" />
      {btn('Aa', () => onExec('fontName', 'Plus Jakarta Sans'), 'Jakarta Sans')}
    </div>
  )
}

export default ArticleFloatingToolbar
