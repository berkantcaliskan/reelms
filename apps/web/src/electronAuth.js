// Electron auth compatibility shim. Web beta keeps isElectron=false, but this stays ready for desktop reuse.
import { getApiBaseUrl } from './config/api'

const BACKEND = getApiBaseUrl()

export const isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'

// ── Internal state ───────────────────────────────────────────────────────────
let _raw = null  // { uid, email, token }
const _listeners = []
const ELECTRON_CLIENT_ID = `electron_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

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

export function getElectronClientId() {
  return ELECTRON_CLIENT_ID
}

async function claimElectronClient(raw = _raw) {
  if (!raw?.token) return null
  return fetch(`${BACKEND}/auth/client/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${raw.token}`, 'X-Reelms-Client-Id': ELECTRON_CLIENT_ID },
    body: JSON.stringify({ clientId: ELECTRON_CLIENT_ID, platform: 'electron' }),
  }).catch(() => null)
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
    headers: { 'Content-Type': 'application/json', 'X-Reelms-Client-Id': ELECTRON_CLIENT_ID },
    body: JSON.stringify({ identifier, password, clientId: ELECTRON_CLIENT_ID, platform: 'electron' }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Sign in failed')
    err.code = data.code || 'auth/unknown'
    err.reason = data.reason
    throw err
  }
  _raw = { uid: data.uid, email: data.email, token: data.token }
  localStorage.setItem('_ea', JSON.stringify(_raw))
  await claimElectronClient(_raw)
  _notify(_raw)
  return { user: _makeUser(_raw), profile: data.profile || null }
}

export async function electronRegister(email, password, profile = {}) {
  const res = await fetch(`${BACKEND}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Reelms-Client-Id': ELECTRON_CLIENT_ID },
    body: JSON.stringify({ email, password, username: profile.username, displayName: profile.displayName || profile.name, clientId: ELECTRON_CLIENT_ID, platform: 'electron' }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Registration failed')
    err.code = data.code || 'auth/unknown'
    err.reason = data.reason
    throw err
  }
  if (data.token) {
    _raw = { uid: data.uid, email: data.email, token: data.token }
    localStorage.setItem('_ea', JSON.stringify(_raw))
    await claimElectronClient(_raw)
    _notify(_raw)
    return { user: _makeUser(_raw), profile: data.profile || null, emailVerificationRequired: Boolean(data.emailVerificationRequired) }
  }
  return { user: { uid: data.uid, email: data.email }, profile: data.profile || null, emailVerificationRequired: Boolean(data.emailVerificationRequired) }
}

export function electronSignOut() {
  _raw = null
  localStorage.removeItem('_ea')
  _notify(null)
}

export function electronSignInWithGoogle() {
  if (window.electronAPI?.openGoogleAuth) window.electronAPI.openGoogleAuth()
}

export async function electronCompleteGoogleAuth({ token, uid, email }) {
  _raw = { uid, email, token }
  localStorage.setItem('_ea', JSON.stringify(_raw))
  await claimElectronClient(_raw)
  _notify(_raw)
}
