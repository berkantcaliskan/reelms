import { API_BASE_URL } from '../config'

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`API ${response.status}`)
  return response.json() as Promise<T>
}
