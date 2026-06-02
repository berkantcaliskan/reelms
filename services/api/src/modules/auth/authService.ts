import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'

const tokenTtl = '30d'

export type AuthClaims = { uid?: string; sub?: string; email?: string }

export function generateUid() {
  return crypto.randomBytes(16).toString('hex')
}

export function signToken(uid: string, email?: string) {
  return jwt.sign({ uid, email, sub: uid }, env.JWT_SECRET, { expiresIn: tokenTtl })
}

export async function verifyIdToken(token: string): Promise<string> {
  if (env.NODE_ENV !== 'production' && process.env.REELMS_DEV_UID) return process.env.REELMS_DEV_UID
  const decoded = jwt.verify(token, env.JWT_SECRET) as AuthClaims
  const uid = decoded.uid || decoded.sub
  if (!uid) throw new Error('missing_uid')
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
