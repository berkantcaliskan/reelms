import React from 'react'
import { useT } from '../../../i18n'

export function MediaGalleryPanel({
  showMediaGallery,
  messages = {},
  mediaGalleryTab = 'all',
  setMediaGalleryTab,
  onClose,
  onOpenLightbox,
  formatMessageTime = (t) => t,
}) {
  const t = useT()
  if (!showMediaGallery) return null

  const msgs = messages[showMediaGallery.key] || []
  const extracted = []
  for (const m of msgs) {
    if (!m) continue
    if (m.attachment?.url) {
      const att = m.attachment
      const type = att.type || (att.url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i) ? 'image' : att.url.match(/\.(mp4|webm|mov)/i) ? 'video' : att.url.match(/\.(mp3|ogg|wav|m4a)/i) ? 'audio' : 'file')
      extracted.push({ id: m.id, type, url: att.url, name: att.name || 'Attachment', time: m.time, text: m.text })
    }
    if (m.voiceNote?.url) {
      extracted.push({ id: m.id, type: 'audio', url: m.voiceNote.url, name: 'Voice Note', duration: m.voiceNote.duration, time: m.time })
    }
    const urlMatches = String(m.text || '').match(/https?:\/\/[^\s]+/g)
    if (urlMatches) {
      for (const u of urlMatches) {
        if (u.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
          extracted.push({ id: m.id, type: 'image', url: u, name: 'Image', time: m.time })
        } else if (u.match(/\.(mp4|webm)(\?.*)?$/i)) {
          extracted.push({ id: m.id, type: 'video', url: u, name: 'Video', time: m.time })
        } else {
          extracted.push({ id: m.id, type: 'link', url: u, name: u, time: m.time })
        }
      }
    }
  }

  const counts = {
    all: extracted.length,
    media: extracted.filter(i => i.type === 'image' || i.type === 'video').length,
    audio: extracted.filter(i => i.type === 'audio').length,
    links: extracted.filter(i => i.type === 'link').length,
    docs: extracted.filter(i => i.type === 'file' || i.type === 'doc').length,
  }

  const tabs = [
    { id: 'all', label: t('all_filter'), count: counts.all },
    { id: 'media', label: t('photos_and_videos'), count: counts.media },
    { id: 'audio', label: t('audio'), count: counts.audio },
    { id: 'links', label: t('links'), count: counts.links },
    { id: 'docs', label: t('documents'), count: counts.docs }
  ]

  const filtered = extracted.filter(item => {
    if (mediaGalleryTab === 'all') return true
    if (mediaGalleryTab === 'media') return item.type === 'image' || item.type === 'video'
    if (mediaGalleryTab === 'audio') return item.type === 'audio'
    if (mediaGalleryTab === 'links') return item.type === 'link'
    if (mediaGalleryTab === 'docs') return item.type === 'file' || item.type === 'doc'
    return true
  })

  return (
    <div className="media-gallery-panel">
      <div className="media-gallery-header">
        <button className="media-gallery-back-btn" onClick={onClose} title={t('back') || 'Back to chat'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="media-gallery-title-wrap">
          <span className="media-gallery-title">{showMediaGallery.name}</span>
          <span className="media-gallery-sub">{t('media_and_files')}</span>
        </div>
      </div>

      <div className="media-gallery-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`media-gallery-tab${mediaGalleryTab === tab.id ? ' media-gallery-tab--active' : ''}`}
            onClick={() => setMediaGalleryTab(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="media-gallery-tab-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="media-gallery-content">
        {filtered.length === 0 ? (
          <div className="media-gallery-empty">
            <div className="media-gallery-empty-icon">🖼️</div>
            <span className="media-gallery-empty-title">{t('no_media_found')}</span>
            <span className="media-gallery-empty-desc">{t('no_media_desc')}</span>
          </div>
        ) : (
          <div className={mediaGalleryTab === 'media' || mediaGalleryTab === 'all' && filtered.every(i => i.type === 'image' || i.type === 'video') ? 'media-gallery-grid' : 'media-gallery-list'}>
            {filtered.map((item, idx) => {
              if (item.type === 'image' || item.type === 'video') {
                return (
                  <div key={item.id + '_' + idx} className="media-gallery-item" onClick={() => onOpenLightbox?.(item.url)}>
                    {item.type === 'video' ? <video src={item.url} preload="metadata" /> : <img src={item.url} alt="" loading="lazy" />}
                    <div className="media-gallery-item-overlay">
                      {item.type === 'video' && <span className="media-gallery-item-play">▶</span>}
                      {item.time && <span className="media-gallery-item-time">{formatMessageTime(item.time)}</span>}
                    </div>
                  </div>
                )
              }
              if (item.type === 'audio') {
                return (
                  <div key={item.id + '_' + idx} className="media-gallery-item-audio">
                    <div className="media-gallery-audio-icon">🎵</div>
                    <div className="media-gallery-audio-body">
                      <span className="media-gallery-audio-name">{item.name || 'Voice / Audio Note'}</span>
                      <audio controls src={item.url} className="media-gallery-audio-player" />
                    </div>
                    {item.time && <span className="media-gallery-meta-time">{formatMessageTime(item.time)}</span>}
                  </div>
                )
              }
              if (item.type === 'link') {
                let hostname = ''
                try { hostname = new URL(item.url).hostname } catch {}
                return (
                  <a key={item.id + '_' + idx} href={item.url} target="_blank" rel="noreferrer" className="media-gallery-item-link">
                    <div className="media-gallery-link-icon">🔗</div>
                    <div className="media-gallery-link-info">
                      <span className="media-gallery-link-url">{item.url}</span>
                      {hostname && <span className="media-gallery-link-host">{hostname}</span>}
                    </div>
                    <svg className="media-gallery-ext-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                )
              }
              return (
                <a key={item.id + '_' + idx} href={item.url} download target="_blank" rel="noreferrer" className="media-gallery-item-doc">
                  <div className="media-gallery-doc-icon">📄</div>
                  <div className="media-gallery-doc-info">
                    <span className="media-gallery-doc-name">{item.name || 'Document'}</span>
                    <span className="media-gallery-doc-sub">{t('platform_download') || 'Download'}</span>
                  </div>
                  <svg className="media-gallery-dl-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MediaGalleryPanel
