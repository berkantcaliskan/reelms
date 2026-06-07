import { API_BASE_URL } from '../config'

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`API ${response.status}`)
  return response.json() as Promise<T>
}

export async function exchangeDesktopAuthCode(code: string) {
  const response = await fetch(`${API_BASE_URL}/auth/desktop/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
  if (!response.ok) throw new Error('Desktop auth exchange failed')
  return response.json() as Promise<{ token: string; user?: { email?: string } }>
}
