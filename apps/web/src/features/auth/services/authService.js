import {
  isElectron,
  electronSignIn,
  electronRegister,
  electronSignOut,
  electronOnAuthStateChanged,
  getElectronCurrentUser,
  electronSignInWithGoogle,
  electronCompleteGoogleAuth
} from '../../../electronAuth'
import {
  webSignIn,
  webRegister,
  webSignOut,
  webOnAuthStateChanged,
  getWebCurrentUser,
  webSignInWithGoogle
} from '../../../webAuth'
import {
  userCheckUsername,
  userCheckEmail,
  userProfileGetById,
  userProfilePut,
  recordUserSession
} from '../../../reelmsAwsClient'
import { getApiBaseUrl } from '../../../config/api'
import { parseDeviceInfo } from '../../../shared/lib/deviceInfo'
import { isEmail, normalizeEmail, normalizeUsername, validateUsername, validatePassword } from '../../../shared/lib/validation'

export const authRuntime = {
  isElectron,
  apiUrl: getApiBaseUrl()
}

export async function resolveLoginIdentifier(identifier) {
  const raw = String(identifier || '').trim()
  if (!raw) return null
  return isEmail(raw) ? normalizeEmail(raw) : normalizeUsername(raw)
}

async function publicAuthFetch(path, body) {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Request failed')
    err.code = data.code || 'auth/unknown'
    throw err
  }
  return data
}

export function requestPasswordReset(identifier) {
  return publicAuthFetch('/auth/password-reset/request', { identifier })
}

export function confirmPasswordReset(token, password) {
  return publicAuthFetch('/auth/password-reset/confirm', { token, password })
}

export function verifyEmailToken(token) {
  return publicAuthFetch('/auth/verify-email', { token })
}

export function resendVerificationEmail(identifier) {
  return publicAuthFetch('/auth/email/verification/resend', { identifier })
}

export async function signInWithPassword({ identifier, password }) {
  const cleanIdentifier = await resolveLoginIdentifier(identifier)
  if (!cleanIdentifier) {
    const err = new Error('Invalid email or username')
    err.code = 'auth/invalid-identifier'
    throw err
  }

  const credential = isElectron
    ? await electronSignIn(cleanIdentifier, password)
    : await webSignIn(cleanIdentifier, password)

  const profile = credential.profile || await userProfileGetById(credential.user.uid)
  if (!profile) {
    const err = new Error('User profile not found')
    err.code = 'auth/profile-not-found'
    throw err
  }

  await safeRecordUserSession(profile)
  return { credential, profile }
}

export async function registerWithPassword({ email, password, username, displayName }) {
  const cleanEmail = normalizeEmail(email)
  const cleanUsername = normalizeUsername(username)
  const usernameCheck = validateUsername(cleanUsername)
  if (!usernameCheck.ok) {
    const err = new Error(usernameCheck.reason)
    err.code = 'auth/invalid-username'
    throw err
  }
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) {
    const err = new Error(passwordCheck.reason)
    err.code = 'auth/weak-password'
    throw err
  }
  if (!isEmail(cleanEmail)) {
    const err = new Error('Enter a valid email address.')
    err.code = 'auth/invalid-email'
    throw err
  }

  const [usernameResult, emailResult] = await Promise.all([
    userCheckUsername(cleanUsername),
    userCheckEmail(cleanEmail)
  ])

  if (usernameResult?.exists || usernameResult === false) {
    const err = new Error('Username is already taken')
    err.code = 'auth/username-taken'
    throw err
  }

  if (emailResult?.exists || emailResult === false) {
    const err = new Error('Email is already registered')
    err.code = 'auth/email-taken'
    throw err
  }

  const registerProfile = { username: cleanUsername, displayName: displayName || cleanUsername, name: displayName || cleanUsername }
  const credential = isElectron
    ? await electronRegister(cleanEmail, password, registerProfile)
    : await webRegister(cleanEmail, password, registerProfile)

  const now = Date.now()
  if (credential.emailVerificationRequired) {
    return { credential, profile: credential.profile || null, emailVerificationRequired: true }
  }

  const profile = credential.profile || {
    uid: credential.user.uid,
    id: credential.user.uid,
    username: cleanUsername,
    displayName: displayName || cleanUsername,
    name: displayName || cleanUsername,
    contact: cleanEmail,
    avatar: '',
    bio: '',
    createdAt: now,
    updatedAt: now,
    notifyNewDevice: true,
    isModerator: false
  }

  if (!credential.profile) await userProfilePut(profile)
  await safeRecordUserSession(profile)

  return { credential, profile, emailVerificationRequired: false }
}

export function signInWithGoogleProvider() {
  if (isElectron) return electronSignInWithGoogle()
  return webSignInWithGoogle()
}

export function completeDesktopGoogleAuth(payload) {
  return electronCompleteGoogleAuth(payload)
}

export function signOutCurrentUser() {
  return isElectron ? electronSignOut() : webSignOut()
}

export function getCurrentUser() {
  return isElectron ? getElectronCurrentUser() : getWebCurrentUser()
}

export function onAuthStateChanged(callback) {
  return isElectron ? electronOnAuthStateChanged(callback) : webOnAuthStateChanged(callback)
}

async function safeRecordUserSession(profile) {
  try {
    await recordUserSession(parseDeviceInfo, profile?.notifyNewDevice)
  } catch {
    // Session recording must never block login/registration.
  }
}
