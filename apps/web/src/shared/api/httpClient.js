import { getWebEnv } from '../config/env.js'
import { isElectron, getElectronToken } from '../../electronAuth.js'
import { getWebToken } from '../../webAuth.js'

const env = getWebEnv()

export class HttpError extends Error {
  constructor(status, body, message = `HTTP ${status}`) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

function getRuntimeToken() {
  return isElectron ? getElectronToken() : getWebToken()
}

export async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(options.headers || {})
  const token = getRuntimeToken()

  if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: typeof options.body === 'string' || options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    throw new HttpError(response.status, body, body?.message || body?.error || `HTTP ${response.status}`)
  }

  return body
}

export function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
