// Web browser auth — per-tab backend auth for web beta.
// Important: tokens are stored in sessionStorage, not localStorage, so different
// browser tabs/profiles cannot leak chats or profile cache into each other.
import { getApiBaseUrl } from './config/api'

const BACKEND = getApiBaseUrl()
const AUTH_KEY = '_wa'
const LEGACY_AUTH_KEY = '_wa'
const CLIENT_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 8)}`

let _raw = null
const _listeners = []
let _claimPromise = null

function readSessionAuth() {
  try {
    const s = sessionStorage.getItem(AUTH_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

function writeSessionAuth(raw) {
  try {
    if (raw) sessionStorage.setItem(AUTH_KEY, JSON.stringify(raw))
    else sessionStorage.removeItem(AUTH_KEY)
    // Do not keep old global web auth around. It caused cross-account state leaks.
    localStorage.removeItem(LEGACY_AUTH_KEY)
  } catch {}
}

_raw = readSessionAuth()

// Drop old localStorage auth once this build is loaded. Users should sign in per tab.
try { localStorage.removeItem(LEGACY_AUTH_KEY) } catch {}

// Process Google OAuth callback on page load (before any component renders)
try {
  const params = new URLSearchParams(window.location.search)
  if (params.get('google') === 'success') {
    const token = params.get('token')
    const uid   = params.get('uid')
    const email = params.get('email')
    if (token && uid && email) {
      _raw = { uid, email, token }
      writeSessionAuth(_raw)
    }
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)
  } else if (params.get('google') === 'error' || params.get('google') === 'not_configured') {
    const reason = params.get('google') === 'not_configured' ? 'google_not_configured' : 'google_failed'
    window.history.replaceState({}, '', `${window.location.pathname}?${reason}=1${window.location.hash || ''}`)
  }
} catch {}

function _makeUser(raw) {
  if (!raw) return null
  return { uid: raw.uid, email: raw.email, getIdToken: () => Promise.resolve(raw.token) }
}

async function _claimClient(raw = _raw) {
  if (!raw?.token || !raw?.uid) return null
  if (_claimPromise) return _claimPromise
  _claimPromise = fetch(`${BACKEND}/auth/client/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${raw.token}`,
      'X-Reelms-Client-Id': CLIENT_ID,
    },
    body: JSON.stringify({ clientId: CLIENT_ID, platform: 'web' }),
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 401) {
        _raw = null
        writeSessionAuth(null)
        _notify(null)
      }
      return null
    }
    return res.json().catch(() => null)
  }).finally(() => { _claimPromise = null })
  return _claimPromise
}

function _notify(raw) {
  const u = _makeUser(raw)
  _listeners.forEach(fn => fn(u))
}

try {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'reelms:auth-event') return
    // Tokens are per-tab. Storage events are only used to tell stale tabs to refresh/sign out.
    try {
      const payload = event.newValue ? JSON.parse(event.newValue) : null
      if (payload?.type === 'signout' || payload?.type === 'session-invalid') {
        _raw = null
        writeSessionAuth(null)
        _notify(null)
      }
    } catch {}
  })

  window.addEventListener('reelms:session-invalid', () => {
    _raw = null
    writeSessionAuth(null)
    _notify(null)
    try { localStorage.setItem('reelms:auth-event', JSON.stringify({ type: 'session-invalid', at: Date.now() })) } catch {}
    const url = new URL(window.location.href)
    url.searchParams.set('session_replaced', '1')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  })
} catch {}

export function getWebCurrentUser() {
  return _makeUser(_raw)
}

export function getWebToken() {
  return _raw?.token || null
}

export function getWebClientId() {
  return CLIENT_ID
}

export async function claimWebClient() {
  return _claimClient(_raw)
}

export function webOnAuthStateChanged(cb) {
  _listeners.push(cb)
  Promise.resolve().then(async () => {
    if (_raw) await _claimClient(_raw).catch(() => null)
    cb(_makeUser(_raw))
  })
  return () => {
    const i = _listeners.indexOf(cb)
    if (i > -1) _listeners.splice(i, 1)
  }
}

export async function webSignIn(identifier, password) {
  const res = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Reelms-Client-Id': CLIENT_ID },
    body: JSON.stringify({ identifier, password, clientId: CLIENT_ID, platform: 'web' }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Sign in failed')
    err.code = data.code || 'auth/unknown'
    err.reason = data.reason
    throw err
  }
  _raw = { uid: data.uid, email: data.email, token: data.token }
  writeSessionAuth(_raw)
  await _claimClient(_raw).catch(() => null)
  _notify(_raw)
  return { user: _makeUser(_raw), profile: data.profile || null }
}

export async function webRegister(email, password, profile = {}) {
  const res = await fetch(`${BACKEND}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Reelms-Client-Id': CLIENT_ID },
    body: JSON.stringify({ email, password, username: profile.username, displayName: profile.displayName || profile.name, clientId: CLIENT_ID, platform: 'web' }),
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
    writeSessionAuth(_raw)
    await _claimClient(_raw).catch(() => null)
    _notify(_raw)
    return { user: _makeUser(_raw), profile: data.profile || null, emailVerificationRequired: Boolean(data.emailVerificationRequired) }
  }
  return { user: { uid: data.uid, email: data.email }, profile: data.profile || null, emailVerificationRequired: Boolean(data.emailVerificationRequired) }
}

export function webSignOut() {
  _raw = null
  writeSessionAuth(null)
  try { localStorage.setItem('reelms:auth-event', JSON.stringify({ type: 'signout', at: Date.now() })) } catch {}
  _notify(null)
}

export function webSignInWithGoogle() {
  const url = new URL(`${BACKEND}/google/login`)
  url.searchParams.set('platform', 'web')
  url.searchParams.set('clientId', CLIENT_ID)
  window.location.href = url.toString()
}
