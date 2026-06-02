import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { createDesktopAuthCode, exchangeDesktopAuthCode } from '../../modules/auth/desktopCodeStore.js'
import { generateUid, hashPassword, signToken, verifyPassword } from '../../modules/auth/authService.js'
import { autoJoinDefaultReelm, DEFAULT_REELM_ID } from '../../modules/reelms/defaultReelm.js'
import { getDoc, putDoc, userPk } from '../../modules/store/docStore.js'

function buildAuthRouter(io?: Server) {
const authRouter = Router()

const emitMembersUpdated = () =>
  io?.to(`reelm:${DEFAULT_REELM_ID}`).emit('reelms:doc', { scope: 'reelm', reelmId: DEFAULT_REELM_ID, sk: 'members' })

async function createOrGetGoogleUser(googleUser: { email: string; name?: string; picture?: string }) {
  const email = googleUser.email.toLowerCase()
  let creds = await getDoc<any>(`AUTH#${email}`, 'CREDS')
  let uid: string
  if (creds) {
    uid = creds.uid
  } else {
    uid = generateUid()
    await putDoc(`AUTH#${email}`, 'CREDS', { uid, googleAuth: true })
    const profileData: Record<string, unknown> = { id: uid }
    if (googleUser.name) profileData.displayName = googleUser.name
    if (googleUser.picture) profileData.photoURL = googleUser.picture
    await putDoc(userPk(uid), 'profile', profileData)
  }
  const joined = await autoJoinDefaultReelm(uid, googleUser.name || '', googleUser.picture || null).catch(() => false)
  if (joined) emitMembersUpdated()
  return { uid, email, token: signToken(uid, email) }
}

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
  try {
    const normalized = String(email).toLowerCase()
    const creds = await getDoc<any>(`AUTH#${normalized}`, 'CREDS')
    if (!creds?.passwordHash) return res.status(401).json({ error: 'invalid_credentials', code: 'auth/invalid-credential' })
    const ok = await verifyPassword(String(password), String(creds.passwordHash))
    if (!ok) return res.status(401).json({ error: 'invalid_credentials', code: 'auth/invalid-credential' })
    const profile = await getDoc<any>(userPk(creds.uid), 'profile').catch(() => null)
    const joined = await autoJoinDefaultReelm(creds.uid, profile?.displayName || profile?.name || '', profile?.photoURL || profile?.photo || null).catch(() => false)
    if (joined) emitMembersUpdated()
    res.json({ uid: creds.uid, email: normalized, token: signToken(creds.uid, normalized) })
  } catch (e) {
    console.error('/auth/login error:', e)
    res.status(500).json({ error: 'auth_failed' })
  }
})

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
  if (String(password).length < 6) return res.status(400).json({ error: 'weak_password', code: 'auth/weak-password' })
  try {
    const normalized = String(email).toLowerCase()
    const existing = await getDoc(`AUTH#${normalized}`, 'CREDS')
    if (existing) return res.status(409).json({ error: 'email_exists', code: 'auth/email-already-in-use' })
    const uid = generateUid()
    const passwordHash = await hashPassword(String(password))
    await putDoc(`AUTH#${normalized}`, 'CREDS', { uid, passwordHash })
    await putDoc(userPk(uid), 'profile', { id: uid, contact: normalized })
    const joined = await autoJoinDefaultReelm(uid, '', null).catch(() => false)
    if (joined) emitMembersUpdated()
    res.json({ uid, email: normalized, token: signToken(uid, normalized) })
  } catch (e) {
    console.error('/auth/register error:', e)
    res.status(500).json({ error: 'registration_failed' })
  }
})

// Compatibility path for old web client: /google/login and new path: /auth/google/login.
authRouter.get('/google/login', (req, res) => {
  const platform = String(req.query.platform ?? 'web')
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    if (env.NODE_ENV !== 'production') {
      const uid = `dev-google-${platform}`
      const email = `${platform}@reelms.local`
      const token = signToken(uid, email)
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
