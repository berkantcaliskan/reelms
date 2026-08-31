import React from 'react'
import { ReelmsCustomSelect } from '../ui/ReelmsSelects'

export function EnvToggle({ k, def = false, v, set }) {
  return (
    <button
      type="button"
      className={`cust-toggle${v(k, def) ? ' cust-toggle-on' : ''}`}
      onClick={() => set(k, !v(k, def))}
    >
      <span className="cust-toggle-knob" />
    </button>
  )
}

export function EnvSelect({ k, def, options, v, set, width = 180 }) {
  return (
    <div style={{ width: width, minWidth: 150, flexShrink: 0 }}>
      <ReelmsCustomSelect
        value={v(k, def)}
        placeholder=""
        options={options}
        onChange={(val) => set(k, val)}
      />
    </div>
  )
}

export function EnvInlineSlider({ k, def, min = 0, max = 100, step = 1, disabled = false, v, set }) {
  const currentVal = v(k, def)
  return (
    <div className="env-inline-slider-wrapper">
      <input
        type="range"
        className="env-slider env-slider--inline"
        min={min}
        max={max}
        step={step}
        value={currentVal}
        disabled={disabled}
        onChange={e => set(k, Number(e.target.value))}
      />
      <span className="env-slider-inline-value">{currentVal}%</span>
    </div>
  )
}

export function EnvSlider({ k, def, min, max, step = 1, disabled = false, v, set }) {
  return (
    <input
      type="range"
      className="env-slider"
      min={min}
      max={max}
      step={step}
      value={v(k, def)}
      disabled={disabled}
      onChange={e => set(k, Number(e.target.value))}
    />
  )
}
