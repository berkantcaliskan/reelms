import React, { useState, useEffect, useRef } from 'react'

export function ReelmsCustomSelect({ value, options = [], placeholder = '— Off —', onChange, className = '', buttonStyle, dropdownStyle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectedOpt = options.find(o => String(o.value) === String(value))
  const displayLabel = selectedOpt ? selectedOpt.label : (placeholder || (options[0]?.label || ''))

  return (
    <div className={`reelms-select-container ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className={`reelms-select-btn${open ? ' reelms-select-btn--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        style={buttonStyle}
      >
        <span className="reelms-select-value">{displayLabel}</span>
        <svg className={`reelms-select-arrow${open ? ' reelms-select-arrow--open' : ''}`} width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="reelms-select-dropdown" style={dropdownStyle}>
          {placeholder ? (
            <button
              type="button"
              className={`reelms-select-option${!value ? ' reelms-select-option--active' : ''}`}
              onClick={() => { onChange?.(''); setOpen(false) }}
            >
              {placeholder}
            </button>
          ) : null}
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`reelms-select-option${String(value) === String(opt.value) ? ' reelms-select-option--active' : ''}`}
              onClick={() => { onChange?.(opt.value); setOpen(false) }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PillSelect({ value, onChange, options = [] }) {
  return (
    <div className="pill-select">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`pill-select-opt${value === o.value ? ' pill-select-opt--on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onChange?.(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
