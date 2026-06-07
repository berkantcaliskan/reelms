import { useEffect, useMemo, useState } from 'react'
import type { HealthResponse } from '@reelms/shared'
import { API_BASE_URL } from './config'
import { apiGet } from './lib/apiClient'
import { createReelmsSocket } from './lib/socketClient'
import './styles.css'

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [apiError, setApiError] = useState<string>('')
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const socket = useMemo(() => createReelmsSocket(), [])

  useEffect(() => {
    apiGet<HealthResponse>('/health')
      .then(setHealth)
      .catch((err) => setApiError(err.message))
  }, [])

  function connectSocket() {
    socket.connect()
    socket.on('connect', () => {
      setSocketStatus(`connected: ${socket.id}`)
      socket.emit('room:join', { roomId: 'lobby' })
    })
    socket.on('disconnect', () => setSocketStatus('disconnected'))
    socket.on('room:joined', (payload) => console.log('room:joined', payload))
    socket.on('message:new', (payload) => console.log('message:new', payload))
  }

  function sendTestMessage() {
    socket.emit('message:send', { roomId: 'lobby', body: 'Hello from Reelms desktop v2' })
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="brand-row">
          <img src="/src/assets/icons/reelms-logo.svg" alt="Reelms" />
          <span>Reelms v2</span>
        </div>
        <h1>Professional desktop foundation</h1>
        <div className="grid">
          <div className="status-card">
            <strong>API</strong>
            <span>{API_BASE_URL}</span>
            <small>{health ? `${health.service} ${health.environment}` : apiError || 'checking...'}</small>
          </div>
          <div className="status-card">
            <strong>Socket</strong>
            <span>{socketStatus}</span>
            <small>Socket.io gateway hazır.</small>
          </div>
        </div>
        <div className="actions">
          <button onClick={connectSocket}>Socket bağlan</button>
          <button onClick={sendTestMessage}>Test mesajı gönder</button>
        </div>
      </section>
    </main>
  )
}
