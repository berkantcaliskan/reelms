import React, { useState, useEffect } from 'react'
import { useT } from '../../../../i18n'
import { userGetDoc, scheduleUserPersist } from '../../../../reelmsAwsClient'
import { ReelmsCustomSelect } from '../ui/ReelmsSelects'

export function AccessibilityPanel({ uid }) {
  const t = useT()
  const [a11y, setA11y] = useState({})

  useEffect(() => {
    if (!uid || uid === 'guest') return
    userGetDoc('accessibility').then(d => {
      if (d && typeof d === 'object') setA11y(d)
    }).catch(() => {})
  }, [uid])

  useEffect(() => {
    const el = document.documentElement
    if (a11y.reducedMotion) el.classList.add('a11y-reduced-motion')
    else el.classList.remove('a11y-reduced-motion')

    if (a11y.messageSpacing) el.classList.add('a11y-msg-spacing')
    else el.classList.remove('a11y-msg-spacing')

    if (a11y.highContrast) el.classList.add('a11y-high-contrast')
    else el.classList.remove('a11y-high-contrast')

    if (a11y.reduceTransparency) el.classList.add('a11y-reduce-transparency')
    else el.classList.remove('a11y-reduce-transparency')

    if (a11y.underlineLinks) el.classList.add('a11y-underline-links')
    else el.classList.remove('a11y-underline-links')

    const scale = a11y.fontScale || 1
    el.style.fontSize = scale === 1 ? '' : (16 * scale) + 'px'
  }, [a11y])

  const update = (next) => {
    setA11y(next)
    scheduleUserPersist('accessibility', next)
  }

  const FONT_OPTIONS = [
    { value: '0.85', label: t('a11y_font_small') || 'Small' },
    { value: '1',    label: t('a11y_font_normal') || 'Normal' },
    { value: '1.15', label: t('a11y_font_large') || 'Large' },
    { value: '1.3',  label: t('a11y_font_xlarge') || 'X-Large' },
  ]

  return (
    <div className="accs-panel">
      {/* 1. Text size */}
      <div className="accs-section">
        <div className="cust-toggle-row" style={{ alignItems: 'center' }}>
          <div>
            <span className="cust-toggle-label">{t('a11y_font_size') || 'Text size'}</span>
            <p className="accs-note">{t('a11y_font_size_desc') || 'Adjust the text scale across the interface.'}</p>
          </div>
          <div style={{ width: 140, flexShrink: 0 }}>
            <ReelmsCustomSelect
              value={String(a11y.fontScale || 1)}
              options={FONT_OPTIONS}
              onChange={val => update({ ...a11y, fontScale: parseFloat(val) })}
            />
          </div>
        </div>
      </div>

      {/* 2. High contrast */}
      <div className="accs-section">
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('a11y_high_contrast') || 'High contrast'}</span>
            <p className="accs-note">{t('a11y_high_contrast_desc') || 'Increases border visibility and contrast for clearer separation.'}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${a11y.highContrast ? ' cust-toggle-on' : ''}`}
            onClick={() => update({ ...a11y, highContrast: !a11y.highContrast })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>

      {/* 3. Reduce motion */}
      <div className="accs-section">
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('a11y_motion')}</span>
            <p className="accs-note">{t('a11y_motion_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${a11y.reducedMotion ? ' cust-toggle-on' : ''}`}
            onClick={() => update({ ...a11y, reducedMotion: !a11y.reducedMotion })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>

      {/* 4. Reduce transparency */}
      <div className="accs-section">
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('a11y_reduce_transparency') || 'Reduce transparency'}</span>
            <p className="accs-note">{t('a11y_reduce_transparency_desc') || 'Replaces translucent glass effects with solid backgrounds for enhanced legibility.'}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${a11y.reduceTransparency ? ' cust-toggle-on' : ''}`}
            onClick={() => update({ ...a11y, reduceTransparency: !a11y.reduceTransparency })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>

      {/* 5. Extra message spacing */}
      <div className="accs-section">
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('a11y_msg_spacing')}</span>
            <p className="accs-note">{t('a11y_msg_spacing_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${a11y.messageSpacing ? ' cust-toggle-on' : ''}`}
            onClick={() => update({ ...a11y, messageSpacing: !a11y.messageSpacing })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>

      {/* 6. Underline links */}
      <div className="accs-section">
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('a11y_underline_links') || 'Underline links'}</span>
            <p className="accs-note">{t('a11y_underline_links_desc') || 'Always underlines links, channels, and mentions.'}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${a11y.underlineLinks ? ' cust-toggle-on' : ''}`}
            onClick={() => update({ ...a11y, underlineLinks: !a11y.underlineLinks })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>
    </div>
  )
}

export default AccessibilityPanel
