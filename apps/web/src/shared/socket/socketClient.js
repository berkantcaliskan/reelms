import { io } from 'socket.io-client'
import { getWebEnv } from '../config/env.js'

let sharedSocket = null

export function createReelmsSocket({ token, apiBaseUrl } = {}) {
  const env = getWebEnv()
  const socket = io(apiBaseUrl || env.apiBaseUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    auth: token ? { token } : undefined
  })
  socket.on('connect_error', (err) => {
    const code = err?.data?.code || err?.message || ''
    if (code === 'auth/session-replaced' || code === 'session_replaced') {
      try { window.dispatchEvent(new CustomEvent('reelms:session-invalid', { detail: { code } })) } catch {}
    }
  })
  return socket
}

export function getSocket(token) {
  if (sharedSocket?.connected) return sharedSocket
  sharedSocket = createReelmsSocket({ token })
  return sharedSocket
}

export function closeSocket() {
  sharedSocket?.disconnect()
  sharedSocket = null
}
