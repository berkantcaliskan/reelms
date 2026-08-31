import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useT } from '../../../../i18n'
import newIcon from '../../../../assets/icons/new-icon.svg'
import avatarUIcon from '../../../../assets/icons/avataru-icon.svg'
import {
  InstagramIcon,
  XIcon,
  TikTokIcon,
  LinkedInIcon,
  WhatsAppIcon,
  DiscordSocialIcon,
  SnapchatIcon,
  CustomLinkIcon,
  SpotifyIcon,
} from '../icons/AppIcons'
import { normalizeMediaUrl, getPersonPhoto, uploadProfileImageFile } from '../../utils/mediaUtils'
import { buildProfileThemeStyle } from '../../utils/profileUtils'
import { CachedProfileImage, CachedProfileCover } from './CachedProfileMedia'
import { ActivityBadge, ActivitySetterModal } from './ActivityModal'
import { ProfileMediaCropModal } from './ProfileMediaCropModal'

export function ProfilePopup({
  user = {},
  width,
  onClose,
  onPhotoChange,
  cover,
  onCoverChange,
  status,
  onStatusChange,
  bio,
  onBioChange,
  socialLinks = {},
  onSocialLinksChange,
  activePlatforms = [],
  onActivePlatformsChange,
  iconFilter,
  uid,
  spotifyConnected,
  spotifyNowPlaying,
  onSpotifyConnect,
  onSpotifyDisconnect,
  activity,
  onActivityChange,
  onViewFullProfile,
  initialEditOpen = false
}) {
  const t = useT()
  const popupRef = useRef(null)
  const ppPhotoInputRef = useRef(null)
  const ppCoverInputRef = useRef(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [editingBio, setEditingBio] = useState(initialEditOpen)
  const [bioInput, setBioInput] = useState('')
  const [editingSocial, setEditingSocial] = useState(null)
  const [socialInput, setSocialInput] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addBtnRef = useRef(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const dragSocialKeyRef = useRef(null)
  const [dragOverSocialKey, setDragOverSocialKey] = useState(null)
  const [socialCtxMenu, setSocialCtxMenu] = useState(null)
  const [showActivitySetter, setShowActivitySetter] = useState(false)
  const [mediaSaving, setMediaSaving] = useState(null)
  const [cropTarget, setCropTarget] = useState(null)

  const statusOptions = [
    { key: 'online', label: 'Online', color: '#4ade80' },
    { key: 'idle', label: 'Idle', color: '#fbbf24' },
    { key: 'busy', label: 'Busy', color: '#f87171' },
    { key: 'invisible', label: 'Invisible', color: '#9ca3af' },
  ]

  const socialPlatforms = [
    { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: '#E1306C', baseUrl: 'https://www.instagram.com/' },
    { key: 'twitter', label: 'X', Icon: XIcon, color: '#e0c9bc', baseUrl: 'https://x.com/' },
    { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon, color: '#b0b0b0', baseUrl: 'https://www.tiktok.com/@' },
    { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, color: '#0A66C2', baseUrl: 'https://www.linkedin.com/in/' },
    { key: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon, color: '#25D366', baseUrl: 'https://wa.me/' },
    { key: 'discord', label: 'Discord', Icon: DiscordSocialIcon, color: '#5865F2', baseUrl: null },
    { key: 'snapchat', label: 'Snapchat', Icon: SnapchatIcon, color: '#FFFC00', baseUrl: 'https://www.snapchat.com/add/' },
    { key: 'custom', label: 'Custom link', Icon: CustomLinkIcon, color: 'rgba(185,152,135,0.75)', baseUrl: null },
  ]

  const safeUser = user || {}
  const safePlatforms = Array.isArray(activePlatforms) ? activePlatforms : []
  const safeLinks = (socialLinks && typeof socialLinks === 'object') ? socialLinks : {}

  const currentStatus = statusOptions.find(s => s.key === status) || statusOptions[0]

  useEffect(() => {
    const handler = (e) => {
      if (cropTarget) return
      if (e.target.closest('.profile-crop-overlay')) return
      if (e.target.closest('.profile-crop-modal')) return
      if (e.target.closest('.pp-social-ctx-menu')) return
      if (e.target.closest('.pp-social-add-menu')) return
      if (e.target.closest('.profile-card')) return
      if (e.target.closest('.msg-avatar, .msg-name, .bubble-avatar, .bubble-sender-name, .rp-member-card')) return
      setSocialCtxMenu(null)
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, cropTarget])

  const handleCropApply = async (croppedFile) => {
    if (!cropTarget) return
    const kind = cropTarget.kind
    setCropTarget(null)
    try {
      setMediaSaving(kind)
      const url = await uploadProfileImageFile(croppedFile, kind === 'photo' ? 'profile-photo' : 'profile-cover')
      if (kind === 'photo') onPhotoChange?.(url)
      else onCoverChange?.(url)
    } catch (err) {
      console.warn(`Profile ${kind} upload failed:`, err)
    } finally {
      setMediaSaving(null)
    }
  }

  return (
    <>
    <div className={`profile-popup${cover ? ' profile-popup--has-cover' : ''}`} style={{ ...(buildProfileThemeStyle(safeUser) || {}), width }} ref={popupRef}>
      {cover && (
        <div className="profile-popup-ambient">
          <div className="profile-popup-ambient-bg" style={{ backgroundImage: `url(${normalizeMediaUrl(cover)})` }} />
          <div className="profile-popup-ambient-scrim" />
        </div>
      )}
      <CachedProfileCover
        src={cover}
        className={`pp-cover${cover ? ' pp-cover--has-image' : ''}`}
        style={{ backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}
        onClick={() => ppCoverInputRef.current?.click()}
        title="Kapak Fotoğrafını Değiştir"
      >
        <div className="pp-cover-edit-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>Edit cover</span>
        </div>
        <input
          type="file"
          accept="image/*"
          ref={ppPhotoInputRef}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) setCropTarget({ file, kind: 'photo' })
            e.target.value = ''
          }}
        />
        <input
          type="file"
          accept="image/*"
          ref={ppCoverInputRef}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) setCropTarget({ file, kind: 'cover' })
            e.target.value = ''
          }}
        />
      </CachedProfileCover>
      {mediaSaving && <div className="pp-media-saving">Uploading {mediaSaving}…</div>}

      <div className="pp-identity">
        <div
          className="pp-avatar-wrap"
          onClick={() => ppPhotoInputRef.current?.click()}
          title="Profil Fotoğrafını Değiştir"
        >
          <CachedProfileImage
            src={getPersonPhoto(safeUser)}
            alt="Avatar"
            className="pp-avatar"
            fallback={<img src={avatarUIcon} alt="Avatar" className="pp-avatar" />}
          />
          <div className="pp-avatar-edit-overlay">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>
        <div className="pp-names-col">
          <span className="pp-name">{safeUser.name || 'User'}</span>
          <div className="pp-username-row">
            <span className="pp-username">{'@' + (safeUser.username || 'username')}</span>
            <div className="pp-status-wrap">
              <button type="button" className="pp-status-btn" onClick={() => setStatusOpen(v => !v)}>
                <span className="pp-status-dot" style={{ background: currentStatus.color }} />
                <span>Status</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {statusOpen && (
                <div className="pp-status-menu">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      className={'pp-status-option' + (status === opt.key ? ' active' : '')}
                      onClick={() => { onStatusChange?.(opt.key); setStatusOpen(false) }}
                    >
                      <span className="pp-status-dot" style={{ background: opt.color }} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pp-body">
        <div className="pp-bio-section">
          {editingBio ? (
            <div className="pp-bio-edit">
              <textarea
                className="pp-bio-textarea"
                value={bioInput}
                onChange={e => { if (e.target.value.length <= 240) setBioInput(e.target.value) }}
                placeholder="Tell us about yourself..."
                autoFocus
              />
              <div className="pp-bio-controls">
                <span className="pp-bio-count">{bioInput.length + '/240'}</span>
                <button type="button" className="pp-bio-save" onClick={() => { onBioChange?.(bioInput); setEditingBio(false) }}>Save</button>
                <button type="button" className="pp-bio-cancel" onClick={() => { setBioInput(bio); setEditingBio(false) }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p
              className={'pp-bio-text' + (!bio ? ' pp-bio-empty' : '')}
              onClick={() => { setBioInput(bio); setEditingBio(true) }}
            >
              {bio || 'Add a bio...'}
            </p>
          )}
        </div>

        <div className="pp-activity-row">
          {activity?.name
            ? <ActivityBadge activity={activity} />
            : <span className="pp-activity-empty">No activity set</span>}
          <button type="button" className="pp-activity-btn" onClick={() => setShowActivitySetter(true)}>
            {activity?.name ? 'Change' : 'Set Activity'}
          </button>
          {activity?.name && <button type="button" className="pp-activity-clear-btn" onClick={() => onActivityChange?.(null)}>✕</button>}
        </div>
        {showActivitySetter && (
          <ActivitySetterModal
            current={activity}
            onSet={onActivityChange}
            onClose={() => setShowActivitySetter(false)}
          />
        )}

        <div className="pp-socials-section">
          <span className="pp-socials-label">SOCIALS</span>
          <div className="pp-socials-row">
            {safePlatforms.map(key => {
              const platform = socialPlatforms.find(p => p.key === key)
              if (!platform) return null
              const { label, Icon, color, baseUrl } = platform
              return (
                <button
                  key={key}
                  type="button"
                  className={'pp-social-chip' + (safeLinks[key] ? ' pp-social-chip-set' : '') + (dragOverSocialKey === key ? ' pp-social-chip-drag-over' : '')}
                  draggable
                  onDragStart={() => { dragSocialKeyRef.current = key }}
                  onDragOver={e => { e.preventDefault(); setDragOverSocialKey(key) }}
                  onDragLeave={() => setDragOverSocialKey(null)}
                  onDrop={e => {
                    e.preventDefault()
                    const from = dragSocialKeyRef.current
                    setDragOverSocialKey(null)
                    dragSocialKeyRef.current = null
                    if (!from || from === key) return
                    const next = [...safePlatforms]
                    const fromIdx = next.indexOf(from)
                    const toIdx = next.indexOf(key)
                    if (fromIdx < 0 || toIdx < 0) return
                    next.splice(fromIdx, 1)
                    next.splice(toIdx, 0, from)
                    onActivePlatformsChange?.(next)
                  }}
                  onDragEnd={() => { setDragOverSocialKey(null); dragSocialKeyRef.current = null }}
                  onContextMenu={e => { e.preventDefault(); setSocialCtxMenu({ key, x: e.clientX, y: e.clientY }) }}
                  onClick={() => {
                    if (safeLinks[key] && (baseUrl || key === 'custom')) {
                      window.open(key === 'custom' ? safeLinks[key] : baseUrl + safeLinks[key], '_blank')
                    } else {
                      setEditingSocial(key)
                      setSocialInput(safeLinks[key] || '')
                      setShowAddMenu(false)
                    }
                  }}
                >
                  <span style={{ color, display: 'flex', alignItems: 'center' }}><Icon /></span>
                  <span>{safeLinks[key] ? (key === 'custom' ? safeLinks[key].replace(/^https?:\/\//, '') : '@' + safeLinks[key]) : label}</span>
                </button>
              )
            })}
            <div className="pp-social-add-wrap">
              <button
                type="button"
                ref={addBtnRef}
                className="pp-social-add-btn"
                onClick={() => {
                  if (!showAddMenu && addBtnRef.current) {
                    const rect = addBtnRef.current.getBoundingClientRect()
                    setMenuPos({ top: rect.bottom + 6, left: rect.left })
                  }
                  setShowAddMenu(v => !v)
                  setEditingSocial(null)
                }}
              ><img src={newIcon} alt="Add" width="14" height="14" style={{ filter: iconFilter, display: 'block' }} /></button>
              {showAddMenu && ReactDOM.createPortal(
                <div className="pp-social-add-menu" style={{ top: menuPos.top, left: menuPos.left }}>
                  {socialPlatforms.filter(p => p.key !== 'custom' && !safePlatforms.includes(p.key)).map(({ key, label, Icon: PlatformIcon, color }) => (
                    <button
                      key={key}
                      type="button"
                      className="pp-social-add-option"
                      onClick={() => { onActivePlatformsChange?.([...safePlatforms, key]); setShowAddMenu(false) }}
                    >
                      <span style={{ color, display: 'flex', alignItems: 'center' }}><PlatformIcon /></span>
                      <span>{label}</span>
                    </button>
                  ))}
                  <div className="pp-social-add-separator" />
                  <button
                    type="button"
                    className="pp-social-add-option"
                    onClick={() => {
                      if (!safePlatforms.includes('custom')) onActivePlatformsChange?.([...safePlatforms, 'custom'])
                      setEditingSocial('custom')
                      setShowAddMenu(false)
                    }}
                  >
                    <span style={{ color: 'rgba(185,152,135,0.75)', display: 'flex', alignItems: 'center' }}><CustomLinkIcon /></span>
                    <span>Add yours</span>
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>
          {socialCtxMenu && ReactDOM.createPortal(
            <div className="pp-social-ctx-menu" style={{ top: socialCtxMenu.y, left: socialCtxMenu.x }}>
              <button type="button" className="pp-social-ctx-item" onClick={() => {
                setEditingSocial(socialCtxMenu.key)
                setSocialInput(safeLinks[socialCtxMenu.key] || '')
                setShowAddMenu(false)
                setSocialCtxMenu(null)
              }}>Edit</button>
              <button type="button" className="pp-social-ctx-item pp-social-ctx-danger" onClick={() => {
                onActivePlatformsChange?.(safePlatforms.filter(k => k !== socialCtxMenu.key))
                const nextLinks = { ...safeLinks }
                delete nextLinks[socialCtxMenu.key]
                onSocialLinksChange?.(nextLinks)
                setSocialCtxMenu(null)
              }}>Delete link</button>
            </div>,
            document.body
          )}
          {editingSocial && (() => {
            const platform = socialPlatforms.find(p => p.key === editingSocial)
            return (
              <div className="pp-social-edit">
                {platform?.baseUrl && <span className="pp-social-edit-prefix">{platform.baseUrl}</span>}
                <input
                  className="pp-social-edit-input"
                  value={socialInput}
                  onChange={e => setSocialInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onSocialLinksChange?.({ ...safeLinks, [editingSocial]: socialInput.trim() })
                      setEditingSocial(null)
                    }
                    if (e.key === 'Escape') setEditingSocial(null)
                  }}
                  placeholder={editingSocial === 'custom' ? 'https://...' : 'username'}
                  autoFocus
                />
                <button type="button" className="pp-social-edit-save" onClick={() => {
                  if (socialInput.trim()) onSocialLinksChange?.({ ...safeLinks, [editingSocial]: socialInput.trim() })
                  setEditingSocial(null)
                }}>Save</button>
              </div>
            )
          })()}
        </div>

        <div className="pp-spotify-section">
          {spotifyConnected && spotifyNowPlaying ? (
            <>
              <div className="pp-spotify-pill-label">Playing now</div>
              <div className="pp-spotify-playing pp-spotify-pill">
                {spotifyNowPlaying.albumArt && (
                  <img src={spotifyNowPlaying.albumArt} alt="album" className="pp-spotify-art" />
                )}
                <div className="pp-spotify-track">
                  <a className="pp-spotify-track-name" href={spotifyNowPlaying.url} target="_blank" rel="noreferrer">
                    {spotifyNowPlaying.name}
                  </a>
                  <span className="pp-spotify-track-artist">{spotifyNowPlaying.artist}</span>
                </div>
                <span className="pp-spotify-pill-icon pp-spotify-icon-active">
                  <SpotifyIcon size={16} />
                </span>
              </div>
            </>
          ) : (
            <div className="pp-spotify-row">
              <span className="pp-spotify-icon"><SpotifyIcon size={18} /></span>
              <span className="pp-spotify-label">
                {spotifyConnected ? 'Nothing playing right now' : 'Connect your Spotify account'}
              </span>
              {spotifyConnected
                ? <button type="button" className="pp-spotify-btn pp-spotify-btn-disconnect" onClick={onSpotifyDisconnect}>Disconnect</button>
                : <button type="button" className="pp-spotify-btn" onClick={onSpotifyConnect}>Connect</button>
              }
            </div>
          )}
        </div>

        {onViewFullProfile && (
          <button
            type="button"
            className="profile-view-full-btn"
            onClick={e => { e.stopPropagation(); onClose?.(); onViewFullProfile() }}
          >
            <span>{t('see_full_profile')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
    {cropTarget && (
      <ProfileMediaCropModal
        file={cropTarget.file}
        kind={cropTarget.kind}
        onApply={handleCropApply}
        onCancel={() => setCropTarget(null)}
        onChangeFile={newFile => setCropTarget(prev => ({ ...prev, file: newFile }))}
      />
    )}
    </>
  )
}

export default ProfilePopup
