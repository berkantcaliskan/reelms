import { DesktopDownloadButton } from './DesktopDownloadButton.jsx'
import { getDesktopDownloadInfo } from '../services/downloadConfig.js'
import './desktopDownload.css'

export function DesktopDownloadSettingsPanel() {
  const info = getDesktopDownloadInfo()

  return (
    <div className="desktop-download-settings-panel">
      <section className="desktop-download-settings-panel__hero">
        <div>
          <p className="desktop-download-settings-panel__eyebrow">{info.channel} desktop</p>
          <h2>Reelms Desktop</h2>
          <p>
            Desktop uygulama henüz web beta akışının yanında hazırlanıyor. Yayınlandığında bu bölümden
            Windows kurulumunu indirebilir ve aynı hesabınla devam edebilirsin.
          </p>
        </div>

        {info.hasPublicUrl ? (
          <DesktopDownloadButton>Windows uygulamasını indir</DesktopDownloadButton>
        ) : (
          <span className="desktop-download-settings-panel__status">Desktop sürüm hazırlanıyor</span>
        )}
      </section>
    </div>
  )
}
