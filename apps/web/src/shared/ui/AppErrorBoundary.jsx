import { Component } from 'react'
import { getWebEnv } from '../config/env.js'

const RENDER_CRASH_STORAGE_KEY = 'reelms:last-render-crash'

function safeJson(value) {
  try { return JSON.stringify(value) }
  catch { return '{}' }
}

function clearRiskyClientCache() {
  try {
    const riskyPrefixes = [
      'reelms:member-reelms:',
      'reelms:profile-cache:',
      'reelms:core-cache:',
      'reelms:doc-cache:',
      'reelms:selected-reelm:',
    ]
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (riskyPrefixes.some(prefix => key.startsWith(prefix))) localStorage.removeItem(key)
    }
  } catch { /* ignore */ }
}

function reportRenderCrash(error, info, props = {}) {
  const payload = {
    name: error?.name || 'RenderError',
    message: String(error?.message || error || 'unknown_render_error').slice(0, 800),
    stack: String(error?.stack || '').slice(0, 4000),
    componentStack: String(info?.componentStack || '').slice(0, 4000),
    boundary: props.boundaryName || 'app',
    route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.hash || ''}` : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    at: Date.now(),
    appVersion: typeof window !== 'undefined' ? window.__REELMS_APP_VERSION__ || null : null
  }
  try { sessionStorage.setItem(RENDER_CRASH_STORAGE_KEY, safeJson(payload)) } catch { /* ignore */ }
  try {
    const apiBaseUrl = getWebEnv()?.apiBaseUrl
    if (!apiBaseUrl) return
    fetch(`${apiBaseUrl}/api/v1/client/render-error`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: safeJson(payload),
      keepalive: true,
    }).catch(() => {})
  } catch { /* ignore */ }
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorKey: 0 }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Reelms Web] render failure', error, info)
    reportRenderCrash(error, info, this.props)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, errorKey: this.state.errorKey + 1 })
    }
  }

  recover = () => {
    clearRiskyClientCache()
    this.setState({ error: null, errorKey: this.state.errorKey + 1 })
  }

  reload = () => {
    clearRiskyClientCache()
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      const title = this.props.title || 'Reelms could not render this screen.'
      const description = this.props.description || 'The broken local snapshot was isolated. Try again without restarting the whole client.'
      return (
        <div className="reelms-fatal-shell" role="alert">
          <div className="reelms-fatal-card">
            <div className="reelms-fatal-mark">R</div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="reelms-fatal-actions">
              <button type="button" onClick={this.recover}>Try again</button>
              <button type="button" onClick={this.reload}>Reload Reelms</button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
