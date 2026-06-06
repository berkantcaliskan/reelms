import { Router } from 'express'
import { env } from '../../config/env.js'
import { createDesktopAuthCode, exchangeDesktopAuthCode } from '../../modules/auth/desktopCodeStore.js'
import { claimActiveClient, generateAuthToken, generateSessionId, generateUid, hashAuthToken, hashPassword, signToken, verifyIdToken, verifyPassword } from '../../modules/auth/authService.js'
import { normalizeEmail, normalizeUsername } from '../../modules/reelms/access.js'
import { autoJoinDefaultReelm } from '../../modules/reelms/defaultReelm.js'
import { buttonEmailHtml, sendEmail } from '../../modules/email/emailService.js'
import { deleteDoc, getDoc, putDoc, putDocIfAbsent, userPk } from '../../modules/store/docStore.js'
import { trackRegistration } from '../../lib/tracker.js'

export const authRouter = Router()


function isGoogleConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI)
}

async function issueAuthSession(uid: string, email: string, platform = 'web', clientId?: string | null) {
  const sessionId = generateSessionId()
  const now = Date.now()
  await putDoc(userPk(uid), 'auth_session', {
    sessionId,
    platform,
    email,
    createdAt: now,
    lastSeenAt: now
  })
  if (clientId) await claimActiveClient(uid, clientId, platform).catch(() => null)
  return signToken(uid, email, sessionId)
}

function requestClientId(req: any) {
  return String(req.body?.clientId || req.query?.clientId || req.headers?.['x-reelms-client-id'] || '').trim()
}

const AUTH_TOKEN_PK = 'AUTH_TOKENS'
const VERIFICATION_EMAIL_COOLDOWN_MS = 2 * 60 * 1000
const PASSWORD_RESET_EMAIL_COOLDOWN_MS = 2 * 60 * 1000

type AuthTokenPurpose = 'verify_email' | 'password_reset'

function webUrl(path = '/', params: Record<string, string> = {}) {
  const url = new URL(path, env.PUBLIC_WEB_URL)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return url.toString()
}

function apiUrl(path = '/', params: Record<string, string> = {}) {
  const url = new URL(path, env.PUBLIC_API_URL)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return url.toString()
}

async function createAuthActionToken(uid: string, email: string, purpose: AuthTokenPurpose, ttlMs: number) {
  const token = generateAuthToken()
  const tokenHash = hashAuthToken(token)
  const now = Date.now()
  await putDoc(AUTH_TOKEN_PK, tokenHash, {
    uid,
    email: normalizeEmail(email),
    purpose,
    createdAt: now,
    expiresAt: now + ttlMs,
    usedAt: null
  })
  return token
}

async function consumeAuthActionToken(token: string, purpose: AuthTokenPurpose) {
  const tokenHash = hashAuthToken(token)
  const doc = await getDoc<any>(AUTH_TOKEN_PK, tokenHash).catch(() => null)
  if (!doc || doc.purpose !== purpose || doc.usedAt) return null
  if (Number(doc.expiresAt || 0) < Date.now()) {
    await deleteDoc(AUTH_TOKEN_PK, tokenHash).catch(() => {})
    return null
  }
  await putDoc(AUTH_TOKEN_PK, tokenHash, { ...doc, usedAt: Date.now() }).catch(() => {})
  return doc as { uid: string; email: string; purpose: AuthTokenPurpose }
}

async function sendVerificationEmail(uid: string, email: string, options: { force?: boolean } = {}) {
  const normalized = normalizeEmail(email)
  const creds = await getDoc<any>(`AUTH#${normalized}`, 'CREDS').catch(() => null)

  if (creds?.uid && String(creds.uid) !== String(uid)) throw new Error('verification_uid_mismatch')
  if (creds?.emailVerified === true) return { sent: false, reason: 'already_verified' as const }

  const now = Date.now()
  const lastSentAt = Number(creds?.lastVerificationEmailSentAt || 0)
  if (!options.force && lastSentAt && now - lastSentAt < VERIFICATION_EMAIL_COOLDOWN_MS) {
    return { sent: false, reason: 'cooldown' as const }
  }

  const token = await createAuthActionToken(uid, normalized, 'verify_email', env.AUTH_TOKEN_TTL_MS)
  // Send users to the API verification endpoint first. It updates the DB, then redirects
  // back to the web app. This keeps e-mail verification working even when the active
  // frontend route is the legacy app and does not process verify_email_token itself.
  const url = apiUrl('/auth/verify-email', { token })
  await sendEmail({
    to: normalized,
    subject: 'Verify your Reelms e-mail',
    text: `Verify your Reelms account: ${url}`,
    html: buttonEmailHtml('Verify your Reelms e-mail', 'Confirm this e-mail address to secure your Reelms account.', 'Verify e-mail', url)
  })

  if (creds?.uid) {
    await putDoc(`AUTH#${normalized}`, 'CREDS', { ...creds, lastVerificationEmailSentAt: now }).catch(() => {})
  }

  return { sent: true }
}

