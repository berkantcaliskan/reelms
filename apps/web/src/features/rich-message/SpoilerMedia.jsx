import React, { useState } from 'react'

export function SpoilerMedia({
  children,
  isSpoiler = false,
  mediaType = 'image',
  onReveal
}) {
  const [revealed, setRevealed] = useState(!isSpoiler)

  if (!isSpoiler) {
    return <>{children}</>
  }

  const handleReveal = (e) => {
    e.stopPropagation()
    setRevealed(true)
    if (onReveal) onReveal()
  }

  return (
    <div
      className={`msg-spoiler-media-wrap${revealed ? ' is-revealed' : ' is-hidden'}`}
      onClick={!revealed ? handleReveal : undefined}
      title={!revealed ? 'Click to reveal spoiler' : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!revealed && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleReveal(e)
        }
      }}
    >
      <div className="msg-spoiler-media-inner">
        {children}
      </div>
      {!revealed && (
        <div className="msg-spoiler-overlay">
          <div className="msg-spoiler-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Spoiler
          </div>
          <span className="msg-spoiler-sub">Click to reveal</span>
        </div>
      )}
    </div>
  )
}
