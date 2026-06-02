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


export function validateUsername(value) {
  const username = normalizeUsername(value)
  if (!username) return { ok: false, reason: 'Username is required.' }
  if (username.length < 3) return { ok: false, reason: 'Username must be at least 3 characters.' }
  if (username.length > 30) return { ok: false, reason: 'Username must be 30 characters or less.' }
  if (!/^[a-z0-9._-]+$/.test(username)) return { ok: false, reason: 'Username can only use letters, numbers, dots, dashes or underscores.' }
  return { ok: true, reason: '', username }
}