async function sendPasswordResetEmail(uid: string, email: string, options: { force?: boolean } = {}) {
  const normalized = normalizeEmail(email)
  const creds = await getDoc<any>(`AUTH#${normalized}`, 'CREDS').catch(() => null)

  if (creds?.uid && String(creds.uid) !== String(uid)) throw new Error('password_reset_uid_mismatch')

  const now = Date.now()
  const lastSentAt = Number(creds?.lastPasswordResetEmailSentAt || 0)
  if (!options.force && lastSentAt && now - lastSentAt < PASSWORD_RESET_EMAIL_COOLDOWN_MS) {
    return { sent: false, reason: 'cooldown' as const }
  }

  const token = await createAuthActionToken(uid, normalized, 'password_reset', env.PASSWORD_RESET_TTL_MS)
  // The production app is mounted at '/', so send reset links there and let the
  // legacy auth screen render the new-password form. /auth-next still supports
  // the same token, but root links avoid dead/experimental route surprises.
  const url = webUrl('/', { reset_password_token: token })
  await sendEmail({
    to: normalized,
    subject: 'Reset your Reelms password',
    text: `Reset your Reelms password: ${url}`,
    html: buttonEmailHtml('Reset your Reelms password', 'Use this link to set a new password for your Reelms account. The link expires soon.', 'Reset password', url)
  })

  if (creds?.uid) {
    await putDoc(`AUTH#${normalized}`, 'CREDS', { ...creds, lastPasswordResetEmailSentAt: now }).catch(() => {})
  }

  return { sent: true }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/

function isValidEmail(value: string) {
  return EMAIL_RE.test(value)
}

function validatePassword(value: unknown) {
  const password = String(value || '')
  if (password.length < 8) return { ok: false as const, error: 'weak_password', code: 'auth/weak-password', message: 'Password must be at least 8 characters.' }
  return { ok: true as const, password }
}

function validateOptionalUsername(value: unknown) {
  if (value == null || String(value).trim() === '') return { ok: true as const, username: '' }
  const username = normalizeUsername(value)
  if (!USERNAME_RE.test(username)) {
    return { ok: false as const, error: 'invalid_username', code: 'auth/invalid-username', message: 'Username must be 3-30 characters and use letters, numbers, dots, dashes or underscores.' }
  }
  return { ok: true as const, username }
}

async function resolveLoginEmail(identifier: unknown): Promise<{ email: string | null; kind: 'email' | 'username' | 'empty' | 'invalid' }> {
  const raw = String(identifier || '').trim()
  if (!raw) return { email: null, kind: 'empty' }
  const normalizedEmail = normalizeEmail(raw)
  if (isValidEmail(normalizedEmail)) return { email: normalizedEmail, kind: 'email' }
  const username = normalizeUsername(raw)
  if (!username || !USERNAME_RE.test(username)) return { email: null, kind: 'invalid' }
  const uid = await getDoc<string>(`USERNAME#${username}`, 'uid').catch(() => null)
  if (!uid) return { email: null, kind: 'username' }
  const profile = await getDoc<any>(userPk(String(uid)), 'profile').catch(() => null)
  const email = normalizeEmail(profile?.contact || profile?.email || '')
  return { email: isValidEmail(email) ? email : null, kind: 'username' }
}

async function createOrGetGoogleUser(googleUser: { email: string; name?: string; picture?: string }, clientId?: string | null) {
  const email = normalizeEmail(googleUser.email)
  let creds = await getDoc<any>(`AUTH#${email}`, 'CREDS')
  let uid: string

  if (creds?.uid) {
    uid = String(creds.uid)
    if (!creds.emailVerified) {
      await putDoc(`AUTH#${email}`, 'CREDS', { ...creds, emailVerified: true, emailVerifiedAt: Date.now() }).catch(() => {})
    }
  } else {
    uid = generateUid()
    const created = await putDocIfAbsent(`AUTH#${email}`, 'CREDS', { uid, googleAuth: true, emailVerified: true, emailVerifiedAt: Date.now() })
    if (!created) {
      creds = await getDoc<any>(`AUTH#${email}`, 'CREDS')
      if (!creds?.uid) throw new Error('google_auth_race_lost')
      uid = String(creds.uid)
    } else {
      const profileData: Record<string, unknown> = { id: uid, uid, contact: email, emailVerified: true, createdAt: Date.now(), updatedAt: Date.now() }
      if (googleUser.name) profileData.displayName = googleUser.name
      if (googleUser.name) profileData.name = googleUser.name
      await putDoc(userPk(uid), 'profile', profileData)
      await putDocIfAbsent(`EMAIL#${email}`, 'uid', uid).catch(() => {})
    }
  }

  await autoJoinDefaultReelm(uid, googleUser.name || '', null).catch(() => {})
  return { uid, email, token: await issueAuthSession(uid, email, 'google', clientId) }
}

authRouter.post('/login', async (req, res) => {
  const { email, identifier, password } = req.body || {}
  if ((!email && !identifier) || !password) return res.status(400).json({ error: 'missing_fields', code: 'auth/missing-fields', message: 'Enter your e-mail/username and password.' })
  try {
    const resolved = await resolveLoginEmail(identifier || email)
    const normalized = resolved.email
    if (!normalized) {
      const message = resolved.kind === 'email'
        ? 'No account is registered with this e-mail.'
        : resolved.kind === 'username'
          ? 'No account is registered with this username.'
          : 'Enter a valid e-mail or username.'
      return res.status(404).json({ error: 'user_not_found', code: 'auth/user-not-found', reason: resolved.kind, message })
    }
    const creds = await getDoc<any>(`AUTH#${normalized}`, 'CREDS')
    if (!creds?.uid) return res.status(404).json({ error: 'user_not_found', code: 'auth/user-not-found', reason: 'email', message: 'No account is registered with this e-mail.' })
    if (!creds?.passwordHash) {
      return res.status(409).json({ error: 'password_not_configured', code: 'auth/password-not-configured', message: 'This account was created with Google. Continue with Google or set a password first.' })
    }
    const ok = await verifyPassword(String(password), String(creds.passwordHash))
    if (!ok) return res.status(401).json({ error: 'wrong_password', code: 'auth/wrong-password', message: 'The password is incorrect.' })
    if (env.REELMS_REQUIRE_EMAIL_VERIFICATION && !creds.emailVerified) {
      await sendVerificationEmail(String(creds.uid), normalized).catch((err) => console.warn('/auth/login verification resend failed:', err))
      return res.status(403).json({ error: 'email_not_verified', code: 'auth/email-not-verified', message: 'Verify your e-mail before signing in. A verification link was sent recently.' })
    }
    const profile = await getDoc<any>(userPk(creds.uid), 'profile').catch(() => null)
    await autoJoinDefaultReelm(creds.uid, profile?.displayName || profile?.name || '', null).catch(() => {})
    res.json({ uid: creds.uid, email: normalized, token: await issueAuthSession(creds.uid, normalized, 'password', requestClientId(req)), profile: profile || null })
  } catch (e) {
    console.error('/auth/login error:', e)
    res.status(500).json({ error: 'auth_failed', code: 'auth/server-error', message: 'Sign in failed because the server could not complete the request.' })
  }
})

authRouter.post('/register', async (req, res) => {
  const { email, password, username: rawUsername, displayName } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing_fields', code: 'auth/missing-fields' })
  const normalized = normalizeEmail(email)
  if (!isValidEmail(normalized)) return res.status(400).json({ error: 'invalid_email', code: 'auth/invalid-email' })
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) return res.status(400).json({ error: passwordCheck.error, code: passwordCheck.code, message: passwordCheck.message })
  const usernameCheck = validateOptionalUsername(rawUsername)
  if (!usernameCheck.ok) return res.status(400).json({ error: usernameCheck.error, code: usernameCheck.code, message: usernameCheck.message })

  const uid = generateUid()
  let usernameReserved = false
  let authCreated = false
  let emailReserved = false
  try {
    if (usernameCheck.username) {
      usernameReserved = await putDocIfAbsent(`USERNAME#${usernameCheck.username}`, 'uid', uid)
      if (!usernameReserved) return res.status(409).json({ error: 'username_taken', code: 'auth/username-taken' })
    }

    const passwordHash = await hashPassword(passwordCheck.password)
    authCreated = await putDocIfAbsent(`AUTH#${normalized}`, 'CREDS', { uid, passwordHash, emailVerified: false, emailVerifiedAt: null })
    if (!authCreated) {
      if (usernameReserved) await deleteDoc(`USERNAME#${usernameCheck.username}`, 'uid').catch(() => {})
      return res.status(409).json({ error: 'email_exists', code: 'auth/email-already-in-use' })
    }

    emailReserved = await putDocIfAbsent(`EMAIL#${normalized}`, 'uid', uid)
    if (!emailReserved) {
      await deleteDoc(`AUTH#${normalized}`, 'CREDS').catch(() => {})
      if (usernameReserved) await deleteDoc(`USERNAME#${usernameCheck.username}`, 'uid').catch(() => {})
      return res.status(409).json({ error: 'email_taken', code: 'auth/email-taken' })
    }

    const now = Date.now()
    const profile = {
      id: uid,
      uid,
      username: usernameCheck.username || undefined,
      name: String(displayName || usernameCheck.username || '').trim() || undefined,
      displayName: String(displayName || usernameCheck.username || '').trim() || undefined,
      contactType: 'email',
      contact: normalized,
      createdAt: now,
      updatedAt: now,
      notifyNewDevice: true,
      emailVerified: false,
      isModerator: false
    }
    await putDoc(userPk(uid), 'profile', profile)
    await autoJoinDefaultReelm(uid, profile.displayName || '', null).catch(() => {})
    await sendVerificationEmail(uid, normalized, { force: true }).catch((err) => console.warn('/auth/register verification send failed:', err))
    trackRegistration({ uid, email: normalized, username: usernameCheck.username, displayName: profile.displayName, platform: req.body?.platform ?? 'web' }).catch(() => {})

    const token = env.REELMS_REQUIRE_EMAIL_VERIFICATION ? null : await issueAuthSession(uid, normalized, 'register', requestClientId(req))
    res.json({ uid, email: normalized, token, emailVerificationRequired: env.REELMS_REQUIRE_EMAIL_VERIFICATION, profile })
  } catch (e) {
    if (emailReserved) await deleteDoc(`EMAIL#${normalized}`, 'uid').catch(() => {})
    if (authCreated) await deleteDoc(`AUTH#${normalized}`, 'CREDS').catch(() => {})
    if (usernameReserved) await deleteDoc(`USERNAME#${usernameCheck.username}`, 'uid').catch(() => {})
    console.error('/auth/register error:', e)
    res.status(500).json({ error: 'registration_failed', code: 'auth/server-error' })
  }
})



