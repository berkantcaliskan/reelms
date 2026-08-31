import React from 'react'
import { useT } from '../../../i18n'

export function MediaGalleryPanel({
  showMediaGallery,
  messages = {},
  mediaGalleryTab = 'all',
  setMediaGalleryTab,
  onClose,
  onOpenLightbox,
  formatMessageTime = (tm) => {
    if (!tm) return ''
    try {
      const d = tm instanceof Date ? tm : new Date(tm)
      return isNaN(d.getTime()) ? String(tm) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return String(tm)
    }
  },
}) {
  const t = useT()
  if (!showMediaGallery) return null

  const key = showMediaGallery.key
  const msgs = (messages && key && Array.isArray(messages[key]))
    ? messages[key]
    : (Array.isArray(messages) ? messages : [])

  const extracted = []

  for (const m of msgs) {
    if (!m || typeof m !== 'object') continue

    // Attachments
    const rawAttachments = Array.isArray(m.attachments)
      ? m.attachments
      : (m.attachment ? [m.attachment] : [])

    for (const att of rawAttachments) {
      if (!att) continue
      const url = typeof att === 'string'
        ? att
        : (typeof att === 'object' ? (att.url || att.src || att.link || '') : '')

      if (!url || typeof url !== 'string') continue

      const type = (typeof att === 'object' && att.type)
        ? att.type
        : (/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url)
            ? 'image'
            : /\.(mp4|webm|mov)(\?.*)?$/i.test(url)
              ? 'video'
              : /\.(mp3|ogg|wav|m4a)(\?.*)?$/i.test(url)
                ? 'audio'
                : 'file')

      const name = (typeof att === 'object' && att.name)
        ? att.name
        : (type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'Attachment')

      extracted.push({
        id: m.id ? `${m.id}_${url}` : Math.random().toString(36),
        type,
        url,
        name,
        time: m.time || m.createdAt || null,
        text: typeof m.text === 'string' ? m.text : ''
      })
    }

    // Voice Notes
    if (m.voiceNote && typeof m.voiceNote === 'object' && m.voiceNote.url) {
      extracted.push({
        id: m.id ? `${m.id}_voice` : Math.random().toString(36),
        type: 'audio',
        url: m.voiceNote.url,
        name: 'Voice Note',
        duration: m.voiceNote.duration,
        time: m.time || m.createdAt || null
      })
    }

    // URLs in text
    if (typeof m.text === 'string' && m.text.includes('http')) {
      const urlMatches = m.text.match(/https?:\/\/[^\s]+/g)
      if (urlMatches) {
        for (const u of urlMatches) {
          if (!u || typeof u !== 'string') continue
          if (/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(u)) {
            extracted.push({ id: `${m.id || ''}_${u}`, type: 'image', url: u, name: 'Image', time: m.time })
          } else if (/\.(mp4|webm)(\?.*)?$/i.test(u)) {
            extracted.push({ id: `${m.id || ''}_${u}`, type: 'video', url: u, name: 'Video', time: m.time })
          } else {
            extracted.push({ id: `${m.id || ''}_${u}`, type: 'link', url: u, name: u, time: m.time })
          }
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
    { id: 'all', label: (typeof t === 'function' ? t('all_filter') : 'All') || 'All', count: counts.all },
    { id: 'media', label: (typeof t === 'function' ? t('photos_and_videos') : 'Media') || 'Media', count: counts.media },
    { id: 'audio', label: (typeof t === 'function' ? t('audio') : 'Audio') || 'Audio', count: counts.audio },
    { id: 'links', label: (typeof t === 'function' ? t('links') : 'Links') || 'Links', count: counts.links },
    { id: 'docs', label: (typeof t === 'function' ? t('documents') : 'Files') || 'Files', count: counts.docs }
  ]

  const filtered = extracted.filter(item => {
    if (mediaGalleryTab === 'all') return true
    if (mediaGalleryTab === 'media') return item.type === 'image' || item.type === 'video'
    if (mediaGalleryTab === 'audio') return item.type === 'audio'
    if (mediaGalleryTab === 'links') return item.type === 'link'
    if (mediaGalleryTab === 'docs') return item.type === 'file' || item.type === 'doc'
    return true
  })

  const isGrid = mediaGalleryTab === 'media' || (mediaGalleryTab === 'all' && filtered.length > 0 && filtered.every(i => i.type === 'image' || i.type === 'video'))

  return (
    <div className="media-gallery-panel">
      <div className="media-gallery-header">
        <button className="media-gallery-back-btn" onClick={onClose} title={(typeof t === 'function' ? t('back') : 'Back') || 'Back'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="media-gallery-title-wrap">
          <span className="media-gallery-title">{showMediaGallery.name || 'Media'}</span>
          <span className="media-gallery-sub">{(typeof t === 'function' ? t('media') : 'Media') || 'Media'}</span>
        </div>
      </div>

      <div className="media-gallery-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`media-gallery-tab${mediaGalleryTab === tab.id ? ' media-gallery-tab--active' : ''}`}
            onClick={() => setMediaGalleryTab?.(tab.id)}
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
            <span className="media-gallery-empty-title">{(typeof t === 'function' ? t('no_media_found') : 'No media yet') || 'No media yet'}</span>
            <span className="media-gallery-empty-desc">{(typeof t === 'function' ? t('no_media_desc') : 'Photos, videos, links and files shared in this chat will appear here.') || 'Photos, videos, links and files shared in this chat will appear here.'}</span>
          </div>
        ) : (
          <div className={isGrid ? 'media-gallery-grid' : 'media-gallery-list'}>
            {filtered.map((item, idx) => {
              const itemKey = `${item.id || 'item'}_${idx}`
              if (item.type === 'image' || item.type === 'video') {
                return (
                  <div key={itemKey} className="media-gallery-item" onClick={() => onOpenLightbox?.(item.url)}>
                    {item.type === 'video'
                      ? <video src={item.url} preload="metadata" />
                      : <img src={item.url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = '0.3' }} />
                    }
                    <div className="media-gallery-item-overlay">
                      {item.type === 'video' && <span className="media-gallery-item-play">▶</span>}
                      {item.time && <span className="media-gallery-item-time">{formatMessageTime(item.time)}</span>}
                    </div>
                  </div>
                )
              }
              if (item.type === 'audio') {
                return (
                  <div key={itemKey} className="media-gallery-item-audio">
                    <div className="media-gallery-audio-icon">🎵</div>
                    <div className="media-gallery-audio-body">
                      <span className="media-gallery-audio-name">{item.name || 'Voice / Audio Note'}</span>
                      <audio controls src={item.url} className="media-gallery-audio-player" preload="none" />
                    </div>
                    {item.time && <span className="media-gallery-meta-time">{formatMessageTime(item.time)}</span>}
                  </div>
                )
              }
              if (item.type === 'link') {
                let hostname = ''
                try { hostname = new URL(item.url).hostname } catch {}
                return (
                  <a key={itemKey} href={item.url} target="_blank" rel="noreferrer" className="media-gallery-item-link">
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
                <a key={itemKey} href={item.url} download target="_blank" rel="noreferrer" className="media-gallery-item-doc">
                  <div className="media-gallery-doc-icon">📄</div>
                  <div className="media-gallery-doc-info">
                    <span className="media-gallery-doc-name">{item.name || 'Document'}</span>
                    <span className="media-gallery-doc-sub">{(typeof t === 'function' ? t('platform_download') : 'Download') || 'Download'}</span>
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
