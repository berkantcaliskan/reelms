import React, { useState, useEffect, useRef } from 'react'
import { useT } from '../../../../i18n'
import avatarUIcon from '../../../../assets/icons/avataru-icon.svg'
import {
  PencilIcon,
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
import { normalizeMediaUrl, getPersonPhoto, getPersonCover, uploadProfileImageFile } from '../../utils/mediaUtils'
import { normalizeFriendProfileTarget, STATUS_OPTIONS_LIST } from '../../utils/profileUtils'
import { CachedProfileImage, CachedProfileCover } from './CachedProfileMedia'
import { ActivityBadge } from './ActivityModal'
import { ProfileMediaCropModal } from './ProfileMediaCropModal'

export function FullProfilePage({
  user,
  isSelf,
  reelms = [],
  friends = [],
  onClose,
  onMessage,
  onAddFriend,
  onRemove,
  onBlock,
  onUnblock,
  isFriend,
  isBlocked,
  isPending,
  onOpenFriend,
  spotifyNowPlaying,
  spotifyConnected,
  onPhotoChange,
  onCoverChange,
  onBioChange,
  onNameChange,
  onSocialLinksChange,
  profileBio,
  socialLinks,
  activePlatforms,
  lastSeenLabel,
  profileStatus = 'online',
  onStatusChange = null
}) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState('')
  const [editingSocial, setEditingSocial] = useState(null)
  const [socialInput, setSocialInput] = useState('')
  const [mediaSaving, setMediaSaving] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [cropTarget, setCropTarget] = useState(null)
  const fpPhotoRef = useRef(null)
  const fpCoverRef = useRef(null)
  const fpTouchRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10)
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const safeUser = user || {}
  const norm = normalizeFriendProfileTarget(safeUser)
  const cover = getPersonCover(safeUser)
  const photo = getPersonPhoto(safeUser)
  const displayName = safeUser.name || norm.name || safeUser.username || norm.username || 'Member'
  const displayUsername = norm.username || (safeUser.username ? String(safeUser.username).replace(/^@+/, '') : '')
  const targetUid = safeUser.id || norm.id || safeUser.uid || norm.uid || ''

  const userActivity = safeUser.activity || norm.activity || null
  const userSpotify = isSelf ? spotifyNowPlaying : (safeUser.spotify || norm.spotify || safeUser.spotifyNowPlaying || null)
  const isSpotifyConnected = isSelf ? spotifyConnected : Boolean(userSpotify || safeUser.spotifyConnected || norm.spotifyConnected)

  const SOCIAL_ICONS = {
    instagram: InstagramIcon,
    twitter: XIcon,
    x: XIcon,
    tiktok: TikTokIcon,
    linkedin: LinkedInIcon,
    whatsapp: WhatsAppIcon,
    discord: DiscordSocialIcon,
    snapchat: SnapchatIcon,
    custom: CustomLinkIcon
  }

  const statusOptions = STATUS_OPTIONS_LIST
  const currentStatusKey = isSelf ? (profileStatus || 'online') : (safeUser.status || norm.status || 'online')
  const currentStatus = statusOptions.find(s => s.key === currentStatusKey) || statusOptions[0]

  const displayBio = isSelf ? (profileBio || '') : (norm.bio || safeUser.bio || '')
  const displayPlatforms = isSelf ? (activePlatforms || []) : (Array.isArray(norm.activePlatforms) ? norm.activePlatforms : [])
  const displayLinks = isSelf ? (socialLinks || {}) : (norm.socialLinks || safeUser.socialLinks || {})
  const hasSocials = Array.isArray(displayPlatforms) && displayPlatforms.some(k => displayLinks?.[k])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 320)
  }

  const handlePhotoUpload = async (file) => {
    try {
      setMediaSaving('photo')
      const url = await uploadProfileImageFile(file, 'profile-photo')
      onPhotoChange?.(url)
    } catch (err) {
      console.warn('Profile photo upload failed:', err)
    } finally {
      setMediaSaving(null)
    }
  }

  const handleCoverUpload = async (file) => {
    try {
      setMediaSaving('cover')
      const url = await uploadProfileImageFile(file, 'profile-cover')
      onCoverChange?.(url)
    } catch (err) {
      console.warn('Cover upload failed:', err)
    } finally {
      setMediaSaving(null)
    }
  }

  return (
    <div
      className={`fp-overlay${visible ? ' fp-overlay--in' : ''}`}
      onClick={e => {
        if (cropTarget) return
        if (e.target.closest('.profile-crop-overlay') || e.target.closest('.profile-crop-modal')) return
        if (
          !e.target.closest('.fp-main') &&
          !e.target.closest('.fp-sidebar') &&
          !e.target.closest('.fp-back-btn') &&
          !e.target.closest('.pp-panel') &&
          !e.target.closest('.modal') &&
          !e.target.closest('.fmt-menu')
        ) {
          handleClose()
        }
      }}
    >
      <div
        className={`fp-page${visible ? ' fp-page--in' : ''}`}
        onTouchStart={e => {
          fpTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchEnd={e => {
          if (!fpTouchRef.current) return
          const dx = e.changedTouches[0].clientX - fpTouchRef.current.x
          const dy = e.changedTouches[0].clientY - fpTouchRef.current.y
          fpTouchRef.current = null
          if (dx > 50 && Math.abs(dx) > Math.abs(dy)) {
            handleClose()
          }
        }}
      >
        <button type="button" className="fp-back-btn" onClick={handleClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Geri
        </button>

        {isSelf && (
          <>
            <input type="file" accept="image/*" ref={fpPhotoRef} style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) setCropTarget({ file: f, kind: 'photo' }); e.target.value = '' }} />
            <input type="file" accept="image/*" ref={fpCoverRef} style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) setCropTarget({ file: f, kind: 'cover' }); e.target.value = '' }} />
          </>
        )}

        <div className="fp-layout">
          <div className={`fp-main${cover ? ' fp-main--has-cover' : ''}`}>
            {cover && (
              <div className="profile-popup-ambient">
                <div className="profile-popup-ambient-bg" style={{ backgroundImage: `url(${normalizeMediaUrl(cover)})` }} />
                <div className="profile-popup-ambient-scrim" />
              </div>
            )}
            <div className={`fp-cover-zone${isSelf ? ' fp-cover-zone--edit' : ''}`}
              onClick={() => { if (isSelf) fpCoverRef.current?.click() }}
              style={{ cursor: isSelf ? 'pointer' : 'default' }}
            >
              <CachedProfileCover src={cover} className="fp-cover" />
              {isSelf && (
                <div className="fp-cover-edit-hint">
                  {mediaSaving === 'cover'
                    ? <span className="fp-edit-saving-dot" />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  }
                  <span>Edit cover</span>
                </div>
              )}
            </div>

            <div className="fp-identity">
              <div
                className={`fp-avatar-wrap${isSelf ? ' fp-avatar-wrap--edit' : ''}`}
                onClick={e => { if (!isSelf) return; e.stopPropagation(); fpPhotoRef.current?.click() }}
                style={{ cursor: isSelf ? 'pointer' : 'default' }}
              >
                <CachedProfileImage
                  src={photo}
                  alt="Avatar"
                  className="fp-avatar"
                  fallback={<img src={avatarUIcon} alt="Avatar" className="fp-avatar" />}
                />
                {isSelf && (
                  <div className="fp-media-edit-overlay">
                    {mediaSaving === 'photo'
                      ? <span className="fp-edit-saving-dot" />
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    }
                  </div>
                )}
              </div>

              <div className="fp-names-col">
                <div className="fp-name-row">
                  {isSelf && editingName ? (
                    <div className="fp-name-edit">
                      <input
                        className="fp-name-input"
                        value={nameInput}
                        autoFocus
                        maxLength={50}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { const tval = nameInput.trim(); if (tval) { onNameChange?.(tval); } setEditingName(false) }
                          if (e.key === 'Escape') setEditingName(false)
                        }}
                        onBlur={() => { const tval = nameInput.trim(); if (tval) { onNameChange?.(tval); } setEditingName(false) }}
                      />
                    </div>
                  ) : (
                    <h1
                      className={`fp-name${isSelf && editMode ? ' fp-name--editable' : ''}`}
                      onClick={() => { if (isSelf && editMode) { setNameInput(displayName || ''); setEditingName(true) } }}
                    >{displayName}</h1>
                  )}
                </div>

                <div className="fp-username-row">
                  {displayUsername && <span className="fp-username">@{displayUsername}</span>}
                  <div className="fp-username-actions">
                    {isSelf ? (
                      <>
                        <div className="pp-status-wrap">
                          <button type="button" className="pp-status-btn" onClick={() => setStatusOpen(v => !v)}>
                            <span className="pp-status-dot" style={{ background: currentStatus.color }} />
                            <span>{currentStatus.label || 'Status'}</span>
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
                                  className={'pp-status-option' + (currentStatusKey === opt.key ? ' active' : '')}
                                  onClick={() => { onStatusChange?.(opt.key); setStatusOpen(false) }}
                                >
                                  <span className="pp-status-dot" style={{ background: opt.color }} />
                                  <span>{opt.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`fp-edit-profile-btn${editMode ? ' fp-edit-profile-btn--done' : ''}`}
                          onClick={() => { setEditMode(v => !v); setEditingBio(false); setEditingSocial(null); setEditingName(false) }}
                        >{editMode ? t('done') : t('edit_profile')}</button>
                      </>
                    ) : (
                      <>
                        <div className="fpp-status-pill">
                          <span className="pp-status-dot" style={{ background: currentStatus.color }} />
                          <span>{currentStatus.label || 'Online'}</span>
                        </div>
                        {lastSeenLabel && <span className="fp-lastseen">{lastSeenLabel}</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Bio */}
            {(displayBio || (isSelf && editMode)) && (
              <div className={`fp-section${editMode ? ' fp-section--editable' : ''}`}>
                {editingBio ? (
                  <div className="fp-bio-edit">
                    <textarea className="fp-bio-textarea" value={bioInput} autoFocus
                      onChange={e => { if (e.target.value.length <= 240) setBioInput(e.target.value) }}
                      placeholder={t('bio_placeholder')} />
                    <div className="fp-bio-controls">
                      <span className="fp-bio-count">{bioInput.length}/240</span>
                      <button type="button" className="fp-bio-save" onClick={() => { onBioChange?.(bioInput); setEditingBio(false) }}>{t('save')}</button>
                      <button type="button" className="fp-bio-cancel" onClick={() => setEditingBio(false)}>{t('cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="fp-editable-row">
                    <p className={`fp-bio${!displayBio ? ' fp-bio--empty' : ''}`}>{displayBio || t('add_bio')}</p>
                    {editMode && (
                      <button type="button" className="fp-inline-edit-btn" onClick={() => { setBioInput(displayBio || ''); setEditingBio(true) }}>
                        <PencilIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Activity */}
            {userActivity?.name && (
              <div className="fp-section">
                <span className="fp-section-label">{t('activity').toUpperCase()}</span>
                <div className="fp-activity-item">
                  <ActivityBadge activity={userActivity} />
                </div>
              </div>
            )}

            {/* 3. Spotify / Connections */}
            {(isSpotifyConnected || userSpotify) && (
              <div className="fp-section">
                <span className="fp-section-label">SPOTIFY</span>
                {userSpotify ? (
                  <div className="fp-spotify-row">
                    {userSpotify.albumArt && <img src={userSpotify.albumArt} alt="album" className="fp-spotify-art" />}
                    <div className="fp-spotify-track">
                      <a className="fp-spotify-track-name" href={userSpotify.url} target="_blank" rel="noreferrer">{userSpotify.name}</a>
                      <span className="fp-spotify-track-artist">{userSpotify.artist}</span>
                    </div>
                    <SpotifyIcon size={16} />
                  </div>
                ) : (
                  <div className="fp-spotify-idle"><SpotifyIcon size={16} /><span>{t('connected')}</span></div>
                )}
              </div>
            )}

            {/* 4. Socials */}
            {(hasSocials || (isSelf && editMode)) && (
              <div className={`fp-section${editMode ? ' fp-section--editable' : ''}`}>
                <div className="fp-editable-row">
                  <span className="fp-section-label">{t('socials').toUpperCase()}</span>
                  {editMode && (
                    <button type="button" className="fp-inline-edit-btn" onClick={() => setEditingSocial(v => v ? null : 'open')}>
                      <PencilIcon />
                    </button>
                  )}
                </div>
                {editMode && editingSocial ? (
                  <div className="fp-socials-edit">
                    {displayPlatforms.map(k => {
                      const Icon = SOCIAL_ICONS[k]
                      return (
                        <div key={k} className="fp-social-edit-row">
                          {Icon && <span className="fp-social-edit-icon"><Icon /></span>}
                          <input className="accs-input" style={{ flex: 1 }}
                            value={editingSocial === k ? socialInput : (displayLinks[k] || '')}
                            onFocus={() => { setEditingSocial(k); setSocialInput(displayLinks[k] || '') }}
                            onChange={e => setSocialInput(e.target.value)}
                            onBlur={() => {
                              if (editingSocial === k) {
                                onSocialLinksChange?.(prev => ({ ...(prev || {}), [k]: socialInput }))
                                setEditingSocial('open')
                              }
                            }}
                            placeholder={`${k} handle or URL`}
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="fp-socials-row">
                    {displayPlatforms.filter(k => displayLinks?.[k]).map(k => {
                      const Icon = SOCIAL_ICONS[k]
                      const handle = displayLinks[k]
                      return Icon ? (
                        <a key={k} className="fp-social-link" href={handle.startsWith('http') ? handle : '#'} target="_blank" rel="noopener noreferrer" title={handle}>
                          <Icon size={18} />
                        </a>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. Actions (if other user) */}
            {!isSelf && (
              <div className="fp-actions">
                {!isBlocked && onMessage && <button type="button" className="fp-action-btn fp-action-btn--primary" onClick={() => { onMessage(); handleClose() }}>{t('send_message')}</button>}
                {!isBlocked && !isFriend && !isPending && onAddFriend && <button type="button" className="fp-action-btn" onClick={() => { onAddFriend(safeUser); handleClose() }}>{t('add_friend')}</button>}
                {!isBlocked && !isFriend && isPending && <button type="button" className="fp-action-btn" disabled>{t('request_sent')}</button>}
                {!isBlocked && isFriend && onRemove && <button type="button" className="fp-action-btn fp-action-danger" onClick={() => { onRemove(targetUid); handleClose() }}>{t('remove_friend')}</button>}
                {isBlocked && onUnblock && <button type="button" className="fp-action-btn" onClick={() => { onUnblock(targetUid); handleClose() }}>{t('unblock')}</button>}
                {!isBlocked && onBlock && <button type="button" className="fp-action-btn fp-action-danger" onClick={() => { onBlock(safeUser); handleClose() }}>{t('block')}</button>}
              </div>
            )}
          </div>

          <div className="fp-sidebar">
            {isSelf && friends.length > 0 && (
              <div className="fp-sidebar-card">
                <span className="fp-section-label">{t('friends').toUpperCase()}</span>
                <div className="fp-friends-list">
                  {friends.slice(0, 12).map(f => (
                    <button key={f.id} type="button" className="fp-friend-row" onClick={() => onOpenFriend?.(f)}>
                      <div className="fp-friend-avatar">
                        {(f.photo || f.photoURL || f.avatar)
                          ? <img src={f.photo || f.photoURL || f.avatar} alt={f.name || ''} />
                          : (f.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="fp-friend-name">{f.name || f.username || t('friend')}</span>
                    </button>
                  ))}
                  {friends.length > 12 && <span className="fp-friends-more">+{friends.length - 12} {t('more')}</span>}
                </div>
              </div>
            )}
            {reelms.length > 0 && (
              <div className="fp-sidebar-card">
                <span className="fp-section-label">{isSelf ? t('reelms').toUpperCase() : t('mutual_reelms').toUpperCase()}</span>
                <div className="fp-reelms-list">
                  {reelms.slice(0, 8).map(r => (
                    <div key={r.id} className="fp-reelm-row">
                      <div className="fp-reelm-avatar">
                        {r.photo ? <img src={r.photo} alt="" /> : <span>{(r.name || 'R').charAt(0).toUpperCase()}</span>}
                      </div>
                      <span className="fp-reelm-name">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {cropTarget && (
        <ProfileMediaCropModal
          file={cropTarget.file}
          kind={cropTarget.kind}
          onApply={async (croppedFile) => {
            const kind = cropTarget.kind
            setCropTarget(null)
            if (kind === 'photo') handlePhotoUpload(croppedFile)
            else handleCoverUpload(croppedFile)
          }}
          onCancel={() => setCropTarget(null)}
          onChangeFile={newFile => setCropTarget(prev => ({ ...prev, file: newFile }))}
        />
      )}
    </div>
  )
}

export default FullProfilePage