authRouter.post('/email/verification/resend', async (req, res) => {
  const resolved = await resolveLoginEmail(req.body?.email || req.body?.identifier)
  if (!resolved.email) return res.json({ ok: true })
  try {
    const creds = await getDoc<any>(`AUTH#${resolved.email}`, 'CREDS').catch(() => null)
    if (creds?.uid && !creds.emailVerified) await sendVerificationEmail(String(creds.uid), resolved.email, { force: true })
    return res.json({ ok: true })
  } catch (e) {
    console.error('/auth/email/verification/resend error:', e)
    return res.status(500).json({ error: 'email_send_failed', code: 'auth/email-send-failed' })
  }
})

authRouter.get('/verify-email', async (req, res) => {
  const token = String(req.query?.token || '')
  if (!token) return res.redirect(webUrl('/', { email_verified: 'missing' }))
  try {
    const action = await consumeAuthActionToken(token, 'verify_email')
    if (!action?.uid || !action.email) return res.redirect(webUrl('/', { email_verified: 'invalid' }))
    const email = normalizeEmail(action.email)
    const creds = await getDoc<any>(`AUTH#${email}`, 'CREDS').catch(() => null)
    if (!creds?.uid || String(creds.uid) !== String(action.uid)) return res.redirect(webUrl('/', { email_verified: 'invalid' }))
    await putDoc(`AUTH#${email}`, 'CREDS', { ...creds, emailVerified: true, emailVerifiedAt: Date.now(), lastVerificationEmailSentAt: null })
    const profile = await getDoc<any>(userPk(String(action.uid)), 'profile').catch(() => null)
    if (profile) await putDoc(userPk(String(action.uid)), 'profile', { ...profile, emailVerified: true, updatedAt: Date.now() }).catch(() => {})
    return res.redirect(webUrl('/', { email_verified: 'success' }))
  } catch (e) {
    console.error('/auth/verify-email error:', e)
    return res.redirect(webUrl('/', { email_verified: 'error' }))
  }
})

