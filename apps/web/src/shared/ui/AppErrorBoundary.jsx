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
      return (
        <div className="reelms-fatal-shell">
          <div className="reelms-fatal-card">
            <div className="reelms-fatal-mark">R</div>
            <h1>Reelms could not render this screen.</h1>
            <p>Refresh the page. If this keeps happening, check the browser console and API health.</p>
            <button type="button" onClick={() => window.location.reload()}>Reload Reelms</button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
