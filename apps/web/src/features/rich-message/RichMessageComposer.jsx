import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { SEMANTIC_COLORS, SUPPORTED_LANGUAGES, isValidLinkUrl } from './richMessageTokens'
import './richMessage.css'

// ── Floating Toolbar & Selection Context Menu ───────────────────
export function RichMessageComposerToolbar({
  editorRef,
  onApplyFormat,
  onApplyColor,
  onInsertCodeBlock,
  onInsertLink,
  isMobile
}) {
  const [toolbarPos, setToolbarPos] = useState(null)
  const [showColors, setShowColors] = useState(false)
  const [ctxMenuPos, setCtxMenuPos] = useState(null)
  const [linkModal, setLinkModal] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  const updateSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setToolbarPos(null)
      setShowColors(false)
      return
    }

    const range = sel.getRangeAt(0)
    const editor = editorRef.current
    if (!editor || !editor.contains(range.commonAncestorContainer)) {
      setToolbarPos(null)
      setShowColors(false)
      return
    }

    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setToolbarPos(null)
      return
    }

    setToolbarPos({
      top: Math.max(10, rect.top - 40),
      left: Math.min(window.innerWidth - 300, Math.max(10, rect.left + rect.width / 2 - 140))
    })
  }, [editorRef])

  useEffect(() => {
    document.addEventListener('selectionchange', updateSelection)
    return () => document.removeEventListener('selectionchange', updateSelection)
  }, [updateSelection])

  // Context Menu Handler on Editor Selection
  const handleContextMenu = useCallback((e) => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) {
      e.preventDefault()
      e.stopPropagation()
      setCtxMenuPos({
        x: Math.min(e.clientX, window.innerWidth - 180),
        y: Math.min(e.clientY, window.innerHeight - 280)
      })
    }
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return undefined
    editor.addEventListener('contextmenu', handleContextMenu)
    return () => editor.removeEventListener('contextmenu', handleContextMenu)
  }, [editorRef, handleContextMenu])

  // Close context menu on outside click
  useEffect(() => {
    const closeCtx = () => setCtxMenuPos(null)
    window.addEventListener('click', closeCtx)
    window.addEventListener('contextmenu', closeCtx)
    return () => {
      window.removeEventListener('click', closeCtx)
      window.removeEventListener('contextmenu', closeCtx)
    }
  }, [])

  const handleLinkSubmit = (e) => {
    e.preventDefault()
    if (linkUrl && isValidLinkUrl(linkUrl)) {
      onInsertLink(linkText || linkUrl, linkUrl)
    }
    setLinkModal(null)
    setLinkUrl('')
    setLinkText('')
  }

  const openLinkModal = () => {
    const sel = window.getSelection()
    const text = sel ? sel.toString() : ''
    setLinkText(text)
    setLinkUrl('')
    setLinkModal(true)
  }

  return (
    <>
      {/* Floating Formatting Toolbar */}
      {toolbarPos && !linkModal && ReactDOM.createPortal(
        <div
          className="msg-floating-toolbar"
          style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px` }}
          onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={e => e.stopPropagation()}
        >
          {!showColors ? (
            <>
              <button className="fmt-btn" title="Bold (Ctrl+B)" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('bold')}><b>B</b></button>
              <button className="fmt-btn" title="Italic (Ctrl+I)" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('italic')}><i>I</i></button>
              <button className="fmt-btn" title="Underline (Ctrl+U)" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('underline')}><u>U</u></button>
              <button className="fmt-btn" title="Strikethrough (Ctrl+Shift+S)" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('strike')}><s>S</s></button>
              <button className="fmt-btn" title="Inline Code (Ctrl+Shift+C)" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('code')}>{'</>'}</button>
              <button className="fmt-btn" title="Spoiler" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('spoiler')}>||</button>
              <button className="fmt-btn" title="Quote" onMouseDown={e => e.preventDefault()} onClick={() => onApplyFormat('quote')}>&rdquo;</button>
              <button className="fmt-btn" title="Link (Ctrl+K)" onMouseDown={e => e.preventDefault()} onClick={openLinkModal}>🔗</button>
              <div className="fmt-divider" />
              <button className="fmt-btn" title="Text Color" onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(true)}>🎨</button>
              <button className="fmt-btn" title="Code Block" onMouseDown={e => e.preventDefault()} onClick={onInsertCodeBlock}>📦</button>
            </>
          ) : (
            <div className="fmt-color-grid">
              {SEMANTIC_COLORS.map(c => (
                <button
                  key={c.id}
                  className="fmt-color-swatch"
                  style={{ background: c.color === 'inherit' ? '#e5e7eb' : c.color }}
                  title={c.label}
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onApplyColor(c.id); setShowColors(false) }}
                />
              ))}
              <button className="fmt-btn" style={{ fontSize: '0.7rem' }} onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(false)}>✕</button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Selection Context Menu (Right Click) */}
      {ctxMenuPos && ReactDOM.createPortal(
        <div
          className="msg-sel-ctx-menu"
          style={{ left: `${ctxMenuPos.x}px`, top: `${ctxMenuPos.y}px` }}
          onMouseDown={e => e.preventDefault()}
          onClick={e => e.stopPropagation()}
        >
          <div className="msg-sel-ctx-header">Clipboard</div>
          <button className="msg-sel-ctx-item" onClick={() => { document.execCommand('copy'); setCtxMenuPos(null) }}>
            <span>Copy</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+C</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { document.execCommand('cut'); setCtxMenuPos(null) }}>
            <span>Cut</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+X</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('clear'); setCtxMenuPos(null) }}>
            <span>Paste as Plain Text</span>
          </button>

          <div className="msg-sel-ctx-header" style={{ marginTop: '4px' }}>Formatting</div>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('bold'); setCtxMenuPos(null) }}>
            <span>Bold</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+B</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('italic'); setCtxMenuPos(null) }}>
            <span>Italic</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+I</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('underline'); setCtxMenuPos(null) }}>
            <span>Underline</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+U</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('strike'); setCtxMenuPos(null) }}>
            <span>Strikethrough</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+Shift+S</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('code'); setCtxMenuPos(null) }}>
            <span>Inline Code</span>
            <span className="msg-sel-ctx-shortcut">Ctrl+Shift+C</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('spoiler'); setCtxMenuPos(null) }}>
            <span>Mark as Spoiler</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('quote'); setCtxMenuPos(null) }}>
            <span>Quote</span>
          </button>
          <button className="msg-sel-ctx-item" onClick={() => { onApplyFormat('clear'); setCtxMenuPos(null) }}>
            <span>Clear Formatting</span>
          </button>
        </div>,
        document.body
      )}

      {/* Link Dialog Modal */}
      {linkModal && ReactDOM.createPortal(
        <div className="voice-modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="voice-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#fff' }}>Add Link</h3>
            <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                className="voice-input"
                placeholder="Display text"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
              />
              <input
                className="voice-input"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="voice-cancel-btn" onClick={() => setLinkModal(null)}>Cancel</button>
                <button type="submit" className="voice-confirm-btn" disabled={!linkUrl.trim()}>Insert</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
