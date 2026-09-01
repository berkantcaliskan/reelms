import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useT } from '../../../../i18n'
import messagesIcon from '../../../../assets/icons/messages-icon.svg'
import friendsIcon from '../../../../assets/icons/friends-icon_reelms.svg'
import avatarUIcon from '../../../../assets/icons/avataru-icon.svg'
import { MaskIcon, SpotifyIcon } from '../icons/AppIcons'
import { normalizeMediaUrl, getPersonPhoto } from '../../utils/mediaUtils'
import { normalizeFriendProfileTarget, buildProfileThemeStyle, STATUS_OPTIONS_LIST, BOT_BIO_KEY } from '../../utils/profileUtils'
import { CachedProfileImage, CachedProfileCover } from './CachedProfileMedia'
import { ActivityBadge } from './ActivityModal'

export function FriendProfilePopup({
  friend,
  status = null,
  anchorRect = null,
  serverContext = null,
  onClose,
  onRemove,
  onBlock,
  onUnblock,
  onAddFriend,
  onNudge,
  onMention,
  isFriend = true,
  isBlocked = false,
  isPending = false,
  nickname,
  onNicknameChange,
  canShare,
  onMessage,
  onCreateGroup,
  onRequestRemoteControl,
  voiceContext = null,
  moderationContext = null,
  roleContext = null,
  isSelf = false,
  embedded = false,
  canEditNickname = true,
  onViewFullProfile,
  rightPanelWidth = 0,
  isMutedUser = false,
  onToggleMuteUser = null
}) {
  const t = useT()
  const popupRef = useRef(null)
  const safeFriend = normalizeFriendProfileTarget(friend || {})
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(nickname || '')

  useEffect(() => {
    setNicknameInput(nickname || '')
  }, [nickname])

  useEffect(() => {
    if (embedded) return undefined
    const handler = (e) => {
      if (popupRef.current && popupRef.current.contains(e.target)) return
      if (e.target.closest('.rp-member-card, .discover-result-row, .hpopup-row, .chat-msg-avatar, .chat-msg-author, .msg-avatar, .msg-name, .bubble-avatar, .bubble-sender-name, .msg-reply-quote, .profile-card')) return
      onClose?.()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose, embedded])

  const popupW = 356
  const isFromChat = !serverContext && !embedded

  const friendCover = safeFriend.cover || safeFriend.coverImage || safeFriend.coverUrl || null
  const isBot = safeFriend.isBot || ['reelmradio', 'reelms-intelligence'].includes(safeFriend.username)
  const rawStatusKey = isBot ? 'online' : (status !== null && status !== undefined ? status : (safeFriend.status || friend?.status || 'offline'))
  const friendStatusKey = ['online', 'idle', 'busy', 'dnd', 'invisible', 'offline'].includes(rawStatusKey) ? rawStatusKey : 'offline'
  const friendStatus = STATUS_OPTIONS_LIST.find(s => s.key === friendStatusKey) || { key: friendStatusKey, label: friendStatusKey, color: '#71717a' }
  const safeFriendBio = safeFriend.isBot ? t(BOT_BIO_KEY[safeFriend.username] || 'bot_radio_bio') : (safeFriend.bio || friend?.bio || '')
  const safeFriendSpotify = safeFriend.spotifyNowPlaying || safeFriend.spotify || friend?.spotifyNowPlaying || friend?.spotify || null
  const safeRect = anchorRect || { top: 96, bottom: 112, left: Math.max(8, window.innerWidth - popupW - 18), right: window.innerWidth - 18 }

  const msgBarEl = !embedded ? document.querySelector('.msg-bar-wrap') : null
  const screenBottom = msgBarEl ? msgBarEl.getBoundingClientRect().top - 8 : window.innerHeight - 24
  const screenTop = 8

  let stylePos = {}

  if (embedded) {
    stylePos = {}
  } else if (isFromChat) {
    let left = safeRect.left
    if (left + popupW > window.innerWidth - 12) left = window.innerWidth - popupW - 12
    if (left < 12) left = 12

    const spaceBelow = screenBottom - safeRect.bottom
    const spaceAbove = safeRect.top - screenTop

    if (spaceBelow >= 300 || spaceBelow >= spaceAbove) {
      const top = Math.max(screenTop, safeRect.bottom + 6)
      const maxHeight = Math.min(560, screenBottom - top)
      stylePos = { top, left, width: popupW, maxHeight }
    } else {
      const bottom = Math.max(8, window.innerHeight - safeRect.top + 6)
      const maxHeight = Math.min(560, safeRect.top - screenTop - 6)
      stylePos = { bottom, left, width: popupW, maxHeight }
    }
  } else {
    const membersPanelEl = !embedded ? document.querySelector('.rp-members-panel') : null
    const panelLeftEdge = membersPanelEl
      ? membersPanelEl.getBoundingClientRect().left
      : (rightPanelWidth > 0 ? window.innerWidth - rightPanelWidth : safeRect.left)
    let left = panelLeftEdge - popupW - 8
    if (left < 8) left = Math.max(8, (safeRect.left || safeRect.right) - popupW - 8)
    if (left < 8) left = 8

    const spaceBelow = screenBottom - safeRect.top
    const spaceAbove = safeRect.bottom - screenTop

    if (spaceBelow < 280 && spaceAbove > spaceBelow) {
      const bottom = Math.max(8, window.innerHeight - safeRect.bottom + 6)
      const maxHeight = Math.min(560, safeRect.bottom - screenTop)
      stylePos = { bottom, left, width: popupW, maxHeight }
    } else {
      const top = Math.max(screenTop, Math.min(safeRect.top, window.innerHeight - 560))
      const maxHeight = Math.min(560, window.innerHeight - top - 16)
      stylePos = { top, left, width: popupW, maxHeight }
    }
  }

  const profileNode = (
    <div className={`profile-popup friend-profile-popup${embedded ? ' friend-profile-popup--embedded' : ''}${friendCover ? ' friend-profile-popup--has-cover profile-popup--has-cover' : ''}`} style={{ ...(buildProfileThemeStyle(safeFriend) || {}), ...stylePos }} ref={popupRef}>
      {friendCover && (
        <div className="profile-popup-ambient">
          <div className="profile-popup-ambient-bg" style={{ backgroundImage: `url(${normalizeMediaUrl(friendCover)})` }} />
          <div className="profile-popup-ambient-scrim" />
        </div>
      )}
      <div className="fpp-scroll-inner">
        <CachedProfileCover src={friendCover} className={`pp-cover fpp-cover${friendCover ? ' pp-cover--has-image fpp-cover--has-image' : ''}`} />
        {embedded && <button type="button" className="fpp-embedded-close" onClick={onClose} aria-label="Close profile">×</button>}

        {/* 1. Identity: Avatar + Names + Status Dot */}
        <div className="pp-identity fpp-identity">
          <div className="pp-avatar-wrap fpp-avatar-wrap">
            <CachedProfileImage
              src={getPersonPhoto(safeFriend)}
              alt="Avatar"
              className="pp-avatar fpp-avatar-img"
              fallback={<img src={avatarUIcon} alt="Avatar" className="pp-avatar fpp-avatar-img" />}
            />
          </div>
          <div className="pp-names-col fpp-names-col">
            <div className="fpp-name-row">
              <span className="pp-name fpp-name">{nickname || safeFriend.name || safeFriend.displayName || 'Member'}</span>
              <span
                className="fpp-status-dot"
                style={{ background: friendStatus.color }}
                title={friendStatus.label || friendStatusKey}
              />
            </div>
            <div className="pp-username-row fpp-username-row">
              <span className="pp-username fpp-username">{'@' + (safeFriend.username ? safeFriend.username.replace(/^@/, '') : (safeFriend.name || 'user').toLowerCase().replace(/\s+/g, ''))}</span>
            </div>
          </div>
        </div>

        <div className="fpp-body">
          {/* 2. Bio */}
          {safeFriendBio && (
            <div className="fpp-bio-section">
              <p className="fpp-bio-text">{safeFriendBio}</p>
            </div>
          )}

          {/* 3. Activity */}
          {(safeFriend.activity?.name || safeFriendSpotify) && (
            <div className="fpp-activities-section">
              {safeFriend.activity?.name && (
                <div className="fpp-activity-item">
                  <ActivityBadge activity={safeFriend.activity} />
                </div>
              )}
              {safeFriendSpotify && (
                <div className="pp-spotify-playing pp-spotify-pill fpp-spotify-pill">
                  {safeFriendSpotify.albumArt && (
                    <img src={safeFriendSpotify.albumArt} alt="album" className="pp-spotify-art" />
                  )}
                  <div className="pp-spotify-track">
                    <a className="pp-spotify-track-name" href={safeFriendSpotify.url} target="_blank" rel="noreferrer">
                      {safeFriendSpotify.name}
                    </a>
                    <span className="pp-spotify-track-artist">{safeFriendSpotify.artist}</span>
                  </div>
                  <span className="pp-spotify-pill-icon pp-spotify-icon-active">
                    <SpotifyIcon size={16} />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Reelm Roles */}
          {roleContext && (roleContext.roles?.length > 0 || (roleContext.canManageRoles && roleContext.allRoles?.length > 0)) && (
            <div className="fpp-roles-section">
              <div className="fpp-roles-header">
                <span className="fpp-section-label">REELM ROLES</span>
                {roleContext.canManageRoles && (
                  <span className="fpp-roles-manage-hint">Click to assign</span>
                )}
              </div>
              {roleContext.canManageRoles && roleContext.allRoles?.length > 0 ? (
                <div className="fpp-role-badges fpp-role-badges--interactive">
                  {roleContext.allRoles.map(role => {
                    const hasRole = (roleContext.memberRoleIds || []).map(String).includes(String(role.id))
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`fpp-role-chip${hasRole ? ' fpp-role-chip--assigned' : ''}`}
                        style={{ '--chip-color': role.color || '#94a3b8' }}
                        onClick={() => roleContext.onToggleRole?.(role.id)}
                        title={hasRole ? `Remove ${role.name}` : `Assign ${role.name}`}
                      >
                        <span className="fpp-role-chip-indicator">{hasRole ? '✓' : '+'}</span>
                        <span className="fpp-role-chip-name">{role.name}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="fpp-role-badges">
                  {roleContext.roles.slice(0, roleContext.expanded ? 12 : 3).map(role => (
                    <span key={role.id} className="rp-role-badge" style={{ color: role.color, borderColor: role.color + '55', background: role.color + '18' }}>{role.name}</span>
                  ))}
                  {roleContext.roles.length > 3 && (
                    <button type="button" className="fpp-mini-link" onClick={roleContext.onToggleExpanded}>
                      {roleContext.expanded ? 'Show less' : `+${roleContext.roles.length - 3} more`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Nickname */}
          {(canEditNickname || nickname) && (
            <div className="fpp-nickname-section">
              <span className="fpp-section-label">NICKNAME</span>
              {editingNickname ? (
                <div className="fpp-nickname-edit">
                  <input
                    className="fpp-nickname-input"
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    placeholder={safeFriend.name}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { onNicknameChange?.(nicknameInput.trim()); setEditingNickname(false) }
                      if (e.key === 'Escape') { setNicknameInput(nickname || ''); setEditingNickname(false) }
                    }}
                  />
                  <button type="button" className="fpp-nickname-save" onClick={() => { onNicknameChange?.(nicknameInput.trim()); setEditingNickname(false) }}>Save</button>
                  {nickname && <button type="button" className="fpp-nickname-clear" onClick={() => { onNicknameChange?.(''); setNicknameInput(''); setEditingNickname(false) }}>Clear</button>}
                </div>
              ) : (
                <button type="button" className="fpp-nickname-btn" onClick={() => canEditNickname && setEditingNickname(true)}>
                  {nickname ? <span>{nickname}</span> : <span className="fpp-nickname-empty">Add nickname...</span>}
                </button>
              )}
            </div>
          )}

          {/* Voice room status if applicable */}
          {voiceContext && !isSelf && voiceContext.userRoom && (
            <div className="fpp-voice-section">
              <span className="fpp-section-label">VOICE</span>
              <div className="fpp-voice-row">
                <span>{safeFriend.name || 'Member'} is in <strong>{voiceContext.userRoom.channelName}</strong></span>
                {!voiceContext.isInSameRoom && (
                  <button type="button" className="fpp-action-btn fpp-action-btn--mini" onClick={() => { voiceContext.onJoinRoom?.(voiceContext.userRoom); onClose?.() }}>Join</button>
                )}
              </div>
            </div>
          )}

          {/* Moderation actions if moderator */}
          {moderationContext?.canShow && !isSelf && (
            <div className="fpp-mod-section">
              <span className="fpp-section-label">REELM ACTIONS</span>
              <div className="fpp-mod-list">
                {moderationContext.voiceRoom && (
                  <button type="button" className="fpp-list-action" onClick={() => { moderationContext.onJoinVoice?.(); onClose?.() }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.39 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Join {moderationContext.voiceRoom.channelName || 'room'}
                  </button>
                )}
                {moderationContext.canTimeout && (
                  <button type="button" className="fpp-list-action" onClick={() => { moderationContext.onTimeout?.(); onClose?.() }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Timeout…
                  </button>
                )}
                {moderationContext.canRemove && (
                  <button type="button" className="fpp-list-action fpp-list-action--danger" onClick={() => { moderationContext.onRemove?.(); onClose?.() }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Kick from Reelm…
                  </button>
                )}
                {moderationContext.canBan && (
                  <button type="button" className="fpp-list-action fpp-list-action--danger" onClick={() => { moderationContext.onBan?.(); onClose?.() }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Ban from Reelm…
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 6. Profile Action Icons */}
          {!isSelf && (
            <div className="fpp-icon-actions">
              {!isBlocked && onMessage && (
                <button
                  type="button"
                  className="fpp-icon-btn"
                  onClick={() => { onMessage(); onClose?.() }}
                  title={t('send_message_btn', 'Message')}
                >
                  <MaskIcon src={messagesIcon} alt="Message" style={{ width: '18px', height: '18px', display: 'block' }} />
                </button>
              )}

              {canShare !== false && (
                <button
                  type="button"
                  className="fpp-icon-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${safeFriend.name} (@${safeFriend.username || safeFriend.id})`)
                    onClose?.()
                  }}
                  title="Share Profile"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
              )}

              {onMention && (
                <button
                  type="button"
                  className="fpp-icon-btn"
                  onClick={() => { onMention(safeFriend.username || safeFriend.name); onClose?.() }}
                  title="Mention in chat"
                >
                  <span style={{ fontSize: '1.05rem', fontWeight: 300, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1 }}>@</span>
                </button>
              )}

              <button
                type="button"
                className={`fpp-icon-btn${(isMutedUser || voiceContext?.isMuted) ? ' fpp-icon-btn--active' : ''}`}
                onClick={() => {
                  if (voiceContext) voiceContext.onToggleMute?.()
                  else onToggleMuteUser?.(safeFriend.id)
                }}
                title={(isMutedUser || voiceContext?.isMuted) ? 'Unmute' : 'Mute'}
              >
                {(isMutedUser || voiceContext?.isMuted) ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>

              {!isFriend && !isBlocked && onAddFriend && (
                <button
                  type="button"
                  className="fpp-icon-btn fpp-icon-btn--add"
                  disabled={isPending}
                  onClick={() => { onAddFriend(friend); onClose?.() }}
                  title={isPending ? 'Friend request sent' : 'Add Friend'}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <MaskIcon src={friendsIcon} alt="Friends" style={{ width: '18px', height: '18px', display: 'block' }} />
                    <span style={{ position: 'absolute', top: -4, right: -6, fontSize: '11px', fontWeight: 800, color: '#4ade80', lineHeight: 1 }}>+</span>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* 7. See full profile */}
          {onViewFullProfile && (
            <button
              type="button"
              className="profile-view-full-btn"
              onClick={() => { onClose?.(); setTimeout(() => onViewFullProfile?.(friend), 50) }}
            >
              <span>{t('see_full_profile')}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (embedded) return profileNode
  return ReactDOM.createPortal(profileNode, document.body)
}

export default FriendProfilePopup
