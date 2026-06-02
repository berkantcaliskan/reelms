import crypto from 'node:crypto'

const ttlMs = 2 * 60 * 1000
const codes = new Map<string, { token: string; expiresAt: number; email?: string; uid?: string }>()

export function createDesktopAuthCode(payload: { token: string; email?: string; uid?: string }) {
  const code = crypto.randomBytes(24).toString('base64url')
  codes.set(code, { ...payload, expiresAt: Date.now() + ttlMs })
  return code
}

export function exchangeDesktopAuthCode(code: string) {
  const item = codes.get(code)
  if (!item) return null
  codes.delete(code)
  if (item.expiresAt < Date.now()) return null
  return { token: item.token, email: item.email, uid: item.uid }
}
