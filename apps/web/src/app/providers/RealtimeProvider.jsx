import { createContext, useContext, useMemo, useRef } from 'react'
import { createReelmsSocket } from '../../shared/socket/socketClient.js'

const RealtimeContext = createContext(null)

export function RealtimeProvider({ children }) {
  const socketRef = useRef(null)

  const value = useMemo(() => ({
    connect(token) {
      if (!socketRef.current) socketRef.current = createReelmsSocket({ token })
      return socketRef.current
    },
    getSocket() {
      return socketRef.current
    },
    disconnect() {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }), [])

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const value = useContext(RealtimeContext)
  if (!value) throw new Error('useRealtime must be used inside RealtimeProvider')
  return value
}
