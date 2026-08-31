import React, { useState } from 'react'
import { useT } from '../../../../i18n'
import { userCheckUsername, userCheckEmail, userGetDoc, userProfileDelete, reelmGetDoc } from '../../../../reelmsAwsClient'

export function AccountSettingsPanel({ user, onUpdate, onLogOut, profileBio, onBioChange, spotifyConnected, onSpotifyConnect, onSpotifyDisconnect, reelms = [], onOpenProfileEdit }) {
  const t = useT()

  const [nameInput, setNameInput] = useState(user?.name || '')
  const [usernameInput, setUsernameInput] = useState(user?.username || '')
  const [usernameError, setUsernameError] = useState('')
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [bioInput, setBioInput] = useState(profileBio || user?.bio || '')
  const [contactInput, setContactInput] = useState(user?.contact || '')
  const [nameSaved, setNameSaved] = useState(false)
  const [bioSaved, setBioSaved] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [contactError, setContactError] = useState('')

  const saveName = () => {
    if (!nameInput.trim()) return
    onUpdate?.({ name: nameInput.trim() })
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  const saveUsername = async () => {
    const val = usernameInput.trim()
    if (!val) return
    if (val === (user?.username || '')) return
    const usernameAvailability = await userCheckUsername(val)
    if (usernameAvailability?.exists || usernameAvailability === false) {
      setUsernameError(t('username_taken'))
      return
    }
    setUsernameError('')
    try {
      await onUpdate?.({ username: val })
      setUsernameSaved(true)
      setTimeout(() => setUsernameSaved(false), 2000)
    } catch (err) {
      if (err?.code === 'auth/username-change-rate-limited') {
        const days = Number(err?.payload?.retryAfterDays || err?.retryAfterDays) || 0
        setUsernameError(t('username_change_limited').replace('{days}', String(days)))
      } else {
        setUsernameError(err?.message || t('username_taken'))
      }
      setUsernameInput(user?.username || '')
    }
  }

  const saveBio = () => {
    onBioChange?.(bioInput)
    onUpdate?.({ bio: bioInput })
    setBioSaved(true)
    setTimeout(() => setBioSaved(false), 2000)
  }

  const saveContact = async () => {
    if (!contactInput.trim()) return
    const emailAvailability = await userCheckEmail(contactInput.trim())
    if (emailAvailability?.exists || emailAvailability === false) {
      setContactError(t('error_email_in_use'))
      return
    }
    setContactError('')
    onUpdate?.({ contact: contactInput.trim() })
    setContactSaved(true)
    setTimeout(() => setContactSaved(false), 2000)
  }

  const downloadUserData = async (format) => {
    const uid = user?.id
    let friends = []
    try {
      const f = await userGetDoc('friends')
      friends = Array.isArray(f) ? f : []
    } catch { friends = [] }
    const reelmsList = Array.isArray(reelms) ? reelms : []
    const articles = []
    const posts = []
    for (const r of reelmsList) {
      try {
        const arts = (await reelmGetDoc(r.id, 'articles')) || []
        const ps = (await reelmGetDoc(r.id, 'feed_posts')) || []
        if (Array.isArray(arts)) arts.filter(a => a.userId === uid).forEach(a => articles.push({ ...a, reelmName: r.name }))
        if (Array.isArray(ps)) ps.filter(p => p.userId === uid).forEach(p => posts.push({ ...p, reelmName: r.name }))
      } catch { /* skip reelm */ }
    }
    const joined = new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #222; max-width: 760px; margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; margin: 32px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  .sub { color: #888; font-size: 13px; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  td:first-child { color: #666; width: 170px; font-weight: 600; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 4px; font-size: 13.5px; }
  .empty { color: #aaa; font-size: 13px; font-style: italic; }
</style>
</head><body>
<h1>Your Reelms Data</h1>
<p class="sub">Downloaded on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<h2>Profile</h2>
<table>
  <tr><td>Name</td><td>${user?.name || '—'}</td></tr>
  <tr><td>Username</td><td>@${user?.username || '—'}</td></tr>
  <tr><td>Bio</td><td>${user?.bio || profileBio || '—'}</td></tr>
  <tr><td>Contact</td><td>${user?.contact || '—'}</td></tr>
  <tr><td>Birth Date</td><td>${user?.birthDate || '—'}</td></tr>
  <tr><td>Joined</td><td>${joined}</td></tr>
</table>
<h2>Friends (${friends.length})</h2>
${friends.length ? `<ul>${friends.map(f => `<li>${f.name || f.username} (@${f.username})</li>`).join('')}</ul>` : '<p class="empty">No friends yet.</p>'}
<h2>Reelms (${reelmsList.length})</h2>
${reelmsList.length ? `<ul>${reelmsList.map(r => `<li>${r.name} — joined ${new Date(r.joinedAt || r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</li>`).join('')}</ul>` : '<p class="empty">Not a member of any reelm.</p>'}
<h2>Articles Authored (${articles.length})</h2>
${articles.length ? `<ul>${articles.map(a => `<li><strong>${a.title}</strong> — ${a.reelmName} — ${new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</li>`).join('')}</ul>` : '<p class="empty">No articles authored.</p>'}
<h2>Feed Posts (${posts.length})</h2>
${posts.length ? `<ul>${posts.map(p => { const raw = (p.text || p.content || '').replace(/<[^>]+>/g, '').slice(0, 120); return `<li>${raw || '(media post)'} — ${p.reelmName} — ${new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</li>` }).join('')}</ul>` : '<p class="empty">No posts yet.</p>'}
</body></html>`
    if (format === 'pdf') {
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      setTimeout(() => { win.focus(); win.print() }, 400)
    } else {
      const blob = new Blob([`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html}</html>`], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reelms_data_${user?.username || user?.id}.doc`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  const freezeAccount = () => {
    if (user?.isSystem) {
      window.alert('This is a permanent system account and cannot be frozen.')
      return
    }
    if (!window.confirm('Brrr... Entering cryogenic sleep? ❄️ You can thaw your account anytime just by signing back in.')) return
    onUpdate?.({ frozen: true })
    onLogOut?.()
  }

  const closeAccount = async () => {
    if (user?.isSystem) {
      window.alert('This is a permanent system account and cannot be deleted.')
      return
    }
    if (!window.confirm('Permanent game over? 💀 There are no respawn points in the digital void. Are you absolutely sure you want to delete your entire account?')) return
    await userProfileDelete().catch(() => {})
    onLogOut?.()
  }

  const memberSinceFormatted = (() => {
    const raw = user?.createdAt || user?.created_at || user?.registeredAt
    if (!raw) return t('recently_joined') || 'Recently Joined'
    const ts = typeof raw === 'number' && raw < 1e12 ? raw * 1000 : (typeof raw === 'string' && !isNaN(Number(raw)) ? Number(raw) : raw)
    const date = new Date(ts)
    if (isNaN(date.getTime())) return t('recently_joined') || 'Recently Joined'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  })()

  return (
    <div className="accs-panel">
      {/* 1. Username */}
      <div className="accs-section">
        <div className="accs-section-title">{t('username')}</div>
        <div className="accs-field-row">
          <input
            className="accs-input"
            value={usernameInput}
            onChange={e => { setUsernameInput(e.target.value.replace(/\s/g, '')); setUsernameError('') }}
            placeholder={t('username')}
          />
          <button type="button" className="accs-btn" onClick={saveUsername}>{usernameSaved ? t('saved') : t('save')}</button>
        </div>
        {usernameError && <p className="accs-error">{usernameError}</p>}
      </div>

      {onOpenProfileEdit && (
        <div className="accs-section accs-section--profile-link">
          <button type="button" className="accs-profile-link" onClick={onOpenProfileEdit}>
            Edit your profile here
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}

      {/* 2. Email */}
      <div className="accs-section">
        <div className="accs-section-title">{t('email')}</div>
        <div className="accs-field-row">
          <input className="accs-input" type="email" value={contactInput} onChange={e => { setContactInput(e.target.value); setContactError('') }} placeholder={t('email_placeholder')} />
          <button type="button" className="accs-btn" onClick={saveContact}>{contactSaved ? t('saved') : t('save')}</button>
        </div>
        {contactError && <p className="accs-error">{contactError}</p>}
        <p className="accs-note">{t('email_signin_note')}</p>
      </div>

      {/* 3. Member Since */}
      <div className="accs-section">
        <div className="accs-section-title">{t('member_since') || 'Member Since'}</div>
        <div className="accs-member-since-display">
          <span className="accs-member-cake-icon">🎂</span>
          <span className="accs-member-since-date">{memberSinceFormatted}</span>
        </div>
      </div>

      {/* 4. Account Status */}
      <div className="accs-section">
        <div className="accs-section-title">{t('account_status') || 'Account Status'}</div>
        <div className="accs-status-card">
          <div className="accs-status-header">
            <span className="accs-status-dot accs-status-dot--active" />
            <span className="accs-status-title">Active & In Good Standing</span>
          </div>
          <p className="accs-note" style={{ margin: '4px 0 0 0' }}>
            All Reelms capabilities, synchronized channels, cloud backups, and voice rooms are fully active.
          </p>
        </div>
      </div>

      {/* 5. Your Data */}
      <div className="accs-section">
        <div className="accs-section-title">{t('your_data')}</div>
        <p className="accs-note" style={{marginBottom: '14px'}}>{t('data_download_desc')}</p>
        <div style={{display: 'flex', gap: '10px'}}>
          <button type="button" className="accs-data-btn" onClick={() => downloadUserData('pdf')}>{t('download_pdf')}</button>
          <button type="button" className="accs-data-btn" onClick={() => downloadUserData('word')}>{t('download_word')}</button>
        </div>
      </div>

      {/* 6. Account Actions */}
      {!user?.isSystem && (
      <div className="accs-section accs-section-danger">
        <div className="accs-section-title accs-danger-title">{t('account_actions')}</div>
        <div className="accs-danger-row">
          <div className="accs-danger-item">
            <div>
              <span className="accs-danger-label">{t('account_freeze')}</span>
              <p className="accs-note">
                Are you sure? It gets pretty chilly out there in cryo-sleep. 🥶 You can thaw your account and jump back in whenever you log in.
              </p>
            </div>
            <button type="button" className="accs-btn accs-btn-danger" onClick={freezeAccount}>{t('freeze')}</button>
          </div>
          <div className="accs-danger-item">
            <div>
              <span className="accs-danger-label">{t('close_account_label')}</span>
              <p className="accs-note">
                Ready to pull the plug? Once you jump into the digital void, you vanish forever. No respawns, no extra lives, no backup saves. 🕳️💀
              </p>
            </div>
            <button type="button" className="accs-btn accs-btn-danger" onClick={closeAccount}>{t('close')}</button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

export default AccountSettingsPanel
