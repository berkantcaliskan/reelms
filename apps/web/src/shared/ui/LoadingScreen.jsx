import reelmsLogo from '../../assets/icons/reelms-logo.svg'

export function LoadingScreen() {
  return (
    <div className="app-intro-splash" aria-hidden="true">
      <div className="app-intro-splash-inner">
        <div className="app-intro-logo-glow" />
        <img src={reelmsLogo} alt="Reelms" className="app-intro-logo-img" />
      </div>
    </div>
  )
}
