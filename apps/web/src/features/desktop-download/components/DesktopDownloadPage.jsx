import reelmsLogo from '../../../assets/icons/reelms-logo.svg'
import { DesktopDownloadButton } from './DesktopDownloadButton.jsx'
import { DesktopDownloadCard } from './DesktopDownloadCard.jsx'
import { getDesktopDownloadInfo } from '../services/downloadConfig.js'
import './desktopDownload.css'

const installSteps = [
  'Windows setup dosyası yayınlandığında bu sayfadan indir.',
  'Kurulum sihirbazını tamamla.',
  'Reelms’i aç ve web beta hesabınla devam et.'
]

const roadmapItems = [
  'Açılışta güncelleme kontrol ekranı',
  'Native desktop bildirimleri',
  'Desktop voice ve screen-share iyileştirmeleri',
  'İmzalı installer ve CloudFront dağıtımı'
]

export function DesktopDownloadPage() {
  const info = getDesktopDownloadInfo()

  return (
    <main className="desktop-download-page">
      <nav className="desktop-download-page__nav">
        <a className="desktop-download-page__brand" href="#/landing" aria-label="Reelms ana sayfasına dön">
          <img src={reelmsLogo} alt="" />
          <span>Reelms</span>
        </a>
        <div className="desktop-download-page__nav-actions">
          <a href="#/signin">Web beta</a>
          <a href="#/landing">Ana sayfa</a>
        </div>
      </nav>

      <section className="desktop-download-page__hero">
        <div>
          <p className="desktop-download-page__eyebrow">Desktop hazırlık alanı · {info.channel}</p>
          <h1>Reelms desktop deneyimi hazırlanıyor.</h1>
          <p className="desktop-download-page__lead">
            Reelms şu an web beta üzerinden test ediliyor. Windows uygulaması; daha net açılış, native bildirimler, güncelleme akışı ve daha güçlü medya deneyimi için hazırlanıyor.
          </p>

          <div className="desktop-download-page__actions">
            {info.hasPublicUrl ? (
              <DesktopDownloadButton>Windows setup indir</DesktopDownloadButton>
            ) : (
              <span className="desktop-download-page__status-pill">Desktop paketi hazırlanıyor</span>
            )}
            <a className="desktop-download-page__primary-link" href="#/signin">Web betaya devam et</a>
            <a className="desktop-download-page__secondary" href="#/landing">Ana sayfaya dön</a>
          </div>
        </div>

        <DesktopDownloadCard showAction={info.hasPublicUrl} />
      </section>

      <section className="desktop-download-page__grid">
        <article>
          <h2>Kurulum akışı</h2>
          <ol>
            {installSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article>
          <h2>Desktop yol haritası</h2>
          <ul>
            {roadmapItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>
    </main>
  )
}
