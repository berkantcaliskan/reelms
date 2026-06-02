import { io } from 'socket.io-client'
import { getWebEnv } from '../config/env.js'

let sharedSocket = null

export function createReelmsSocket({ token, apiBaseUrl } = {}) {
  const env = getWebEnv()
  return io(apiBaseUrl || env.apiBaseUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    auth: token ? { token } : undefined
  })
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
