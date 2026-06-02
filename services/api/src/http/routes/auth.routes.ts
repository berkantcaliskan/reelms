import { Router } from 'express'
import { env } from '../../config/env.js'
import { createDesktopAuthCode, exchangeDesktopAuthCode } from '../../modules/auth/desktopCodeStore.js'
import { generateUid, hashPassword, signToken, verifyPassword } from '../../modules/auth/authService.js'
import { normalizeEmail, normalizeUsername } from '../../modules/reelms/access.js'
import { autoJoinDefaultReelm } from '../../modules/reelms/defaultReelm.js'
import { deleteDoc, getDoc, putDoc, putDocIfAbsent, userPk } from '../../modules/store/docStore.js'

export const authRouter = Router()


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

async function resolveLoginEmail(identifier: unknown) {
  const raw = String(identifier || '').trim()
  if (!raw) return null
  const normalizedEmail = normalizeEmail(raw)
  if (isValidEmail(normalizedEmail)) return normalizedEmail
  const username = normalizeUsername(raw)
  if (!username) return null
  const uid = await getDoc<string>(`USERNAME#${username}`, 'uid').catch(() => null)
  if (!uid) return null
  const profile = await getDoc<any>(userPk(String(uid)), 'profile').catch(() => null)
  const email = normalizeEmail(profile?.contact || profile?.email || '')
  return isValidEmail(email) ? email : null
}

async function createOrGetGoogleUser(googleUser: { email: string; name?: string; picture?: string }) {
  const email = normalizeEmail(googleUser.email)
  let creds = await getDoc<any>(`AUTH#${email}`, 'CREDS')
  let uid: string

  if (creds?.uid) {
    uid = String(creds.uid)
  } else {
    uid = generateUid()
    const created = await putDocIfAbsent(`AUTH#${email}`, 'CREDS', { uid, googleAuth: true })
    if (!created) {
      creds = await getDoc<any>(`AUTH#${email}`, 'CREDS')
      if (!creds?.uid) throw new Error('google_auth_race_lost')
      uid = String(creds.uid)
    } else {
      const profileData: Record<string, unknown> = { id: uid, uid, contact: email, createdAt: Date.now(), updatedAt: Date.now() }
      if (googleUser.name) profileData.displayName = googleUser.name
      if (googleUser.name) profileData.name = googleUser.name
      if (googleUser.picture) profileData.photoURL = googleUser.picture
      await putDoc(userPk(uid), 'profile', profileData)
      await putDocIfAbsent(`EMAIL#${email}`, 'uid', uid).catch(() => {})
    }
  }

  await autoJoinDefaultReelm(uid, googleUser.name || '', googleUser.picture || null).catch(() => {})
  return { uid, email, token: signToken(uid, email) }
}

authRouter.post('/login', async (req, res) => {
  const { email, identifier, password } = req.body || {}
  if ((!email && !identifier) || !password) return res.status(400).json({ error: 'missing_fields', code: 'auth/missing-fields' })
  try {
    const normalized = await resolveLoginEmail(identifier || email)
    if (!normalized) return res.status(401).json({ error: 'invalid_credentials', code: 'auth/invalid-credential' })
    const creds = await getDoc<any>(`AUTH#${normalized}`, 'CREDS')
    if (!creds?.passwordHash) return res.status(401).json({ error: 'invalid_credentials', code: 'auth/invalid-credential' })
    const ok = await verifyPassword(String(password), String(creds.passwordHash))
    if (!ok) return res.status(401).json({ error: 'invalid_credentials', code: 'auth/invalid-credential' })
    const profile = await getDoc<any>(userPk(creds.uid), 'profile').catch(() => null)
    await autoJoinDefaultReelm(creds.uid, profile?.displayName || profile?.name || '', profile?.photoURL || profile?.photo || null).catch(() => {})
    res.json({ uid: creds.uid, email: normalized, token: signToken(creds.uid, normalized), profile: profile || null })
  } catch (e) {
    console.error('/auth/login error:', e)
    res.status(500).json({ error: 'auth_failed', code: 'auth/server-error' })
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
    authCreated = await putDocIfAbsent(`AUTH#${normalized}`, 'CREDS', { uid, passwordHash })
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
      isModerator: false
    }
    await putDoc(userPk(uid), 'profile', profile)
    await autoJoinDefaultReelm(uid, profile.displayName || '', null).catch(() => {})
    res.json({ uid, email: normalized, token: signToken(uid, normalized), profile })
  } catch (e) {
    if (emailReserved) await deleteDoc(`EMAIL#${normalized}`, 'uid').catch(() => {})
    if (authCreated) await deleteDoc(`AUTH#${normalized}`, 'CREDS').catch(() => {})
    if (usernameReserved) await deleteDoc(`USERNAME#${usernameCheck.username}`, 'uid').catch(() => {})
    console.error('/auth/register error:', e)
    res.status(500).json({ error: 'registration_failed', code: 'auth/server-error' })
  }
})

// Compatibility path for old web client: /google/login and new path: /auth/google/login.
authRouter.get('/google/login', async (req, res) => {
  const platform = String(req.query.platform ?? 'web')
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    if (env.NODE_ENV !== 'production') {
      const uid = `dev-google-${platform}`
      const email = `${platform}@reelms.local`
      const displayName = platform === 'web' ? 'web' : platform
      const token = signToken(uid, email)
      const existingProfile = await getDoc<any>(userPk(uid), 'profile').catch(() => null)
      if (!existingProfile) {
        await putDoc(userPk(uid), 'profile', {
          id: uid,
          name: displayName,
          username: displayName,
          contactType: 'email',
          contact: email,
          createdAt: new Date().toISOString(),
          isDevGoogleUser: true
        })
        await putDocIfAbsent(`USERNAME#${displayName.toLowerCase()}`, 'uid', uid).catch(() => {})
        await putDocIfAbsent(`EMAIL#${email.toLowerCase()}`, 'uid', uid).catch(() => {})
      }
      await autoJoinDefaultReelm(uid, displayName, null).catch(() => {})
      if (platform === 'desktop') {
        const code = createDesktopAuthCode({ token, email, uid })
        return res.redirect(`${env.PUBLIC_DESKTOP_PROTOCOL}://auth?code=${encodeURIComponent(code)}`)
      }
      const params = new URLSearchParams({ google: 'success', token, uid, email })
      return res.redirect(`${env.PUBLIC_WEB_URL}/?${params}`)
    }
    return res.status(503).send('Google sign-in not configured')
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: platform
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

async function handleGoogleCallback(req: any, res: any) {
  const { code, error, state } = req.query
  const platform = String(state || 'web')
  if (error || !code) return res.redirect(`${env.PUBLIC_WEB_URL}/?google=error`)
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) return res.redirect(`${env.PUBLIC_WEB_URL}/?google=error`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString()
    })
    const tokenData = await tokenRes.json() as any
    if (!tokenData.access_token) throw new Error('No access token')
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } })
    const googleUser = await userRes.json() as any
    if (!googleUser.email) throw new Error('No email returned')
    const auth = await createOrGetGoogleUser({ email: googleUser.email, name: googleUser.name, picture: googleUser.picture })

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
