import { DesktopDownloadButton } from './DesktopDownloadButton.jsx'
import { getDesktopDownloadInfo } from '../services/downloadConfig.js'
import './desktopDownload.css'

export function DesktopDownloadCard({ compact = false, surface = 'glass', showAction = true }) {
  const info = getDesktopDownloadInfo()

  return (
    <aside className={`desktop-download-card desktop-download-card--${surface}${compact ? ' desktop-download-card--compact' : ''}`}>
      <div className="desktop-download-card__icon" aria-hidden="true">
        <span>R</span>
      </div>

      <div className="desktop-download-card__body">
        <div className="desktop-download-card__meta">
          <span>{info.channel}</span>
          <span>{info.platform}</span>
        </div>
        <h3>Reelms Desktop</h3>
        <p>{info.note}</p>
        {showAction && <DesktopDownloadButton size={compact ? 'sm' : 'md'}>Windows uygulamasını indir</DesktopDownloadButton>}
      </div>
    </aside>
  )
}
