import { io } from 'socket.io-client'
import { API_BASE_URL } from '../config'

export function createReelmsSocket() {
  return io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: false
  })
}
