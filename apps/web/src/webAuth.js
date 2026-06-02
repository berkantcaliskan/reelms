// Web browser auth — centralised backend config for web beta.
import { getApiBaseUrl } from './config/api'

const BACKEND = getApiBaseUrl()

let _raw = null
const _listeners = []

try {
  const s = localStorage.getItem('_wa')
  if (s) _raw = JSON.parse(s)
} catch {}

// Process Google OAuth callback on page load (before any component renders)
try {
  const params = new URLSearchParams(window.location.search)
  if (params.get('google') === 'success') {
    const token = params.get('token')
    const uid   = params.get('uid')
    const email = params.get('email')
    if (token && uid && email) {
      _raw = { uid, email, token }
      localStorage.setItem('_wa', JSON.stringify(_raw))
    }
    window.history.replaceState({}, '', window.location.pathname)
  } else if (params.get('google') === 'error') {
    window.history.replaceState({}, '', window.location.pathname + '?google_failed=1')
  }
} catch {}

function _makeUser(raw) {
  if (!raw) return null
  return { uid: raw.uid, email: raw.email, getIdToken: () => Promise.resolve(raw.token) }
}

function _notify(raw) {
  const u = _makeUser(raw)
  _listeners.forEach(fn => fn(u))
}

export function getWebCurrentUser() {
  return _makeUser(_raw)
}

export function getWebToken() {
  return _raw?.token || null
}

export function webOnAuthStateChanged(cb) {
  _listeners.push(cb)
  Promise.resolve().then(() => cb(_makeUser(_raw)))
  return () => {
    const i = _listeners.indexOf(cb)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export async function webSignIn(identifier, password) {
  const res = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Sign in failed')
    err.code = data.code || 'auth/unknown'
    throw err
  }
  _raw = { uid: data.uid, email: data.email, token: data.token }
  localStorage.setItem('_wa', JSON.stringify(_raw))
  _notify(_raw)
  return { user: _makeUser(_raw), profile: data.profile || null }
}

export async function webRegister(email, password, profile = {}) {
  const res = await fetch(`${BACKEND}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username: profile.username, displayName: profile.displayName || profile.name }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Registration failed')
    err.code = data.code || 'auth/unknown'
    throw err
  }
  _raw = { uid: data.uid, email: data.email, token: data.token }
  localStorage.setItem('_wa', JSON.stringify(_raw))
  _notify(_raw)
  return { user: _makeUser(_raw), profile: data.profile || null }
}

export function webSignOut() {
  _raw = null
  localStorage.removeItem('_wa')
  _notify(null)
}

export function webSignInWithGoogle() {
  window.location.href = `${BACKEND}/google/login?platform=web`
}
