import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { getDoc, putDoc, userPk } from '../store/docStore.js'

const tokenTtl = '30d'

export type AuthClaims = { uid?: string; sub?: string; email?: string; sid?: string }

export function generateUid() {
  return crypto.randomBytes(16).toString('hex')
}

export function generateSessionId() {
  return crypto.randomBytes(24).toString('hex')
}

export function generateAuthToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashAuthToken(token: string) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

export function signToken(uid: string, email?: string, sessionId?: string) {
  const sid = sessionId || generateSessionId()
  return jwt.sign({ uid, email, sub: uid, sid }, env.JWT_SECRET, { expiresIn: tokenTtl })
}


function sessionReplacedError() {
  const err = new Error('session_replaced')
  ;(err as any).code = 'auth/session-replaced'
  return err
}

export async function claimActiveClient(uid: string, clientId?: string | null, platform = 'web') {
  const cleanClientId = String(clientId || '').trim()
  if (!uid || !cleanClientId) return null
  const now = Date.now()
  const doc = { clientId: cleanClientId, platform, updatedAt: now }
  await putDoc(userPk(uid), 'active_client', doc)
  return doc
}

export async function assertActiveClient(uid: string, clientId?: string | null) {
  const activeClient = await getDoc<any>(userPk(String(uid)), 'active_client').catch(() => null)
  if (!activeClient?.clientId) return
  const cleanClientId = String(clientId || '').trim()
  if (!cleanClientId || cleanClientId !== String(activeClient.clientId)) throw sessionReplacedError()
}

export async function verifyIdToken(token: string): Promise<string> {
  if (env.NODE_ENV !== 'production' && process.env.REELMS_DEV_UID) return process.env.REELMS_DEV_UID
  const decoded = jwt.verify(token, env.JWT_SECRET) as AuthClaims
  const uid = decoded.uid || decoded.sub
  if (!uid) throw new Error('missing_uid')

  const activeSession = await getDoc<any>(userPk(String(uid)), 'auth_session').catch(() => null)
  if (activeSession?.sessionId) {
    const tokenSessionId = decoded.sid ? String(decoded.sid) : ''
    if (!tokenSessionId || tokenSessionId !== String(activeSession.sessionId)) {
      throw sessionReplacedError()
    }
  }

  return String(uid)
}

export function hashPassword(password: string) {
  return new Promise<string>((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err)
      resolve(`${salt}:${key.toString('hex')}`)
    })
  })
}

export function verifyPassword(password: string, stored: string) {
  return new Promise<boolean>((resolve, reject) => {
    const [salt, key] = String(stored || '').split(':')
    if (!salt || !key) return resolve(false)
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err)
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived.toString('hex'), 'hex')))
    })
  })
}
