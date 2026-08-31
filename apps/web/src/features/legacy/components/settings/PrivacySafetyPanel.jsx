import React, { useState, useMemo, useCallback } from 'react'
import { useT } from '../../../../i18n'
import { authChangePassword } from '../../../../reelmsAwsClient'
import { PillSelect } from '../ui/ReelmsSelects'

export function getCurrentSessionId() {
  try { return sessionStorage.getItem('reelms_session_id') } catch { return null }
}

export function BlockedAccountsSection({ blockedList = [], onUnblock }) {
  const t = useT()
  const handleUnblock = (targetId) => {
    onUnblock?.(targetId)
  }

  return (
    <div className="accs-section">
      <div className="accs-section-title">{t('blocked_accounts')}</div>
      {blockedList.length === 0
        ? <p className="accs-note">{t('no_blocked_users')}</p>
        : (
          <div className="accs-sessions-list">
            {blockedList.map(b => (
              <div key={b.id} className="accs-session-row">
                <div className="accs-session-info">
                  <span className="accs-session-device">{b.name}{b.username ? ` (@${b.username})` : ''}</span>
                  <span className="accs-session-meta">{t('blocked_label')} {new Date(b.blockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <button type="button" className="accs-data-btn" onClick={() => handleUnblock(b.id)}>{t('unblock')}</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

export function ActiveSessionsSection({ sessions = [], onSessionsUpdate }) {
  const t = useT()
  const currentSessionId = getCurrentSessionId()

  const revokeSession = (id) => {
    const updated = sessions.filter(s => s.id !== id)
    onSessionsUpdate?.(updated)
  }

  const formatTime = useCallback((ts) => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - ts
    if (diff < 60000) return t('just_now')
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [t])

  return (
    <div className="accs-section">
      <div className="accs-section-title">{t('active_sessions')}</div>
      {sessions.length === 0 && <p className="accs-note">{t('no_sessions')}</p>}
      <div className="accs-sessions-list">
        {sessions.map(s => {
          const isCurrent = s.id === currentSessionId
          return (
            <div key={s.id} className={`accs-session-row${isCurrent ? ' accs-session-current' : ''}`}>
              <div className="accs-session-info">
                <span className="accs-session-device">{s.device}{isCurrent && <span className="accs-session-this"> · {t('this_device')}</span>}</span>
                <span className="accs-session-meta">{t('signed_in_at')} {formatTime(s.loginTime)} · {t('last_active')} {formatTime(s.lastActivity)}</span>
              </div>
              {!isCurrent && (
                <button type="button" className="accs-session-revoke" onClick={() => revokeSession(s.id)}>{t('revoke')}</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PrivacySafetyPanel({
  user,
  onUpdate,
  onUnblock,
  blockedList = [],
  sessionsList = [],
  onSessionsUpdate,
  showHiddenBarItems,
  onShowHiddenBarItemsChange,
  friends = [],
  lastSeenAllowList = [],
  onLastSeenAllowListChange
}) {
  const t = useT()
  const [friendSearch, setFriendSearch] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [pwPhase, setPwPhase] = useState('new') // 'new' | 'confirm'
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handlePasswordUpdate = async () => {
    setPwError('')
    if (newPw.length < 8) { setPwError(t('password_too_short') || 'Password too short'); return }
    if (newPw !== confirmPw) { setPwError(t('passwords_no_match') || 'Passwords do not match'); return }
    const hasPassword = Boolean(user?.hasPassword)
    if (hasPassword && pwPhase === 'new') {
      setPwPhase('confirm')
      return
    }
    setPwSaving(true)
    try {
      await authChangePassword({ newPassword: newPw, currentPassword: hasPassword ? currentPw : undefined })
      onUpdate?.({ hasPassword: true })
      setNewPw(''); setConfirmPw(''); setCurrentPw('')
      setPwPhase('new')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/wrong-password') setPwError(t('wrong_current_password') || 'Wrong current password')
      else if (code === 'auth/weak-password') setPwError(t('password_too_short') || 'Password too short')
      else setPwError(err?.message || t('password_update_failed') || 'Failed to update password')
    } finally {
      setPwSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="accs-panel">
        <div className="accs-section">
          <div className="accs-section-title">{t('privacy_safety')}</div>
          <p className="accs-note">Oturum bilgileri hazırlanıyor. Bu ekran oturumu kapatmadan yüklenecek.</p>
        </div>
      </div>
    )
  }

  const sensitiveContentOn = useMemo(() => {
    if (user.sensitiveContentFilter !== undefined) return user.sensitiveContentFilter
    const age = user.birthDate ? Math.floor((Date.now() - new Date(user.birthDate)) / 31557600000) : 99
    return age < 18
  }, [user.sensitiveContentFilter, user.birthDate])

  return (
    <div className="accs-panel">

      <div className="accs-section">
        <div className="accs-section-title">{t('change_password')}</div>
        <div className="accs-field-col">
          {pwPhase === 'new' ? (
            <>
              <input className="accs-input" type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(''); setPwSuccess(false) }} placeholder={t('new_password')} autoComplete="new-password" />
              <input className="accs-input" type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(''); setPwSuccess(false) }} placeholder={t('confirm_password')} autoComplete="new-password" />
            </>
          ) : (
            <>
              <input className="accs-input" type="password" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwError('') }} placeholder={t('current_password')} autoComplete="current-password" autoFocus />
              <button type="button" className="accs-link-btn" onClick={() => { setPwPhase('new'); setCurrentPw(''); setPwError('') }}>{t('back')}</button>
            </>
          )}
          {pwError && <p className="accs-error">{pwError}</p>}
          {pwSuccess && <p className="accs-success">{t('password_updated')}</p>}
          <button type="button" className="accs-btn" style={{ alignSelf: 'flex-end' }} onClick={handlePasswordUpdate} disabled={pwSaving}>
            {pwSaving ? '…' : pwPhase === 'confirm' ? t('confirm') : t('update_password')}
          </button>
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('security')}</div>
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('new_signin_notif')}</span>
            <p className="accs-note">{t('new_signin_notif_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${user.notifyNewDevice !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate?.({ notifyNewDevice: user.notifyNewDevice === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('two_fa')}</span>
            <p className="accs-note">{t('two_fa_desc').replace(' Coming soon', '')} <span className="accs-coming-soon">{t('coming_soon')}</span></p>
          </div>
          <button type="button" className="cust-toggle" disabled style={{opacity: 0.4, cursor: 'not-allowed'}}><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('e2ee')}</span>
            <p className="accs-note">{t('e2ee_desc').replace(' Coming soon', '')}</p>
          </div>
        </div>
      </div>

      <ActiveSessionsSection sessions={sessionsList} onSessionsUpdate={onSessionsUpdate} />

      <div className="accs-section">
        <div className="accs-section-title">{t('privacy')}</div>
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('allow_profile_sharing')}</span>
            <p className="accs-note">{t('allow_profile_sharing_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${user.allowProfileSharing !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate?.({ allowProfileSharing: user.allowProfileSharing === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('show_in_discover')}</span>
            <p className="accs-note">{t('show_in_discover_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${user.showInDiscover !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate?.({ showInDiscover: user.showInDiscover === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">Dinamik sohbetler'de gizlenen içeriği göster</span>
            <p className="accs-note">Dinamik sohbetler çubuğunda gizlenen sohbet ve toplulukları görünür kılar.</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${showHiddenBarItems ? ' cust-toggle-on' : ''}`}
            onClick={() => onShowHiddenBarItemsChange?.(!showHiddenBarItems)}
          ><span className="cust-toggle-knob" /></button>
        </div>

        <div className="accs-visibility-group">
          <p className="accs-note" style={{marginBottom: '10px'}}>{t('dm_settings_note')}</p>
          {[
            { key: 'readReceiptsVisibility', label: t('read_receipts'), note: t('read_receipts_desc') },
            { key: 'onlineStatusVisibility', label: t('online_status_label'), note: t('online_status_desc') },
          ].map(({ key, label, note }) => (
            <div key={key} className="accs-visibility-row">
              <div>
                <span className="cust-toggle-label">{label}</span>
                <p className="accs-note">{note}</p>
              </div>
              <PillSelect
                value={user[key] || 'everyone'}
                onChange={val => onUpdate?.({ [key]: val })}
                options={[
                  { value: 'everyone', label: t('everyone') },
                  { value: 'friends', label: t('friends') },
                  { value: 'nobody', label: t('nobody') },
                ]}
              />
            </div>
          ))}

          <div className="accs-visibility-row accs-visibility-row--stacked">
            <div className="accs-visibility-row-top">
              <div>
                <span className="cust-toggle-label">{t('last_seen')}</span>
                <p className="accs-note">{t('last_seen_desc')}</p>
              </div>
              <PillSelect
                value={user.lastSeenVisibility || 'friends'}
                onChange={val => onUpdate?.({ lastSeenVisibility: val })}
                options={[
                  { value: 'reelm_members', label: "Aynı reelm'dekiler" },
                  { value: 'friends', label: t('friends') },
                  { value: 'custom', label: 'Sadece şu kişiler...' },
                ]}
              />
            </div>
            {user.lastSeenVisibility === 'custom' && (
              <div className="accs-allow-list">
                <span className="accs-allow-list-title">Son görülmeyi kimlerle paylaş?</span>
                <input
                  className="accs-allow-list-search"
                  type="text"
                  placeholder="Arkadaş ara..."
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                />
                <div className="accs-allow-list-friends">
                  {(friends || [])
                    .filter(f => {
                      const q = friendSearch.toLowerCase()
                      return !q || (f.displayName || f.name || '').toLowerCase().includes(q) || (f.username || '').toLowerCase().includes(q)
                    })
                    .map(f => {
                      const fid = String(f.id || '')
                      const selected = (lastSeenAllowList || []).includes(fid)
                      return (
                        <button
                          key={fid}
                          type="button"
                          className={`accs-allow-list-item${selected ? ' accs-allow-list-item--on' : ''}`}
                          onClick={() => {
                            const next = selected
                              ? (lastSeenAllowList || []).filter(id => id !== fid)
                              : [...(lastSeenAllowList || []), fid]
                            onLastSeenAllowListChange?.(next)
                          }}
                        >
                          {f.photoURL
                            ? <img src={f.photoURL} alt="" className="accs-allow-avatar" />
                            : <span className="accs-allow-avatar accs-allow-avatar--placeholder">{(f.displayName || f.name || '?')[0].toUpperCase()}</span>
                          }
                          <span className="accs-allow-name">{f.displayName || f.name}</span>
                          {selected && <span className="accs-allow-check">✓</span>}
                        </button>
                      )
                    })
                  }
                  {(friends || []).length === 0 && (
                    <p className="accs-note" style={{padding: '8px 0'}}>Henüz arkadaşın yok.</p>
                  )}
                </div>
                {(lastSeenAllowList || []).length > 0 && (
                  <p className="accs-note" style={{marginTop: '6px'}}>{lastSeenAllowList.length} kişiyle paylaşılıyor</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('content_section')}</div>
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('sensitive_content')}</span>
            <p className="accs-note">{t('sensitive_content_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${sensitiveContentOn ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate?.({ sensitiveContentFilter: !sensitiveContentOn })}
          ><span className="cust-toggle-knob" /></button>
        </div>
        <div className="accs-visibility-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('vanishing_media')}</span>
            <p className="accs-note">{t('vanishing_media_desc')}</p>
          </div>
          <PillSelect
            value={user.vanishingMediaDuration || 'off'}
            onChange={val => onUpdate?.({ vanishingMediaDuration: val === 'off' ? null : val })}
            options={[
              { value: 'off', label: t('off') },
              { value: '1d', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '1mo' },
            ]}
          />
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('msg_requests_section')}</div>
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('allow_msg_requests')}</span>
            <p className="accs-note">{t('allow_msg_requests_desc')}</p>
          </div>
          <button
            type="button"
            className={`cust-toggle${user.allowMessageRequests !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate?.({ allowMessageRequests: user.allowMessageRequests === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>

      <BlockedAccountsSection blockedList={blockedList} onUnblock={onUnblock || (() => {})} />

    </div>
  )
}

export default PrivacySafetyPanel