authRouter.post('/verify-email', async (req, res) => {
  const token = String(req.body?.token || '')
  if (!token) return res.status(400).json({ error: 'missing_token', code: 'auth/missing-token' })
  try {
    const action = await consumeAuthActionToken(token, 'verify_email')
    if (!action?.uid || !action.email) return res.status(400).json({ error: 'invalid_or_expired_token', code: 'auth/invalid-action-code' })
    const email = normalizeEmail(action.email)
    const creds = await getDoc<any>(`AUTH#${email}`, 'CREDS').catch(() => null)
    if (!creds?.uid || String(creds.uid) !== String(action.uid)) {
      return res.status(400).json({ error: 'invalid_or_expired_token', code: 'auth/invalid-action-code' })
    }
    await putDoc(`AUTH#${email}`, 'CREDS', { ...creds, emailVerified: true, emailVerifiedAt: Date.now(), lastVerificationEmailSentAt: null })
    const profile = await getDoc<any>(userPk(String(action.uid)), 'profile').catch(() => null)
    if (profile) await putDoc(userPk(String(action.uid)), 'profile', { ...profile, emailVerified: true, updatedAt: Date.now() }).catch(() => {})
    return res.json({ ok: true })
  } catch (e) {
    console.error('/auth/verify-email json error:', e)
    return res.status(500).json({ error: 'verify_failed', code: 'auth/server-error' })
  }
})

