import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { ArticleFloatingToolbar } from './ArticleFloatingToolbar'

export function ArticleEditor({ articleCat, initialDraft, onPublish, onSaveDraft, onClose }) {
  const [title, setTitle] = useState(initialDraft?.title || '')
  const [cover, setCover] = useState(initialDraft?.coverImage || null)
  const [floatingMenu, setFloatingMenu] = useState(null)
  const [useJakarta, setUseJakarta] = useState(false)
  const bodyRef = useRef(null)
  const coverInputRef = useRef(null)
  const imgInputRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current && initialDraft?.contentHtml) {
      bodyRef.current.innerHTML = initialDraft.contentHtml
    }
    bodyRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const execCmd = (cmd, val = null) => { bodyRef.current?.focus(); document.execCommand(cmd, false, val) }
  const applyHeading = (tag) => { bodyRef.current?.focus(); document.execCommand('formatBlock', false, tag) }

  const handleSelectionChange = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !bodyRef.current?.contains(sel.anchorNode)) { setFloatingMenu(null); return }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setFloatingMenu({ x: rect.left + rect.width / 2, y: rect.top })
  }

  const handleLink = () => {
    const url = window.prompt('Enter URL:')
    if (!url) return
    execCmd('createLink', url)
    // mark external links
    bodyRef.current?.querySelectorAll('a').forEach(a => {
      if (!a.dataset.handled) { a.dataset.handled = '1'; a.target = '_blank'; a.rel = 'noopener' }
    })
  }

  const insertImage = (src) => { bodyRef.current?.focus(); document.execCommand('insertImage', false, src) }

  const getHtml = () => bodyRef.current?.innerHTML || ''

  const handlePublish = () => {
    const t = title.trim()
    if (!t) return
    onPublish({ title: t, contentHtml: getHtml(), coverImage: cover, category: articleCat || null })
  }

  const handleDraft = () => {
    onSaveDraft({ id: initialDraft?.id || 'draft_' + Date.now(), title: title || 'Untitled', contentHtml: getHtml(), coverImage: cover, savedAt: new Date().toISOString() })
  }

  const toolbarFmt = (cmd, val, label, title) => (
    <button className="aef-btn" title={title} onClick={() => execCmd(cmd, val)}>{label}</button>
  )

  return ReactDOM.createPortal(
    <div className="article-editor-overlay" onMouseUp={handleSelectionChange} onKeyUp={handleSelectionChange} onClick={() => setFloatingMenu(null)}>
      {/* Top toolbar */}
      <div className="article-editor-toolbar" onClick={e => e.stopPropagation()}>
        <div className="article-editor-formats">
          <button className="aef-btn aef-heading" title="Heading 1" onClick={() => applyHeading('h1')}>H1</button>
          <button className="aef-btn aef-heading" title="Heading 2" onClick={() => applyHeading('h2')}>H2</button>
          <button className="aef-btn aef-heading" title="Heading 3" onClick={() => applyHeading('h3')}>H3</button>
          <button className="aef-btn" title="Body" onClick={() => applyHeading('p')}>Aa</button>
          <span className="aef-sep" />
          {toolbarFmt('bold', null, <b>B</b>, 'Bold')}
          {toolbarFmt('italic', null, <i>I</i>, 'Italic')}
          {toolbarFmt('underline', null, <u>U</u>, 'Underline')}
          <span className="aef-sep" />
          {toolbarFmt('insertOrderedList', null, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="7" fontSize="5" fill="currentColor" stroke="none">1.</text><text x="2" y="13" fontSize="5" fill="currentColor" stroke="none">2.</text><text x="2" y="19" fontSize="5" fill="currentColor" stroke="none">3.</text></svg>, 'Ordered list')}
          {toolbarFmt('insertUnorderedList', null, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>, 'Unordered list')}
          <span className="aef-sep" />
          {toolbarFmt('formatBlock', 'blockquote', '❝', 'Quote')}
          <button className="aef-btn" title="Link" onClick={handleLink}>🔗</button>
          <button
            className={`aef-btn${useJakarta ? ' aef-btn-active' : ''}`}
            title={useJakarta ? 'Switch to EB Garamond' : 'Switch to Jakarta Sans'}
            onClick={() => {
              const next = !useJakarta
              setUseJakarta(next)
              if (bodyRef.current) bodyRef.current.style.fontFamily = next ? "'Plus Jakarta Sans', sans-serif" : "'EB Garamond', Georgia, serif"
            }}
          >{useJakarta ? 'Eb' : 'Jkt'}</button>
        </div>
        <div className="article-editor-media-pills">
          <button className="aef-media-pill" onClick={() => imgInputRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Image
          </button>
          <button className={`aef-media-pill${cover ? ' aef-media-pill-set' : ''}`} onClick={() => coverInputRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            Cover{cover ? ' ✓' : ''}
          </button>
          <input type="file" accept="image/*" ref={coverInputRef} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setCover(ev.target.result); r.readAsDataURL(f); e.target.value = '' }} />
          <input type="file" accept="image/*" ref={imgInputRef} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => insertImage(ev.target.result); r.readAsDataURL(f); e.target.value = '' }} />
        </div>
      </div>

      {/* Main row: editor + right actions */}
      <div className="article-editor-main-row">
        {/* Editor area */}
        <div className="article-editor-area" onClick={e => e.stopPropagation()}>
          {cover && <div className="article-editor-cover-preview"><img src={cover} alt="" /><button className="article-editor-cover-remove" onClick={() => setCover(null)}>✕</button></div>}
          <input className="article-editor-title-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={180} />
          <div
            className="article-editor-body"
            contentEditable
            suppressContentEditableWarning
            ref={bodyRef}
            data-placeholder="Write your article…"
            onInput={() => {}}
            onClick={e => e.stopPropagation()}
          />
        </div>

        {/* Right-panel actions */}
        <div className="article-editor-right-actions" onClick={e => e.stopPropagation()}>
          <button className="article-editor-close" onClick={onClose}>✕</button>
          <div style={{ flex: 1 }} />
          <button className="article-editor-publish-btn" onClick={handlePublish}>
            Publish
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="article-editor-draft-btn" onClick={handleDraft}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Save as draft
          </button>
        </div>
      </div>

      {/* Floating toolbar */}
      {floatingMenu && <ArticleFloatingToolbar x={floatingMenu.x} y={floatingMenu.y} onExec={(cmd, val) => execCmd(cmd, val)} onHeading={applyHeading} onLink={handleLink} onClose={() => setFloatingMenu(null)} />}
    </div>,
    document.body
  )
}

export default ArticleEditor
