import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Reelms Web] render failure', error, info)
  }

  render() {
    if (this.state.error) {
      const errStr = String(this.state.error)
      const stackLines = (this.state.error?.stack || '').split('\n').slice(0, 8).join('\n')
      return (
        <div className="reelms-fatal-shell">
          <div className="reelms-fatal-card">
            <div className="reelms-fatal-mark">R</div>
            <h1>Reelms could not render this screen.</h1>
            <pre style={{ fontFamily: 'monospace', fontSize: '0.7em', background: '#1a1a1a', padding: '8px', borderRadius: '6px', wordBreak: 'break-all', textAlign: 'left', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {errStr}{stackLines ? '\n' + stackLines : ''}
            </pre>
            <button type="button" onClick={() => window.location.reload()}>Reload Reelms</button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