authRouter.post('/password-reset/request', async (req, res) => {
  const resolved = await resolveLoginEmail(req.body?.email || req.body?.identifier)
  try {
    if (resolved.email) {
      const creds = await getDoc<any>(`AUTH#${resolved.email}`, 'CREDS').catch(() => null)
      if (creds?.uid) await sendPasswordResetEmail(String(creds.uid), resolved.email)
    }
    // Anti-enumeration: always return ok even when the account does not exist.
    return res.json({ ok: true })
  } catch (e) {
    console.error('/auth/password-reset/request error:', e)
    return res.status(500).json({ error: 'email_send_failed', code: 'auth/email-send-failed' })
  }
})

authRouter.post('/password-reset/confirm', async (req, res) => {
  const token = String(req.body?.token || '')
  const passwordCheck = validatePassword(req.body?.password)
  if (!token) return res.status(400).json({ error: 'missing_token', code: 'auth/missing-token' })
  if (!passwordCheck.ok) return res.status(400).json({ error: passwordCheck.error, code: passwordCheck.code, message: passwordCheck.message })
  try {
    const action = await consumeAuthActionToken(token, 'password_reset')
    if (!action?.uid || !action.email) return res.status(400).json({ error: 'invalid_or_expired_token', code: 'auth/invalid-action-code' })
    const email = normalizeEmail(action.email)
    const creds = await getDoc<any>(`AUTH#${email}`, 'CREDS').catch(() => null)
    if (!creds?.uid || String(creds.uid) !== String(action.uid)) return res.status(400).json({ error: 'invalid_or_expired_token', code: 'auth/invalid-action-code' })
    const passwordHash = await hashPassword(passwordCheck.password)
    await putDoc(`AUTH#${email}`, 'CREDS', { ...creds, passwordHash, emailVerified: true, emailVerifiedAt: creds.emailVerifiedAt || Date.now(), passwordResetAt: Date.now(), lastPasswordResetEmailSentAt: null })
    const profile = await getDoc<any>(userPk(String(action.uid)), 'profile').catch(() => null)
    if (profile) await putDoc(userPk(String(action.uid)), 'profile', { ...profile, emailVerified: true, updatedAt: Date.now() }).catch(() => {})
    return res.json({ ok: true })
  } catch (e) {
    console.error('/auth/password-reset/confirm error:', e)
    return res.status(500).json({ error: 'reset_failed', code: 'auth/server-error' })
  }
})

