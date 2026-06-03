import reelmsLogo from '../../../assets/icons/reelms-logo.svg'
import { DesktopDownloadButton } from '../../desktop-download/index.js'

const floatingCells = [
  'auth-cell-1',
  'auth-cell-2',
  'auth-cell-3',
  'auth-cell-4',
  'auth-cell-5',
  'auth-cell-6',
  'auth-cell-7',
  'auth-cell-8'
]

export function AuthShell({ title, subtitle, children, mode = 'signin' }) {
  const isSignUp = mode === 'signup'

  return (
    <main className="reelms-auth-page" data-auth-mode={mode}>
      <div className="reelms-auth-background" aria-hidden="true">
        <div className="reelms-auth-grid" />
        <div className="reelms-auth-aurora reelms-auth-aurora--one" />
        <div className="reelms-auth-aurora reelms-auth-aurora--two" />
        <div className="reelms-auth-aurora reelms-auth-aurora--three" />
        <div className="reelms-auth-cells">
          {floatingCells.map((cell) => <span key={cell} className={cell} />)}
        </div>
      </div>

      <nav className="reelms-auth-topbar" aria-label="Authentication navigation">
        <a className="reelms-auth-brand" href="#/landing" aria-label="Go to Reelms home">
          <img src={reelmsLogo} alt="" />
          <span>Reelms</span>
        </a>

        <div className="reelms-auth-topbar-actions">
          <a href="#/landing">Ana sayfa</a>
          <a href="#/download">Desktop</a>
          <a className="reelms-auth-open-beta" href="#/">Open web beta</a>
        </div>
      </nav>

      <section className="reelms-auth-stage" aria-label={title}>
        <div className="reelms-auth-copy su-drop su-drop-1">
          <p className="reelms-auth-eyebrow">{isSignUp ? 'Create account' : 'Secure sign in'}</p>
          <h1>{isSignUp ? 'Create your place inside Reelms.' : 'Welcome to Reelm.'}</h1>
          <p>
            {isSignUp
              ? 'Reserve your identity for the web beta, communities, channels and desktop app later.'
              : 'Enter your private realtime space with rooms, friends, feed and voice-ready communities.'}
          </p>
        </div>

        <div className="reelms-auth-card-shell su-drop su-drop-2">
          <div className="reelms-auth-card-border">
            <section className="reelms-auth-card">
              <div className="reelms-auth-card-logo" aria-hidden="true">
                <img src={reelmsLogo} alt="" />
              </div>

              <div className="reelms-auth-card-head">
                <h2>{title}</h2>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>

              {children}
            </section>
          </div>
        </div>

        <div className="reelms-auth-footer-card su-drop su-drop-3">
          <div>
            <strong>Prefer desktop later?</strong>
            <span>Install the Windows app when beta releases are ready.</span>
          </div>
          <DesktopDownloadButton variant="secondary" size="sm">Desktop setup</DesktopDownloadButton>
        </div>
      </section>
    </main>
  )
}
