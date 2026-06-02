// Electron auth compatibility shim. Web beta keeps isElectron=false, but this stays ready for desktop reuse.
import { getApiBaseUrl } from './config/api'

const BACKEND = getApiBaseUrl()

export const isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'

// ── Internal state ───────────────────────────────────────────────────────────
let _raw = null  // { uid, email, token }
const _listeners = []

try {
  const s = localStorage.getItem('_ea')
  if (s) _raw = JSON.parse(s)
} catch {}

function _makeUser(raw) {
  if (!raw) return null
  return { uid: raw.uid, email: raw.email, getIdToken: () => Promise.resolve(raw.token) }
}

function _notify(raw) {
  const u = _makeUser(raw)
  _listeners.forEach(fn => fn(u))
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getElectronCurrentUser() {
  return _makeUser(_raw)
}

export function getElectronToken() {
  return _raw?.token || null
}

export function electronOnAuthStateChanged(cb) {
  _listeners.push(cb)
  Promise.resolve().then(() => cb(_makeUser(_raw)))
  return () => {
    const i = _listeners.indexOf(cb)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export async function electronSignIn(identifier, password) {
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
  localStorage.setItem('_ea', JSON.stringify(_raw))
  _notify(_raw)
  return { user: _makeUser(_raw), profile: data.profile || null }
}

export async function electronRegister(email, password, profile = {}) {
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
  localStorage.setItem('_ea', JSON.stringify(_raw))
  _notify(_raw)
  return { user: _makeUser(_raw), profile: data.profile || null }
}

export function electronSignOut() {
  _raw = null
  localStorage.removeItem('_ea')
  _notify(null)
}

export function electronSignInWithGoogle() {
  if (window.electronAPI?.openGoogleAuth) window.electronAPI.openGoogleAuth()
}

export function electronCompleteGoogleAuth({ token, uid, email }) {
  _raw = { uid, email, token }
  localStorage.setItem('_ea', JSON.stringify(_raw))
  _notify(_raw)
}
