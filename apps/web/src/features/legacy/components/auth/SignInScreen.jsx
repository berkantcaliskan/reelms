import React, { useState, useEffect } from 'react'
import { useT } from '../../../../i18n'
import {
  isElectron,
  electronSignIn,
  electronSignInWithGoogle,
  electronCompleteGoogleAuth,
} from '../../../../electronAuth'
import {
  webSignIn,
  webSignInWithGoogle,
} from '../../../../webAuth'
import { userProfileGetById, recordUserSession } from '../../../../reelmsAwsClient'
import { getApiBaseUrl } from '../../../../config/api'
import reelmsLogo from '../../../../assets/icons/reelms-logo.svg'
import { EyeIcon, GoogleIcon } from '../icons/AppIcons'
import { DesktopDownloadButton } from '../../../desktop-download/index.js'
import { parseDeviceInfo } from '../../utils/deviceUtils'

const BACKEND_URL = getApiBaseUrl()

export function AuthLanguagePicker({ language, onLanguageChange }) {
  const [open, setOpen] = useState(false)
  const currentLang = (language || 'en').toUpperCase()

  const list = [
    { code: 'en', label: 'EN' },
    { code: 'tr', label: 'TR' },
    { code: 'de', label: 'DE' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' },
    { code: 'pt', label: 'PT' },
  ]

  return (
    <div className="auth-lang-container">
      <div className={`auth-lang-picker${open ? ' auth-lang-picker--open' : ''}`}>
        {!open ? (
          <button
            type="button"
            className="auth-lang-btn auth-lang-btn--current"
            onClick={() => setOpen(true)}
            title="Change language"
          >
            {currentLang}
          </button>
        ) : (
          <div className="auth-lang-slider">
            {list.map(l => (
              <button
                key={l.code}
                type="button"
                className={`auth-lang-btn${language === l.code ? ' auth-lang-btn--active' : ''}`}
                onClick={() => {
                  onLanguageChange(l.code)
                  setOpen(false)
                }}
              >
                {l.label}
              </button>
            ))}
            <button
              type="button"
              className="auth-lang-close"
              onClick={() => setOpen(false)}
              title="Close"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function LegacyAuthDownloadCta({ compact = false }) {
  const t = useT()
  return (
    <div className={`legacy-auth-download-cta${compact ? ' legacy-auth-download-cta--compact' : ''} su-drop su-drop-5`}>
      <DesktopDownloadButton variant="auth-text" size="sm">{t('download_app') || 'Download Reelms'}</DesktopDownloadButton>
    </div>
  )
}

export function DatePicker({ day, month, year, onDayChange, onMonthChange, onYearChange, error, onKeyDown }) {
  const t = useT()
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    t('month_jan'), t('month_feb'), t('month_mar'), t('month_apr'),
    t('month_may'), t('month_jun'), t('month_jul'), t('month_aug'),
    t('month_sep'), t('month_oct'), t('month_nov'), t('month_dec'),
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)

  return (
    <div className='date-picker-container'>
      <div className='date-inputs-row'>
        <select
          value={day}
          onChange={(e) => onDayChange(e.target.value)}
          className='date-input'
          onKeyDown={onKeyDown}
        >
          <option value=''>{t('day_ph')}</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className='date-input'
          onKeyDown={onKeyDown}
        >
          <option value=''>{t('month_ph')}</option>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className='date-input'
          onKeyDown={onKeyDown}
        >
          <option value=''>{t('year_ph')}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {error && <p className='input-error'>{error}</p>}
    </div>
  )
}

export function SignInScreen({ onGoSignUp, onSignInSuccess }) {
  const t = useT()
  const [showPassword, setShowPassword] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const [authMode, setAuthMode] = useState('signin')
  const [resetToken, setResetToken] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')

  const clearAuthMessages = () => {
    setLoginError('')
    setLoginNotice('')
  }

  async function postPublicAuth(path, body, fallbackMessage) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.message || data.error || fallbackMessage || 'Request failed')
      err.code = data.code || 'auth/unknown'
      throw err
    }
    return data
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const resetTokenParam = params.get('reset_password_token')
    const verifyToken = params.get('verify_email_token')

    if (resetTokenParam) {
      setResetToken(resetTokenParam)
      setAuthMode('reset-confirm')
      setLoginNotice('Reset link accepted. Choose a new password.')
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (verifyToken) {
      setLoginNotice('Verifying your e-mail…')
      fetch(`${BACKEND_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken })
      }).then(async (res) => {
        if (!res.ok) throw new Error('verify_failed')
        return res.json().catch(() => ({}))
      }).then(() => {
        setLoginNotice('E-mail verified. You can sign in now.')
      }).catch(() => {
        setLoginNotice('')
        setLoginError('This verification link is invalid or expired. Sign in to request a fresh one.')
      }).finally(() => {
        window.history.replaceState({}, '', window.location.pathname)
      })
      return
    }

    if (params.get('email_verified') === 'success') {
      setLoginNotice('E-mail verified. You can sign in now.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('email_verified') === 'invalid' || params.get('email_verified') === 'error' || params.get('email_verified') === 'missing') {
      setLoginError('This verification link is invalid or expired. Sign in to request a fresh one.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('password_reset') === 'success') {
      setLoginNotice('Password updated. You can sign in now.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('google_failed')) {
      setLoginError(t('google_signin_failed'))
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('google_not_configured')) {
      setLoginError('Google sign-in is not configured for this environment.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('session_replaced')) {
      setLoginError('This account was opened in another session. Please sign in again here if you want to continue on this tab.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (isElectron) {
      const handleAuth = async (data) => {
        if (typeof data === 'string') {
          try {
            const apiEndpoint = (window.reelms?.apiUrl || window.electronAPI?.apiUrl || BACKEND_URL || getApiBaseUrl()).replace(/\/$/, '')
            const resp = await fetch(`${apiEndpoint}/auth/desktop/exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: data })
            })
            if (resp.ok) {
              const res = await resp.json()
              await electronCompleteGoogleAuth(res)
              onSignInSuccess()
            }
          } catch (e) {
            console.error('Desktop auth code exchange error:', e)
          }
        } else if (data && typeof data === 'object') {
          await electronCompleteGoogleAuth(data)
          onSignInSuccess()
        }
      }
      if (window.reelms?.onAuthCode) window.reelms.onAuthCode(handleAuth)
      if (window.electronAPI?.onGoogleAuth) window.electronAPI.onGoogleAuth(handleAuth)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = async () => {
    clearAuthMessages()
    if (!loginEmail.trim()) { setLoginError(t('enter_email_or_username')); return }
    if (!loginPassword.trim()) { setLoginError(t('enter_password')); return }

    setIsSigningIn(true)
    try {
      const input = loginEmail.trim().toLowerCase()

      const cred = isElectron
        ? await electronSignIn(input, loginPassword.trim())
        : await webSignIn(input, loginPassword.trim())
      const userData = await userProfileGetById(cred.user.uid)
      if (!userData) { setLoginError(t('user_profile_not_found')); setIsSigningIn(false); return }
      try {
        await recordUserSession(parseDeviceInfo, userData.notifyNewDevice)
      } catch { /* noop */ }

      if (userData.isModerator) {
        fetch(`${BACKEND_URL}/admin/mod-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time: Date.now(), device: parseDeviceInfo(navigator.userAgent) }),
        }).catch(() => {})
      }

      onSignInSuccess()
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setLoginError(err?.message || 'No account is registered with this e-mail or username.')
      } else if (err.code === 'auth/wrong-password') {
        setLoginError('The password is incorrect.')
      } else if (err.code === 'auth/password-not-configured') {
        setLoginError('This account uses Google sign-in. Continue with Google or set a password first.')
      } else if (err.code === 'auth/invalid-credential') {
        setLoginError('No matching account was found for these sign-in details.')
      } else if (err.code === 'auth/email-not-verified') {
        setLoginError(err?.message || 'Verify your e-mail before signing in.')
      } else if (err.code === 'auth/too-many-requests') {
        setLoginError(t('too_many_login_attempts'))
      } else {
        setLoginError(err?.message || t('signin_failed_retry'))
      }
    }
    setIsSigningIn(false)
  }

  const handlePasswordResetRequest = async () => {
    clearAuthMessages()
    const identifier = loginEmail.trim()
    if (!identifier) {
      setLoginError('Enter your e-mail or username first.')
      return
    }
    setIsSigningIn(true)
    try {
      await postPublicAuth('/auth/password-reset/request', { identifier }, 'Could not send password reset e-mail.')
      setLoginNotice('If this account exists, a password reset link has been sent. Check your inbox and spam folder.')
    } catch (err) {
      setLoginError(err?.message || 'Could not send password reset e-mail.')
    }
    setIsSigningIn(false)
  }

  const handlePasswordResetConfirm = async () => {
    clearAuthMessages()
    if (!resetToken) {
      setLoginError('This reset link is missing or expired. Request a new password reset link.')
      setAuthMode('reset-request')
      return
    }
    if (resetPassword.length < 8) {
      setLoginError('New password must be at least 8 characters.')
      return
    }
    if (resetPassword !== resetConfirm) {
      setLoginError('Passwords do not match.')
      return
    }
    setIsSigningIn(true)
    try {
      await postPublicAuth('/auth/password-reset/confirm', { token: resetToken, password: resetPassword }, 'Password reset failed.')
      setResetToken('')
      setResetPassword('')
      setResetConfirm('')
      setAuthMode('signin')
      setLoginPassword('')
      setLoginNotice('Password updated. You can sign in now.')
    } catch (err) {
      if (err?.code === 'auth/invalid-action-code') {
        setLoginError('This reset link is invalid or expired. Request a new password reset link.')
      } else {
        setLoginError(err?.message || 'Password reset failed.')
      }
    }
    setIsSigningIn(false)
  }

  const handleGoogleSignIn = () => {
    if (isElectron) electronSignInWithGoogle()
    else webSignInWithGoogle()
  }

  if (authMode === 'reset-request') {
    return (
      <div className="main-content">
        <h1 className="welcome-text su-drop su-drop-1">Reset password</h1>
        <div className="signin-card-border su-drop su-drop-2">
          <div className="signin-card">
            <p className="legacy-auth-note">Enter your e-mail or username. If the account exists, we will send a reset link.</p>
            <input
              type="text"
              className="pill-input"
              placeholder={t('email_or_username_ph')}
              value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); clearAuthMessages() }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordResetRequest()}
            />
            {loginNotice && (
              <p className='input-error' style={{ marginTop: '8px', color: '#8bd89b' }}>{loginNotice}</p>
            )}
            {loginError && (
              <p className='input-error' style={{ marginTop: '8px' }}>{loginError}</p>
            )}
            <button className="pill-btn-text" onClick={handlePasswordResetRequest} disabled={isSigningIn} style={{ display: 'grid', placeItems: 'center', marginTop: loginError ? '12px' : '0' }}>
              <span style={{ opacity: isSigningIn ? 0 : 1, gridArea: '1/1' }}>Send reset link</span>
              {isSigningIn && (
                <div style={{ gridArea: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={reelmsLogo} alt="" style={{ height: '20px', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                </div>
              )}
            </button>
            <button type="button" className="legacy-auth-secondary-link" onClick={() => { setAuthMode('signin'); clearAuthMessages() }}>Back to sign in</button>
          </div>
        </div>
        <LegacyAuthDownloadCta />
      </div>
    )
  }

  if (authMode === 'reset-confirm') {
    return (
      <div className="main-content">
        <h1 className="welcome-text su-drop su-drop-1">Choose new password</h1>
        <div className="signin-card-border su-drop su-drop-2">
          <div className="signin-card">
            <p className="legacy-auth-note">Enter a new password for your Reelms account.</p>
            <input
              type="password"
              className="pill-input"
              placeholder="New password"
              value={resetPassword}
              autoComplete="new-password"
              onChange={e => { setResetPassword(e.target.value); clearAuthMessages() }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordResetConfirm()}
            />
            <input
              type="password"
              className="pill-input"
              placeholder="Confirm new password"
              value={resetConfirm}
              autoComplete="new-password"
              onChange={e => { setResetConfirm(e.target.value); clearAuthMessages() }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordResetConfirm()}
            />
            {loginNotice && (
              <p className='input-error' style={{ marginTop: '8px', color: '#8bd89b' }}>{loginNotice}</p>
            )}
            {loginError && (
              <p className='input-error' style={{ marginTop: '8px' }}>{loginError}</p>
            )}
            <button className="pill-btn-text" onClick={handlePasswordResetConfirm} disabled={isSigningIn} style={{ display: 'grid', placeItems: 'center', marginTop: loginError ? '12px' : '0' }}>
              <span style={{ opacity: isSigningIn ? 0 : 1, gridArea: '1/1' }}>Update password</span>
              {isSigningIn && (
                <div style={{ gridArea: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={reelmsLogo} alt="" style={{ height: '20px', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                </div>
              )}
            </button>
            <button type="button" className="legacy-auth-secondary-link" onClick={() => { setAuthMode('signin'); clearAuthMessages(); setResetToken('') }}>Back to sign in</button>
          </div>
        </div>
        <LegacyAuthDownloadCta />
      </div>
    )
  }

  return (
    <div className="main-content">
      <h1 className="welcome-text su-drop su-drop-1">{t('welcome_to_reelm')}</h1>
      <div className="signin-card-border su-drop su-drop-2">
        <div className="signin-card">
          <input
            type="text"
            className="pill-input"
            placeholder={t('email_or_username_ph')}
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); clearAuthMessages() }}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />
          <div className="password-row">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="pill-input"
                placeholder={t('password_placeholder')}
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); clearAuthMessages() }}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              />
              <button
                className="eye-btn"
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <button type="button" className="forgot-link" onClick={() => { setAuthMode('reset-request'); clearAuthMessages() }}>{t('forgot_password')}</button>
          </div>
          {loginNotice && (
            <p className='input-error' style={{ marginTop: '8px', color: '#8bd89b' }}>{loginNotice}</p>
          )}
          {loginError && (
            <p className='input-error' style={{ marginTop: '8px' }}>{loginError}</p>
          )}
          <button className="pill-btn-text" onClick={handleSignIn} disabled={isSigningIn} style={{ display: 'grid', placeItems: 'center', marginTop: loginError ? '12px' : '0' }}>
            <span style={{ opacity: isSigningIn ? 0 : 1, gridArea: '1/1' }}>{t('sign_in')}</span>
            {isSigningIn && (
              <div style={{
                gridArea: '1/1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={reelmsLogo}
                  alt=""
                  style={{
                    height: '20px',
                    animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                />
              </div>
            )}
          </button>
        </div>
      </div>
      <div className="social-login su-drop su-drop-3">
        <button className="social-btn social-btn-wide" onClick={handleGoogleSignIn} disabled={isSigningIn}><GoogleIcon /><span>{t('continue_google')}</span></button>
      </div>
      <p className="signup-link su-drop su-drop-4">
        {t('no_account_text')} <span onClick={onGoSignUp}>{t('create_one')}</span>
      </p>
      <LegacyAuthDownloadCta />
    </div>
  )
}

export default SignInScreen