authRouter.post('/client/claim', async (req, res) => {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token', code: 'auth/missing-token' })
  const clientId = requestClientId(req)
  if (!clientId) return res.status(400).json({ error: 'missing_client_id', code: 'auth/missing-client-id' })
  try {
    const uid = await verifyIdToken(h.slice(7))
    const platform = String(req.body?.platform || req.query?.platform || 'web')
    await claimActiveClient(uid, clientId, platform)
    return res.json({ ok: true, uid, clientId })
  } catch (err: any) {
    const code = err?.code || err?.message
    if (code === 'auth/session-replaced' || code === 'session_replaced') {
      return res.status(401).json({ error: 'session_replaced', code: 'auth/session-replaced', message: 'This account was signed in somewhere else.' })
    }
    return res.status(401).json({ error: 'invalid_token', code: 'auth/invalid-token' })
  }
})

// Compatibility path for old web client: /google/login and new path: /auth/google/login.
authRouter.get('/google/login', async (req, res) => {
  const platform = String(req.query.platform ?? 'web')

  if (!isGoogleConfigured()) {
    if (platform === 'desktop') {
      return res.redirect(`${env.PUBLIC_DESKTOP_PROTOCOL}://auth?error=google_not_configured`)
    }
    return res.redirect(`${env.PUBLIC_WEB_URL}/?google=not_configured`)
  }

  const clientId = requestClientId(req)
  const state = Buffer.from(JSON.stringify({ platform, clientId })).toString('base64url')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

async function handleGoogleCallback(req: any, res: any) {
  const { code, error, state } = req.query
  let platform = 'web'
  let clientId = ''
  try {
    const parsed = JSON.parse(Buffer.from(String(state || ''), 'base64url').toString('utf8'))
    platform = String(parsed.platform || 'web')
    clientId = String(parsed.clientId || '')
  } catch {
    platform = String(state || 'web')
  }
  if (error || !code) return res.redirect(`${env.PUBLIC_WEB_URL}/?google=error`)
  if (!isGoogleConfigured()) return res.redirect(`${env.PUBLIC_WEB_URL}/?google=not_configured`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code'
      }).toString()
    })
    const tokenData = await tokenRes.json() as any
    if (!tokenData.access_token) throw new Error('No access token')
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } })
    const googleUser = await userRes.json() as any
    if (!googleUser.email || !googleUser.id) throw new Error('Google profile missing email or id')
    const auth = await createOrGetGoogleUser({ email: googleUser.email, name: googleUser.name || String(googleUser.email).split('@')[0], picture: googleUser.picture }, clientId)

    if (platform === 'desktop') {
      const desktopCode = createDesktopAuthCode(auth)
      return res.redirect(`${env.PUBLIC_DESKTOP_PROTOCOL}://auth?code=${encodeURIComponent(desktopCode)}`)
    }

    const params = new URLSearchParams({ google: 'success', token: auth.token, uid: auth.uid, email: auth.email })
    return res.redirect(`${env.PUBLIC_WEB_URL}/?${params}`)
  } catch (err) {
    console.error('Google callback error:', err)
    return res.redirect(`${env.PUBLIC_WEB_URL}/?google=error`)
  }
}

authRouter.get('/google/callback', handleGoogleCallback)
authRouter.get('/callback/google', handleGoogleCallback)

authRouter.post('/desktop/exchange', (req, res) => {
  const code = String(req.body?.code ?? '')
  if (!code) return res.status(400).json({ error: 'missing_code' })
  const result = exchangeDesktopAuthCode(code)
  if (!result) return res.status(400).json({ error: 'invalid_or_expired_code' })
  return res.json({ token: result.token, uid: result.uid, user: { uid: result.uid, email: result.email }, email: result.email })
})
