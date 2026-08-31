import React, { useState, useRef } from 'react'
import { useT } from '../../../../i18n'
import { THEMES, MIDNIGHT_ACCENTS, SUNLIGHT_ACCENTS, CLASSIC_GREETINGS } from '../../constants/themeConstants'
import { hslToHex } from '../../utils/colorUtils'
import { normalizeMediaUrl, uploadProfileImageFile } from '../../utils/mediaUtils'

export function CustomizationPanel({ customization = {}, onChange, bodyFont, BODY_FONTS = [], onFontChange, user }) {
  const t = useT()
  const bgInputRef = useRef(null)
  const currentTheme = THEMES.find(th => th.id === customization.themeId) || THEMES[0]
  const [openSpectrum, setOpenSpectrum] = useState(null)
  const [fontsExpanded, setFontsExpanded] = useState(false)

  const pickSpectrum = (e, key) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hue = (x / rect.width) * 360
    const yN  = y / rect.height
    const l   = yN < 0.5 ? 100 - 100 * yN : 100 * (1 - yN)
    const s   = yN < 0.5 ? 100 * (yN * 2) : 100
    onChange?.({ [key]: hslToHex(hue, s, l) })
  }

  const compressImageToDataUrl = async (file) => {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsDataURL(file)
    })

    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image decode failed'))
      el.src = dataUrl
    })

    const maxSide = 1600
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, w, h)

    const webp = canvas.toDataURL('image/webp', 0.82)
    if (webp && webp.startsWith('data:image/webp')) return webp
    return canvas.toDataURL('image/jpeg', 0.84)
  }

  const activeFontObj = (BODY_FONTS || []).find(f => f.id === bodyFont) || BODY_FONTS?.[0] || { label: 'Karla', family: "'Karla', sans-serif" }

  return (
    <div className="accs-panel">
      {/* ── Background ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('background')}</div>
        <div className="cust-bg-area">
          {customization.bgImage ? (
            <div className="cust-bg-box">
              <div
                className="cust-bg-preview"
                style={{ backgroundImage: `url("${normalizeMediaUrl(customization.bgImage) || customization.bgImage}")` }}
              />
              <div className="cust-bg-controls-row">
                <button type="button" className="cust-bg-btn" onClick={() => bgInputRef.current?.click()}>
                  {t('change') || 'Change'}
                </button>
                <button type="button" className="cust-bg-btn cust-bg-btn--danger" onClick={() => onChange?.({ bgImage: null })}>
                  {t('remove') || 'Remove'}
                </button>
                <div className="cust-bg-slider-item">
                  <span className="cust-bg-slider-label">Blur: {customization.bgBlur ?? 16}px</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={customization.bgBlur ?? 16}
                    onChange={e => onChange?.({ bgBlur: Number(e.target.value) })}
                    className="cust-bg-slider"
                  />
                </div>
                <div className="cust-bg-slider-item">
                  <span className="cust-bg-slider-label">Dim: {customization.bgDim ?? 30}%</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={customization.bgDim ?? 30}
                    onChange={e => onChange?.({ bgDim: Number(e.target.value) })}
                    className="cust-bg-slider"
                  />
                </div>
              </div>
            </div>
          ) : (
            <button className="cust-btn-upload" onClick={() => bgInputRef.current?.click()}>
              {t('upload_bg')}
            </button>
          )}
          <input
            type="file" accept="image/*" ref={bgInputRef} style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              ;(async () => {
                try {
                  let url = null
                  try {
                    url = await uploadProfileImageFile(file, 'profile-background')
                  } catch {
                    url = await compressImageToDataUrl(file)
                  }
                  if (!url) {
                    url = await compressImageToDataUrl(file)
                  }
                  if (url) onChange?.({ bgImage: url })
                } catch (err) {
                  console.warn('Background image could not be processed:', err)
                }
              })()
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* ── Theme ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('theme_section') || 'Theme'}</div>
        <div className="cust-theme-grid">
          {THEMES.map(th => {
            const isSelected = customization.themeId === th.id
            return (
              <button
                key={th.id}
                type="button"
                className={`cust-theme-swatch${isSelected ? ' cust-theme-swatch-active' : ''}${th.isLight ? ' cust-theme-swatch--light' : ''}`}
                onClick={() => onChange?.({ themeId: th.id, customAccent: null })}
                title={th.name}
                style={{ background: th.base }}
              >
                <span className="cust-theme-swatch-dot" style={{ background: isSelected && customization.customAccent ? customization.customAccent : th.accent }} />
              </button>
            )
          })}
        </div>

        {/* Midnight / Sunlight Selectable Accent Presets */}
        {(customization.themeId === 'midnight' || customization.themeId === 'sunlight' || currentTheme.hasSubAccents) && (
          <div className="cust-midnight-accents" style={{ marginTop: 14 }}>
            <div style={{ fontSize: '0.76rem', color: 'rgba(var(--ta-rgb), 0.8)', marginBottom: 8, fontWeight: 600 }}>
              {t('accent_color')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(customization.themeId === 'sunlight' ? SUNLIGHT_ACCENTS : MIDNIGHT_ACCENTS).map(acc => {
                const isSelected = (customization.customAccent || currentTheme.accent).toLowerCase() === acc.color.toLowerCase()
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onChange?.({ customAccent: acc.color })}
                    className={`cust-midnight-acc-btn${isSelected ? ' active' : ''}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: isSelected ? 'rgba(var(--ta-rgb), 0.16)' : 'rgba(var(--ta-rgb), 0.06)',
                      border: `1.5px solid ${isSelected ? 'var(--ta)' : 'rgba(var(--ta-rgb), 0.2)'}`,
                      color: isSelected ? 'var(--ta)' : 'rgba(var(--ta-rgb), 0.85)',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: acc.color, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    <span>{acc.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Accent Color (replacing Spectrum) ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('accent_color') || 'Accent color'}</div>
        <p className="accs-note" style={{ marginTop: 0, marginBottom: 12 }}>
          {t('accent_color_desc') || 'Accent color for icons, highlights, indicators and active elements.'}
        </p>
        <div className="cust-tayf-row">
          <div className="cust-tayf-picker">
            <div className="cust-tayf-item">
              <div
                className={`cust-tayf-swatch${openSpectrum === 'customAccent' ? ' active' : ''}`}
                style={{ background: customization.customAccent || currentTheme.accent }}
                onClick={() => setOpenSpectrum(openSpectrum === 'customAccent' ? null : 'customAccent')}
              >
                {customization.customAccent && (
                  <button type="button" className="cust-tayf-reset" onClick={e => { e.stopPropagation(); onChange?.({ customAccent: null }); if (openSpectrum === 'customAccent') setOpenSpectrum(null) }}>×</button>
                )}
              </div>
              <span className="cust-tayf-label">{t('accent_color') || 'Accent'}</span>
            </div>
            <div
              className={`cust-tayf-strip${openSpectrum === 'customAccent' ? ' open' : ''}`}
              onClick={e => pickSpectrum(e, 'customAccent')}
              role="presentation"
            />
          </div>
        </div>

        {/* ── Text Color (3 options ONLY: match_theme, white, black) ── */}
        <div className="cust-tayf-text-row" style={{ marginTop: 18 }}>
          <div>
            <span className="cust-toggle-label">{t('text_color') || 'Text color'}</span>
            <p className="accs-note" style={{ margin: '4px 0 0' }}>{t('text_color_desc') || 'Choose text appearance across channels and feed.'}</p>
          </div>
          <div className="cust-textcolor-opts">
            {[
              { id: 'match_theme', label: t('match_theme') || 'Match theme' },
              { id: 'white', label: t('white') || 'White' },
              { id: 'black', label: t('black') || 'Black' },
            ].map(({ id, label }) => {
              const active = (customization.customTextColor || 'match_theme') === id || (id === 'match_theme' && customization.customTextColor === 'theme')
              return (
                <button
                  key={id}
                  type="button"
                  className={`cust-textcolor-btn${active ? ' active' : ''}`}
                  onClick={() => onChange?.({ customTextColor: id })}
                >{label}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Typography (Expandable Accordion) ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('typography')}</div>
        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.45)', lineHeight: 1.5 }}>
          {t('typography_desc')}
        </p>

        <div className="cust-font-accordion">
          <div
            className="cust-font-header"
            onClick={() => setFontsExpanded(!fontsExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 14,
              background: 'rgba(var(--ta-rgb), 0.08)',
              border: '1px solid rgba(var(--ta-rgb), 0.18)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'rgba(var(--ta-rgb), 0.95)', fontFamily: activeFontObj.family }}>
                {activeFontObj.label}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.45)' }}>
                (Aa Bb Gg 123)
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.6)', transform: fontsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              ▼
            </span>
          </div>

          <div
            className="cust-font-grid"
            style={{
              display: fontsExpanded ? 'grid' : 'none',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginTop: 10,
              animation: 'nameMenuFadeIn 0.15s ease both',
            }}
          >
            {(BODY_FONTS || []).map(font => (
              <button
                key={font.id}
                type="button"
                onClick={() => {
                  if (onFontChange) onFontChange(font.id)
                }}
                style={{
                  padding: '9px 14px',
                  borderRadius: 14,
                  border: `1.5px solid ${bodyFont === font.id ? 'rgba(var(--ta-rgb), 0.7)' : 'rgba(var(--ta-rgb), 0.18)'}`,
                  background: bodyFont === font.id ? 'rgba(var(--ta-rgb), 0.14)' : 'rgba(var(--ta-rgb), 0.04)',
                  color: bodyFont === font.id ? 'rgba(var(--ta-rgb), 0.98)' : 'rgba(var(--ta-rgb), 0.55)',
                  fontFamily: font.family,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{font.label}</span>
                {bodyFont === font.id && <span style={{ fontSize: '0.75rem', color: 'var(--ta)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Custom Greeting ── */}
      <div className="accs-section">
        <div className="accs-section-title">Custom Greeting</div>
        <div className="cust-greeting-sublabel">Classic Greetings</div>
        <div className="cust-greeting-pills">
          {CLASSIC_GREETINGS.map(g => (
            <button
              key={g}
              type="button"
              className={`cust-greeting-pill${customization.customGreeting === g ? ' cust-greeting-pill--active' : ''}`}
              onClick={() => onChange?.({ customGreeting: customization.customGreeting === g ? null : g })}
            >{g}</button>
          ))}
        </div>
        <div className="cust-greeting-sublabel" style={{ marginTop: 18 }}>Custom greeting</div>
        <input
          className="accs-input"
          style={{ width: '100%' }}
          placeholder='e.g. "Selam" or "Hey"'
          value={CLASSIC_GREETINGS.includes(customization.customGreeting) ? '' : (customization.customGreeting || '')}
          onChange={e => onChange?.({ customGreeting: e.target.value || null })}
          onFocus={() => {
            if (CLASSIC_GREETINGS.includes(customization.customGreeting)) onChange?.({ customGreeting: null })
          }}
        />
        <div className="cust-greeting-sublabel" style={{ marginTop: 18 }}>Greeting Punctuation</div>
        <div className="cust-greeting-pills">
          {[
            { id: '!', label: '! (Default)' },
            { id: '.', label: '.' },
            { id: '?', label: '?' },
            { id: 'none', label: 'None' },
          ].map(p => {
            const currentPunct = customization.greetingPunctuation || '!'
            const isActive = currentPunct === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={`cust-greeting-pill${isActive ? ' cust-greeting-pill--active' : ''}`}
                onClick={() => onChange?.({ greetingPunctuation: p.id })}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {customization.customGreeting && (
          <p className="cust-greeting-preview">
            {customization.customGreeting}, {user?.name || user?.username || 'you'}{customization.greetingPunctuation === 'none' ? '' : (customization.greetingPunctuation || '!')}
          </p>
        )}
      </div>
    </div>
  )
}

export default CustomizationPanel
