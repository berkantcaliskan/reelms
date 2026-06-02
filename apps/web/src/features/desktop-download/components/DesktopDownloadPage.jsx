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
        <a className="desktop-download-page__brand" href="#/landing" aria-label="Reelms landing sayfasına dön">
          <img src={reelmsLogo} alt="" />
          <span>Reelms</span>
        </a>
        <div className="desktop-download-page__nav-actions">
          <a href="#/signin">Web beta</a>
          <a href="#/landing">Landing</a>
        </div>
      </nav>

      <section className="desktop-download-page__hero">
        <div>
          <p className="desktop-download-page__eyebrow">{info.channel} desktop</p>
          <h1>Reelms Windows uygulaması.</h1>
          <p className="desktop-download-page__lead">
            Reelms şu an web beta olarak geliştiriliyor. Desktop sürüm; native açılış, update ekranı,
            bildirimler ve ileride ses/ekran paylaşımı için hazırlanıyor.
          </p>

          <div className="desktop-download-page__actions">
            {info.hasPublicUrl ? (
              <DesktopDownloadButton>Windows setup indir</DesktopDownloadButton>
            ) : (
              <span className="desktop-download-page__status-pill">Desktop sürüm hazırlanıyor</span>
            )}
            <a className="desktop-download-page__primary-link" href="#/signin">Web betayı aç</a>
            <a className="desktop-download-page__secondary" href="#/landing">Landing’e dön</a>
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
