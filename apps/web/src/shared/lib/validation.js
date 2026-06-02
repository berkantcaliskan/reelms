export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
}

export function validatePassword(value) {
  const password = String(value || '')
  return {
    ok: password.length >= 8,
    reason: password.length >= 8 ? '' : 'Password must be at least 8 characters.'
  }
}

export function validateRequired(value, label) {
  if (String(value || '').trim()) return { ok: true, reason: '' }
  return { ok: false, reason: `${label} is required.` }
}
