import React from 'react'
import reelmsLogo from './assets/icons/reelms-logo.svg'
import { DesktopDownloadButton } from './features/desktop-download/index.js'
import './marketing.css'

const featureCards = [
  {
    title: 'Canlı odalar',
    body: 'Reelm, kanal, mesaj, arkadaş ve ses odası deneyimi önce web üzerinde hızlı test edilecek; aynı temel daha sonra desktop’a taşınacak.'
  },
  {
    title: 'Sosyal merkez',
    body: 'Feed, forum, makale, bildirim, profil ve arkadaş akışları tek topluluk deneyimi içinde birleşir.'
  },
  {
    title: 'Tek backend yolu',
    body: 'Web ve desktop aynı API ve realtime altyapıya bağlanır. Client tarafına secret koymadan güvenli büyüme hedeflenir.'
  }
]

function scrollToSection(id) {
  const section = document.getElementById(id)
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function MarketingLanding() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav">
        <a className="marketing-brand" href="#/" aria-label="Reelms web beta">
          <img src={reelmsLogo} alt="" />
          <span>Reelms</span>
        </a>

        <div className="marketing-links">
          <button type="button" onClick={() => scrollToSection('features')}>Neler var?</button>
          <a href="#/download">Desktop</a>
          <a className="marketing-nav-cta" href="#/signin">Web beta</a>
        </div>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">Web beta açık · Desktop hazırlanıyor</p>
          <h1>Arkadaşların, odaların ve toplulukların tek sakin alanı.</h1>
          <p className="marketing-lead">
            Reelms; mesaj, sesli oda, arkadaşlık, profil ve topluluk akışlarını sade bir arayüzde toplar. Web beta ile dene, desktop hazır olduğunda aynı hesapla devam et.
          </p>
          <div className="marketing-actions">
            <a className="marketing-primary" href="#/signin">Web betaya gir</a>
            <DesktopDownloadButton variant="secondary">Desktop durumunu gör</DesktopDownloadButton>
          </div>
        </div>

        <div className="marketing-preview" aria-label="Reelms uygulama önizlemesi">
          <div className="preview-topbar">
            <span></span><span></span><span></span>
            <strong>Reelms web beta</strong>
          </div>

          <div className="preview-grid">
            <aside className="preview-sidebar">
              <b>Reelms</b>
              <i className="is-active">Feed</i>
              <i>Forums</i>
              <i>Articles</i>
              <i>Friends</i>
            </aside>

            <section className="preview-feed">
              <article className="preview-composer">
                <span className="preview-avatar"></span>
                <div>
                  <b>Bir şey paylaş</b>
                  <p>Topluluğa bir not bırak...</p>
                </div>
              </article>

              <article className="preview-post preview-post--main">
                <div className="preview-post-head">
                  <span className="preview-avatar small"></span>
                  <div>
                    <b>Cem</b>
                    <p>Live Action kanalında buluşuyoruz.</p>
                  </div>
                </div>
                <div className="preview-post-body"></div>
                <div className="preview-post-actions">
                  <span>128 beğeni</span>
                  <span>32 yorum</span>
                </div>
              </article>

              <div className="preview-mini-row">
                <div></div>
                <div></div>
              </div>
            </section>

            <aside className="preview-voice">
              <b>Voice</b>
              <i className="is-live">General • 8</i>
              <i>Live Action • 3</i>
              <i>Spatial • 2</i>
              <div className="preview-members">
                <span></span><span></span><span></span><span></span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="features" className="marketing-cards">
        {featureCards.map((card) => (
          <article key={card.title}>
            <strong>{card.title}</strong>
            <span>{card.body}</span>
          </article>
        ))}
      </section>
    </main>
  )
}
