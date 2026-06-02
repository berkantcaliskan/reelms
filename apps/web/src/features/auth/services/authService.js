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
  userByUsername,
  userCheckUsername,
  userCheckEmail,
  userProfileGetById,
  userProfilePut,
  recordUserSession
} from '../../../reelmsAwsClient'
import { getApiBaseUrl } from '../../../config/api'
import { parseDeviceInfo } from '../../../shared/lib/deviceInfo'
import { isEmail, normalizeEmail, normalizeUsername } from '../../../shared/lib/validation'

export const authRuntime = {
  isElectron,
  apiUrl: getApiBaseUrl()
}

export async function resolveLoginIdentifier(identifier) {
  const raw = String(identifier || '').trim()
  if (!raw) return null
  if (isEmail(raw)) return normalizeEmail(raw)

  const profile = await userByUsername(normalizeUsername(raw))
  return profile?.contact || null
}

export async function signInWithPassword({ identifier, password }) {
  const email = await resolveLoginIdentifier(identifier)
  if (!email) {
    const err = new Error('Invalid email or username')
    err.code = 'auth/invalid-identifier'
    throw err
  }

  const credential = isElectron
    ? await electronSignIn(email, password)
    : await webSignIn(email, password)

  const profile = await userProfileGetById(credential.user.uid)
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

  const [usernameResult, emailResult] = await Promise.all([
    userCheckUsername(cleanUsername),
    userCheckEmail(cleanEmail)
  ])

  if (usernameResult?.exists) {
    const err = new Error('Username is already taken')
    err.code = 'auth/username-taken'
    throw err
  }

  if (emailResult?.exists) {
    const err = new Error('Email is already registered')
    err.code = 'auth/email-taken'
    throw err
  }

  const credential = isElectron
    ? await electronRegister(cleanEmail, password)
    : await webRegister(cleanEmail, password)

  const now = Date.now()
  const profile = {
    uid: credential.user.uid,
    id: credential.user.uid,
    username: cleanUsername,
    displayName: displayName || cleanUsername,
    contact: cleanEmail,
    avatar: '',
    bio: '',
    createdAt: now,
    updatedAt: now,
    notifyNewDevice: true,
    isModerator: false
  }

  await userProfilePut(profile)
  await safeRecordUserSession(profile)

  return { credential, profile }
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
