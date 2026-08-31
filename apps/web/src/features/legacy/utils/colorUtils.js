export function _hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255
  const g = parseInt(hex.slice(3,5), 16) / 255
  const b = parseInt(hex.slice(5,7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function makeIconFilter(baseHex) {
  const base = _hexToHsl(baseHex)
  return function(accent) {
    if (!accent || typeof accent !== 'string' || !accent.startsWith('#')) return 'none'
    const { h, s, l } = _hexToHsl(accent)
    const rotation = h - base.h
    const satScale = base.s > 0 ? s / base.s : 1
    const briScale = base.l > 0 ? l / base.l : 1
    return `hue-rotate(${rotation.toFixed(1)}deg) saturate(${satScale.toFixed(2)}) brightness(${briScale.toFixed(2)})`
  }
}

export function rgbArrayFrom(value, fallback = null) {
  if (Array.isArray(value)) {
    const nums = value.slice(0, 3).map(n => Number(n)).map(n => Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : NaN)
    return nums.length === 3 && nums.every(Number.isFinite) ? nums : fallback
  }
  if (value && typeof value === 'object') {
    const nums = [value.r, value.g, value.b].map(n => Number(n)).map(n => Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : NaN)
    return nums.every(Number.isFinite) ? nums : fallback
  }
  const raw = String(value || '').trim()
  if (!raw) return fallback
  const hex = raw.startsWith('#') ? raw.slice(1) : raw
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return hex.split('').map(ch => parseInt(ch + ch, 16))
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
  }
  const m = raw.match(/rgba?\s*\(([^)]+)\)/i)
  const csv = m ? m[1] : raw
  const parts = csv.split(/[\s,]+/).map(part => Number(String(part).replace('%', ''))).filter(Number.isFinite)
  if (parts.length >= 3) return parts.slice(0, 3).map(n => Math.max(0, Math.min(255, Math.round(n))))
  return fallback
}

export function rgbCssValue(value, fallback = '253,252,251') {
  const arr = rgbArrayFrom(value, null)
  return arr ? arr.join(',') : fallback
}

export function hexToRgb(hex) {
  return rgbCssValue(hex)
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
