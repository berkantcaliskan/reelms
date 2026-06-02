import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getT, LANGUAGES, LanguageContext, useT } from '../../i18n'
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation'
import EmojiPickerReact, { EmojiStyle } from 'emoji-picker-react'
import ReactDOM from 'react-dom'
import {
  isElectron,
  electronSignIn,
  electronRegister,
  electronSignOut,
  electronOnAuthStateChanged,
  getElectronCurrentUser,
  electronSignInWithGoogle,
  electronCompleteGoogleAuth,
} from '../../electronAuth'
import {
  webSignIn,
  webRegister,
  webSignOut,
  webOnAuthStateChanged,
  getWebCurrentUser,
  webSignInWithGoogle,
} from '../../webAuth'
import reelmsLogo from '../../assets/icons/reelms-logo.svg'
import newIcon from '../../assets/icons/new-icon.svg'
// import settingsIcon from '../../assets/icons/settings-icon.svg'
import feedIcon from '../../assets/icons/feed-icon.svg'
import articlesIcon from '../../assets/icons/articles-icon.svg'
import forumsIcon from '../../assets/icons/forums-icon_reelms.svg'
import readyreelmIcon from '../../assets/icons/readyreelm-icon.svg'
import newdmIcon from '../../assets/icons/newdm-icon.svg'
import newgroupIcon from '../../assets/icons/newgroup-icon.svg'
import notificationIcon from '../../assets/icons/notification-icon_reelms.svg'
import friendsIcon from '../../assets/icons/friends-icon_reelms.svg'
import avatarUIcon from '../../assets/icons/avataru-icon.svg'
import channelGeneralIcon from '../../assets/icons/channel-general.svg'
import channelTextIcon from '../../assets/icons/channel-text.svg'
import channelMultimediaIcon from '../../assets/icons/channel-multimedia.svg'
import channelLiveactionIcon from '../../assets/icons/channel-liveaction.svg'
import discoverIcon from '../../assets/icons/discover-icon.svg'
import sendIcon from '../../assets/icons/send.svg'
import messagesIcon from '../../assets/icons/messages.svg'
import likePostIcon from '../../assets/icons/likepost-icon_reelms.svg'
import commentPostIcon from '../../assets/icons/commentpost-icon.svg'
import resharePostIcon from '../../assets/icons/resharepost-icon_reelms.svg'
import forwardPostIcon from '../../assets/icons/forwardpost-icon_reelms.svg'
import { getApiBaseUrl } from '../../config/api'
import './LegacyReelmsApp.css'
import {
  REELM_CACHE,
  patchReelmCache,
  scheduleReelmPersist,
  scheduleUserPersist,
  scheduleAppPersist,
  userBootstrap,
  userGetDoc,
  userPutDoc,
  loadReelmDocuments,
  connectReelmsSocket,
  socketJoinReelm,
  socketLeaveReelm,
  socketJoinChannel,
  socketLeaveChannel,
  socketEmitVoicePosition,
  socketVcJoin,
  socketVcLeave,
  socketVcSignal,
  socketVcBroadcast,
  socketRequestVcCounts,
  messagesGet,
  messageSend,
  messageDelete,
  reactionsGet,
  reactionsToggle,
  socialNotify,
  socialFriendRequest,
  socialFriendAccept,
  socialFriendReject,
  socialRemoveFriend,
  socialMessageRequest,
  recordUserSession,
  touchUserSession,
  appGetDoc,
  appPutDoc,
  reelmGetDoc,
  reelmPutDoc,
  modInboxGet,
  modReportSend,
  reelmByCode,
  createReelmRemote,
  joinReelmByCode,
  adminAllReelms,
  userProfilePut,
  userProfilePatch,
  userProfileGetById,
  userProfileDelete,
  userByUsername,
  // userByEmail, // unused
  userCheckUsername,
  userCheckEmail,
  usersList,
  getIdToken,
  feedbackSend,
} from '../../reelmsAwsClient'
import { seedModerationAccount } from '../../reelmsModerationAccount'
import { moderateText } from '../../moderationClient'
import { playSound, applySoundSettings, previewSound, SOUND_CATEGORIES, SOUND_DEFAULTS } from '../../soundManager'
import { DesktopDownloadButton, DesktopDownloadSettingsPanel } from '../desktop-download/index.js'
import { useAuthSession as useCentralAuthSession } from '../../app/providers/AuthSessionProvider.jsx'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}


function LegacyAuthDownloadCta({ compact = false }) {
  return (
    <div className={`legacy-auth-download-cta${compact ? ' legacy-auth-download-cta--compact' : ''} su-drop su-drop-5`}>
      <span className="legacy-auth-download-cta__text">Windows uygulaması da hazır olduğunda aynı hesapla devam et.</span>
      <DesktopDownloadButton variant="auth" size="sm">Windows uygulamasını indir</DesktopDownloadButton>
    </div>
  )
}

function SignInScreen({ onGoSignUp, onSignInSuccess }) {
  const t = useT()
  const [showPassword, setShowPassword] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_failed')) {
      setLoginError(t('google_signin_failed'))
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (isElectron && window.electronAPI?.onGoogleAuth) {
      window.electronAPI.onGoogleAuth((data) => {
        electronCompleteGoogleAuth(data)
        onSignInSuccess()
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = async () => {
    setLoginError('')
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setLoginError(t('invalid_email_or_password'))
      } else if (err.code === 'auth/user-not-found') {
        setLoginError(t('no_account_signup_first'))
      } else if (err.code === 'auth/too-many-requests') {
        setLoginError(t('too_many_login_attempts'))
      } else {
        setLoginError(t('signin_failed_retry'))
      }
    }
    setIsSigningIn(false)
  }

  const handleGoogleSignIn = () => {
    if (isElectron) electronSignInWithGoogle()
    else webSignInWithGoogle()
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
            onChange={e => { setLoginEmail(e.target.value); setLoginError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          />
          <div className="password-row">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="pill-input"
                placeholder={t('password_placeholder')}
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
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
            <span className="forgot-link">{t('forgot_password')}</span>
          </div>
          {loginError && (
            <p className='input-error' style={{ marginTop: '8px' }}>{loginError}</p>
          )}
          <button className="pill-btn-text" onClick={handleSignIn} style={{ display: 'grid', placeItems: 'center', marginTop: loginError ? '12px' : '0' }}>
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

function DatePicker({ day, month, year, onDayChange, onMonthChange, onYearChange, error }) {
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
        >
          <option value=''>{t('day_ph')}</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className='date-input'
        >
          <option value=''>{t('month_ph')}</option>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className='date-input'
        >
          <option value=''>{t('year_ph')}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {error && <p className='input-error'>{error}</p>}
    </div>
  )
}

function SettingsIcon() {
  const [hovered, setHovered] = useState(false)
  const transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  return (
    <svg
      viewBox="0 0 360 360" width="28" height="28"
      style={{ display: 'block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <g>
        <path fill="#0c0c20" d="M 284.652344 0 C 326.394531 0 360 33.605469 360 75.347656 C 360 117.09375 326.394531 150.699219 284.652344 150.699219 L 75.347656 150.699219 C 33.605469 150.699219 0 117.09375 0 75.347656 C 0 33.605469 33.605469 0 75.347656 0 Z"/>
        <circle
          cx="284.652344" cy="75.347656" r="41.861328"
          style={{ fill: 'var(--ta)', transition, transform: hovered ? 'translateX(-16.3px)' : 'translateX(0)' }}
        />
      </g>
      <g>
        <path fill="#0c0c20" d="M 284.652344 209.304688 C 326.394531 209.304688 360 242.910156 360 284.652344 C 360 326.394531 326.394531 360 284.652344 360 L 75.347656 360 C 33.605469 360 0 326.394531 0 284.652344 C 0 242.910156 33.605469 209.304688 75.347656 209.304688 Z"/>
        <circle
          cx="75.347656" cy="284.652344" r="41.861328"
          style={{ fill: 'var(--ta)', transition, transform: hovered ? 'translateX(16.3px)' : 'translateX(0)' }}
        />
      </g>
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.41a8.16 8.16 0 004.77 1.52V7.48a4.85 4.85 0 01-1-.79z"/>
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function DiscordSocialIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.102.134 18.116a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

function SnapchatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.008.14-.016.28-.022.42.017.01.05.03.108.036.37.037.887-.11 1.226-.199.079-.02.152-.038.213-.05.055-.012.11-.018.163-.018.25 0 .475.12.636.342.246.33.077.7-.008.87-.026.052-.271.527-.693.698-.062.024-.13.046-.198.067-.398.122-.94.29-1.111.728-.028.073-.042.15-.042.23 0 .194.08.345.094.374.119.24.375.5.548.656.173.155.321.294.434.462.193.283.293.587.293.895 0 .5-.274.91-.728 1.118-.193.09-.41.14-.64.14-.168 0-.34-.026-.509-.079-.158-.052-.317-.11-.478-.17-.19-.071-.38-.14-.565-.14-.18 0-.32.04-.43.07-.09.028-.167.05-.24.05-.077 0-.143-.018-.217-.047-.147-.058-.28-.132-.396-.196-.25-.138-.444-.233-.63-.233-.193 0-.383.095-.57.23-.138.1-.26.175-.37.235l-.002.002c-.28.153-.596.287-.92.287-.226 0-.432-.05-.615-.15l-.006-.003c-.272-.146-.503-.37-.735-.594-.208-.2-.42-.408-.644-.534-.212-.12-.45-.175-.708-.175-.26 0-.497.054-.71.175-.224.126-.436.334-.644.534-.232.224-.463.448-.735.594l-.006.003c-.183.1-.39.15-.615.15-.324 0-.64-.134-.92-.287l-.002-.002c-.11-.06-.232-.135-.37-.235-.187-.135-.377-.23-.57-.23-.186 0-.38.095-.63.233-.116.064-.249.138-.396.196-.074.029-.14.047-.217.047-.073 0-.15-.022-.24-.05-.11-.03-.25-.07-.43-.07-.185 0-.375.069-.565.14-.161.06-.32.118-.478.17-.169.053-.341.079-.509.079-.23 0-.447-.05-.64-.14-.454-.208-.728-.618-.728-1.118 0-.308.1-.612.293-.895.113-.168.261-.307.434-.462.173-.156.429-.416.548-.656.014-.029.094-.18.094-.374 0-.08-.014-.157-.042-.23-.171-.438-.713-.606-1.111-.728-.068-.021-.136-.043-.198-.067-.422-.171-.667-.646-.693-.698-.085-.17-.254-.54-.008-.87.161-.222.386-.342.636-.342.053 0 .108.006.163.018.061.012.134.03.213.05.339.089.856.236 1.226.199.058-.006.091-.026.108-.036-.006-.14-.014-.28-.022-.42l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z"/>
    </svg>
  )
}

function CustomLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function SpotifyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function _hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255
  const g = parseInt(hex.slice(3,5), 16) / 255
  const b = parseInt(hex.slice(5,7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s: s * 100, l: l * 100 }
}
function makeIconFilter(baseHex) {
  const base = _hexToHsl(baseHex)
  return function(accent) {
    const { h, s } = _hexToHsl(accent)
    const rotation = h - base.h
    const satScale = base.s > 0 ? s / base.s : 1
    return `hue-rotate(${rotation.toFixed(1)}deg) saturate(${satScale.toFixed(2)})`
  }
}
const categoryIconFilter    = makeIconFilter('#68c586')
const headerIconThemeFilter = makeIconFilter('#b99887')
const newIconThemeFilter    = makeIconFilter('#c49c7a')

const capBadge = (n) => n > 99 ? '99+' : n

function PillSelect({ value, onChange, options }) {
  return (
    <div className="pill-select">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`pill-select-opt${value === o.value ? ' pill-select-opt--on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onChange(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const THEMES = [
  { id: 'default',  name: 'Default Warm', accent: '#b99887', accentRgb: '185,152,135', base: '#0c0c20', baseRgb: '12,12,32' },
  { id: 'stone',    name: 'Stone',     accent: '#c8bfa8', accentRgb: '200,191,168', base: '#383835', baseRgb: '56,56,53', noGradient: true },
  { id: 'sage',     name: 'Sage',      accent: '#68c586', accentRgb: '104,197,134', base: '#0d1d14', baseRgb: '13,29,20' },
  { id: 'rose',     name: 'Rose',      accent: '#e8a4b8', accentRgb: '232,164,184', base: '#1a0d12', baseRgb: '26,13,18' },
  { id: 'crimson',  name: 'Crimson',   accent: '#d46e82', accentRgb: '212,110,130', base: '#18080d', baseRgb: '24,8,13' },
  { id: 'sky',      name: 'Sky',       accent: '#7fc8e8', accentRgb: '127,200,232', base: '#0a1520', baseRgb: '10,21,32' },
  { id: 'ocean',    name: 'Ocean',     accent: '#4a96be', accentRgb: '74,150,190',  base: '#080f1a', baseRgb: '8,15,26' },
  { id: 'lavender', name: 'Lavender',  accent: '#c0a8e0', accentRgb: '192,168,224', base: '#120d1a', baseRgb: '18,13,26' },
  { id: 'dusk',     name: 'Dusk',      accent: '#9070c0', accentRgb: '144,112,192', base: '#0d0a18', baseRgb: '13,10,24' },
  { id: 'peach',    name: 'Peach',     accent: '#f0a06a', accentRgb: '240,160,106', base: '#1a0e08', baseRgb: '26,14,8' },
  { id: 'amber',    name: 'Amber',     accent: '#d4a030', accentRgb: '212,160,48',  base: '#180f00', baseRgb: '24,15,0' },
  { id: 'lemon',    name: 'Lemon',     accent: '#c8c040', accentRgb: '200,192,64',  base: '#161400', baseRgb: '22,20,0' },
]

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `${r},${g},${b}`
}
// hexLum removed — unused
function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const DEFAULT_CUSTOMIZATION = {
  themeId: 'default',
  bgImage: null,
  reduceBlur: false,
  showCategoryIcons: true,
  showTimestamps: true,
  customAccent: null,
  customBase: null,
  customTextColor: 'white',
}

function EnvToggle({ k, def = false, v, set }) {
  return (
    <button
      className={`cust-toggle${v(k, def) ? ' cust-toggle-on' : ''}`}
      onClick={() => set(k, !v(k, def))}
    ><span className="cust-toggle-knob" /></button>
  )
}

function EnvSelect({ k, def, options, v, set }) {
  return (
    <PillSelect value={v(k, def)} onChange={(val) => set(k, val)} options={options} />
  )
}

function EnvSlider({ k, def, min, max, step = 1, disabled = false, v, set }) {
  return (
    <input
      type="range"
      className="env-slider"
      min={min} max={max} step={step}
      value={v(k, def)}
      disabled={disabled}
      onChange={e => set(k, Number(e.target.value))}
    />
  )
}

function EnvironmentPanel({ uid }) {
  const t = useT()
  const [env, setEnv] = useState({})
  useEffect(() => {
    if (!uid || uid === 'guest') return
    let cancel = false
    userGetDoc('environment').then((d) => {
      if (cancel) return
      setEnv(d && typeof d === 'object' ? d : {})
    }).catch(() => {})
    return () => { cancel = true }
  }, [uid])

  const set = (key, value) => {
    setEnv(prev => {
      const next = { ...prev, [key]: value }
      scheduleUserPersist('environment', next)
      return next
    })
  }

  const v = (key, def) => env[key] ?? def

  return (
    <div className="accs-panel">

      {/* ── Audio ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('audio_section')}</div>

        <div className="accs-visibility-row">
          <div>
            <span className="cust-toggle-label">{t('microphone_label')}</span>
            <p className="accs-note">{t('microphone_desc')}</p>
          </div>
          <EnvSelect k="micDevice" def="default" options={[
            { value: 'default', label: t('default_microphone') },
            { value: 'system', label: t('system_microphone') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 12 }}>
          <div>
            <span className="cust-toggle-label">{t('speaker_label')}</span>
            <p className="accs-note">{t('speaker_desc')}</p>
          </div>
          <EnvSelect k="speakerDevice" def="default" options={[
            { value: 'default', label: t('default_speaker') },
            { value: 'system', label: t('system_speaker') },
          ]} v={v} set={set} />
        </div>

        <div className="env-slider-row" style={{ marginTop: 16 }}>
          <div className="env-slider-label-row">
            <span className="cust-toggle-label">{t('input_volume_label')}</span>
            <span className="env-slider-value">{v('inputVolume', 80)}%</span>
          </div>
          <EnvSlider k="inputVolume" def={80} min={0} max={100} v={v} set={set} />
        </div>

        <div className="env-slider-row" style={{ marginTop: 12 }}>
          <div className="env-slider-label-row">
            <span className="cust-toggle-label">{t('output_volume_label')}</span>
            <span className="env-slider-value">{v('outputVolume', 100)}%</span>
          </div>
          <EnvSlider k="outputVolume" def={100} min={0} max={100} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('noise_suppression_label')}</span>
            <p className="accs-note">{t('noise_suppression_desc')}</p>
          </div>
          <EnvToggle k="noiseSuppression" def={true} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('echo_cancellation_label')}</span>
            <p className="accs-note">{t('echo_cancellation_desc')}</p>
          </div>
          <EnvToggle k="echoCancellation" def={true} v={v} set={set} />
        </div>
      </div>

      {/* ── Spatial Audio ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('spatial_audio')}</div>

        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('enable_spatial_audio')}</span>
            <p className="accs-note">{t('spatial_audio_desc')}</p>
          </div>
          <EnvToggle k="spatialAudio" def={false} v={v} set={set} />
        </div>

        <div className="env-slider-row" style={{ marginTop: 16 }}>
          <div className="env-slider-label-row">
            <span className="cust-toggle-label" style={{ opacity: v('spatialAudio', false) ? 1 : 0.4 }}>{t('spatial_depth_label')}</span>
            <span className="env-slider-value" style={{ opacity: v('spatialAudio', false) ? 1 : 0.4 }}>{v('spatialDepth', 50)}%</span>
          </div>
          <EnvSlider k="spatialDepth" def={50} min={0} max={100} disabled={!v('spatialAudio', false)} v={v} set={set} />
        </div>
      </div>

      {/* ── Video ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('video')}</div>

        <div className="accs-visibility-row">
          <div>
            <span className="cust-toggle-label">{t('camera')}</span>
            <p className="accs-note">{t('camera_desc')}</p>
          </div>
          <EnvSelect k="cameraDevice" def="default" options={[
            { value: 'default', label: t('default_camera') },
            { value: 'system', label: t('system_camera') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 12 }}>
          <div>
            <span className="cust-toggle-label">{t('video_quality_label')}</span>
            <p className="accs-note">{t('video_quality_desc')}</p>
          </div>
          <EnvSelect k="videoQuality" def="auto" options={[
            { value: 'auto', label: t('video_quality_auto') },
            { value: 'low', label: t('video_quality_low') },
            { value: 'medium', label: t('video_quality_medium') },
            { value: 'high', label: t('video_quality_high') },
          ]} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('mirror_camera_label')}</span>
            <p className="accs-note">{t('mirror_camera_desc')}</p>
          </div>
          <EnvToggle k="mirrorCamera" def={true} v={v} set={set} />
        </div>
      </div>

      {/* ── Screen Sharing ── */}
      <div className="accs-section">
        <div className="accs-section-title">{t('screen_sharing_section')}</div>

        <div className="accs-visibility-row">
          <div>
            <span className="cust-toggle-label">{t('frame_rate_label')}</span>
            <p className="accs-note">{t('frame_rate_desc')}</p>
          </div>
          <EnvSelect k="screenFps" def="30" options={[
            { value: '15', label: t('fps_15') },
            { value: '30', label: t('fps_30') },
            { value: '60', label: t('fps_60') },
          ]} v={v} set={set} />
        </div>

        <div className="accs-visibility-row" style={{ marginTop: 12 }}>
          <div>
            <span className="cust-toggle-label">{t('resolution_label')}</span>
            <p className="accs-note">{t('resolution_desc')}</p>
          </div>
          <EnvSelect k="screenResolution" def="1080p" options={[
            { value: '720p', label: t('res_720p') },
            { value: '1080p', label: t('res_1080p') },
            { value: '4k', label: t('res_4k') },
          ]} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 16 }}>
          <div>
            <span className="cust-toggle-label">{t('share_sys_audio')}</span>
            <p className="accs-note">{t('share_sys_audio_desc')}</p>
          </div>
          <EnvToggle k="screenShareAudio" def={false} v={v} set={set} />
        </div>

        <div className="cust-toggle-row" style={{ marginTop: 14 }}>
          <div>
            <span className="cust-toggle-label">{t('show_cursor')}</span>
            <p className="accs-note">{t('show_cursor_desc')}</p>
          </div>
          <EnvToggle k="screenShowCursor" def={true} v={v} set={set} />
        </div>
      </div>

    </div>
  )
}

function CustomizationPanel({ customization, onChange, bodyFont, BODY_FONTS, onFontChange }) {
  const t = useT()
  const bgInputRef = useRef(null)
  const currentTheme = THEMES.find(th => th.id === customization.themeId) || THEMES[0]
  const [openSpectrum, setOpenSpectrum] = useState(null)

  const pickSpectrum = (e, key) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hue = (x / rect.width) * 360
    const yN  = y / rect.height
    const l   = yN < 0.5 ? 100 - 100 * yN : 100 * (1 - yN)
    const s   = yN < 0.5 ? 100 * (yN * 2) : 100
    onChange({ [key]: hslToHex(hue, s, l) })
  }

  const compressImageToDataUrl = async (file) => {
    // Keep story background images small (payload size).
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsDataURL(file)
    })

    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image decode failed'))
      el.src = dataUrl
    })

    const maxSide = 1600
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, w, h)

    // Prefer webp where available, fallback to jpeg.
    const webp = canvas.toDataURL('image/webp', 0.82)
    if (webp && webp.startsWith('data:image/webp')) return webp
    return canvas.toDataURL('image/jpeg', 0.84)
  }

  return (
    <div className="accs-panel">
      <div className="accs-section">
        <div className="accs-section-title">{t('background')}</div>
        <div className="cust-bg-area">
          {customization.bgImage ? (
            <div className="cust-bg-preview" style={{ backgroundImage: `url(${customization.bgImage})` }}>
              <button className="cust-bg-remove" onClick={() => onChange({ bgImage: null })}>{t('remove')}</button>
            </div>
          ) : (
            <button className="cust-btn-upload" onClick={() => bgInputRef.current?.click()}>
              {t('upload_bg')}
            </button>
          )}
          <input
            type="file" accept="image/*" ref={bgInputRef} style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files[0]
              if (!file) return
              ;(async () => {
                try {
                  const safeDataUrl = await compressImageToDataUrl(file)
                  onChange({ bgImage: safeDataUrl })
                } catch (err) {
                  console.warn('Background image could not be processed:', err)
                }
              })()
              e.target.value = ''
            }}
          />
        </div>
        {customization.bgImage && (
          <div className="cust-toggle-row" style={{ marginTop: '14px' }}>
            <div>
              <span className="cust-toggle-label">{t('reduce_blur')}</span>
              <p className="accs-note">{t('reduce_blur_desc')}</p>
            </div>
            <button
              className={`cust-toggle${customization.reduceBlur ? ' cust-toggle-on' : ''}`}
              onClick={() => onChange({ reduceBlur: !customization.reduceBlur })}
            ><span className="cust-toggle-knob" /></button>
          </div>
        )}
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('theme_section')}</div>
        <div className="cust-theme-grid">
          {THEMES.map(th => (
            <button
              key={th.id}
              className={`cust-theme-swatch${customization.themeId === th.id ? ' cust-theme-swatch-active' : ''}`}
              onClick={() => onChange({ themeId: th.id })}
              title={th.name}
              style={{ background: `linear-gradient(to bottom, ${th.accent} 68%, ${th.base} 68%)` }}
            />
          ))}
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('spectrum')}</div>
        <p className="accs-note" style={{ marginTop: 0, marginBottom: 12 }}>
          <strong>{t('spectrum_primary')}</strong> is the base background color (panels keep their glass effect). <strong>{t('spectrum_accent')}</strong> is for logo, icons, and headings — channel/feed text is configured separately below.
        </p>
        <div className="cust-tayf-row">
          <div className="cust-tayf-picker">
            <div className="cust-tayf-item">
              <div
                className={`cust-tayf-swatch${openSpectrum === 'customBase' ? ' active' : ''}`}
                style={{ background: customization.customBase || currentTheme.base }}
                onClick={() => setOpenSpectrum(openSpectrum === 'customBase' ? null : 'customBase')}
              >
                {customization.customBase && (
                  <button type="button" className="cust-tayf-reset" onClick={e => { e.stopPropagation(); onChange({ customBase: null }); if (openSpectrum === 'customBase') setOpenSpectrum(null) }}>×</button>
                )}
              </div>
              <span className="cust-tayf-label">{t('spectrum_primary')}</span>
            </div>
            <div
              className={`cust-tayf-strip${openSpectrum === 'customBase' ? ' open' : ''}`}
              onClick={e => pickSpectrum(e, 'customBase')}
              role="presentation"
            />
          </div>
          <div className="cust-tayf-picker">
            <div className="cust-tayf-item">
              <div
                className={`cust-tayf-swatch${openSpectrum === 'customAccent' ? ' active' : ''}`}
                style={{ background: customization.customAccent || currentTheme.accent }}
                onClick={() => setOpenSpectrum(openSpectrum === 'customAccent' ? null : 'customAccent')}
              >
                {customization.customAccent && (
                  <button type="button" className="cust-tayf-reset" onClick={e => { e.stopPropagation(); onChange({ customAccent: null }); if (openSpectrum === 'customAccent') setOpenSpectrum(null) }}>×</button>
                )}
              </div>
              <span className="cust-tayf-label">{t('spectrum_accent')}</span>
            </div>
            <div
              className={`cust-tayf-strip${openSpectrum === 'customAccent' ? ' open' : ''}`}
              onClick={e => pickSpectrum(e, 'customAccent')}
              role="presentation"
            />
          </div>
        </div>
        <div className="cust-tayf-text-row">
          <div>
            <span className="cust-toggle-label">{t('channel_text_color')}</span>
            <p className="accs-note" style={{ margin: '4px 0 0' }}>{t('channel_text_desc')}</p>
          </div>
          <div className="cust-textcolor-opts">
            {[
              { id: 'theme', label: t('match_theme') },
              { id: 'white', label: t('white_ecru') },
              { id: 'black', label: t('black') },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`cust-textcolor-btn${(customization.customTextColor || 'white') === id ? ' active' : ''}`}
                onClick={() => onChange({ customTextColor: id })}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('typography')}</div>
        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.45)', lineHeight: 1.5 }}>
          {t('typography_desc')}
        </p>
        <div style={{ fontSize: '0.72rem', color: 'rgba(var(--ta-rgb), 0.4)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('body_label')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {(BODY_FONTS || []).map(font => (
            <button
              key={font.id}
              onClick={() => onFontChange && onFontChange(font.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: `1.5px solid ${bodyFont === font.id ? 'rgba(var(--ta-rgb), 0.7)' : 'rgba(var(--ta-rgb), 0.18)'}`,
                background: bodyFont === font.id ? 'rgba(var(--ta-rgb), 0.12)' : 'none',
                color: bodyFont === font.id ? 'rgba(var(--ta-rgb), 0.95)' : 'rgba(var(--ta-rgb), 0.45)',
                fontFamily: font.family,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >{font.label}</button>
          ))}
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('interface_section')}</div>
        <div className="cust-options-col">
          {[
            { key: 'showCategoryIcons', label: t('category_icons'), note: t('category_icons_desc') },
            { key: 'showTimestamps',    label: t('msg_timestamps'), note: t('msg_timestamps_desc') },
          ].map(({ key, label, note }) => (
            <div key={key} className="cust-toggle-row">
              <div>
                <span className="cust-toggle-label">{label}</span>
                <p className="accs-note">{note}</p>
              </div>
              <button
                className={`cust-toggle${customization[key] ? ' cust-toggle-on' : ''}`}
                onClick={() => onChange({ [key]: !customization[key] })}
              ><span className="cust-toggle-knob" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrivacySafetyPanel({ user, onUpdate, onUnblock, blockedList, sessionsList, onSessionsUpdate }) {
  const t = useT()

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
    // eslint-disable-next-line react-hooks/purity
    const age = user.birthDate ? Math.floor((Date.now() - new Date(user.birthDate)) / 31557600000) : 99
    return age < 18
  }, [user.sensitiveContentFilter, user.birthDate])

  return (
    <div className="accs-panel">

      <div className="accs-section">
        <div className="accs-section-title">{t('security')}</div>
        <div className="cust-toggle-row">
          <div>
            <span className="cust-toggle-label">{t('two_fa')}</span>
            <p className="accs-note">{t('two_fa_desc').replace(' Coming soon', '')} <span className="accs-coming-soon">{t('coming_soon')}</span></p>
          </div>
          <button className="cust-toggle" disabled style={{opacity: 0.4, cursor: 'not-allowed'}}><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('e2ee')}</span>
            <p className="accs-note">{t('e2ee_desc').replace(' Coming soon', '')} <span className="accs-coming-soon">{t('coming_soon')}</span></p>
          </div>
          <button className="cust-toggle" disabled style={{opacity: 0.4, cursor: 'not-allowed'}}><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('new_signin_notif')}</span>
            <p className="accs-note">{t('new_signin_notif_desc')}</p>
          </div>
          <button
            className={`cust-toggle${user.notifyNewDevice !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate({ notifyNewDevice: user.notifyNewDevice === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
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
            className={`cust-toggle${user.allowProfileSharing !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate({ allowProfileSharing: user.allowProfileSharing === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>
        <div className="cust-toggle-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('show_in_discover')}</span>
            <p className="accs-note">{t('show_in_discover_desc')}</p>
          </div>
          <button
            className={`cust-toggle${user.showInDiscover !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate({ showInDiscover: user.showInDiscover === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>

        <div className="accs-visibility-group">
          <p className="accs-note" style={{marginBottom: '10px'}}>{t('dm_settings_note')}</p>
          {[
            { key: 'readReceiptsVisibility', label: t('read_receipts'), note: t('read_receipts_desc') },
            { key: 'onlineStatusVisibility', label: t('online_status_label'), note: t('online_status_desc') },
            { key: 'lastSeenVisibility', label: t('last_seen'), note: t('last_seen_desc') },
          ].map(({ key, label, note }) => (
            <div key={key} className="accs-visibility-row">
              <div>
                <span className="cust-toggle-label">{label}</span>
                <p className="accs-note">{note}</p>
              </div>
              <PillSelect
                value={user[key] || 'everyone'}
                onChange={val => onUpdate({ [key]: val })}
                options={[
                  { value: 'everyone', label: t('everyone') },
                  { value: 'friends', label: t('friends') },
                  { value: 'nobody', label: t('nobody') },
                ]}
              />
            </div>
          ))}
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
            className={`cust-toggle${sensitiveContentOn ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate({ sensitiveContentFilter: !sensitiveContentOn })}
          ><span className="cust-toggle-knob" /></button>
        </div>
        <div className="accs-visibility-row" style={{marginTop: '14px'}}>
          <div>
            <span className="cust-toggle-label">{t('vanishing_media')}</span>
            <p className="accs-note">{t('vanishing_media_desc')}</p>
          </div>
          <PillSelect
            value={user.vanishingMediaDuration || 'off'}
            onChange={val => onUpdate({ vanishingMediaDuration: val === 'off' ? null : val })}
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
            className={`cust-toggle${user.allowMessageRequests !== false ? ' cust-toggle-on' : ''}`}
            onClick={() => onUpdate({ allowMessageRequests: user.allowMessageRequests === false ? true : false })}
          ><span className="cust-toggle-knob" /></button>
        </div>
      </div>

      <BlockedAccountsSection blockedList={blockedList} onUnblock={onUnblock || (() => {})} />

    </div>
  )
}

function BlockedAccountsSection({ blockedList, onUnblock }) {
  const t = useT()
  const handleUnblock = (targetId) => {
    onUnblock(targetId)
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
                <button className="accs-data-btn" onClick={() => handleUnblock(b.id)}>{t('unblock')}</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

function getCurrentSessionId() {
  try { return sessionStorage.getItem('reelms_session_id') } catch { return null }
}

function ActiveSessionsSection({ sessions, onSessionsUpdate }) {
  const t = useT()
  const currentSessionId = getCurrentSessionId()

  const revokeSession = (id) => {
    const updated = sessions.filter(s => s.id !== id)
    onSessionsUpdate(updated)
  }

  const formatTime = useCallback((ts) => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - ts
    if (diff < 60000) return t('just_now')
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <button className="accs-session-revoke" onClick={() => revokeSession(s.id)}>{t('revoke')}</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AccountSettingsPanel({ user, onUpdate, onLogOut, profileBio, onBioChange, spotifyConnected, onSpotifyConnect, onSpotifyDisconnect, reelms = [] }) {
  const t = useT()
  const photoInputRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef(null)

  const [nameInput, setNameInput] = useState(user.name || '')
  const [usernameInput, setUsernameInput] = useState(user.username || '')
  const [usernameError, setUsernameError] = useState('')
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [bioInput, setBioInput] = useState(profileBio || user.bio || '')
  const [contactInput, setContactInput] = useState(user.contact || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [bioSaved, setBioSaved] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [contactError, setContactError] = useState('')

  const [photoEditModal, setPhotoEditModal] = useState(null)
  const [photoScale, setPhotoScale] = useState(1)
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 })
  const [rawPhotoImg, setRawPhotoImg] = useState(null)

  // Load image when modal opens
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!photoEditModal) { setRawPhotoImg(null); return }
    const img = new Image()
    img.onload = () => setRawPhotoImg(img)
    img.src = photoEditModal.src
  }, [photoEditModal])

  // Draw preview canvas
  useEffect(() => {
    if (!rawPhotoImg || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const size = canvas.width
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    const s = Math.max(size / rawPhotoImg.naturalWidth, size / rawPhotoImg.naturalHeight)
    const fw = rawPhotoImg.naturalWidth * s * photoScale
    const fh = rawPhotoImg.naturalHeight * s * photoScale
    const fx = (size - fw) / 2 + photoOffset.x
    const fy = (size - fh) / 2 + photoOffset.y
    ctx.drawImage(rawPhotoImg, fx, fy, fw, fh)
    ctx.restore()
  }, [rawPhotoImg, photoScale, photoOffset])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPhotoEditModal({ src: ev.target.result })
      setPhotoScale(1)
      setPhotoOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const applyPhotoEdit = () => {
    if (!rawPhotoImg) return
    const OUT = 400
    const PREV = 160
    const canvas = document.createElement('canvas')
    canvas.width = OUT; canvas.height = OUT
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2)
    ctx.clip()
    const ratio = OUT / PREV
    const s = Math.max(PREV / rawPhotoImg.naturalWidth, PREV / rawPhotoImg.naturalHeight)
    const fw = rawPhotoImg.naturalWidth * s * photoScale * ratio
    const fh = rawPhotoImg.naturalHeight * s * photoScale * ratio
    const fx = (OUT - fw) / 2 + photoOffset.x * ratio
    const fy = (OUT - fh) / 2 + photoOffset.y * ratio
    ctx.drawImage(rawPhotoImg, fx, fy, fw, fh)
    onUpdate({ photo: canvas.toDataURL('image/jpeg', 0.92) })
    setPhotoEditModal(null)
  }

  const onPreviewMouseDown = (e) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX - photoOffset.x, y: e.clientY - photoOffset.y }
    e.preventDefault()
  }
  const onPreviewMouseMove = (e) => {
    if (!isDraggingRef.current) return
    setPhotoOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })
  }
  const onPreviewMouseUp = () => { isDraggingRef.current = false }
  const onPreviewTouchStart = (e) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.touches[0].clientX - photoOffset.x, y: e.touches[0].clientY - photoOffset.y }
  }
  const onPreviewTouchMove = (e) => {
    if (!isDraggingRef.current) return
    setPhotoOffset({ x: e.touches[0].clientX - dragStartRef.current.x, y: e.touches[0].clientY - dragStartRef.current.y })
  }

  const saveName = () => {
    if (!nameInput.trim()) return
    onUpdate({ name: nameInput.trim() })
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  const saveUsername = async () => {
    const val = usernameInput.trim()
    if (!val) return
    const usernameAvailability = await userCheckUsername(val)
    if (usernameAvailability?.exists || usernameAvailability === false) {
      setUsernameError(t('username_taken'))
      return
    }
    setUsernameError('')
    onUpdate({ username: val })
    setUsernameSaved(true)
    setTimeout(() => setUsernameSaved(false), 2000)
  }

  const saveBio = () => {
    onBioChange(bioInput)
    onUpdate({ bio: bioInput })
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
    onUpdate({ contact: contactInput.trim() })
    setContactSaved(true)
    setTimeout(() => setContactSaved(false), 2000)
  }

  const savePassword = () => {
    setPwError('')
    setPwSuccess(false)
    if (currentPw !== user.password) { setPwError(t('wrong_current_password')); return }
    if (newPw.length < 6) { setPwError(t('password_too_short')); return }
    if (newPw !== confirmPw) { setPwError(t('passwords_no_match')); return }
    onUpdate({ password: newPw })
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setPwSuccess(true)
    setTimeout(() => setPwSuccess(false), 2000)
  }

  const downloadUserData = async (format) => {
    const uid = user.id
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
    const joined = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
  <tr><td>Name</td><td>${user.name || '—'}</td></tr>
  <tr><td>Username</td><td>@${user.username || '—'}</td></tr>
  <tr><td>Bio</td><td>${user.bio || profileBio || '—'}</td></tr>
  <tr><td>Contact</td><td>${user.contact || '—'}</td></tr>
  <tr><td>Birth Date</td><td>${user.birthDate || '—'}</td></tr>
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
      a.download = `reelms_data_${user.username || user.id}.doc`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  const freezeAccount = () => {
    if (user.isSystem) {
      window.alert('This is a permanent system account and cannot be frozen.')
      return
    }
    if (!window.confirm('Freeze your account? You can reactivate it by signing in again.')) return
    onUpdate({ frozen: true })
    onLogOut()
  }

  const closeAccount = async () => {
    if (user.isSystem) {
      window.alert('This is a permanent system account and cannot be deleted.')
      return
    }
    if (!window.confirm('Permanently close your account? This cannot be undone.')) return
    await userProfileDelete().catch(() => {})
    onLogOut()
  }

  return (
    <div className="accs-panel">
      <div className="accs-section">
        <div className="accs-section-title">{t('profile_photo')}</div>
        <div className="accs-photo-row">
          <div className="accs-photo-wrap">
            <img src={user.photo || avatarUIcon} alt="Avatar" className="accs-photo" />
          </div>
          <div className="accs-photo-btns">
            <button className="accs-btn" onClick={() => photoInputRef.current?.click()}>{t('change_photo')}</button>
            {user.photo && (
              <button className="accs-btn accs-btn-ghost" onClick={() => onUpdate({ photo: null })}>{t('remove_photo')}</button>
            )}
          </div>
          <input type="file" accept="image/*" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('display_name')}</div>
        <div className="accs-field-row">
          <input className="accs-input" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder={t('your_name_ph')} />
          <button className="accs-btn" onClick={saveName}>{nameSaved ? t('saved') : t('save')}</button>
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('username')}</div>
        <div className="accs-field-row">
          <input
            className="accs-input"
            value={usernameInput}
            onChange={e => { setUsernameInput(e.target.value.replace(/\s/g, '')); setUsernameError('') }}
            placeholder={t('username')}
          />
          <button className="accs-btn" onClick={saveUsername}>{usernameSaved ? t('saved') : t('save')}</button>
        </div>
        {usernameError && <p className="accs-error">{usernameError}</p>}
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('bio')}</div>
        <div className="accs-field-col">
          <textarea
            className="accs-textarea"
            value={bioInput}
            onChange={e => { if (e.target.value.length <= 240) setBioInput(e.target.value) }}
            placeholder={t('bio_placeholder')}
            rows={3}
          />
          <div className="accs-row-between">
            <span className="accs-note">{bioInput.length}/240</span>
            <button className="accs-btn" onClick={saveBio}>{bioSaved ? t('saved') : t('save')}</button>
          </div>
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('email')}</div>
        <div className="accs-field-row">
          <input className="accs-input" type="email" value={contactInput} onChange={e => { setContactInput(e.target.value); setContactError('') }} placeholder={t('email_placeholder')} />
          <button className="accs-btn" onClick={saveContact}>{contactSaved ? t('saved') : t('save')}</button>
        </div>
        {contactError && <p className="accs-error">{contactError}</p>}
        <p className="accs-note">{t('email_signin_note')}</p>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('change_password')}</div>
        <div className="accs-field-col">
          <input className="accs-input" type="password" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwError(''); setPwSuccess(false) }} placeholder={t('current_password')} />
          <input className="accs-input" type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(''); setPwSuccess(false) }} placeholder={t('new_password')} />
          <input className="accs-input" type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(''); setPwSuccess(false) }} placeholder={t('confirm_password')} />
          {pwError && <p className="accs-error">{pwError}</p>}
          {pwSuccess && <p className="accs-success">{t('password_updated')}</p>}
          <button className="accs-btn" style={{ alignSelf: 'flex-end' }} onClick={savePassword}>{t('update_password')}</button>
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('connected_accounts')}</div>
        <div className="accs-connected-item">
          <div className="accs-connected-info">
            <span className="accs-connected-icon" style={{ color: '#1DB954' }}><SpotifyIcon size={22} /></span>
            <div>
              <span className="accs-connected-name">Spotify</span>
              <p className="accs-note" style={{ margin: 0 }}>
                {spotifyConnected ? t('spotify_connected') : t('spotify_connect_desc')}
              </p>
            </div>
          </div>
          {spotifyConnected
            ? <button className="accs-btn accs-btn-ghost accs-btn-spotify-disconnect" onClick={onSpotifyDisconnect}>{t('disconnect')}</button>
            : <button className="accs-btn accs-btn-ghost accs-btn-spotify" onClick={onSpotifyConnect}>{t('connect')}</button>
          }
        </div>
      </div>

      <div className="accs-section">
        <div className="accs-section-title">{t('your_data')}</div>
        <p className="accs-note" style={{marginBottom: '14px'}}>{t('data_download_desc')}</p>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className="accs-data-btn" onClick={() => downloadUserData('pdf')}>{t('download_pdf')}</button>
          <button className="accs-data-btn" onClick={() => downloadUserData('word')}>{t('download_word')}</button>
        </div>
      </div>

      {!user.isSystem && (
      <div className="accs-section accs-section-danger">
        <div className="accs-section-title accs-danger-title">{t('account_actions')}</div>
        <div className="accs-danger-row">
          <div className="accs-danger-item">
            <div>
              <span className="accs-danger-label">{t('account_freeze')}</span>
              <p className="accs-note">{t('freeze_desc')}</p>
            </div>
            <button className="accs-btn accs-btn-danger" onClick={freezeAccount}>{t('freeze')}</button>
          </div>
          <div className="accs-danger-item">
            <div>
              <span className="accs-danger-label">{t('close_account_label')}</span>
              <p className="accs-note">{t('close_account_desc')}</p>
            </div>
            <button className="accs-btn accs-btn-danger" onClick={closeAccount}>{t('close')}</button>
          </div>
        </div>
      </div>
      )}

      {photoEditModal && <PhotoEditModal
        previewCanvasRef={previewCanvasRef}
        isDraggingRef={isDraggingRef}
        photoScale={photoScale}
        setPhotoScale={setPhotoScale}
        onMouseDown={onPreviewMouseDown}
        onMouseMove={onPreviewMouseMove}
        onMouseUp={onPreviewMouseUp}
        onTouchStart={onPreviewTouchStart}
        onTouchMove={onPreviewTouchMove}
        onTouchEnd={() => { isDraggingRef.current = false }}
        onCancel={() => setPhotoEditModal(null)}
        onApply={applyPhotoEdit}
      />}
    </div>
  )
}

function PhotoEditModal({ previewCanvasRef, photoScale, setPhotoScale, onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd, onCancel, onApply }) {
  const t = useT()
  return ReactDOM.createPortal(
    <div className="photo-edit-overlay" onClick={onCancel}>
      <div className="photo-edit-modal" onClick={e => e.stopPropagation()}>
        <span className="photo-edit-title">{t('adjust_photo')}</span>
        <p className="photo-edit-hint">{t('adjust_photo_hint')}</p>
        <canvas
          ref={previewCanvasRef}
          width={160}
          height={160}
          className="photo-edit-canvas"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        <div className="photo-edit-zoom-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
          <input
            type="range"
            className="photo-edit-slider"
            min="1" max="3" step="0.01"
            value={photoScale}
            onChange={e => setPhotoScale(parseFloat(e.target.value))}
          />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M8 11h6M11 8v6"/></svg>
        </div>
        <div className="photo-edit-actions">
          <button className="photo-edit-cancel" onClick={onCancel}>{t('cancel')}</button>
          <button className="photo-edit-apply" onClick={onApply}>{t('apply')}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ProfilePopup({ user, width, onClose, onPhotoChange, cover, onCoverChange, status, onStatusChange, bio, onBioChange, socialLinks, onSocialLinksChange, activePlatforms, onActivePlatformsChange, iconFilter, reelms, uid, spotifyConnected, spotifyNowPlaying, onSpotifyConnect, onSpotifyDisconnect, activity, onActivityChange }) {
  const popupRef = useRef(null)
  const ppPhotoInputRef = useRef(null)
  const ppCoverInputRef = useRef(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [headerEditOpen, setHeaderEditOpen] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState('')
  const [editingSocial, setEditingSocial] = useState(null)
  const [socialInput, setSocialInput] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addBtnRef = useRef(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const dragSocialKeyRef = useRef(null)
  const [dragOverSocialKey, setDragOverSocialKey] = useState(null)
  const [socialCtxMenu, setSocialCtxMenu] = useState(null)
  const [showMyReelms, setShowMyReelms] = useState(false)
  const [showMyActivity, setShowMyActivity] = useState(false)
  const [activityItems, setActivityItems] = useState([])
  const [showActivitySetter, setShowActivitySetter] = useState(false)

  useEffect(() => {
    if (!showMyActivity || !reelms || !uid) return
    let cancelled = false
    ;(async () => {
      const items = []
      for (const r of reelms) {
        try {
          const ps = (await reelmGetDoc(r.id, 'feed_posts')) || []
          if (!Array.isArray(ps) || cancelled) continue
          ps.forEach(p => {
            const postText = p.text || p.content
            if (p.userId === uid) {
              items.push({ type: 'post', reelmName: r.name, text: postText, createdAt: p.createdAt })
            }
            if (Array.isArray(p.likes) && p.likes.includes(uid) && p.userId !== uid) {
              items.push({ type: 'like', reelmName: r.name, text: postText, createdAt: p.createdAt })
            }
            ;(p.comments || []).forEach(c => {
              if (c.userId === uid) {
                items.push({ type: 'comment', reelmName: r.name, text: c.text, createdAt: c.createdAt })
              }
            })
          })
        } catch { /* skip */ }
      }
      if (cancelled) return
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setActivityItems(items)
    })()
    return () => { cancelled = true }
  }, [showMyActivity, reelms, uid])

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

  const currentStatus = statusOptions.find(s => s.key === status)

  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('.pp-social-ctx-menu')) return
      if (e.target.closest('.pp-social-add-menu')) return
      setSocialCtxMenu(null)
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <>
    <div className="profile-popup" style={{ width }} ref={popupRef}>
      <div className="pp-cover" style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <button className="pp-cover-edit-btn" onClick={() => setHeaderEditOpen(v => !v)}>
          <PencilIcon />
        </button>
        <input
          type="file"
          accept="image/*"
          ref={ppPhotoInputRef}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = ev => onPhotoChange(ev.target.result)
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />
        <input
          type="file"
          accept="image/*"
          ref={ppCoverInputRef}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = ev => onCoverChange(ev.target.result)
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />
      </div>
      {headerEditOpen && (
        <div className="pp-cover-menu">
          <button className="pp-cover-menu-item" onClick={() => { ppPhotoInputRef.current?.click(); setHeaderEditOpen(false) }}>Change photo</button>
          <button className="pp-cover-menu-item" onClick={() => { ppCoverInputRef.current?.click(); setHeaderEditOpen(false) }}>Edit cover</button>
          <button className="pp-cover-menu-item" onClick={() => setHeaderEditOpen(false)}>Edit profile</button>
        </div>
      )}

      <div className="pp-identity">
        <img src={user.photo || avatarUIcon} alt="Avatar" className="pp-avatar" />
        <div className="pp-names">
          <span className="pp-name">{user.name}</span>
          <span className="pp-username">{'@' + (user.username || 'username')}</span>
        </div>
        <div className="pp-status-wrap">
          <button className="pp-status-btn" onClick={() => setStatusOpen(v => !v)}>
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
                  className={'pp-status-option' + (status === opt.key ? ' active' : '')}
                  onClick={() => { onStatusChange(opt.key); setStatusOpen(false) }}
                >
                  <span className="pp-status-dot" style={{ background: opt.color }} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pp-activity-row">
        {activity?.name
          ? <ActivityBadge activity={activity} />
          : <span className="pp-activity-empty">No activity set</span>}
        <button className="pp-activity-btn" onClick={() => setShowActivitySetter(true)}>
          {activity?.name ? 'Change' : 'Set Activity'}
        </button>
        {activity?.name && <button className="pp-activity-clear-btn" onClick={() => onActivityChange(null)}>✕</button>}
      </div>
      {showActivitySetter && (
        <ActivitySetterModal
          current={activity}
          onSet={onActivityChange}
          onClose={() => setShowActivitySetter(false)}
        />
      )}

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
                <button className="pp-bio-save" onClick={() => { onBioChange(bioInput); setEditingBio(false) }}>Save</button>
                <button className="pp-bio-cancel" onClick={() => { setBioInput(bio); setEditingBio(false) }}>Cancel</button>
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

        <div className="pp-socials-section">
          <span className="pp-socials-label">SOCIALS</span>
          <div className="pp-socials-row">
            {activePlatforms.map(key => {
              const platform = socialPlatforms.find(p => p.key === key)
              const { label, Icon, color, baseUrl } = platform
              return (
                <button
                  key={key}
                  className={'pp-social-chip' + (socialLinks[key] ? ' pp-social-chip-set' : '') + (dragOverSocialKey === key ? ' pp-social-chip-drag-over' : '')}
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
                    const next = [...activePlatforms]
                    const fromIdx = next.indexOf(from)
                    const toIdx = next.indexOf(key)
                    if (fromIdx < 0 || toIdx < 0) return
                    next.splice(fromIdx, 1)
                    next.splice(toIdx, 0, from)
                    onActivePlatformsChange(next)
                  }}
                  onDragEnd={() => { setDragOverSocialKey(null); dragSocialKeyRef.current = null }}
                  onContextMenu={e => { e.preventDefault(); setSocialCtxMenu({ key, x: e.clientX, y: e.clientY }) }}
                  onClick={() => {
                    if (socialLinks[key] && (baseUrl || key === 'custom')) {
                      window.open(key === 'custom' ? socialLinks[key] : baseUrl + socialLinks[key], '_blank')
                    } else {
                      setEditingSocial(key)
                      setSocialInput(socialLinks[key] || '')
                      setShowAddMenu(false)
                    }
                  }}
                >
                  <span style={{ color, display: 'flex', alignItems: 'center' }}><Icon /></span>
                  <span>{socialLinks[key] ? (key === 'custom' ? socialLinks[key].replace(/^https?:\/\//, '') : '@' + socialLinks[key]) : label}</span>
                </button>
              )
            })}
            <div className="pp-social-add-wrap">
              <button
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
                  {/* eslint-disable-next-line no-unused-vars */}
                  {socialPlatforms.filter(p => p.key !== 'custom' && !activePlatforms.includes(p.key)).map(({ key, label, Icon: PlatformIcon, color }) => (
                    <button
                      key={key}
                      className="pp-social-add-option"
                      onClick={() => { onActivePlatformsChange(prev => [...prev, key]); setShowAddMenu(false) }}
                    >
                      <span style={{ color, display: 'flex', alignItems: 'center' }}><PlatformIcon /></span>
                      <span>{label}</span>
                    </button>
                  ))}
                  <div className="pp-social-add-separator" />
                  <button
                    className="pp-social-add-option"
                    onClick={() => {
                      if (!activePlatforms.includes('custom')) onActivePlatformsChange(prev => [...prev, 'custom'])
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
              <button className="pp-social-ctx-item" onClick={() => {
                setEditingSocial(socialCtxMenu.key)
                setSocialInput(socialLinks[socialCtxMenu.key] || '')
                setShowAddMenu(false)
                setSocialCtxMenu(null)
              }}>Edit</button>
              <button className="pp-social-ctx-item pp-social-ctx-danger" onClick={() => {
                onActivePlatformsChange(prev => prev.filter(k => k !== socialCtxMenu.key))
                onSocialLinksChange(prev => { const n = { ...prev }; delete n[socialCtxMenu.key]; return n })
                setSocialCtxMenu(null)
              }}>Delete link</button>
            </div>,
            document.body
          )}
          {editingSocial && (() => {
            const platform = socialPlatforms.find(p => p.key === editingSocial)
            return (
              <div className="pp-social-edit">
                {platform.baseUrl && <span className="pp-social-edit-prefix">{platform.baseUrl}</span>}
                <input
                  className="pp-social-edit-input"
                  value={socialInput}
                  onChange={e => setSocialInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onSocialLinksChange(prev => ({ ...prev, [editingSocial]: socialInput.trim() }))
                      setEditingSocial(null)
                    }
                    if (e.key === 'Escape') setEditingSocial(null)
                  }}
                  placeholder={editingSocial === 'custom' ? 'https://...' : 'username'}
                  autoFocus
                />
                <button className="pp-social-edit-save" onClick={() => {
                  if (socialInput.trim()) onSocialLinksChange(prev => ({ ...prev, [editingSocial]: socialInput.trim() }))
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
                ? <button className="pp-spotify-btn pp-spotify-btn-disconnect" onClick={onSpotifyDisconnect}>Disconnect</button>
                : <button className="pp-spotify-btn" onClick={onSpotifyConnect}>Connect</button>
              }
            </div>
          )}
        </div>

        <div className="pp-action-row">
          <button className="pp-action-btn" onClick={() => { setShowMyReelms(true); setShowMyActivity(false) }}>
            <span className="pp-action-count">{reelms?.length || 0}</span>
            {"Reelms you're in"}
          </button>
          <button className="pp-action-btn" onClick={() => { setShowMyActivity(true); setShowMyReelms(false) }}>
            All activity
          </button>
        </div>
      </div>
    </div>

    {showMyReelms && ReactDOM.createPortal(
      <div className="pp-panel-overlay" onMouseDown={() => setShowMyReelms(false)}>
        <div className="pp-panel" onMouseDown={e => e.stopPropagation()}>
          <div className="pp-panel-header">
            <span className="pp-panel-title">Reelms you're in <span className="pp-panel-count">{reelms?.length || 0}</span></span>
            <button className="pp-panel-close" onClick={() => setShowMyReelms(false)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="pp-panel-list">
            {(reelms || []).length === 0 && (
              <p className="pp-panel-empty">You haven't joined any reelms yet.</p>
            )}
            {(reelms || []).map(r => (
              <div className="pp-panel-row" key={r.id}>
                <div className="pp-panel-reelm-avatar">
                  {r.photo
                    ? <img src={r.photo} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                    : <span>{r.name?.[0]?.toUpperCase() || 'R'}</span>}
                </div>
                <div className="pp-panel-row-info">
                  <span className="pp-panel-row-name">{r.name}</span>
                  <span className="pp-panel-row-sub">{r.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    )}

    {showMyActivity && ReactDOM.createPortal(
      <div className="pp-panel-overlay" onMouseDown={() => setShowMyActivity(false)}>
        <div className="pp-panel" onMouseDown={e => e.stopPropagation()}>
          <div className="pp-panel-header">
            <span className="pp-panel-title">All activity</span>
            <button className="pp-panel-close" onClick={() => setShowMyActivity(false)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="pp-panel-list">
            {activityItems.length === 0 && (
              <p className="pp-panel-empty">No activity yet.</p>
            )}
            {activityItems.map((item, i) => (
              <div className="pp-panel-row pp-activity-row" key={i}>
                <span className={`pp-activity-icon pp-activity-icon-${item.type}`}>
                  {item.type === 'post' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  )}
                  {item.type === 'like' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  )}
                  {item.type === 'comment' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  )}
                </span>
                <div className="pp-panel-row-info">
                  <span className="pp-panel-row-name">
                    {item.type === 'post' && 'Shared a post'}
                    {item.type === 'like' && 'Liked a post'}
                    {item.type === 'comment' && 'Left a comment'}
                    <span className="pp-activity-reelm"> · {item.reelmName}</span>
                  </span>
                  {item.text && <span className="pp-panel-row-sub pp-activity-text">{item.text.slice(0, 80)}{item.text.length > 80 ? '…' : ''}</span>}
                </div>
                {item.createdAt && (
                  <span className="pp-activity-time">{new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}

const ACTIVITY_TYPES = [
  { key: 'playing', icon: '🎮', label: 'Playing' },
  { key: 'using', icon: '💻', label: 'Using' },
  { key: 'watching', icon: '📺', label: 'Watching' },
  { key: 'custom', icon: '✨', label: 'Custom' },
]
const ACTIVITY_SUGGESTIONS = {
  playing: ['Valorant', 'CS2', 'Minecraft', 'Fortnite', 'League of Legends', 'GTA V', 'Elden Ring', 'Roblox'],
  using: ['VS Code', 'Figma', 'Photoshop', 'Notion', 'Spotify', 'YouTube', 'Chrome'],
  watching: ['Netflix', 'YouTube', 'Twitch', 'Disney+', 'Prime Video'],
  custom: [],
}

function ActivityBadge({ activity }) {
  if (!activity || !activity.name) return null
  const t = ACTIVITY_TYPES.find(a => a.key === activity.type) || ACTIVITY_TYPES[3]
  return (
    <div className="activity-badge">
      <span className="activity-badge-icon">{t.icon}</span>
      <span className="activity-badge-text">
        {t.key !== 'custom' && <span className="activity-badge-label">{t.label} </span>}
        <span className="activity-badge-name">{activity.name}</span>
        {activity.detail && <span className="activity-badge-detail"> · {activity.detail}</span>}
      </span>
    </div>
  )
}

function ActivitySetterModal({ current, onSet, onClose }) {
  const [type, setType] = useState(current?.type || 'playing')
  const [name, setName] = useState(current?.name || '')
  const [detail, setDetail] = useState(current?.detail || '')
  const handleSet = () => {
    if (!name.trim()) return
    onSet({ type, name: name.trim(), detail: detail.trim() || undefined, since: Date.now() })
    onClose()
  }
  return (
    <div className="activity-setter-overlay" onClick={onClose}>
      <div className="activity-setter-modal" onClick={e => e.stopPropagation()}>
        <div className="activity-setter-title">Set Activity</div>
        <div className="activity-setter-types">
          {ACTIVITY_TYPES.map(t => (
            <button key={t.key} className={`activity-type-btn${type === t.key ? ' active' : ''}`}
              onClick={() => { setType(t.key); setName(''); setDetail('') }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
        <input className="activity-setter-input" autoFocus
          placeholder={`${ACTIVITY_TYPES.find(t => t.key === type)?.label || ''}${type !== 'custom' ? ' what?' : ' status...'}`}
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSet()} />
        {ACTIVITY_SUGGESTIONS[type]?.length > 0 && (
          <div className="activity-suggestions">
            {ACTIVITY_SUGGESTIONS[type].map(s => (
              <button key={s} className={`activity-suggestion-btn${name === s ? ' active' : ''}`}
                onClick={() => setName(s)}>{s}</button>
            ))}
          </div>
        )}
        <input className="activity-setter-input" placeholder="Details (optional)"
          value={detail} onChange={e => setDetail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSet()} />
        <div className="activity-setter-actions">
          {current && <button className="activity-clear-btn" onClick={() => { onSet(null); onClose() }}>Clear</button>}
          <button className="activity-set-btn" onClick={handleSet} disabled={!name.trim()}>Set Activity</button>
        </div>
      </div>
    </div>
  )
}

function FriendProfilePopup({ friend, anchorRect, onClose, onRemove, onBlock, nickname, onNicknameChange, canShare, onMessage, onCreateGroup, onRequestRemoteControl }) {
  const popupRef = useRef(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(nickname || '')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNicknameInput(nickname || '')
  }, [nickname])

  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const popupW = 280
  const popupH = 360
  let top = anchorRect.top - popupH - 8
  let left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - popupW - 8)
  if (top < 8) top = anchorRect.bottom + 8

  return ReactDOM.createPortal(
    <div className="friend-profile-popup" style={{ top, left, width: popupW }} ref={popupRef}>
      <div className="fpp-cover" />
      <div className="fpp-identity">
        <div className="fpp-avatar">
          {friend.photo
            ? <img src={friend.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : <span>{(friend.name || '?').charAt(0).toUpperCase()}</span>
          }
        </div>
        <div className="fpp-names">
          <span className="fpp-name">{nickname || friend.name}</span>
          {friend.username && <span className="fpp-username">{'@' + (friend.username.startsWith('@') ? friend.username.slice(1) : friend.username)}</span>}
          {friend.activity?.name && <ActivityBadge activity={friend.activity} />}
        </div>
      </div>
      {friend.bio && <p className="fpp-bio">{friend.bio}</p>}
      <div className="fpp-nickname-section">
        <span className="fpp-section-label">NICKNAME</span>
        {editingNickname ? (
          <div className="fpp-nickname-edit">
            <input
              className="fpp-nickname-input"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              placeholder={friend.name}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { onNicknameChange(nicknameInput.trim()); setEditingNickname(false) }
                if (e.key === 'Escape') { setNicknameInput(nickname || ''); setEditingNickname(false) }
              }}
            />
            <button className="fpp-nickname-save" onClick={() => { onNicknameChange(nicknameInput.trim()); setEditingNickname(false) }}>Save</button>
            {nickname && <button className="fpp-nickname-clear" onClick={() => { onNicknameChange(''); setNicknameInput(''); setEditingNickname(false) }}>Clear</button>}
          </div>
        ) : (
          <button className="fpp-nickname-btn" onClick={() => setEditingNickname(true)}>
            {nickname ? <span>{nickname}</span> : <span className="fpp-nickname-empty">Add nickname...</span>}
          </button>
        )}
      </div>
      <div className="fpp-actions">
        <button className="fpp-action-btn" onClick={() => { onMessage(); onClose() }}>Message</button>
        {onCreateGroup && <button className="fpp-action-btn" onClick={() => { onCreateGroup(friend); onClose() }}>Create group</button>}
        {onRequestRemoteControl && <button className="fpp-action-btn" onClick={() => { onRequestRemoteControl(friend); onClose() }}>
          <img src={channelLiveactionIcon} alt="" width="12" height="12" style={{filter:'brightness(0.8)', marginRight: 4}}/> Remote control
        </button>}
        {canShare && (
          <button className="fpp-action-btn" onClick={() => { navigator.clipboard?.writeText(`${friend.name} (@${friend.username || friend.id})`); onClose() }}>Share Profile</button>
        )}
        <button className="fpp-action-btn fpp-action-danger" onClick={() => { onRemove(friend.id); onClose() }}>Remove Friend</button>
        {onBlock && <button className="fpp-action-btn fpp-action-danger" onClick={() => { onBlock(friend); onClose() }}>Block</button>}
      </div>
    </div>,
    document.body
  )
}

const FLYING_ROOM_DURATIONS = [
  { label: '15 min', localeKey: 'duration_15m', ms: 15 * 60 * 1000 },
  { label: '30 min', localeKey: 'duration_30m', ms: 30 * 60 * 1000 },
  { label: '1h',     localeKey: 'duration_1h',  ms: 60 * 60 * 1000 },
  { label: '3h',     localeKey: 'duration_3h',  ms: 3 * 60 * 60 * 1000 },
  { label: '6h',     localeKey: 'duration_6h',  ms: 6 * 60 * 60 * 1000 },
  { label: '12h',    localeKey: 'duration_12h', ms: 12 * 60 * 60 * 1000 },
  { label: '24h',    localeKey: 'duration_24h', ms: 24 * 60 * 60 * 1000 },
  { label: '48h',    localeKey: 'duration_48h', ms: 48 * 60 * 60 * 1000 },
]

function formatTimeLeft(expiresAt) {
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'expired'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
}

// ── Mention renderer ──────────────────────────────────────────────────────────
function renderMentions(text, uid, members, roles) {
  if (!text) return null
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (!part.startsWith('@')) return part
    const raw = part.slice(1)
    const lower = raw.toLowerCase()
    if (lower === 'everyone') return <span key={i} className="mention mention--everyone">{part}</span>
    const role = roles?.find(r => r.name.toLowerCase() === lower)
    if (role) return <span key={i} className="mention mention--role" style={{ color: role.color }}>{part}</span>
    const member = members?.find(m => m.userName.toLowerCase() === lower)
    if (member) {
      const isMe = String(member.userId) === String(uid)
      return <span key={i} className={`mention mention--user${isMe ? ' mention--me' : ''}`}>{part}</span>
    }
    return part
  })
}

// ── Moderation Inbox Panel (mod account only) ─────────────────────────────────

function SpatialRoom({ voicePositions, voiceParticipants, myUid, myUser, onMyMove }) {
  const ROOM_W = 280
  const ROOM_H = 200
  const AVATAR_D = 40
  const HALF = AVATAR_D / 2

  const startDrag = (e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const onMove = (ev) => {
      const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / ROOM_W))
      const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / ROOM_H))
      onMyMove(x, y)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const myPos = voicePositions[myUid] || { x: 0.5, y: 0.5 }

  return (
    <div className="spatial-room">
      <div className="spatial-room-label">Spatial Room — drag to move</div>
      <div className="spatial-room-canvas" style={{ position: 'relative', width: ROOM_W, height: ROOM_H }}>
        {voiceParticipants.filter(p => p.userId !== myUid).map(p => {
          const pos = voicePositions[p.userId] || { x: 0.5, y: 0.5 }
          return (
            <div key={p.userId} className="spatial-avatar spatial-avatar-other"
              style={{ left: pos.x * ROOM_W - HALF, top: pos.y * ROOM_H - HALF }}>
              {p.userPhoto
                ? <img src={p.userPhoto} alt="" className="spatial-avatar-img" />
                : <div className="spatial-avatar-initials">{(p.userName || '?')[0].toUpperCase()}</div>}
              <span className="spatial-avatar-name">{p.userName}</span>
            </div>
          )
        })}
        <div className="spatial-avatar spatial-avatar-me"
          style={{ left: myPos.x * ROOM_W - HALF, top: myPos.y * ROOM_H - HALF, cursor: 'grab' }}
          onMouseDown={startDrag}>
          {myUser?.photo
            ? <img src={myUser.photo} alt="" className="spatial-avatar-img" />
            : <div className="spatial-avatar-initials">{(myUser?.name || '?')[0].toUpperCase()}</div>}
          <span className="spatial-avatar-name">You</span>
        </div>
      </div>
    </div>
  )
}

function ModInboxPanel({ onClose }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    modInboxGet()
      .then(msgs => setEvents([...msgs].sort((a, b) => a.time - b.time)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group events by calendar day
  const grouped = []
  let lastDay = null
  for (const ev of events) {
    const d = new Date(ev.time)
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (dayKey !== lastDay) {
      lastDay = dayKey
      grouped.push({ type: 'day', label: d.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), key: dayKey })
    }
    grouped.push({ type: 'event', ev })
  }

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mod-inbox-panel">
      <div className="mod-inbox-header">
        <button className="reelm-settings-back-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="mod-inbox-title">Moderation Inbox</span>
      </div>
      <div className="mod-inbox-list">
        {loading && <div className="mod-inbox-empty">Loading…</div>}
        {!loading && grouped.length === 0 && <div className="mod-inbox-empty">No events yet.</div>}
        {grouped.map((item, i) => {
          if (item.type === 'day') {
            return <div key={item.key} className="mod-inbox-day-sep">{item.label}</div>
          }
          const ev = item.ev
          const isFlag = ev.type === 'auto_flag'
          return (
            <div key={ev.id || i} className={`mod-inbox-event${isFlag ? ' mod-flag' : ' mod-report'}`}>
              <div className="mod-inbox-event-top">
                <span className={`mod-inbox-badge${isFlag ? ' badge-flag' : ' badge-report'}`}>
                  {isFlag ? 'AI blocked' : 'User report'}
                </span>
                {ev.needsReview && <span className="mod-inbox-badge badge-review">Needs review</span>}
                {ev.actionTaken && <span className="mod-inbox-badge badge-done">Action taken</span>}
                <span className="mod-inbox-time">{fmtTime(ev.time)}</span>
              </div>
              {isFlag ? (
                <div className="mod-inbox-body">
                  <div className="mod-inbox-text">"{ev.text}"</div>
                  {ev.categories?.length > 0 && (
                    <div className="mod-inbox-cats">{ev.categories.join(' · ')}</div>
                  )}
                </div>
              ) : (
                <div className="mod-inbox-body">
                  <div className="mod-inbox-reporter">
                    <strong>{ev.reporterName || ev.reporterId}</strong> bildirdi
                    {ev.targetUserName ? <> — Hedef: <strong>{ev.targetUserName}</strong></> : null}
                    {ev.reason ? <> · <em>{ev.reason}</em></> : null}
                  </div>
                  {ev.targetContent && <div className="mod-inbox-text">"{ev.targetContent}"</div>}
                  <div className="mod-inbox-cats">
                    {ev.targetType}{ev.reelmId ? ` · reelm:${ev.reelmId}` : ''}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ROLE_PALETTE = [
  '#f87171','#fb923c','#fbbf24','#a3e635',
  '#34d399','#22d3ee','#60a5fa','#818cf8',
  '#c084fc','#f472b6','#e0c9bc','#94a3b8',
]

function getReelmTemplates(t) {
  const sp = s => s.split(', ')
  return [
    { id: 'gaming',    emoji: '🎮', name: t('tpl_gaming_name'),    desc: t('tpl_gaming_desc'),    beginning: sp(t('tpl_gaming_begin')),    text: sp(t('tpl_gaming_text')),    mm: sp(t('tpl_gaming_mm')),    live: sp(t('tpl_gaming_live')) },
    { id: 'music',     emoji: '🎵', name: t('tpl_music_name'),     desc: t('tpl_music_desc'),     beginning: sp(t('tpl_music_begin')),     text: sp(t('tpl_music_text')),     mm: sp(t('tpl_music_mm')),     live: sp(t('tpl_music_live')) },
    { id: 'cinema',    emoji: '🎬', name: t('tpl_cinema_name'),    desc: t('tpl_cinema_desc'),    beginning: sp(t('tpl_cinema_begin')),    text: sp(t('tpl_cinema_text')),    mm: sp(t('tpl_cinema_mm')),    live: sp(t('tpl_cinema_live')) },
    { id: 'education', emoji: '📚', name: t('tpl_education_name'), desc: t('tpl_education_desc'), beginning: sp(t('tpl_education_begin')), text: sp(t('tpl_education_text')), mm: sp(t('tpl_education_mm')), live: sp(t('tpl_education_live')) },
    { id: 'corporate', emoji: '💼', name: t('tpl_corporate_name'), desc: t('tpl_corporate_desc'), beginning: sp(t('tpl_corporate_begin')), text: sp(t('tpl_corporate_text')), mm: sp(t('tpl_corporate_mm')), live: sp(t('tpl_corporate_live')) },
    { id: 'tech',      emoji: '💻', name: t('tpl_tech_name'),      desc: t('tpl_tech_desc'),      beginning: sp(t('tpl_tech_begin')),      text: sp(t('tpl_tech_text')),      mm: sp(t('tpl_tech_mm')),      live: sp(t('tpl_tech_live')) },
    { id: 'startup',   emoji: '🚀', name: t('tpl_startup_name'),   desc: t('tpl_startup_desc'),   beginning: sp(t('tpl_startup_begin')),   text: sp(t('tpl_startup_text')),   mm: sp(t('tpl_startup_mm')),   live: sp(t('tpl_startup_live')) },
    { id: 'lifestyle', emoji: '🌿', name: t('tpl_lifestyle_name'), desc: t('tpl_lifestyle_desc'), beginning: sp(t('tpl_lifestyle_begin')), text: sp(t('tpl_lifestyle_text')), mm: sp(t('tpl_lifestyle_mm')), live: sp(t('tpl_lifestyle_live')) },
  ]
}

function ReelmSettings({ reelm, currentUser, friends, onUpdate, onClose, onAnnouncement }) {
  const [activeTab, setActiveTab] = useState('general')
  const [roles, setRoles] = useState(() => reelm.roles || [])
  const [members, setMembers] = useState(() => reelm.members || [])
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleColor, setEditingRoleColor] = useState('#60a5fa')
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#60a5fa')
  const [memberSearch, setMemberSearch] = useState('')
  const [showInDiscover, setShowInDiscover] = useState(() => reelm.showInDiscover ?? false)
  const [autoJoinOnInvite, setAutoJoinOnInvite] = useState(() => reelm.autoJoinOnInvite ?? false)
  const [ageRating, setAgeRating] = useState(() => reelm.ageRating || 'under18')

  const ownerAge = useMemo(() => {
    return currentUser?.birthDate
      ? Math.floor((Date.now() - new Date(currentUser.birthDate)) / 31557600000) // eslint-disable-line react-hooks/purity
      : 99
  }, [currentUser?.birthDate])
  const canSetAgeRating = ownerAge >= 18

  const saveAll = (updatedRoles, updatedMembers) => {
    setRoles(updatedRoles)
    setMembers(updatedMembers)
    onUpdate({ ...reelm, roles: updatedRoles, members: updatedMembers })
  }

  const addRole = () => {
    if (!newRoleName.trim() || roles.length >= 12) return
    const nr = { id: 'role-' + Date.now(), name: newRoleName.trim(), color: newRoleColor }
    saveAll([...roles, nr], members)
    setNewRoleName('')
    setNewRoleColor('#60a5fa')
    setAddingRole(false)
  }

  const startEditRole = (role) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
    setEditingRoleColor(role.color)
  }

  const saveEditRole = () => {
    if (!editingRoleName.trim()) return
    saveAll(roles.map(r => r.id === editingRoleId ? { ...r, name: editingRoleName.trim(), color: editingRoleColor } : r), members)
    setEditingRoleId(null)
  }

  const deleteRole = (roleId) => {
    const updatedMembers = members.map(m => ({ ...m, roleIds: (m.roleIds || []).filter(r => r !== roleId) }))
    saveAll(roles.filter(r => r.id !== roleId), updatedMembers)
  }

  const toggleMemberRole = (userId, roleId) => {
    const updatedMembers = members.map(m => {
      if (m.userId !== userId) return m
      const has = (m.roleIds || []).includes(roleId)
      return { ...m, roleIds: has ? m.roleIds.filter(r => r !== roleId) : [...(m.roleIds || []), roleId] }
    })
    saveAll(roles, updatedMembers)
  }

  const addFriendAsMember = (friend) => {
    if (members.find(m => m.userId === friend.id)) return
    saveAll(roles, [...members, { userId: friend.id, userName: friend.name, userPhoto: friend.photo || null, roleIds: [] }])
    onAnnouncement?.({ type: 'join', userName: friend.name })
  }

  const removeMember = (userId) => {
    if (userId === currentUser.id) return
    saveAll(roles, members.filter(m => m.userId !== userId))
  }

  const nonMembers = friends.filter(f => !members.find(m => m.userId === f.id))
  const filteredNonMembers = memberSearch.trim()
    ? nonMembers.filter(f => f.name?.toLowerCase().includes(memberSearch.toLowerCase()))
    : nonMembers

  return (
    <div className="settings-layout">
      <div className="settings-sidebar">
        <div className="settings-title rs-reelm-title">
          <button className="reelm-settings-back-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {reelm.name}
        </div>
        <nav className="settings-nav">
          {[
            { key: 'general', label: 'General' },
            { key: 'visibility', label: 'Visibility' },
            { key: 'roles', label: 'Roles and members' },
            { key: 'channels', label: 'Channels' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`settings-nav-item${activeTab === tab.key ? ' settings-nav-item-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >{tab.label}</button>
          ))}
        </nav>
      </div>
      <div className="settings-content">
        <div className="settings-topbar">
          <button className="settings-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="settings-content-panel">

          {activeTab === 'general' && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Reelm info</span>
              </div>
              <p className="rs-section-hint" style={{ marginBottom: 0 }}>General settings coming soon.</p>
            </div>
          )}

          {activeTab === 'visibility' && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Visibility</span>
              </div>
              <div className="cust-toggle-row">
                <div>
                  <span className="cust-toggle-label">Show in Discover</span>
                  <p className="accs-note">Allow this reelm to appear in the Discover section so others can find and join it.</p>
                </div>
                <button
                  className={`cust-toggle${showInDiscover ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = !showInDiscover
                    setShowInDiscover(next)
                    onUpdate({ ...reelm, roles, members, showInDiscover: next })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>
              <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                <div>
                  <span className="cust-toggle-label">Auto-join via invite link</span>
                  <p className="accs-note">People who arrive through an invite link join automatically without needing approval.</p>
                </div>
                <button
                  className={`cust-toggle${autoJoinOnInvite ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = !autoJoinOnInvite
                    setAutoJoinOnInvite(next)
                    onUpdate({ ...reelm, roles, members, autoJoinOnInvite: next })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>
              {canSetAgeRating && (
                <div style={{ marginTop: '28px' }}>
                  <span className="cust-toggle-label">Content age restriction</span>
                  <p className="accs-note" style={{ marginBottom: '12px' }}>Determines the content moderation profile applied to posts within this reelm.</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: 'under18', label: '14–17', note: 'All categories' },
                      { id: 'adults',  label: '18+',   note: 'Nefret/taciz/zarar engelli' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        className={`cust-textcolor-btn${ageRating === opt.id ? ' active' : ''}`}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gap: '2px' }}
                        onClick={() => {
                          setAgeRating(opt.id)
                          onUpdate({ ...reelm, roles, members, ageRating: opt.id })
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{opt.label}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{opt.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Roles</span>
                <span className="rs-section-hint">{roles.length}/12</span>
                {roles.length < 12 && !addingRole && (
                  <button className="rs-add-btn" onClick={() => setAddingRole(true)}>+ New role</button>
                )}
              </div>

              {addingRole && (
                <div className="rs-role-editor">
                  <div className="rs-color-row">
                    {ROLE_PALETTE.map(c => (
                      <button
                        key={c}
                        className={`rs-color-dot${newRoleColor === c ? ' rs-color-dot-active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setNewRoleColor(c)}
                      />
                    ))}
                  </div>
                  <div className="rs-name-row">
                    <span className="rs-color-preview" style={{ background: newRoleColor }} />
                    <input
                      className="rs-name-input"
                      placeholder="Role name…"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addRole(); if (e.key === 'Escape') setAddingRole(false) }}
                      autoFocus
                    />
                    <button className="rs-save-btn" onClick={addRole}>Create</button>
                    <button className="rs-cancel-btn" onClick={() => setAddingRole(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="rs-roles-list">
                {roles.map(role => (
                  <div key={role.id} className="rs-role-row">
                    {editingRoleId === role.id ? (
                      <div className="rs-role-editor">
                        <div className="rs-color-row">
                          {ROLE_PALETTE.map(c => (
                            <button
                              key={c}
                              className={`rs-color-dot${editingRoleColor === c ? ' rs-color-dot-active' : ''}`}
                              style={{ background: c }}
                              onClick={() => setEditingRoleColor(c)}
                            />
                          ))}
                        </div>
                        <div className="rs-name-row">
                          <span className="rs-color-preview" style={{ background: editingRoleColor }} />
                          <input
                            className="rs-name-input"
                            value={editingRoleName}
                            onChange={e => setEditingRoleName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEditRole(); if (e.key === 'Escape') setEditingRoleId(null) }}
                            autoFocus
                          />
                          <button className="rs-save-btn" onClick={saveEditRole}>Save</button>
                          <button className="rs-cancel-btn" onClick={() => setEditingRoleId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="rs-role-dot" style={{ background: role.color }} />
                        <span className="rs-role-name">{role.name}</span>
                        <span className="rs-role-count">{members.filter(m => (m.roleIds || []).includes(role.id)).length} members</span>
                        <button className="rs-role-edit-btn" onClick={() => startEditRole(role)}>Edit</button>
                        <button className="rs-role-delete-btn" onClick={() => deleteRole(role.id)}>✕</button>
                      </>
                    )}
                  </div>
                ))}
                {roles.length === 0 && <p className="rs-empty">No roles yet. Create one above.</p>}
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Members</span>
                <span className="rs-section-hint">{members.length}</span>
              </div>

              <div className="rs-members-list">
                {members.map(m => (
                  <div key={m.userId} className="rs-member-row">
                    <div className="rs-member-avatar">
                      {m.userPhoto
                        ? <img src={m.userPhoto} alt={m.userName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : (m.userName || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="rs-member-info">
                      <span className="rs-member-name">
                        {m.userName}
                        {m.userId === currentUser.id && <span className="rs-member-you"> (you)</span>}
                      </span>
                      <div className="rs-member-roles">
                        {roles.map(role => (
                          <button
                            key={role.id}
                            className={`rs-role-tag${(m.roleIds || []).includes(role.id) ? ' rs-role-tag-active' : ''}`}
                            style={(m.roleIds || []).includes(role.id) ? { background: role.color + '33', borderColor: role.color, color: role.color } : {}}
                            onClick={() => toggleMemberRole(m.userId, role.id)}
                          >{role.name}</button>
                        ))}
                      </div>
                    </div>
                    {m.userId !== currentUser.id && (
                      <button className="rs-member-remove" onClick={() => removeMember(m.userId)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>

              {nonMembers.length > 0 && (
                <div className="rs-add-member-section">
                  <div className="rs-section-header" style={{ marginTop: 24 }}>
                    <span className="rs-section-title">Add from friends</span>
                  </div>
                  <input
                    className="rs-search-input"
                    placeholder="Search friends…"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                  {filteredNonMembers.map(f => (
                    <div key={f.id} className="rs-member-row">
                      <div className="rs-member-avatar">
                        {f.photo
                          ? <img src={f.photo} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          : (f.name || '?').charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="rs-member-info">
                        <span className="rs-member-name">{f.name}</span>
                      </div>
                      <button className="rs-add-btn" onClick={() => addFriendAsMember(f)}>Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (() => {
            const beginningCat = reelm.categories?.find(c => c.type === 'announcement')
            const beginningChannels = beginningCat?.channels || []
            const currentAnnId = reelm.announcementChannelId || beginningChannels[0]?.id || ''
            return (
              <>
              <div className="rs-section">
                <div className="rs-section-header">
                  <span className="rs-section-title">Announcements Channel</span>
                </div>
                <p className="rs-section-hint" style={{ marginBottom: 14 }}>
                  System events like member joins will be posted to this channel.
                </p>
                <div className="rs-channel-select-row">
                  <span className="rs-channel-select-label"># Announcements channel</span>
                  <select
                    className="rs-channel-select"
                    value={currentAnnId}
                    onChange={e => onUpdate({ ...reelm, announcementChannelId: e.target.value })}
                  >
                    {beginningChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="rs-section" style={{ marginTop: 20 }}>
                <div className="rs-section-header">
                  <span className="rs-section-title">Voice Channels</span>
                </div>
                <div className="rs-channel-select-row">
                  <div>
                    <span className="rs-channel-select-label">Auto-join on click</span>
                    <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.4)' }}>
                      Members join a voice channel instantly when clicked.
                    </p>
                  </div>
                  <button
                    className={`cust-toggle${reelm.autoJoinVoice !== false ? ' cust-toggle-on' : ''}`}
                    onClick={() => onUpdate({ ...reelm, autoJoinVoice: reelm.autoJoinVoice === false ? true : false })}
                  >
                    <span className="cust-toggle-knob" />
                  </button>
                </div>
              </div>
            </>
            )
          })()}

        </div>
      </div>
    </div>
  )
}

const ARTICLE_CATEGORIES = [
  { id: 'tech', label: 'Technology & Engineering', subs: [
    { id: 'ai', label: 'AI' },
    { id: 'web3', label: 'Web3' },
    { id: 'seo', label: 'SEO' },
  ]},
  { id: 'insights', label: 'Insights' },
  { id: 'communities', label: 'Communities' },
  { id: 'marketing', label: 'Marketing & Growth' },
  { id: 'business', label: 'Business', subs: [
    { id: 'culture', label: 'Culture' },
    { id: 'product', label: 'Product' },
  ]},
  { id: 'social', label: 'Social Sciences' },
  { id: 'science', label: 'Science' },
  { id: 'psychology', label: 'Psychology' },
  { id: 'health', label: 'Health' },
  { id: 'life', label: 'Life' },
  { id: 'creative', label: 'Creative' },
  { id: 'arts', label: 'Arts', subs: [
    { id: 'music', label: 'Music' },
    { id: 'cinema', label: 'Cinema & TV' },
  ]},
]

/* ── Article floating toolbar (selection-based) ── */
function ArticleFloatingToolbar({ x, y, onExec, onHeading, onLink, onClose }) {
  const btn = (label, action, title) => (
    <button className="aft-btn" title={title} onMouseDown={e => { e.preventDefault(); action(); onClose() }}>{label}</button>
  )
  return (
    <div className="article-float-toolbar" style={{ left: x, top: y - 52, transform: 'translateX(-50%)' }}>
      {btn('H1', () => onHeading('h1'), 'Heading 1')}
      {btn('H2', () => onHeading('h2'), 'Heading 2')}
      <span className="aft-sep" />
      {btn(<b>B</b>, () => onExec('bold'), 'Bold')}
      {btn(<i>I</i>, () => onExec('italic'), 'Italic')}
      {btn(<u>U</u>, () => onExec('underline'), 'Underline')}
      <span className="aft-sep" />
      {btn(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="7" fontSize="5" fill="currentColor" stroke="none">1.</text><text x="2" y="13" fontSize="5" fill="currentColor" stroke="none">2.</text><text x="2" y="19" fontSize="5" fill="currentColor" stroke="none">3.</text></svg>, () => onExec('insertOrderedList'), 'Ordered list')}
      {btn(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>, () => onExec('insertUnorderedList'), 'Unordered list')}
      <span className="aft-sep" />
      {btn('❝', () => onExec('formatBlock', 'blockquote'), 'Quote')}
      {btn('🔗', onLink, 'Add link')}
      <span className="aft-sep" />
      {btn('Aa', () => onExec('fontName', 'Plus Jakarta Sans'), 'Jakarta Sans')}
    </div>
  )
}

/* ── Article editor (full-screen rich text) ── */
function ArticleEditor({ articleCat, initialDraft, onPublish, onSaveDraft, onClose }) {
  const [title, setTitle] = useState(initialDraft?.title || '')
  const [cover, setCover] = useState(initialDraft?.coverImage || null)
  const [floatingMenu, setFloatingMenu] = useState(null)
  const [useJakarta, setUseJakarta] = useState(false)
  const bodyRef = useRef(null)
  const coverInputRef = useRef(null)
  const imgInputRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current && initialDraft?.contentHtml) {
      bodyRef.current.innerHTML = initialDraft.contentHtml
    }
    bodyRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const execCmd = (cmd, val = null) => { bodyRef.current?.focus(); document.execCommand(cmd, false, val) }
  const applyHeading = (tag) => { bodyRef.current?.focus(); document.execCommand('formatBlock', false, tag) }

  const handleSelectionChange = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !bodyRef.current?.contains(sel.anchorNode)) { setFloatingMenu(null); return }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setFloatingMenu({ x: rect.left + rect.width / 2, y: rect.top })
  }

  const handleLink = () => {
    const url = window.prompt('Enter URL:')
    if (!url) return
    execCmd('createLink', url)
    // mark external links
    bodyRef.current?.querySelectorAll('a').forEach(a => {
      if (!a.dataset.handled) { a.dataset.handled = '1'; a.target = '_blank'; a.rel = 'noopener' }
    })
  }

  const insertImage = (src) => { bodyRef.current?.focus(); document.execCommand('insertImage', false, src) }

  const getHtml = () => bodyRef.current?.innerHTML || ''

  const handlePublish = () => {
    const t = title.trim()
    if (!t) return
    onPublish({ title: t, contentHtml: getHtml(), coverImage: cover, category: articleCat || null })
  }

  const handleDraft = () => {
    onSaveDraft({ id: initialDraft?.id || 'draft_' + Date.now(), title: title || 'Untitled', contentHtml: getHtml(), coverImage: cover, savedAt: new Date().toISOString() })
  }

  const toolbarFmt = (cmd, val, label, title) => (
    <button className="aef-btn" title={title} onClick={() => execCmd(cmd, val)}>{label}</button>
  )

  return ReactDOM.createPortal(
    <div className="article-editor-overlay" onMouseUp={handleSelectionChange} onKeyUp={handleSelectionChange} onClick={() => setFloatingMenu(null)}>
      {/* Top toolbar */}
      <div className="article-editor-toolbar" onClick={e => e.stopPropagation()}>
        <div className="article-editor-formats">
          <button className="aef-btn aef-heading" title="Heading 1" onClick={() => applyHeading('h1')}>H1</button>
          <button className="aef-btn aef-heading" title="Heading 2" onClick={() => applyHeading('h2')}>H2</button>
          <button className="aef-btn aef-heading" title="Heading 3" onClick={() => applyHeading('h3')}>H3</button>
          <button className="aef-btn" title="Body" onClick={() => applyHeading('p')}>Aa</button>
          <span className="aef-sep" />
          {toolbarFmt('bold', null, <b>B</b>, 'Bold')}
          {toolbarFmt('italic', null, <i>I</i>, 'Italic')}
          {toolbarFmt('underline', null, <u>U</u>, 'Underline')}
          <span className="aef-sep" />
          {toolbarFmt('insertOrderedList', null, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="7" fontSize="5" fill="currentColor" stroke="none">1.</text><text x="2" y="13" fontSize="5" fill="currentColor" stroke="none">2.</text><text x="2" y="19" fontSize="5" fill="currentColor" stroke="none">3.</text></svg>, 'Ordered list')}
          {toolbarFmt('insertUnorderedList', null, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>, 'Unordered list')}
          <span className="aef-sep" />
          {toolbarFmt('formatBlock', 'blockquote', '❝', 'Quote')}
          <button className="aef-btn" title="Link" onClick={handleLink}>🔗</button>
          <button
            className={`aef-btn${useJakarta ? ' aef-btn-active' : ''}`}
            title={useJakarta ? 'Switch to EB Garamond' : 'Switch to Jakarta Sans'}
            onClick={() => {
              const next = !useJakarta
              setUseJakarta(next)
              if (bodyRef.current) bodyRef.current.style.fontFamily = next ? "'Plus Jakarta Sans', sans-serif" : "'EB Garamond', Georgia, serif"
            }}
          >{useJakarta ? 'Eb' : 'Jkt'}</button>
        </div>
        <div className="article-editor-media-pills">
          <button className="aef-media-pill" onClick={() => imgInputRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Image
          </button>
          <button className={`aef-media-pill${cover ? ' aef-media-pill-set' : ''}`} onClick={() => coverInputRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            Cover{cover ? ' ✓' : ''}
          </button>
          <input type="file" accept="image/*" ref={coverInputRef} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setCover(ev.target.result); r.readAsDataURL(f); e.target.value = '' }} />
          <input type="file" accept="image/*" ref={imgInputRef} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => insertImage(ev.target.result); r.readAsDataURL(f); e.target.value = '' }} />
        </div>
      </div>

      {/* Main row: editor + right actions */}
      <div className="article-editor-main-row">
        {/* Editor area */}
        <div className="article-editor-area" onClick={e => e.stopPropagation()}>
          {cover && <div className="article-editor-cover-preview"><img src={cover} alt="" /><button className="article-editor-cover-remove" onClick={() => setCover(null)}>✕</button></div>}
          <input className="article-editor-title-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={180} />
          <div
            className="article-editor-body"
            contentEditable
            suppressContentEditableWarning
            ref={bodyRef}
            data-placeholder="Write your article…"
            onInput={() => {}}
            onClick={e => e.stopPropagation()}
          />
        </div>

        {/* Right-panel actions */}
        <div className="article-editor-right-actions" onClick={e => e.stopPropagation()}>
          <button className="article-editor-close" onClick={onClose}>✕</button>
          <div style={{ flex: 1 }} />
          <button className="article-editor-publish-btn" onClick={handlePublish}>
            Publish
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="article-editor-draft-btn" onClick={handleDraft}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Save as draft
          </button>
        </div>
      </div>

      {/* Floating toolbar */}
      {floatingMenu && <ArticleFloatingToolbar x={floatingMenu.x} y={floatingMenu.y} onExec={(cmd, val) => execCmd(cmd, val)} onHeading={applyHeading} onLink={handleLink} onClose={() => setFloatingMenu(null)} />}
    </div>,
    document.body
  )
}

/* ── Article view (full reading page) ── */
function ArticleView({ article, uid, onClose, onLike, onComment, onLinkWarning }) {
  const [readingMode, setReadingMode] = useState(false)
  const [commentText, setCommentText] = useState('')
  const isLiked = (article.likes || []).includes(uid)
  const mins = articleReadTime(article.contentHtml || article.content || '')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!bodyRef.current) return
    bodyRef.current.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href') || ''
        if (href.startsWith('http://') || href.startsWith('https://')) {
          e.preventDefault()
          onLinkWarning(href)
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article])

  return ReactDOM.createPortal(
    <div className={`article-view-overlay${readingMode ? ' article-view-reading-mode' : ''}`}>
      {/* Top bar */}
      <div className="article-view-topbar">
        <button className="article-view-back" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </button>
        <span className="article-view-readtime">{mins}d okuma</span>
        <button className={`article-view-light-btn${readingMode ? ' active' : ''}`} title="Reading mode" onClick={() => setReadingMode(v => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
      </div>

      <div className="article-view-scroll">
        {article.coverImage && <img src={article.coverImage} className="article-view-cover" alt="" />}
        <h1 className="article-view-title">{article.title}</h1>

        {/* Author row */}
        <div className="article-view-author">
          <div className="feed-post-pill-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
            {article.userPhoto ? <img src={article.userPhoto} alt="" /> : <span>{(article.userName || '?')[0].toUpperCase()}</span>}
          </div>
          <div>
            <span className="article-view-author-name">{article.userName}</span>
            <span className="article-view-author-date"> · {new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Body */}
        <div
          className="article-view-body"
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: article.contentHtml || (article.content || '').replace(/\n/g, '<br/>') }}
        />

        {/* Citations */}
        {article.citations?.length > 0 && (
          <div className="article-view-citations">
            <h4 className="article-view-citations-title">Works Cited</h4>
            {article.citations.map((c, i) => <p key={i} className="article-view-citation-item">[{i + 1}] {c.text} — <span>{c.url}</span></p>)}
          </div>
        )}

        {/* Actions */}
        <div className="article-view-actions">
          <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={onLike}>
            <img src={likePostIcon} alt="like" className="feed-post-action-icon" />
            <span>{(article.likes || []).length || ''}</span>
          </button>
          <button className="feed-post-action-btn">
            <img src={commentPostIcon} alt="comment" className="feed-post-action-icon" />
            <span>{(article.comments || []).length || ''}</span>
          </button>
          <button className="feed-post-action-btn">
            <img src={resharePostIcon} alt="reshare" className="feed-post-action-icon" />
          </button>
          <button className="feed-post-action-btn">
            <img src={forwardPostIcon} alt="forward" className="feed-post-action-icon" />
          </button>
        </div>

        {/* Comments */}
        <div className="article-view-comments">
          {(article.comments || []).map(c => (
            <div key={c.id} className="feed-comment-pill">
              <div className="feed-comment-avatar">
                {c.userPhoto ? <img src={c.userPhoto} alt="" /> : <span>{(c.userName || '?')[0].toUpperCase()}</span>}
              </div>
              <div className="feed-comment-content">
                <span className="feed-comment-name">{c.userName}</span>
                <span className="feed-comment-text">{c.text}</span>
              </div>
            </div>
          ))}
          <div className="feed-add-comment-row">
            <input placeholder="Add a comment…" value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) { onComment(commentText.trim()); setCommentText('') } }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function FeedPage({ currentUser, uid, tab, selectedReelm, isMod, onReport, onModDeletePost, modDeleteTick, appStoriesTick, onShare, pushNotifTo }) {
  const reelmId = selectedReelm?.id || 'global'
  const NEWS_CATEGORIES = ['World', 'Technology', 'Science', 'Health', 'Business', 'Culture', 'Sports', 'Politics']
  const STORY_DUR = 8000

  const getUserRole = (userId) => {
    if (!selectedReelm) return null
    const members = selectedReelm.members || []
    const member = members.find(m => m.userId === userId)
    if (!member || !(member.roleIds || []).length) return null
    const roles = selectedReelm.roles || []
    const role = roles.find(r => member.roleIds.includes(r.id))
    return role ? role.name : null
  }

  const [stories, setStories] = useState([])
  const skipStoriesPersist = useRef(true)
  const skipPostsPersist = useRef(true)
  const [viewingGroup, setViewingGroup] = useState(null) // { groupIndex, storyIndex }
  const [showAddStory, setShowAddStory] = useState(false)
  const [addType, setAddType] = useState(null) // 'text' | 'photo' | 'video'
  const [storyText, setStoryText] = useState('')
  const [storyBg, setStoryBg] = useState('#2d1f2e')
  const [storyDuration, setStoryDuration] = useState(24)
  const [storyMedia, setStoryMedia] = useState(null)
  const storyFileInputRef = useRef(null)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [articleCat, setArticleCat] = useState(null)
  const [articleCatOpen, setArticleCatOpen] = useState(null)
  const [articleCatExpanded, setArticleCatExpanded] = useState(false)
  const [articleCatSearch, setArticleCatSearch] = useState(false)
  const [articleCatSearchText, setArticleCatSearchText] = useState('')
  const [articles, setArticles] = useState(() => getArticles(reelmId))
  const [openArticleMenu, setOpenArticleMenu] = useState(null)
  const [articleEditorOpen, setArticleEditorOpen] = useState(false)
  const [editorDraftId, setEditorDraftId] = useState(null)
  const [editorInitContent, setEditorInitContent] = useState(null)
  const [articleDrafts, setArticleDrafts] = useState(() => getArticleDrafts(reelmId))
  const [showDrafts, setShowDrafts] = useState(false)
  const [viewingArticle, setViewingArticle] = useState(null)
  const [linkWarning, setLinkWarning] = useState(null)
  const [openArticleComments, setOpenArticleComments] = useState(null)
  const [articleCommentText, setArticleCommentText] = useState('')
  const [threads, setThreads] = useState(() => getThreads(reelmId))
  const [newsItems, setNewsItems] = useState(() => getNews(reelmId))
  const [newNewsTitle, setNewNewsTitle] = useState('')
  const [newNewsBody, setNewNewsBody] = useState('')
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [newsCat, setNewsCat] = useState(null)
  const [newsSort, setNewsSort] = useState('newest')
  const [openNewsMenu, setOpenNewsMenu] = useState(null)
  const [openNewsComments, setOpenNewsComments] = useState(null)
  const [newsCommentText, setNewsCommentText] = useState('')
  const [forumTag, setForumTag] = useState(null)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadBody, setNewThreadBody] = useState('')
  const [newThreadTags, setNewThreadTags] = useState('')
  const [viewingThread, setViewingThread] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [nestedReplyTexts, setNestedReplyTexts] = useState({})

  const addNestedReply = (replies, parentId, newReply) => replies.map(r => {
    if (r.id === parentId) return { ...r, replies: [...(r.replies || []), newReply] }
    if ((r.replies || []).length > 0) return { ...r, replies: addNestedReply(r.replies, parentId, newReply) }
    return r
  })
  const [feedSort, setFeedSort] = useState('newest')
  const [feedDisplay, setFeedDisplay] = useState('posts')
  const [postText, setPostText] = useState('')
  const [feedModerationWarning, setFeedModerationWarning] = useState('')
  const [posts, setPosts] = useState([])

  useEffect(() => {
    if (uid === 'guest') {
      setStories([])
      skipStoriesPersist.current = true
      return undefined
    }
    let cancelled = false
    const isInitialSync = appStoriesTick === 0
    if (isInitialSync) skipStoriesPersist.current = true
    appGetDoc('stories')
      .then((s) => {
        if (cancelled) return
        setStories(Array.isArray(s) ? s : [])
        if (isInitialSync) skipStoriesPersist.current = false
      })
      .catch(() => {
        if (!cancelled && isInitialSync) skipStoriesPersist.current = false
      })
    return () => { cancelled = true }
  }, [uid, appStoriesTick])

  useEffect(() => {
    let cancelled = false
    skipPostsPersist.current = true
    const id = reelmId || 'global'
    loadReelmDocuments(id)
      .then(() => {
        if (cancelled) return
        const fp = REELM_CACHE[id]?.feed_posts
        setPosts(Array.isArray(fp) ? fp : [])
        skipPostsPersist.current = false
      })
      .catch(() => {
        if (!cancelled) skipPostsPersist.current = false
      })
    return () => { cancelled = true }
  }, [reelmId])

  useEffect(() => {
    if (modDeleteTick <= 0) return
    const id = reelmId || 'global'
    const cache = REELM_CACHE[id] || {}
    if (Array.isArray(cache.feed_posts)) setPosts(cache.feed_posts)
    if (Array.isArray(cache.articles)) setArticles(cache.articles)
    if (Array.isArray(cache.threads)) setThreads(cache.threads)
    if (Array.isArray(cache.news)) setNewsItems(cache.news)
  }, [modDeleteTick, reelmId])
  const [storyElapsed, setStoryElapsed] = useState(0)
  const [storyDurationMs, setStoryDurationMs] = useState(STORY_DUR)
  const storyGroupsRef = useRef([])
  const storiesRowRef = useRef(null)
  const [storiesEdge, setStoriesEdge] = useState({ left: false, right: true })

  const checkStoriesEdge = () => {
    const el = storiesRowRef.current
    if (!el) return
    setStoriesEdge({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    })
  }

  useEffect(() => {
    const el = storiesRowRef.current
    if (!el) return
    checkStoriesEdge()
    el.addEventListener('scroll', checkStoriesEdge)
    const ro = new ResizeObserver(checkStoriesEdge)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkStoriesEdge); ro.disconnect() }
  }, [])

  const [commentDrafts, setCommentDrafts] = useState({})
  const [replyDrafts, setReplyDrafts] = useState({})
  const [openPostMenu, setOpenPostMenu] = useState(null)
  const [openCommentMenu, setOpenCommentMenu] = useState(null)
  const [forwardPost, setForwardPost] = useState(null)
  const [forwardCopied, setForwardCopied] = useState(false)

  useEffect(() => {
    const handler = () => { setOpenPostMenu(null); setOpenCommentMenu(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const formatPostDate = useCallback((ts) => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = Date.now()
    const diff = now - ts
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (diff < 60000) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days <= 7) return `${days}d ago`
    const d = new Date(ts)
    const postYear = d.getFullYear()
    const thisYear = new Date(now).getFullYear()
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${postYear < thisYear ? ' ' + postYear : ''}`
  }, [])

  const reelmLabel = selectedReelm?.name || 'a reelm'
  const togglePostLike = (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const likes = p.likes || []
      const wasLiked = likes.includes(uid)
      if (!wasLiked && String(p.userId) !== String(uid) && pushNotifTo) {
        const snippet = (p.text || '').trim().slice(0, 50)
        const tail = snippet ? `: "${snippet}${snippet.length >= 50 ? '…' : ''}"` : ''
        pushNotifTo(p.userId, `${currentUser.name} liked your post in ${reelmLabel}${tail}.`)
      }
      return { ...p, likes: wasLiked ? likes.filter(x => x !== uid) : [...likes, uid] }
    }))
  }
  const toggleCommentLike = (postId, commentId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, comments: (p.comments || []).map(c => {
        if (c.id !== commentId) return c
        const likes = c.likes || []
        const wasLiked = likes.includes(uid)
        if (!wasLiked && String(c.userId) !== String(uid) && pushNotifTo) {
          pushNotifTo(c.userId, `${currentUser.name} liked your comment in ${reelmLabel}.`)
        }
        return { ...c, likes: wasLiked ? likes.filter(x => x !== uid) : [...likes, uid] }
      })}
    }))
  }
  const toggleReplyLike = (postId, commentId, replyId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, comments: (p.comments || []).map(c => {
        if (c.id !== commentId) return c
        return { ...c, replies: (c.replies || []).map(r => {
          if (r.id !== replyId) return r
          const likes = r.likes || []
          const wasLiked = likes.includes(uid)
          if (!wasLiked && String(r.userId) !== String(uid) && pushNotifTo) {
            pushNotifTo(r.userId, `${currentUser.name} liked your reply in ${reelmLabel}.`)
          }
          return { ...r, likes: wasLiked ? likes.filter(x => x !== uid) : [...likes, uid] }
        })}
      })}
    }))
  }
  const addComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim()
    if (!text) return
    const mod = await moderateText(text, selectedReelm?.ageRating)
    if (!mod.allowed) {
      setFeedModerationWarning(mod.message || 'Blocked.')
      setTimeout(() => setFeedModerationWarning(''), 5000)
      return
    }
    const c = { id: Date.now().toString(), userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, text, createdAt: Date.now(), likes: [], replies: [] }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      if (String(p.userId) !== String(uid) && pushNotifTo) {
        pushNotifTo(p.userId, `${currentUser.name} commented on your post in ${reelmLabel}.`)
      }
      return { ...p, comments: [...(p.comments || []), c] }
    }))
    setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
  }
  const addReply = async (postId, commentId) => {
    const text = (replyDrafts[commentId] || '').trim()
    if (!text) return
    const mod = await moderateText(text, selectedReelm?.ageRating)
    if (!mod.allowed) {
      setFeedModerationWarning(mod.message || 'Blocked.')
      setTimeout(() => setFeedModerationWarning(''), 5000)
      return
    }
    const r = { id: Date.now().toString(), userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, text, createdAt: Date.now(), likes: [] }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, comments: (p.comments || []).map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), r] } : c) }
    }))
    setReplyDrafts(prev => ({ ...prev, [commentId]: '' }))
  }
  const handleSharePost = async () => {
    if (!postText.trim()) return
    const mod = await moderateText(postText, selectedReelm?.ageRating)
    if (!mod.allowed) {
      setFeedModerationWarning(mod.message || 'Blocked.')
      setTimeout(() => setFeedModerationWarning(''), 5000)
      return
    }
    const newPost = { id: Date.now().toString(), userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, text: postText.trim(), createdAt: Date.now(), likes: [], comments: [] }
    setPosts(prev => [newPost, ...prev])
    setPostText('')
  }

  useEffect(() => {
    if (skipStoriesPersist.current || uid === 'guest') return
    scheduleAppPersist('stories', stories)
  }, [stories, uid])

  useEffect(() => {
    if (skipPostsPersist.current) return
    scheduleReelmPersist(reelmId, 'feed_posts', posts)
  }, [posts, reelmId])

  const storyGroups = useMemo(() => {
    const now = Date.now()
    const active = stories.filter(s => s.expiresAt > now)
    const map = new Map()
    active.forEach(s => {
      if (!map.has(s.userId)) map.set(s.userId, [])
      map.get(s.userId).push(s)
    })
    const arr = []
    if (map.has(uid)) arr.push(map.get(uid))
    map.forEach((g, userId) => { if (userId !== uid) arr.push(g) })
    return arr
  }, [stories, uid])

  useEffect(() => { storyGroupsRef.current = storyGroups }, [storyGroups])

  useEffect(() => {
    if (tab !== 'news') return
    const canvas = document.getElementById(`news-particles-${selectedReelm?.id}`)
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Cat-face shaped particle (small circles arranged as cat face silhouette)
    const catPoints = () => {
      const pts = []
      // Head circle
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        pts.push({ x: Math.cos(a) * 18, y: Math.sin(a) * 16 })
      }
      // Left ear
      pts.push({ x: -12, y: -18 }, { x: -16, y: -26 }, { x: -8, y: -22 })
      // Right ear
      pts.push({ x: 12, y: -18 }, { x: 16, y: -26 }, { x: 8, y: -22 })
      return pts
    }
    const shape = catPoints()

    for (let i = 0; i < 22; i++) {
      const pt = shape[Math.floor(Math.random() * shape.length)]
      const scale = 0.8 + Math.random() * 1.8
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        ox: pt.x * scale, oy: pt.y * scale,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.18 - Math.random() * 0.22,
        alpha: 0,
        targetAlpha: 0.04 + Math.random() * 0.07,
        r: 2 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    canvas.style.opacity = '1'

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() / 1000
      particles.forEach(p => {
        p.alpha += (p.targetAlpha - p.alpha) * 0.02
        p.x += p.vx + Math.sin(t * 0.4 + p.phase) * 0.15
        p.y += p.vy
        if (p.y < -40) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.arc(p.x + p.ox * 0.06, p.y + p.oy * 0.06, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(185,152,135,${p.alpha})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      canvas.style.opacity = '0'
    }
  }, [tab, selectedReelm?.id])

  const currentStory = viewingGroup
    ? storyGroups[viewingGroup.groupIndex]?.[viewingGroup.storyIndex]
    : null

  useEffect(() => {
    if (!viewingGroup || !currentStory) return
    if (currentStory.type === 'video') return
    setStoryElapsed(0)
    setStoryDurationMs(STORY_DUR)
    const startTime = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed >= STORY_DUR) {
        clearInterval(id)
        setViewingGroup(prev => {
          if (!prev) return null
          const { groupIndex, storyIndex } = prev
          const groups = storyGroupsRef.current
          const group = groups[groupIndex]
          if (!group) return null
          if (storyIndex < group.length - 1) return { groupIndex, storyIndex: storyIndex + 1 }
          if (groupIndex < groups.length - 1) return { groupIndex: groupIndex + 1, storyIndex: 0 }
          return null
        })
      } else {
        setStoryElapsed(elapsed)
      }
    }, 100)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingGroup?.groupIndex, viewingGroup?.storyIndex])

  const goNextStory = () => {
    setViewingGroup(prev => {
      if (!prev) return null
      const { groupIndex, storyIndex } = prev
      const groups = storyGroupsRef.current
      const group = groups[groupIndex]
      if (!group) return null
      if (storyIndex < group.length - 1) return { groupIndex, storyIndex: storyIndex + 1 }
      if (groupIndex < groups.length - 1) return { groupIndex: groupIndex + 1, storyIndex: 0 }
      return null
    })
  }

  const goPrevStory = () => {
    setViewingGroup(prev => {
      if (!prev) return null
      const { groupIndex, storyIndex } = prev
      const groups = storyGroupsRef.current
      if (storyIndex > 0) return { groupIndex, storyIndex: storyIndex - 1 }
      if (groupIndex > 0) {
        const prevGroup = groups[groupIndex - 1]
        if (!prevGroup) return prev
        return { groupIndex: groupIndex - 1, storyIndex: prevGroup.length - 1 }
      }
      return prev
    })
  }

  const addStory = () => {
    const now = Date.now()
    const story = {
      id: now.toString(),
      userId: uid,
      userName: currentUser.name,
      userPhoto: currentUser.photo || null,
      type: addType === 'text' ? 'text' : storyMedia?.type === 'video' ? 'video' : 'image',
      content: addType === 'text' ? storyText : storyMedia?.url,
      backgroundColor: addType === 'text' ? storyBg : null,
      duration: storyDuration,
      createdAt: now,
      expiresAt: now + storyDuration * 60 * 60 * 1000,
      likes: [],
    }
    setStories(prev => [story, ...prev])
    setShowAddStory(false)
    setAddType(null)
    setStoryText('')
    setStoryMedia(null)
  }

  const likeStory = (storyId) => {
    setStories(prev => prev.map(s => {
      if (s.id !== storyId) return s
      const liked = (s.likes || []).includes(uid)
      return { ...s, likes: liked ? (s.likes || []).filter(l => l !== uid) : [...(s.likes || []), uid] }
    }))
  }

  const RADIUS = 13
  const CIRC = 2 * Math.PI * RADIUS
  const progress = currentStory?.type === 'video'
    ? (storyDurationMs > 0 ? storyElapsed / storyDurationMs : 0)
    : storyElapsed / STORY_DUR
  const strokeOffset = CIRC * progress

  return (
    <div className="panel panel-middle feed-page">
      {/* Story Viewer Overlay */}
      {viewingGroup !== null && currentStory && (
        <div className="story-viewer-overlay" onClick={() => setViewingGroup(null)}>
          <div className="story-viewer-window" onClick={e => e.stopPropagation()}>
            {/* Progress bars */}
            <div className="story-progress-bars">
              {(storyGroups[viewingGroup.groupIndex] || []).map((s, i) => (
                <div key={s.id} className="story-progress-track">
                  <div className="story-progress-fill" style={{
                    width: i < viewingGroup.storyIndex
                      ? '100%'
                      : i === viewingGroup.storyIndex
                        ? `${Math.min(100, progress * 100)}%`
                        : '0%'
                  }} />
                </div>
              ))}
            </div>
            {/* Top bar */}
            <div className="story-viewer-top">
              <div className="story-viewer-user">
                <div className="story-viewer-avatar">
                  {currentStory.userPhoto
                    ? <img src={currentStory.userPhoto} alt="" />
                    : <span>{(currentStory.userName || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <span className="story-viewer-name">{currentStory.userName}</span>
              </div>
              <div className="story-countdown">
                <svg width={RADIUS * 2 + 8} height={RADIUS * 2 + 8}>
                  <circle cx={RADIUS + 4} cy={RADIUS + 4} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                  <circle
                    cx={RADIUS + 4} cy={RADIUS + 4} r={RADIUS}
                    fill="none" stroke="white" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={strokeOffset}
                    transform={`rotate(-90 ${RADIUS + 4} ${RADIUS + 4})`}
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                  />
                </svg>
              </div>
              <button className="story-close-btn" onClick={() => setViewingGroup(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {/* Story content */}
            {currentStory.type === 'text' && (
              <div className="story-content-text" style={{ background: currentStory.backgroundColor || '#2d1f2e' }}>
                <p className="story-text-content">{currentStory.content}</p>
              </div>
            )}
            {currentStory.type === 'image' && (
              <img src={currentStory.content} className="story-content-media" alt="" />
            )}
            {currentStory.type === 'video' && (
              <video
                src={currentStory.content}
                className="story-content-media"
                autoPlay
                playsInline
                onTimeUpdate={e => {
                  const v = e.target
                  if (v.duration && v.duration !== Infinity) {
                    setStoryDurationMs(v.duration * 1000)
                    setStoryElapsed(v.currentTime * 1000)
                  }
                }}
                onEnded={goNextStory}
              />
            )}
            {/* Navigation zones */}
            <div className="story-nav story-nav-prev" onClick={e => { e.stopPropagation(); goPrevStory() }} />
            <div className="story-nav story-nav-next" onClick={e => { e.stopPropagation(); goNextStory() }} />
            {/* Bottom respond pill */}
            <div className="story-bottom">
              <div className="story-respond-pill">
                <span className="story-respond-placeholder">Respond to this story</span>
                <button
                  className={`story-like-btn${(currentStory.likes || []).includes(uid) ? ' liked' : ''}`}
                  onClick={e => { e.stopPropagation(); likeStory(currentStory.id) }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"
                    fill={(currentStory.likes || []).includes(uid) ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Story Modal */}
      {showAddStory && (
        <div className="story-viewer-overlay" onClick={() => { setShowAddStory(false); setAddType(null); setStoryText(''); setStoryMedia(null) }}>
          <div className="add-story-modal" onClick={e => e.stopPropagation()}>
            <button className="story-close-btn add-story-close" onClick={() => { setShowAddStory(false); setAddType(null); setStoryText(''); setStoryMedia(null) }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {!addType ? (
              <div className="add-story-choose">
                <h3>Add to your story</h3>
                <div className="add-story-options">
                  <button className="add-story-option" onClick={() => setAddType('text')}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 6h16M4 12h10M4 18h14"/>
                    </svg>
                    <span>Text</span>
                  </button>
                  <button className="add-story-option" onClick={() => storyFileInputRef.current?.click()}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>Photo / Video</span>
                  </button>
                </div>
                <input
                  ref={storyFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const r = new FileReader()
                    r.onload = ev => {
                      setStoryMedia({ url: ev.target.result, type: file.type.startsWith('video/') ? 'video' : 'image' })
                      setAddType(file.type.startsWith('video/') ? 'video' : 'photo')
                    }
                    r.readAsDataURL(file)
                  }}
                />
              </div>
            ) : addType === 'text' ? (
              <div className="add-story-editor">
                <div className="add-story-preview" style={{ background: storyBg }}>
                  <textarea
                    className="add-story-textarea"
                    placeholder="What's on your mind?"
                    value={storyText}
                    onChange={e => setStoryText(e.target.value)}
                    autoFocus
                    maxLength={200}
                  />
                </div>
                <div className="add-story-bg-row">
                  {['#2d1f2e', '#1a1428', '#0c0c20', '#1a2e1f', '#2e1a1a', '#1a2328', '#2e2a1a'].map(c => (
                    <button key={c} className={`add-story-bg-btn${storyBg === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setStoryBg(c)} />
                  ))}
                </div>
                <div className="add-story-dur-row">
                  <span>Visible for</span>
                  {[8, 12, 24, 48].map(d => (
                    <button key={d} className={`add-story-dur-btn${storyDuration === d ? ' active' : ''}`} onClick={() => setStoryDuration(d)}>{d}h</button>
                  ))}
                </div>
                <button className="add-story-submit" onClick={addStory} disabled={!storyText.trim()}>Share Story</button>
              </div>
            ) : storyMedia ? (
              <div className="add-story-editor">
                <div className="add-story-preview add-story-preview-media">
                  {storyMedia.type === 'video'
                    ? <video src={storyMedia.url} controls className="add-story-media-el" />
                    : <img src={storyMedia.url} className="add-story-media-el" alt="" />
                  }
                </div>
                <div className="add-story-dur-row">
                  <span>Visible for</span>
                  {[8, 12, 24, 48].map(d => (
                    <button key={d} className={`add-story-dur-btn${storyDuration === d ? ' active' : ''}`} onClick={() => setStoryDuration(d)}>{d}h</button>
                  ))}
                </div>
                <button className="add-story-submit" onClick={addStory}>Share Story</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Feed inner content */}
      {tab === 'articles' ? (
        <>
        <div className="articles-page">
          {/* Header */}
          <div className="articles-header-row">
            <span className="articles-title">Articles</span>
            <div className="articles-header-actions">
              <button className={`articles-drafts-btn${showDrafts ? ' active' : ''}`} title="Drafts" onClick={() => setShowDrafts(v => !v)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button className="articles-new-btn" onClick={() => { setEditorDraftId(null); setEditorInitContent(null); setArticleEditorOpen(true) }}>
                <img src={newIcon} alt="New article" />
              </button>
            </div>
          </div>

          {/* Drafts panel */}
          {showDrafts && (
            <div className="articles-drafts-panel">
              <span className="articles-drafts-title">Drafts</span>
              {articleDrafts.length === 0
                ? <p className="articles-drafts-empty">No drafts saved.</p>
                : articleDrafts.map(draft => (
                  <div key={draft.id} className="articles-draft-item">
                    <div className="articles-draft-item-text" onClick={() => { setEditorDraftId(draft.id); setEditorInitContent(draft); setArticleEditorOpen(true); setShowDrafts(false) }}>
                      <span className="articles-draft-item-title">{draft.title || 'Untitled'}</span>
                      <span className="articles-draft-item-date">{new Date(draft.savedAt).toLocaleDateString()}</span>
                    </div>
                    <button className="articles-draft-item-del" onClick={() => { deleteArticleDraft(draft.id, reelmId); setArticleDrafts(getArticleDrafts(reelmId)) }} title="Delete">✕</button>
                  </div>
                ))
              }
            </div>
          )}

          {/* Category bar */}
          <div className="articles-cat-bar">
            <div className={`articles-cat-pills${articleCatExpanded ? ' expanded' : ''}`}>
              {ARTICLE_CATEGORIES
                .filter(cat => !articleCatSearchText || cat.label.toLowerCase().includes(articleCatSearchText.toLowerCase()))
                .map(cat => (
                  <button
                    key={cat.id}
                    className={`articles-cat-pill${articleCat === cat.id ? ' active' : ''}`}
                    onClick={() => setArticleCat(articleCat === cat.id ? null : cat.id)}
                  >
                    {cat.label}
                    {cat.subs && (
                      <span
                        className={`articles-cat-chevron${articleCatOpen === cat.id ? ' open' : ''}`}
                        onClick={e => { e.stopPropagation(); setArticleCatOpen(articleCatOpen === cat.id ? null : cat.id) }}
                      >
                        <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
                          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))
              }
            </div>
            <div className="articles-cat-controls">
              <button
                className={`articles-cat-expand-btn${articleCatExpanded ? ' open' : ''}`}
                onClick={() => setArticleCatExpanded(v => !v)}
                title={articleCatExpanded ? 'Show less' : 'Show more'}
              >
                <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
                  <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className={`articles-cat-search-btn${articleCatSearch ? ' active' : ''}`}
                onClick={() => { setArticleCatSearch(v => !v); setArticleCatSearchText('') }}
                title="Search categories"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Sub-category pills */}
          {articleCatOpen && (
            <div className="articles-sub-pills">
              {ARTICLE_CATEGORIES.find(c => c.id === articleCatOpen)?.subs?.map(sub => (
                <button
                  key={sub.id}
                  className={`articles-cat-pill articles-sub-pill${articleCat === sub.id ? ' active' : ''}`}
                  onClick={() => setArticleCat(articleCat === sub.id ? null : sub.id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Category search input */}
          {articleCatSearch && (
            <input
              className="articles-cat-search-input"
              placeholder="Search categories..."
              value={articleCatSearchText}
              onChange={e => setArticleCatSearchText(e.target.value)}
              autoFocus
            />
          )}

          {/* Articles content */}
          <div className="articles-content">
            {articles.length === 0
              ? <p className="articles-empty">No articles yet.</p>
              : articles
                  .filter(a => !articleCat || a.category === articleCat)
                  .map(article => {
                    const rawText = (article.contentHtml || article.content || '').replace(/<[^>]*>/g, ' ')
                    const firstParagraph = rawText.trim().split(/\n+/).find(l => l.trim()) || rawText.trim().slice(0, 300)
                    const mins = articleReadTime(article.contentHtml || article.content || '')
                    const isLiked = (article.likes || []).includes(uid)
                    return (
                      <div key={article.id} className="article-card" onClick={() => setViewingArticle(article)}>
                        {/* Header pill */}
                        <div className="feed-post-pill" onClick={e => e.stopPropagation()}>
                          <div className="feed-post-pill-avatar">
                            {article.userPhoto ? <img src={article.userPhoto} alt="" /> : <span>{(article.userName || '?')[0].toUpperCase()}</span>}
                          </div>
                          <div className="feed-post-pill-meta">
                            <div className="feed-post-pill-top">
                              <span className="feed-post-pill-name">{article.userName}</span>
                              <div className="feed-post-menu-wrap">
                                <button className="feed-post-menu-btn" onClick={e => { e.stopPropagation(); setOpenArticleMenu(openArticleMenu === article.id ? null : article.id) }}>
                                  <svg width="3" height="11" viewBox="0 0 3 11" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="1.5" cy="5.5" r="1.3"/><circle cx="1.5" cy="9.5" r="1.3"/></svg>
                                </button>
                                {openArticleMenu === article.id && (
                                  <div className="feed-post-menu-dropdown">
                                    {isMod
                                      ? <button className="feed-post-menu-item feed-post-menu-danger" onClick={e => { e.stopPropagation(); setOpenArticleMenu(null); deleteArticle(article.id, reelmId); setArticles(getArticles(reelmId)) }}>Delete article</button>
                                      : <button className="feed-post-menu-item" onClick={e => { e.stopPropagation(); setOpenArticleMenu(null); onReport && onReport('article', article.id, article.title, article.userId, article.userName, '') }}>Report</button>
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="feed-post-pill-bottom">{formatPostDate(article.createdAt)}</div>
                          </div>
                        </div>

                        {/* Body: text left, cover right */}
                        <div className="article-card-body">
                          <div className="article-card-text">
                            <h2 className="article-card-title">{article.title}</h2>
                            {firstParagraph && (
                              <p className="article-card-excerpt">
                                {firstParagraph}
                                <span className="article-card-readtime"> · {mins}d okuma</span>
                              </p>
                            )}
                          </div>
                          {article.coverImage && (
                            <div className="article-card-cover">
                              <img src={article.coverImage} alt="" />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="feed-post-actions article-card-actions" onClick={e => e.stopPropagation()}>
                          <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={() => {
                            const likes = isLiked ? (article.likes || []).filter(l => l !== uid) : [...(article.likes || []), uid]
                            updateArticle(article.id, { likes }, reelmId)
                            setArticles(getArticles(reelmId))
                          }}>
                            <img src={likePostIcon} alt="like" className="feed-post-action-icon" />
                            <span>{(article.likes || []).length || ''}</span>
                          </button>
                          <button className="feed-post-action-btn" onClick={() => setOpenArticleComments(openArticleComments === article.id ? null : article.id)}>
                            <img src={commentPostIcon} alt="comment" className="feed-post-action-icon" />
                            <span>{(article.comments || []).length || ''}</span>
                          </button>
                          <button className="feed-post-action-btn">
                            <img src={resharePostIcon} alt="reshare" className="feed-post-action-icon" />
                          </button>
                          <button className="feed-post-action-btn">
                            <img src={forwardPostIcon} alt="forward" className="feed-post-action-icon" />
                          </button>
                        </div>

                        {/* Comments */}
                        {openArticleComments === article.id && (
                          <div className="feed-post-comments article-card-comments" onClick={e => e.stopPropagation()}>
                            {(article.comments || []).map(c => (
                              <div key={c.id} className="feed-comment-pill">
                                <div className="feed-comment-avatar">
                                  {c.userPhoto ? <img src={c.userPhoto} alt="" /> : <span>{(c.userName || '?')[0].toUpperCase()}</span>}
                                </div>
                                <div className="feed-comment-content">
                                  <span className="feed-comment-name">{c.userName}</span>
                                  <span className="feed-comment-text">{c.text}</span>
                                </div>
                              </div>
                            ))}
                            <div className="feed-add-comment-row">
                              <input
                                placeholder="Add a comment…"
                                value={articleCommentText}
                                onChange={e => setArticleCommentText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && articleCommentText.trim()) {
                                    const comment = { id: Date.now().toString(), text: articleCommentText.trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString() }
                                    updateArticle(article.id, { comments: [...(article.comments || []), comment] }, reelmId)
                                    setArticles(getArticles(reelmId))
                                    setArticleCommentText('')
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
            }
          </div>

          {/* Article editor */}
          {articleEditorOpen && <ArticleEditor
            uid={uid}
            currentUser={currentUser}
            articleCat={articleCat}
            initialDraft={editorInitContent}
            onPublish={(data) => {
              const article = { id: 'article_' + Date.now(), ...data, userId: uid, userName: currentUser?.name || currentUser?.username || 'Unknown', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString(), likes: [], comments: [] }
              if (editorDraftId) { deleteArticleDraft(editorDraftId, reelmId); setArticleDrafts(getArticleDrafts(reelmId)) }
              saveArticle(article, reelmId); setArticles(getArticles(reelmId)); setArticleEditorOpen(false); setEditorDraftId(null); setEditorInitContent(null)
            }}
            onSaveDraft={(draft) => { saveArticleDraft(draft, reelmId); setArticleDrafts(getArticleDrafts(reelmId)); setArticleEditorOpen(false); setEditorDraftId(null); setEditorInitContent(null) }}
            onClose={() => { setArticleEditorOpen(false); setEditorDraftId(null); setEditorInitContent(null) }}
          />}

          {/* Article view */}
          {viewingArticle && <ArticleView
            article={viewingArticle}
            uid={uid}
            currentUser={currentUser}
            onClose={() => setViewingArticle(null)}
            onLike={() => {
              const a = viewingArticle
              const isLiked = (a.likes || []).includes(uid)
              const likes = isLiked ? (a.likes || []).filter(l => l !== uid) : [...(a.likes || []), uid]
              updateArticle(a.id, { likes }, reelmId); setArticles(getArticles(reelmId)); setViewingArticle({ ...a, likes })
            }}
            onComment={(text) => {
              const comment = { id: Date.now().toString(), text, userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString() }
              const a = viewingArticle
              updateArticle(a.id, { comments: [...(a.comments || []), comment] }, reelmId); setArticles(getArticles(reelmId)); setViewingArticle({ ...a, comments: [...(a.comments || []), comment] })
            }}
            onLinkWarning={(url) => setLinkWarning(url)}
          />}

          {/* Link warning */}
          {linkWarning && ReactDOM.createPortal(
            <div className="link-warning-overlay" onClick={() => setLinkWarning(null)}>
              <div className="link-warning-modal" onClick={e => e.stopPropagation()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span className="link-warning-title">Leaving Reelms</span>
                <p className="link-warning-desc">This link goes to an external site:<br/><span className="link-warning-url">{linkWarning}</span></p>
                <div className="link-warning-actions">
                  <button className="link-warning-cancel" onClick={() => setLinkWarning(null)}>Cancel</button>
                  <button className="link-warning-go" onClick={() => { window.open(linkWarning, '_blank', 'noopener'); setLinkWarning(null) }}>Continue</button>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
        </>
      ) : tab === 'forums' ? (
        <div className="forums-page">
          {/* Header */}
          <div className="forums-header-row">
            <span className="forums-header-title">Forums</span>
            <div className="articles-header-actions">
              <button className="articles-new-btn" onClick={() => setShowNewThread(true)}>
                <img src={newIcon} alt="New thread" />
              </button>
            </div>
          </div>

          {/* Tag ribbon */}
          {(() => {
            const allTags = [...new Set(threads.flatMap(t => t.tags || []))]
            return allTags.length > 0 ? (
              <div className="forums-tag-ribbon">
                <button className={`forums-tag-pill${!forumTag ? ' active' : ''}`} onClick={() => setForumTag(null)}>All</button>
                {allTags.map(tag => (
                  <button key={tag} className={`forums-tag-pill${forumTag === tag ? ' active' : ''}`} onClick={() => setForumTag(forumTag === tag ? null : tag)}>{tag}</button>
                ))}
              </div>
            ) : null
          })()}

          {/* Thread feed */}
          <div className="forums-feed">
            {threads.filter(t => !forumTag || (t.tags || []).includes(forumTag)).length === 0
              ? <p className="forums-empty">No threads yet. Start the first one.</p>
              : threads
                  .filter(t => !forumTag || (t.tags || []).includes(forumTag))
                  .map((thread, tIdx) => {
                    const isLiked = (thread.likes || []).includes(uid)
                    return (
                      <div key={thread.id} className="forum-card su-drop" style={{ animationDelay: `${tIdx * 60}ms` }} onClick={() => setViewingThread(thread)}>
                        <div className="forum-card-inner">
                          <div className="forum-card-header">
                            <div className="forum-card-author">
                              <div className="forum-card-avatar">
                                {thread.userPhoto ? <img src={thread.userPhoto} alt="" /> : <span>{(thread.userName || '?')[0].toUpperCase()}</span>}
                              </div>
                              <span className="forum-card-name">{thread.userName}</span>
                              <span className="forum-card-time">{timeAgo(thread.createdAt)}</span>
                            </div>
                            <div className="forum-card-badges">
                              {thread.vaporRoomActive && (
                                <span className="forum-card-vapor-badge">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                                  Vapor Room active
                                </span>
                              )}
                              <span className="forum-card-shield" title="End-to-End Encrypted & Anonymous">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              </span>
                            </div>
                          </div>
                          <h3 className="forum-card-title">{thread.title}</h3>
                          <p className="forum-card-preview">{thread.body}</p>
                          {(thread.tags || []).length > 0 && (
                            <div className="forum-card-tags">
                              {thread.tags.map(tag => <span key={tag} className="forum-card-tag">{tag}</span>)}
                            </div>
                          )}
                          <div className="forum-card-footer" onClick={e => e.stopPropagation()}>
                            <button className={`forum-card-action${isLiked ? ' liked' : ''}`} onClick={() => {
                              const likes = isLiked ? (thread.likes || []).filter(l => l !== uid) : [...(thread.likes || []), uid]
                              updateThread(thread.id, { likes }, reelmId); setThreads(getThreads(reelmId))
                            }}>
                              <img src={likePostIcon} alt="" style={{ width: 15, height: 15, opacity: 0.7 }} />
                              <span>{(thread.likes || []).length || ''}</span>
                            </button>
                            <button className="forum-card-action">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              <span>{(thread.replies || []).length || ''}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
            }
          </div>

          {/* New thread modal */}
          {showNewThread && ReactDOM.createPortal(
            <div className="forum-compose-overlay" onClick={() => setShowNewThread(false)}>
              <div className="forum-compose-modal" onClick={e => e.stopPropagation()}>
                <span className="forum-compose-title">New Thread</span>
                <input className="forum-compose-input" placeholder="Thread title…" value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)} maxLength={140} />
                <textarea className="forum-compose-textarea" placeholder="What's on your mind?" value={newThreadBody} onChange={e => setNewThreadBody(e.target.value)} />
                <input className="forum-compose-input forum-compose-tags" placeholder="#tag1  #tag2  #tag3" value={newThreadTags} onChange={e => setNewThreadTags(e.target.value)} />
                <div className="forum-compose-actions">
                  <button className="forum-compose-cancel" onClick={() => setShowNewThread(false)}>Cancel</button>
                  <button className="forum-compose-post" onClick={() => {
                    if (!newThreadTitle.trim()) return
                    const tags = newThreadTags.split(/\s+/).map(t => t.trim()).filter(t => t.startsWith('#') && t.length > 1)
                    const thread = { id: 'thread_' + Date.now(), title: newThreadTitle.trim(), body: newThreadBody.trim(), tags, userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString(), likes: [], replies: [], vaporRoomActive: false }
                    saveThread(thread, reelmId); setThreads(getThreads(reelmId)); setNewThreadTitle(''); setNewThreadBody(''); setNewThreadTags(''); setShowNewThread(false)
                  }}>Post</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Thread detail */}
          {viewingThread && ReactDOM.createPortal(
            <div className="forum-thread-overlay">
              <div className="forum-thread-topbar">
                <button className="article-view-back" onClick={() => setViewingThread(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>
                <button className="forum-thread-vapor-btn" onClick={() => { updateThread(viewingThread.id, { vaporRoomActive: !viewingThread.vaporRoomActive }, reelmId); setThreads(getThreads(reelmId)); setViewingThread({ ...viewingThread, vaporRoomActive: !viewingThread.vaporRoomActive }) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  {viewingThread.vaporRoomActive ? 'Close Vapor Room' : 'Launch Vapor Room'}
                </button>
              </div>
              <div className="forum-thread-scroll">
                <h1 className="forum-thread-title">{viewingThread.title}</h1>
                <div className="forum-thread-meta">
                  <div className="forum-card-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                    {viewingThread.userPhoto ? <img src={viewingThread.userPhoto} alt="" /> : <span>{(viewingThread.userName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <span className="forum-card-name">{viewingThread.userName}</span>
                  <span className="forum-card-time">{timeAgo(viewingThread.createdAt)}</span>
                  <span className="forum-card-shield" title="End-to-End Encrypted & Anonymous" style={{ marginLeft: 'auto' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </span>
                </div>
                {(viewingThread.tags || []).length > 0 && (
                  <div className="forum-card-tags" style={{ marginBottom: 20 }}>
                    {viewingThread.tags.map(tag => <span key={tag} className="forum-card-tag">{tag}</span>)}
                  </div>
                )}
                <p className="forum-thread-body">{viewingThread.body}</p>
                <div className="forum-thread-replies">
                  <span className="forum-thread-replies-label">{(viewingThread.replies || []).length} replies</span>
                  {(() => {
                    const renderNestedReplies = (replies, depth) => replies.map(r => {
                      const replyInput = replyingToId === r.id && (
                        <div className="forum-reply-input-row" style={{ marginTop: 8 }}>
                          <div className="forum-card-avatar" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                            {currentUser?.photo ? <img src={currentUser.photo} alt="" /> : <span>{(currentUser?.name || '?')[0].toUpperCase()}</span>}
                          </div>
                          <input
                            className="forum-reply-input"
                            placeholder={`Reply to ${r.userName}…`}
                            value={nestedReplyTexts[r.id] || ''}
                            onChange={e => setNestedReplyTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && (nestedReplyTexts[r.id] || '').trim()) {
                                const newReply = { id: Date.now().toString(), text: (nestedReplyTexts[r.id] || '').trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString(), replies: [] }
                                const newReplies = addNestedReply(viewingThread.replies, r.id, newReply)
                                const updated = { ...viewingThread, replies: newReplies }
                                updateThread(viewingThread.id, { replies: newReplies }, reelmId); setThreads(getThreads(reelmId)); setViewingThread(updated)
                                setNestedReplyTexts(prev => ({ ...prev, [r.id]: '' })); setReplyingToId(null)
                              }
                              if (e.key === 'Escape') setReplyingToId(null)
                            }}
                          />
                        </div>
                      )
                      const avatarSize = Math.max(20, 28 - depth * 2)
                      const innerContent = (
                        <>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div className="forum-card-avatar" style={{ width: avatarSize, height: avatarSize, fontSize: 10, flexShrink: 0 }}>
                              {r.userPhoto ? <img src={r.userPhoto} alt="" /> : <span>{(r.userName || '?')[0].toUpperCase()}</span>}
                            </div>
                            <div className="forum-reply-content">
                              <div className="forum-reply-header">
                                <span className="forum-card-name">{r.userName}</span>
                                <span className="forum-card-time">{timeAgo(r.createdAt)}</span>
                              </div>
                              <p className="forum-reply-text">{r.text}</p>
                              <button className="forum-reply-btn" onClick={() => setReplyingToId(replyingToId === r.id ? null : r.id)}>reply</button>
                            </div>
                          </div>
                          {replyInput}
                          {(r.replies || []).length > 0 && (
                            <div style={{ marginLeft: avatarSize + 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {renderNestedReplies(r.replies, depth + 1)}
                            </div>
                          )}
                        </>
                      )
                      if (depth === 0) {
                        return (
                          <div key={r.id} className="forum-reply-card forum-reply-card--col">
                            {innerContent}
                          </div>
                        )
                      }
                      return (
                        <div key={r.id} style={{ position: 'relative', paddingLeft: 14 }}>
                          <div className="forum-reply-nest-line" />
                          {innerContent}
                        </div>
                      )
                    })
                    return renderNestedReplies(viewingThread.replies || [], 0)
                  })()}
                  <div className="forum-reply-input-row">
                    <div className="forum-card-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                      {currentUser?.photo ? <img src={currentUser.photo} alt="" /> : <span>{(currentUser?.name || '?')[0].toUpperCase()}</span>}
                    </div>
                    <input className="forum-reply-input" placeholder="Add a reply…" value={threadReplyText} onChange={e => setThreadReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && threadReplyText.trim()) {
                          const reply = { id: Date.now().toString(), text: threadReplyText.trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString(), replies: [] }
                          const updated = { ...viewingThread, replies: [...(viewingThread.replies || []), reply] }
                          updateThread(viewingThread.id, { replies: updated.replies }, reelmId); setThreads(getThreads(reelmId)); setViewingThread(updated); setThreadReplyText('')
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      ) : tab === 'news' ? (
        <div className="articles-page news-page">
          {/* Header */}
          <div style={{ position: 'relative' }}>
          <div className="articles-header-row">
            <span className="news-page-title">News</span>
            <button className="articles-new-btn" onClick={() => setShowNewsForm(v => !v)}>
              <img src={newIcon} alt="Post news" />
            </button>
          </div>

          {/* New news form */}
          {showNewsForm && (
            <div className="news-compose-card">
              <select
                className="news-compose-cat"
                value={newsCat || ''}
                onChange={e => setNewsCat(e.target.value || null)}
              >
                <option value="">Category…</option>
                {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="news-compose-title"
                placeholder="Headline…"
                value={newNewsTitle}
                onChange={e => setNewNewsTitle(e.target.value)}
                maxLength={140}
              />
              <textarea
                className="news-compose-body"
                placeholder="Write the full story…"
                value={newNewsBody}
                onChange={e => setNewNewsBody(e.target.value)}
                rows={4}
              />
              <div className="news-compose-actions">
                <button className="news-compose-cancel" onClick={() => { setShowNewsForm(false); setNewNewsTitle(''); setNewNewsBody(''); setNewsCat(null) }}>Cancel</button>
                <button
                  className="news-compose-submit"
                  disabled={!newNewsTitle.trim()}
                  onClick={() => {
                    const item = { id: Date.now().toString(), title: newNewsTitle.trim(), body: newNewsBody.trim(), category: newsCat, authorId: uid, authorName: currentUser.name || currentUser.username || 'User', authorPhoto: currentUser.photo || null, time: Date.now(), likes: [], comments: [] }
                    saveNews(item, reelmId)
                    setNewsItems(getNews(reelmId))
                    setNewNewsTitle(''); setNewNewsBody(''); setNewsCat(null); setShowNewsForm(false)
                  }}
                >Publish</button>
              </div>
            </div>
          )}
          </div>

          {/* Category pills */}
          <div className="news-cat-bar">
            {NEWS_CATEGORIES.map(c => (
              <button key={c} className={`articles-cat-pill${newsCat === c ? ' active' : ''}`} onClick={() => setNewsCat(newsCat === c ? null : c)}>{c}</button>
            ))}
          </div>

          {/* Sort bar */}
          <div className="feed-filter-row">
            {[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }, { id: 'popular', label: 'Popular' }].map(opt => (
              <button key={opt.id} className={`feed-filter-pill${newsSort === opt.id ? ' active' : ''}`} onClick={() => setNewsSort(opt.id)}>{opt.label}</button>
            ))}
          </div>

          {/* News cards */}
          <div className="articles-content">
            {(() => {
              let items = [...newsItems].filter(n => !newsCat || n.category === newsCat)
              if (newsSort === 'newest') items.sort((a, b) => b.time - a.time)
              else if (newsSort === 'oldest') items.sort((a, b) => a.time - b.time)
              else if (newsSort === 'popular') items.sort((a, b) => ((b.likes || []).length + (b.comments || []).length) - ((a.likes || []).length + (a.comments || []).length))
              if (items.length === 0) return <p className="articles-empty">No news in this reelm yet.</p>
              return items.map((item, nIdx) => {
                const isLiked = (item.likes || []).includes(uid)
                return (
                  <div key={item.id} className="news-card-full su-drop" style={{ animationDelay: `${nIdx * 55}ms` }}>
                    {/* pill header */}
                    <div className="feed-post-pill">
                      <div className="feed-post-pill-avatar">
                        {item.authorPhoto ? <img src={item.authorPhoto} alt="" /> : <span>{(item.authorName || '?')[0].toUpperCase()}</span>}
                      </div>
                      <div className="feed-post-pill-meta">
                        <div className="feed-post-pill-top">
                          <span className="feed-post-pill-name">{item.authorName}</span>
                          {item.category && <span className="news-card-cat-tag">{item.category}</span>}
                          <div className="feed-post-menu-wrap">
                            <button className="feed-post-menu-btn" onClick={e => { e.stopPropagation(); setOpenNewsMenu(openNewsMenu === item.id ? null : item.id) }}>
                              <svg width="3" height="11" viewBox="0 0 3 11" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="1.5" cy="5.5" r="1.3"/><circle cx="1.5" cy="9.5" r="1.3"/></svg>
                            </button>
                            {openNewsMenu === item.id && (
                              <div className="feed-post-menu-dropdown">
                                {(isMod || item.authorId === uid)
                                  ? <button className="feed-post-menu-item feed-post-menu-danger" onClick={() => { deleteNews(item.id, reelmId); setNewsItems(getNews(reelmId)); setOpenNewsMenu(null) }}>Delete</button>
                                  : <button className="feed-post-menu-item" onClick={() => { onReport && onReport('news', item.id, item.title, item.authorId, item.authorName, ''); setOpenNewsMenu(null) }}>Report</button>
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="feed-post-pill-bottom">{timeAgo(item.time)}</div>
                      </div>
                    </div>

                    {/* body */}
                    <div className="news-card-full-body">
                      <h2 className="news-card-full-title">{item.title}</h2>
                      {item.body && <p className="news-card-full-excerpt">{item.body}</p>}
                    </div>

                    {/* actions */}
                    <div className="feed-post-actions">
                      <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={() => {
                        const likes = isLiked ? (item.likes || []).filter(l => l !== uid) : [...(item.likes || []), uid]
                        updateNews(item.id, { likes }, reelmId); setNewsItems(getNews(reelmId))
                      }}>
                        <img src={likePostIcon} alt="like" className="feed-post-action-icon" />
                        <span>{(item.likes || []).length || ''}</span>
                      </button>
                      <button className="feed-post-action-btn" onClick={() => setOpenNewsComments(openNewsComments === item.id ? null : item.id)}>
                        <img src={commentPostIcon} alt="comment" className="feed-post-action-icon" />
                        <span>{(item.comments || []).length || ''}</span>
                      </button>
                      <button className="feed-post-action-btn">
                        <img src={resharePostIcon} alt="reshare" className="feed-post-action-icon" />
                      </button>
                      <button className="feed-post-action-btn">
                        <img src={forwardPostIcon} alt="forward" className="feed-post-action-icon" />
                      </button>
                    </div>

                    {/* comments */}
                    {openNewsComments === item.id && (
                      <div className="feed-post-comments">
                        {(item.comments || []).map(c => (
                          <div key={c.id} className="feed-comment-pill">
                            <div className="feed-comment-avatar">
                              {c.userPhoto ? <img src={c.userPhoto} alt="" /> : <span>{(c.userName || '?')[0].toUpperCase()}</span>}
                            </div>
                            <div className="feed-comment-content">
                              <span className="feed-comment-name">{c.userName}</span>
                              <span className="feed-comment-text">{c.text}</span>
                            </div>
                          </div>
                        ))}
                        <div className="feed-add-comment-row">
                          <input
                            placeholder="Add a comment…"
                            value={newsCommentText}
                            onChange={e => setNewsCommentText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newsCommentText.trim()) {
                                const comment = { id: Date.now().toString(), text: newsCommentText.trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: currentUser?.photo || null, createdAt: new Date().toISOString() }
                                updateNews(item.id, { comments: [...(item.comments || []), comment] }, reelmId)
                                setNewsItems(getNews(reelmId)); setNewsCommentText('')
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          {/* Particle canvas */}
          <canvas className="news-particle-canvas" id={`news-particles-${selectedReelm?.id}`} />
        </div>
      ) : tab !== 'feed' ? (
        <div className="feed-tab-panel">
          <p className="feed-tab-empty">
            {tab === 'headlines' && 'No headlines yet.'}
            {tab === 'new' && 'Create new content.'}
          </p>
        </div>
      ) : (
      <div className="feed-inner">
        {/* Stories */}
        <div
          className="feed-stories-wrap"
          style={{
            maskImage: `linear-gradient(to right, ${storiesEdge.left ? 'transparent 0px, black 48px,' : ''} black ${storiesEdge.left ? '' : '0px'}, black ${storiesEdge.right ? 'calc(100% - 48px), transparent 100%' : '100%'})`,
            WebkitMaskImage: `linear-gradient(to right, ${storiesEdge.left ? 'transparent 0px, black 48px,' : ''} black ${storiesEdge.left ? '' : '0px'}, black ${storiesEdge.right ? 'calc(100% - 48px), transparent 100%' : '100%'})`,
          }}
        >
        <div className="feed-stories-row" ref={storiesRowRef}>
          <button className="story-bubble story-bubble-add" onClick={() => setShowAddStory(true)}>
            <div className="story-bubble-img">
              {currentUser.photo
                ? <img src={currentUser.photo} alt="" />
                : <span>{(currentUser.name || '?')[0].toUpperCase()}</span>
              }
              <div className="story-add-badge">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <span className="story-bubble-label">Your story</span>
          </button>
          {storyGroups.map((group, gi) => {
            const first = group[0]
            return (
              <button
                key={first.userId + '-' + gi}
                className="story-bubble story-bubble-active"
                onClick={() => setViewingGroup({ groupIndex: gi, storyIndex: 0 })}
              >
                <div className="story-bubble-img story-bubble-ring">
                  {first.userPhoto
                    ? <img src={first.userPhoto} alt="" />
                    : <span>{(first.userName || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <span className="story-bubble-label">{first.userId === uid ? 'You' : first.userName}</span>
              </button>
            )
          })}
        </div>
        </div>

        {feedModerationWarning && (
          <div className="moderation-warning">{feedModerationWarning}</div>
        )}

        {/* Context Bar */}
        <div className="feed-context-bar">
          <textarea
            className="feed-ctx-textarea"
            placeholder="What's on your mind?"
            value={postText}
            onChange={e => setPostText(e.target.value)}
          />
          <div className="feed-ctx-actions">
            <button className="feed-ctx-share-btn" title="Share post" onClick={handleSharePost}>Share</button>
            <button className="feed-ctx-btn" title="Add media">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <button className="feed-ctx-btn" title="Add document">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </button>
            <div className="feed-ctx-plus-wrap">
              <button className="feed-ctx-btn feed-ctx-plus-btn" title="More" onClick={() => setShowPlusMenu(v => !v)}>
                <img src={newIcon} alt="+" className="feed-ctx-new-icon" />
              </button>
              {showPlusMenu && (
                <div className="feed-plus-menu">
                  <button className="feed-plus-item" onClick={() => setShowPlusMenu(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M9 9h6M9 12h4M9 15h6"/>
                    </svg>
                    <span>Poll</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter bars */}
        <div className="feed-filter-bars">
          <div className="feed-filter-row">
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'oldest', label: 'Oldest' },
              { id: 'popular', label: 'Popular' },
              { id: 'related', label: 'Related' },
            ].map(opt => (
              <button key={opt.id} className={`feed-filter-pill${feedSort === opt.id ? ' active' : ''}`} onClick={() => setFeedSort(opt.id)}>{opt.label}</button>
            ))}
          </div>
          <div className="feed-filter-row">
            {[
              { id: 'posts', label: 'Posts only' },
              { id: 'posts-forums', label: 'Posts + Forums' },
              { id: 'posts-articles', label: 'Posts + Articles' },
              { id: 'everything', label: 'Everything' },
            ].map(opt => (
              <button key={opt.id} className={`feed-filter-pill${feedDisplay === opt.id ? ' active' : ''}`} onClick={() => setFeedDisplay(opt.id)}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="feed-posts">
          {(() => {
            // Build unified item list based on feedDisplay
            let items = posts.map(p => ({ ...p, _type: 'post' }))
            if (feedDisplay === 'posts-forums' || feedDisplay === 'everything') {
              items = [...items, ...threads.map(t => ({ ...t, _type: 'thread' }))]
            }
            if (feedDisplay === 'posts-articles' || feedDisplay === 'everything') {
              items = [...items, ...articles.map(a => ({ ...a, _type: 'article' }))]
            }
            // Sort
            if (feedSort === 'newest') items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            else if (feedSort === 'oldest') items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            else if (feedSort === 'popular') items.sort((a, b) => ((b.likes || []).length + (b.replies || b.comments || []).length) - ((a.likes || []).length + (a.replies || a.comments || []).length))
            if (items.length === 0) return <p className="feed-empty-text">No posts yet.</p>
            return items.map(item => {
              if (item._type === 'thread') return (
                <div key={item.id} className="feed-post feed-cross-card" onClick={() => setViewingThread(item)}>
                  <div className="feed-cross-card-type"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Forum</div>
                  <div className="feed-post-pill">
                    <div className="feed-post-pill-avatar">{item.userPhoto ? <img src={item.userPhoto} alt="" /> : <span>{(item.userName || '?')[0].toUpperCase()}</span>}</div>
                    <div className="feed-post-pill-meta">
                      <div className="feed-post-pill-top"><span className="feed-post-pill-name">{item.userName}</span></div>
                      <div className="feed-post-pill-bottom">{timeAgo(item.createdAt)}</div>
                    </div>
                  </div>
                  <p className="feed-post-text-only" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 15, color: '#b99887' }}>{item.title}</p>
                  {item.body && <p className="feed-post-caption">{item.body.slice(0, 160)}{item.body.length > 160 ? '…' : ''}</p>}
                </div>
              )
              if (item._type === 'article') return (
                <div key={item.id} className="feed-post feed-cross-card" onClick={() => setViewingArticle(item)}>
                  <div className="feed-cross-card-type"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Article</div>
                  <div className="feed-post-pill">
                    <div className="feed-post-pill-avatar">{item.userPhoto ? <img src={item.userPhoto} alt="" /> : <span>{(item.userName || '?')[0].toUpperCase()}</span>}</div>
                    <div className="feed-post-pill-meta">
                      <div className="feed-post-pill-top"><span className="feed-post-pill-name">{item.userName}</span></div>
                      <div className="feed-post-pill-bottom">{timeAgo(item.createdAt)}</div>
                    </div>
                  </div>
                  <p className="feed-post-text-only" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 15, color: '#b99887' }}>{item.title}</p>
                  {item.contentHtml && <p className="feed-post-caption">{(item.contentHtml || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 160)}…</p>}
                </div>
              )
              // Regular post — render the full post card below
              const post = item
              const isLiked = (post.likes || []).includes(uid)
              const postRole = getUserRole(post.userId)
              return (
              <div key={post.id} className="feed-post">
                {/* Header pill */}
                <div className="feed-post-pill">
                  <div className="feed-post-pill-avatar">
                    {post.userPhoto ? <img src={post.userPhoto} alt="" /> : <span>{(post.userName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <div className="feed-post-pill-meta">
                    <div className="feed-post-pill-top">
                      <span className="feed-post-pill-name">{post.userName}</span>
                      <div className="feed-post-menu-wrap" onClick={e => e.stopPropagation()}>
                        <button className="feed-post-menu-btn" onClick={() => setOpenPostMenu(openPostMenu === post.id ? null : post.id)}>
                          <svg width="3" height="11" viewBox="0 0 3 11" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="1.5" cy="5.5" r="1.3"/><circle cx="1.5" cy="9.5" r="1.3"/></svg>
                        </button>
                        {openPostMenu === post.id && (
                          <div className="feed-post-menu-dropdown">
                            {isMod
                              ? <button className="feed-post-menu-item feed-post-menu-danger" onClick={() => { setOpenPostMenu(null); onModDeletePost(post.id) }}>Delete post</button>
                              : <button className="feed-post-menu-item" onClick={() => { setOpenPostMenu(null); onReport('post', post.id, post.text, post.userId, post.userName, '') }}>Report</button>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="feed-post-pill-bottom">
                      {postRole && <span>{postRole}, </span>}
                      <span>{formatPostDate(post.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {post.text && !post.media && <p className="feed-post-text-only">{post.text}</p>}
                {post.media && post.mediaType === 'image' && <img src={post.media} alt="" className="feed-post-media-img" />}
                {post.media && post.mediaType === 'video' && <video src={post.media} className="feed-post-media-video" controls />}
                {post.media && post.mediaType === 'file' && (
                  <div className="feed-post-file">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>{post.fileName || 'File'}</span>
                  </div>
                )}
                {post.caption && <p className="feed-post-caption">{post.caption}</p>}

                {/* Actions */}
                <div className="feed-post-actions">
                  <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={() => togglePostLike(post.id)}>
                    <img src={likePostIcon} className="feed-post-action-icon" alt="like" />
                    <span>{(post.likes || []).length}</span>
                  </button>
                  <button className="feed-post-action-btn">
                    <img src={commentPostIcon} className="feed-post-action-icon" alt="comment" />
                    <span>{(post.comments || []).length}</span>
                  </button>
                  <button className="feed-post-action-btn" onClick={() => onShare && onShare({ type: 'post', title: post.text?.slice(0, 60), subtitle: post.userName, image: post.mediaUrl || null, data: post })}>
                    <img src={resharePostIcon} className="feed-post-action-icon" alt="reshare" />
                    <span>{post.reshares || 0}</span>
                  </button>
                  <button className="feed-post-action-btn" onClick={() => { setForwardPost(post); setForwardCopied(false) }}>
                    <img src={forwardPostIcon} className="feed-post-action-icon" alt="forward" />
                    <span>Forward</span>
                  </button>
                </div>

                {/* Comments */}
                <div className="feed-post-comments">
                  {(post.comments || []).map(comment => {
                    const cLiked = (comment.likes || []).includes(uid)
                    return (
                      <div key={comment.id} className="feed-comment-pill">
                        <div className="feed-comment-avatar">
                          {comment.userPhoto ? <img src={comment.userPhoto} alt="" /> : <span>{(comment.userName || '?')[0].toUpperCase()}</span>}
                        </div>
                        <div className="feed-comment-content">
                          <div className="feed-comment-text-row">
                            <span className="feed-comment-name">{comment.userName}</span>{' '}{comment.text}
                          </div>
                          <div className="feed-comment-actions" onClick={e => e.stopPropagation()}>
                            <button className={`feed-comment-like-btn${cLiked ? ' liked' : ''}`} onClick={() => toggleCommentLike(post.id, comment.id)}>
                              <img src={likePostIcon} alt="like" />
                              {(comment.likes || []).length > 0 && <span>{(comment.likes || []).length}</span>}
                            </button>
                            <div className="feed-comment-menu-wrap">
                              <button className="feed-comment-menu-btn" onClick={() => setOpenCommentMenu(openCommentMenu === comment.id ? null : comment.id)}>
                                <svg width="3" height="12" viewBox="0 0 3 12" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.5"/><circle cx="1.5" cy="6" r="1.5"/><circle cx="1.5" cy="10.5" r="1.5"/></svg>
                              </button>
                              {openCommentMenu === comment.id && (
                                <div className="feed-comment-menu-dropdown">
                                  <button className="feed-comment-menu-item" onClick={() => setOpenCommentMenu(null)}>Report</button>
                                </div>
                              )}
                              <div className="dm-profile-actions" style={{ width: '100%', marginTop: '10px' }}>
                                {fp && (() => {
                                  const canShare = fp.allowProfileSharing !== false
                                  return (<>
                                    {canShare && (
                                      <button className="dm-profile-action-btn" style={{ width: '100%', textAlign: 'center' }} onClick={() => navigator.clipboard?.writeText(`https://reelms.io/u/${fp.username || fp.id}`)}>
                                        Share Profile
                                      </button>
                                    )}
                                    <button className="dm-profile-action-btn dm-profile-action-danger" style={{ width: '100%', textAlign: 'center' }} onClick={() => { removeFriend(fp.id); setSelectedChat(null) }}>
                                      Remove Friend
                                    </button>
                                    <button className="dm-profile-action-btn dm-profile-action-danger" style={{ width: '100%', textAlign: 'center' }} onClick={() => { blockUserFn(fp); setSelectedChat(null) }}>
                                      Block
                                    </button>
                                  </>)
                                })()}
                              </div>
                            </div>
                          </div>
                          {/* Replies */}
                          {(comment.replies || []).map(reply => {
                            const rLiked = (reply.likes || []).includes(uid)
                            return (
                              <div key={reply.id} className="feed-reply">
                                <div className="feed-reply-avatar">
                                  {reply.userPhoto ? <img src={reply.userPhoto} alt="" /> : <span>{(reply.userName || '?')[0].toUpperCase()}</span>}
                                </div>
                                <div className="feed-reply-content">
                                  <div className="feed-comment-text-row">
                                    <span className="feed-comment-name">{reply.userName}</span>{' '}{reply.text}
                                  </div>
                                  <div className="feed-comment-actions" onClick={e => e.stopPropagation()}>
                                    <button className={`feed-comment-like-btn${rLiked ? ' liked' : ''}`} onClick={() => toggleReplyLike(post.id, comment.id, reply.id)}>
                                      <img src={likePostIcon} alt="like" />
                                      {(reply.likes || []).length > 0 && <span>{(reply.likes || []).length}</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {/* Reply input */}
                          <div className="feed-reply-input-row">
                            <input
                              placeholder="Reply..."
                              value={replyDrafts[comment.id] || ''}
                              onChange={e => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { addReply(post.id, comment.id); e.preventDefault() } }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Comment input */}
                  <div className="feed-add-comment-row">
                    <input
                      placeholder="Add a comment..."
                      value={commentDrafts[post.id] || ''}
                      onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { addComment(post.id); e.preventDefault() } }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        })()}
        </div>
      </div>
      )}

      {/* Forward modal */}
      {forwardPost && (
        <div className="feed-forward-overlay" onClick={() => setForwardPost(null)}>
          <div className="feed-forward-modal" onClick={e => e.stopPropagation()}>
            <span className="feed-forward-title">Forward Post</span>
            <div className="feed-forward-link-row">
              <input className="feed-forward-link-input" readOnly value={`reelms://post/${forwardPost.id}`} />
              <button className="feed-forward-copy-btn" onClick={() => { navigator.clipboard?.writeText(`reelms://post/${forwardPost.id}`); setForwardCopied(true) }}>
                {forwardCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button className="feed-forward-reelm-btn" onClick={() => setForwardPost(null)}>Share in Reelm</button>
            <button className="feed-forward-close-btn" onClick={() => setForwardPost(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardScreen({ onLogOut, onShake, language, onLanguageChange, updateAvailable, setUpdateAvailable: _setUA, pushToast }) {
  const navigate = useNavigate()
  const authSession = useCentralAuthSession()
  const [authUser, setAuthUser] = useState(() =>
    authSession.authUser || (isElectron ? getElectronCurrentUser() : getWebCurrentUser())
  )

  useEffect(() => {
    if (authSession.authUser) setAuthUser(authSession.authUser)
    else if (authSession.status === 'guest') setAuthUser(null)
  }, [authSession.authUser, authSession.status])

  useEffect(() => {
    return isElectron
      ? electronOnAuthStateChanged(setAuthUser)
      : webOnAuthStateChanged(setAuthUser)
  }, [])

  const [currentUser, setCurrentUser] = useState(() => authSession.profile || null)
  const uid = currentUser?.id || currentUser?.uid || authUser?.uid || 'guest'

  useEffect(() => {
    if (!authUser?.uid) {
      if (authSession.status === 'hydrating' || authSession.status === 'loading-profile' || authSession.status === 'checking') return undefined
      setCurrentUser(null)
      return undefined
    }

    let cancelled = false

    if (authSession.profile && (authSession.profile.id || authSession.profile.uid) === authUser.uid) {
      setCurrentUser(authSession.profile)
    }

    userProfileGetById(authUser.uid).then(data => {
      if (cancelled) return
      if (data) {
        setCurrentUser(data)
        return
      }

      const fallback = authSession.profile || currentUser || {
        uid: authUser.uid,
        id: authUser.uid,
        email: authUser.email || '',
        contact: authUser.email || '',
        username: authUser.email ? authUser.email.split('@')[0] : 'user',
        displayName: authUser.email ? authUser.email.split('@')[0] : 'User',
        name: authUser.email ? authUser.email.split('@')[0] : 'User',
        photo: null,
        avatar: ''
      }

      setCurrentUser(fallback)
      pushToast?.({
        id: 'profile-fallback',
        text: 'Profil bilgisi geçici olarak doğrulanamadı; oturum korunuyor.'
      })
    }).catch(() => {
      if (cancelled) return
      const fallback = authSession.profile || currentUser
      if (fallback) {
        setCurrentUser(fallback)
        return
      }
      pushToast?.({
        id: 'profile-load-failed',
        text: 'Profil bilgisi yüklenemedi; tekrar denenecek.'
      })
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid, authSession.profile?.id, authSession.profile?.uid, authSession.status])

  const [isBgLight, setIsBgLight] = useState(false)

  const updateUserData = (updates) => {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates }
      userProfilePatch(updates).catch(() => {})
      return updated
    })
  }

  const [customization, setCustomization] = useState(() => ({ ...DEFAULT_CUSTOMIZATION }))
  useEffect(() => {
    if (!uid || uid === 'guest') return
    let cancel = false
    Promise.all([userGetDoc('customization'), userGetDoc('bg_image'), userGetDoc('body_font')])
      .then(([cust, bg, bf]) => {
        if (cancel) return
        const base = cust && typeof cust === 'object' ? cust : {}
        setCustomization({
          ...DEFAULT_CUSTOMIZATION,
          ...base,
          bgImage: typeof bg === 'string' ? bg : (base.bgImage ?? null),
        })
        if (typeof bf === 'string' && bf) setBodyFont(bf)
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [uid])

  const [env, setEnv] = useState({})
  useEffect(() => {
    if (!uid || uid === 'guest') return
    let cancel = false
    userGetDoc('environment').then((d) => {
      if (cancel) return
      setEnv(d && typeof d === 'object' ? d : {})
    }).catch(() => {})
    return () => { cancel = true }
  }, [uid])
  const v = (key, def) => env[key] ?? def

  const updateCustomization = (updates) => {
    setCustomization(prev => {
      const updated = { ...prev, ...updates }
      const { bgImage: _b, ...toSave } = updated
      scheduleUserPersist('customization', toSave)
      if ('bgImage' in updates) {
        if (updates.bgImage) {
          scheduleUserPersist('bg_image', updates.bgImage)
        } else {
          userPutDoc('bg_image', null).catch(() => {})
        }
      }
      return updated
    })
  }
  const activeTheme = THEMES.find(t => t.id === customization.themeId) || THEMES[0]
  const effectiveAccent    = customization.customAccent || activeTheme.accent
  const effectiveAccentRgb = customization.customAccent ? hexToRgb(customization.customAccent) : activeTheme.accentRgb
  const effectiveBase      = customization.customBase   || activeTheme.base
  const effectiveBaseRgb   = customization.customBase   ? hexToRgb(customization.customBase)   : activeTheme.baseRgb
  const effectiveTextColor = (() => {
    const tc = customization.customTextColor || 'white'
    if (tc === 'black') return 'rgba(20, 14, 30, 0.9)'
    if (tc === 'theme') return effectiveAccent
    return 'rgba(235, 225, 210, 0.88)'
  })()

  useEffect(() => {
    let cancelled = false
    const src = customization.bgImage
    if (!src) {
      setIsBgLight(false)
      return
    }
    ;(async () => {
      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Background image decode failed'))
          el.src = src
        })
        const canvas = document.createElement('canvas')
        const size = 32
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let sum = 0
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255
          if (a < 0.05) continue
          const r = data[i] / 255
          const g = data[i + 1] / 255
          const b = data[i + 2] / 255
          // Relative luminance (sRGB)
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
          sum += lum
          count++
        }
        const avg = count ? (sum / count) : 0
        if (!cancelled) setIsBgLight(avg > 0.62)
      } catch {
        // Fail open: keep default (dark) text
        if (!cancelled) setIsBgLight(false)
      }
    })()
    return () => { cancelled = true }
  }, [customization.bgImage])

  useEffect(() => {
    touchUserSession().catch(() => {})
    const interval = setInterval(() => touchUserSession().catch(() => {}), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [uid])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--ta', effectiveAccent)
    root.style.setProperty('--ta-rgb', effectiveAccentRgb)
    root.style.setProperty('--tb', effectiveBase)
    root.style.setProperty('--tb-rgb', effectiveBaseRgb)
    root.style.setProperty('--text-fg', effectiveTextColor)
    return () => {
      root.style.removeProperty('--ta')
      root.style.removeProperty('--ta-rgb')
      root.style.removeProperty('--tb')
      root.style.removeProperty('--tb-rgb')
      root.style.removeProperty('--text-fg')
    }
  }, [effectiveAccent, effectiveAccentRgb, effectiveBase, effectiveBaseRgb, effectiveTextColor])

  const [chats, setChats] = useState([])
  const [reelms, setReelms] = useState([])
  const [selectedReelm, setSelectedReelm] = useState(null)
  const [reelmLoading, setReelmLoading] = useState(false)

  // Load reelms + chats from Firestore on mount
  useEffect(() => {
    if (!uid) return
    if (currentUser?.isModerator) {
      // God-mode: load all reelms from DynamoDB registry
      adminAllReelms()
        .then(all => {
          if (all.length > 0) setReelms(all.map(r => ({ ...r, _godMode: true })))
        })
        .catch(() => {
          // Fallback to own reelms
          userGetDoc('reelms').then(v => { if (Array.isArray(v)) setReelms(v) }).catch(() => {})
        })
      // Mod account has no DMs — skip loading chats
    } else {
      userGetDoc('reelms').then(v => { if (Array.isArray(v)) setReelms(v) }).catch(() => {})
      userGetDoc('chats').then(v => { if (Array.isArray(v)) { setChats(v); v.forEach(c => { if (c.id) socketJoinChannel(c.id) }) } }).catch(() => {})
    }
  }, [uid, currentUser?.isModerator])
  const [createReelmStep, setCreateReelmStep] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [reelmNameInput, setReelmNameInput] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [openCategoryMenu, setOpenCategoryMenu] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [lastChannels, setLastChannels] = useState({})
  const [sessionsList, setSessionsList] = useState([])
  const [feedTab, setFeedTab] = useState('feed') // 'feed' | 'forums'
  const ALL_FEED_NAV = [
    { key: 'feed', label: 'Headlines', icon: feedIcon },
    { key: 'forums', label: 'Forums', icon: forumsIcon },
  ]
  const [feedNavOrder, setFeedNavOrder] = useState(['feed', 'forums'])
  const updateFeedNavOrder = (order) => {
    setFeedNavOrder(order)
    scheduleUserPersist('feed_nav', order)
  }
  const [showReelmMenu, setShowReelmMenu] = useState(false)
  const [showReelmSettings, setShowReelmSettings] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const reelmImageInputRef = useRef(null)
  const msgListRef = useRef(null)
  const mediaInputRef = useRef(null)
  const docInputRef = useRef(null)
  const [editingChannelId, setEditingChannelId] = useState(null)
  const [editingChannelName, setEditingChannelName] = useState('')
  const [newVoiceChannelId, setNewVoiceChannelId] = useState(null) // channel id awaiting capacity pick after creation
  const [channelCtxMenu, setChannelCtxMenu] = useState(null)
  const [flyingRoomModal, setFlyingRoomModal] = useState(null) // { reelmId, catId }
  const [flyingRoomName, setFlyingRoomName] = useState('')
  const [flyingRoomDuration, setFlyingRoomDuration] = useState(60 * 60 * 1000) // default 1h
  const [flyingRoomTick, setFlyingRoomTick] = useState(0)
  const [voiceChannel, setVoiceChannel] = useState(null) // { channelId, reelmId, channelName }
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voiceVideoOn, setVoiceVideoOn] = useState(false)
  const [voiceScreenSharing, setVoiceScreenSharing] = useState(false)
  const [voiceScreenFullscreen, setVoiceScreenFullscreen] = useState(false)
  const [voiceParticipants, setVoiceParticipants] = useState([])
  const [vcCounts, setVcCounts] = useState({}) // { [channelId]: number }
  const [channelFullToast, setChannelFullToast] = useState(false)
  const [speakingUsers, setSpeakingUsers] = useState(new Set())
  const [remoteControlActive, setRemoteControlActive] = useState(null) // { controllerId, controllerName, sharingUserId, sharingUserName }
  const [remoteControlReq, setRemoteControlReq] = useState(null) // { requesterId, requesterName, targetUserId }
  const audioAnalyzersRef = useRef({})
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const screenTrackIdsRef = useRef(new Set()) // track IDs belonging to screen share
  const peersRef = useRef({})
  const dataChannelsRef = useRef({})
  const vcRoomRef = useRef(null)      // { reelmId, channelId } while in voice
  const currentUserRef = useRef(null) // always-fresh currentUser for vc callbacks
  const vcEventHandlerRef = useRef(null) // updated every render
  const remoteControlActiveRef = useRef(null)
  const lastCtrlMouseMoveSentRef = useRef(0)
  const remoteAudiosRef = useRef({})
  const pannerNodesRef = useRef({})
  const spatialContextRef = useRef(null)
  const voicePositionsRef = useRef({})
  const spatialSettingsRef = useRef({ enabled: false, depth: 50 })
  spatialSettingsRef.current = { enabled: v('spatialAudio', false), depth: v('spatialDepth', 50) }
  const [voicePositions, setVoicePositions] = useState({})
  const [showSpatialPanel, setShowSpatialPanel] = useState(false)
  const [expandedVideoUser, setExpandedVideoUser] = useState(null)
  const [blurBg, setBlurBg] = useState(false)
  const blurCanvasRef = useRef(null)
  const blurHiddenVideoRef = useRef(null)
  const blurSegRef = useRef(null)
  const blurAnimFrameRef = useRef(null)
  const [showVoiceParticipantsPopup, setShowVoiceParticipantsPopup] = useState(false)
  const [voiceTileMenuUser, setVoiceTileMenuUser] = useState(null)
  const [changelog, setChangelog] = useState([])
  const [, setCurrentVersion] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showFeed, setShowFeed] = useState(false)
  const [showProfilePopup, setShowProfilePopup] = useState(false)
  const [showLiveParticipantsPopup, setShowLiveParticipantsPopup] = useState(false)
  const [activeNudge, setActiveNudge] = useState(null)
  const [isShaking, setIsShaking] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [discoverUsers, setDiscoverUsers] = useState([])
  const [showFriendsPopup, setShowFriendsPopup] = useState(false)
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false)
  const [showFriendsPanel, setShowFriendsPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState('account')
  const [showHelpCenter, setShowHelpCenter] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', email: '', message: '' })
  const [helpStatus, setHelpStatus] = useState('idle')
  const soundPrevRef = useRef({ notifs: -1, friendReqs: -1, friends: -1 })
  const activeMsgKeyRef = useRef(null)
  const [soundSettings, setSoundSettings] = useState(SOUND_DEFAULTS)
  const [availableSounds, setAvailableSounds] = useState([])
  const reelmTemplates = getReelmTemplates(getT(language))
  const activeTemplate = selectedTemplateId ? reelmTemplates.find(t => t.id === selectedTemplateId) ?? null : null
  const BODY_FONTS = [
    { id: 'be-vietnam-pro', label: 'Be Vietnam Pro', family: "'Be Vietnam Pro', sans-serif" },
    { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" },
    { id: 'line-seed-jp', label: 'LINE Seed JP', family: "'LINE Seed JP', sans-serif" },
    { id: 'akt', label: 'Akt', family: "'Akt', sans-serif" },
    { id: 'mona-sans', label: 'Mona Sans', family: "'Mona Sans', sans-serif" },
    { id: 'inclusive-sans', label: 'Inclusive Sans', family: "'Inclusive Sans', sans-serif" },
    { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
    { id: 'sour-gummy', label: 'Sour Gummy', family: "'Sour Gummy', sans-serif" },
  ]
  const [bodyFont, setBodyFont] = useState('be-vietnam-pro')
  useEffect(() => {
    const font = BODY_FONTS.find(f => f.id === bodyFont) || BODY_FONTS[0]
    const fontName = font.family.split(',')[0].replace(/'/g, '').trim()
    const apply = () => document.documentElement.style.setProperty('--body-font', font.family)
    document.fonts.load(`400 1em "${fontName}"`).then(apply).catch(apply)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyFont])

  useEffect(() => { applySoundSettings(soundSettings) }, [soundSettings])

  useEffect(() => {
    if (selectedSettingsCategory !== 'usage' || availableSounds.length > 0) return
    fetch(`${BACKEND_URL}/api/v1/sounds/list`).then(r => r.json()).then(d => {
      if (Array.isArray(d.files)) setAvailableSounds(d.files)
    }).catch(() => {})
  }, [selectedSettingsCategory])
  const updateBodyFont = (id) => { setBodyFont(id); scheduleUserPersist('body_font', id) }
  const t = getT(language)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [spotifyNowPlaying, setSpotifyNowPlaying] = useState(null)
  const [spotifyFriendsNowPlaying, setSpotifyFriendsNowPlaying] = useState({})
  const [reportModal, setReportModal] = useState(null)
  const [reports, setReports] = useState([])
  const [modDeleteTick, setModDeleteTick] = useState(0)
  const [appStoriesTick, setAppStoriesTick] = useState(0)
  const [shareTarget, setShareTarget] = useState(null)
  const [showChatList, setShowChatList] = useState(false)
  const [chatListFilter, setChatListFilter] = useState('all')
  const [friends, setFriends] = useState([])
  const [blocked, setBlocked] = useState([])
  const [msgRequests, setMsgRequests] = useState([])
  const [friendRequestsOut, setFriendRequestsOut] = useState([])
  const [messageRequestsOut, setMessageRequestsOut] = useState([])
  const [showMsgRequests, setShowMsgRequests] = useState(false)
  const saveMsgRequests = (list) => {
    setMsgRequests(list)
    scheduleUserPersist('message_requests', list)
  }
  const blockUserFn = async (target) => {
    const entry = { id: target.id, name: target.name, username: target.username, photo: target.photo || null, blockedAt: Date.now() }
    const updated = [entry, ...blocked.filter(b => b.id !== target.id)]
    setBlocked(updated)
    await userPutDoc('blocked', updated).catch(() => {})
    try { await socialRemoveFriend(target.id) } catch { /* noop */ }
    setFriends(prev => prev.filter(f => f.id !== target.id))
    setChats(prev => prev.filter(c => c.friendId !== target.id))
  }
  const unblockUserFn = (targetId) => {
    const updated = blocked.filter(b => b.id !== targetId)
    setBlocked(updated)
    userPutDoc('blocked', updated).catch(() => {})
  }
  const [friendRequests, setFriendRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [notifSeenCount, setNotifSeenCount] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState({})

  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    let cancel = false
    userBootstrap().then((data) => {
      if (cancel || !data) return
      if (Array.isArray(data.friends)) setFriends(data.friends)
      if (Array.isArray(data.friend_requests)) setFriendRequests(data.friend_requests)
      if (Array.isArray(data.notifications)) { setNotifications(data.notifications); setNotifSeenCount(data.notifications.length) }
      if (Array.isArray(data.message_requests)) setMsgRequests(data.message_requests)
      if (Array.isArray(data.blocked)) setBlocked(data.blocked)
      if (Array.isArray(data.friend_requests_out)) setFriendRequestsOut(data.friend_requests_out)
      if (Array.isArray(data.message_requests_out)) setMessageRequestsOut(data.message_requests_out)
      if (data.nicknames && typeof data.nicknames === 'object') setNicknames(data.nicknames)
      if (data.unread_counts && typeof data.unread_counts === 'object') setUnreadCounts(data.unread_counts)
      if (Array.isArray(data.pinned_items)) setPinnedItemIds(data.pinned_items)
      if (Array.isArray(data.feed_nav) && data.feed_nav.length === ALL_FEED_NAV.length) setFeedNavOrder(data.feed_nav)
      if (typeof data.landing_view === 'string') setReelmLandingView(data.landing_view)
      if (data.lpw != null) setLeftWidth(parseInt(String(data.lpw), 10) || PANEL_DEFAULT)
      if (data.rpw != null) setRightWidth(parseInt(String(data.rpw), 10) || PANEL_DEFAULT)
      if (data.sociallinks && typeof data.sociallinks === 'object') setProfileSocialLinks(data.sociallinks)
      if (Array.isArray(data.socialorder)) setProfileActivePlatforms(data.socialorder)
      if (data.spotify_connected === true || data.spotify_connected === 'true') setSpotifyConnected(true)
      if (data.last_channels && typeof data.last_channels === 'object') setLastChannels(data.last_channels)
      if (Array.isArray(data.sessions)) setSessionsList(data.sessions)
      if (data.sounds && typeof data.sounds === 'object') setSoundSettings(s => ({ ...s, ...data.sounds }))
      soundPrevRef.current = {
        notifs: Array.isArray(data.notifications) ? data.notifications.length : 0,
        friendReqs: Array.isArray(data.friend_requests) ? data.friend_requests.length : 0,
        friends: Array.isArray(data.friends) ? data.friends.length : 0,
      }
    }).catch(() => {})
    return () => { cancel = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    const applyUserDoc = (sk, v) => {
      if (sk === 'notifications') {
        const arr = Array.isArray(v) ? v : []
        if (soundPrevRef.current.notifs >= 0 && arr.length > soundPrevRef.current.notifs) playSound.notification()
        soundPrevRef.current.notifs = arr.length
        setNotifications(arr)
      } else if (sk === 'friend_requests') {
        const arr = Array.isArray(v) ? v : []
        if (soundPrevRef.current.friendReqs >= 0 && arr.length > soundPrevRef.current.friendReqs) playSound.friend()
        soundPrevRef.current.friendReqs = arr.length
        setFriendRequests(arr)
      } else if (sk === 'friends') setFriends(Array.isArray(v) ? v : [])
      else if (sk === 'message_requests') setMsgRequests(Array.isArray(v) ? v : [])
      else if (sk === 'blocked') setBlocked(Array.isArray(v) ? v : [])
      else if (sk === 'friend_requests_out') setFriendRequestsOut(Array.isArray(v) ? v : [])
      else if (sk === 'message_requests_out') setMessageRequestsOut(Array.isArray(v) ? v : [])
      else if (sk === 'nicknames') setNicknames(v && typeof v === 'object' ? v : {})
      else if (sk === 'unread_counts') setUnreadCounts(v && typeof v === 'object' ? v : {})
      else if (sk === 'pinned_items') setPinnedItemIds(Array.isArray(v) ? v : [])
      else if (sk === 'spotify_connected') setSpotifyConnected(v === true || v === 'true')
      else if (sk === 'last_channels') setLastChannels(v && typeof v === 'object' ? v : {})
      else if (sk === 'sessions') setSessionsList(Array.isArray(v) ? v : [])
      else if (sk === 'body_font') { if (typeof v === 'string' && v && v !== 'style2') setBodyFont(v) }
      else if (sk === 'sounds') { if (v && typeof v === 'object') setSoundSettings(s => ({ ...s, ...v })) }
      else if (sk === 'reelms') { if (Array.isArray(v)) setReelms(v) }
      else if (sk === 'chats') { if (Array.isArray(v)) { setChats(v); v.forEach(c => { if (c.id) socketJoinChannel(c.id) }) } }
    }
    const off = connectReelmsSocket({
      onUserDoc: (sk) => { userGetDoc(sk).then((v) => applyUserDoc(sk, v)).catch(() => {}) },
      onReelmDoc: (reelmId, sk) => {
        if (['meta', 'structure', 'roles', 'members'].includes(sk)) {
          hydrateReelmCore(reelmId).then((updated) => {
            if (updated) mergeReelmIntoState(updated)
          }).catch(() => {})
        } else {
          loadReelmDocuments(reelmId).then(() => setModDeleteTick((t) => t + 1)).catch(() => {})
        }
      },
      onAppDoc: (sk) => {
        if (sk === 'reports') appGetDoc('reports').then((r) => setReports(Array.isArray(r) ? r : [])).catch(() => {})
        if (sk === 'stories') setAppStoriesTick((t) => t + 1)
      },
      onMessage: (msgKey, msg) => {
        const t = msg.time
        const time = t instanceof Date ? t : typeof t === 'number' ? new Date(t) : new Date()
        setMessages(prev => {
          const existing = prev[msgKey] || []
          if (existing.some(m => m.id === msg.id)) return prev
          return { ...prev, [msgKey]: [...existing, { ...msg, time }] }
        })
        if (String(msg.sender?.id) !== String(uid)) {
          const myUsername = currentUserRef.current?.username || ''
          const hasMention = myUsername && msg.text && msg.text.toLowerCase().includes(`@${myUsername.toLowerCase()}`)
          const isBackground = document.hidden
          if (hasMention) playSound.mention()
          else if (!isBackground && msgKey === activeMsgKeyRef.current) playSound.dot()
          else playSound.message()
        }
      },
      onMessageDeleted: (msgKey, msgId) => {
        setMessages(prev => ({ ...prev, [msgKey]: (prev[msgKey] || []).filter(m => String(m.id) !== String(msgId)) }))
      },
      onReaction: ({ msgKey, msgId, emoji, users }) => {
        const id = String(msgId)
        setMsgReactions(prev => {
          const ch = { ...(prev[msgKey] || {}) }
          const mr = { ...(ch[id] || {}) }
          if (users.length) mr[emoji] = users; else delete mr[emoji]
          if (Object.keys(mr).length) ch[id] = mr; else delete ch[id]
          return { ...prev, [msgKey]: ch }
        })
      },
      onVoicePosition: (msg) => {
        const { userId, x, y } = msg
        voicePositionsRef.current = { ...voicePositionsRef.current, [userId]: { x, y } }
        setVoicePositions(prev => ({ ...prev, [userId]: { x, y } }))
        const panner = pannerNodesRef.current[userId]
        if (panner) {
          const spread = (spatialSettingsRef.current.depth / 50) * 10
          if (panner.positionX) { panner.positionX.value = (x - 0.5) * spread; panner.positionZ.value = (y - 0.5) * spread }
          else panner.setPosition((x - 0.5) * spread, 0, (y - 0.5) * spread)
        }
        // Update listener if this is our own position echoed back
        if (userId === uid && spatialContextRef.current) {
          const spread = (spatialSettingsRef.current.depth / 50) * 10
          const l = spatialContextRef.current.listener
          if (l.positionX) { l.positionX.value = (x - 0.5) * spread; l.positionZ.value = (y - 0.5) * spread }
          else l.setPosition((x - 0.5) * spread, 0, (y - 0.5) * spread)
        }
      },
      onVcEvent: (msg) => { vcEventHandlerRef.current?.(msg) },
      onVcError: (msg) => {
        if (msg?.error === 'channel_full') { showChannelFullToast(); leaveVoiceChannel() }
        else console.warn('Voice channel error:', msg?.error || msg)
      },
      onVcCount: ({ channelId, count }) => { setVcCounts(prev => ({ ...prev, [channelId]: count })) },
      onVcCounts: ({ counts }) => { setVcCounts(prev => ({ ...prev, ...counts })) },
      onConnect: () => {
        // Re-fetch critical user docs after reconnect so we don't miss anything
        const keys = ['chats', 'reelms', 'friends', 'friend_requests', 'notifications', 'message_requests', 'unread_counts']
        keys.forEach(sk => userGetDoc(sk).then(v => applyUserDoc(sk, v)).catch(() => {}))
      },
    })
    return off
  }, [uid])

  useEffect(() => {
    remoteControlActiveRef.current = remoteControlActive
  }, [remoteControlActive])

  useEffect(() => {
    const active = remoteControlActive
    if (!active || active.pending || String(active.controllerId) !== String(uid)) return
    const peer = String(active.sharingUserId)
    const onKey = (e) => {
      sendControlEvent(peer, { type: 'ctrl_key', event: e.type, key: e.key, code: e.code, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey })
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [remoteControlActive, uid])

  useEffect(() => {
    if (!uid || uid === 'guest') return
    appGetDoc('reports').then((r) => setReports(Array.isArray(r) ? r : [])).catch(() => {})
  }, [uid])

  const [reelmLandingView, setReelmLandingView] = useState('chat')
  const updateReelmLandingView = (val) => {
    setReelmLandingView(val)
    scheduleUserPersist('landing_view', val)
  }

  useEffect(() => {
    if (!selectedReelm?.id) return undefined
    socketJoinReelm(selectedReelm.id)
    socketRequestVcCounts(selectedReelm.id)
    return () => socketLeaveReelm(selectedReelm.id)
  }, [selectedReelm?.id])

  // Close reelm settings whenever the active reelm changes or is cleared
  useEffect(() => { setShowReelmSettings(false) }, [selectedReelm?.id])

  // Discover: fetch users from backend on query change
  useEffect(() => {
    const q = discoverQuery.trim().toLowerCase()
    if (!q) { setDiscoverUsers([]); return }
    usersList().then(users => {
      setDiscoverUsers(users.filter(u => !u.isSystem))
    }).catch(() => {})
  }, [discoverQuery])

  const toggleFriendsPopup = () => { setShowFriendsPopup(v => !v); setShowNotificationsPopup(false) }
  const toggleNotifPopup = () => {
    setShowNotificationsPopup(v => {
      if (!v) setNotifSeenCount(notifications.length)
      setShowFriendsPopup(false)
      return !v
    })
  }
  const goHome = () => {
    setSelectedChat(null)
    setSelectedReelm(null)
    setShowDiscover(false)
    setShowFriendsPanel(false)
    setShowSettings(false)
    setShowChatList(false)
    setShowFeed(false)
  }

  const handleSelectReelm = (reelm) => {
    setSelectedReelm(reelm)
    setSelectedChat(null)
    setShowDiscover(false)
    setShowFriendsPanel(false)
    setShowSettings(false)
    setShowChatList(false)
    setReelmLoading(true)
    setTimeout(() => setReelmLoading(false), 350)
    if (reelmLandingView === 'feed') {
      setShowFeed(true)
      setFeedTab('feed')
    } else {
      setShowFeed(false)
    }
  }

  useEffect(() => {
    const pending = sessionStorage.getItem('reelms_pending_deeplink')
    if (!pending || reelms.length === 0) return
    sessionStorage.removeItem('reelms_pending_deeplink')
    try {
      const { type, value } = JSON.parse(pending)
      if (type === 'reelm') {
        const code = String(value).toUpperCase()
        const found = reelms.find(r => r.code === code)
        if (found) { setSelectedReelm(found); setShowFeed(false) }
        else {
          // Not in user's list — show join modal pre-filled
          setJoinCodeInput(code)
          setCreateReelmStep('joining')
          setShowMenu(true)
        }
      } else if (type === 'user') {
        const qv = String(value).trim().toLowerCase()
        userByUsername(qv).then((profile) => {
          if (profile) {
            setDiscoverQuery(value)
            setShowDiscover(true)
          }
        }).catch(() => {})
      } else if (type === 'channel') {
        let foundReelm = null
        let foundChannel = null
        for (const r of reelms) {
          for (const cat of (r.categories || [])) {
            const ch = (cat.channels || []).find(c => c.id === value)
            if (ch) { foundReelm = r; foundChannel = ch; break }
          }
          if (foundChannel) break
        }
        if (foundReelm && foundChannel) { setSelectedReelm(foundReelm); setSelectedChannel(foundChannel); setShowFeed(false) }
      } else if (type === 'post') {
        setShowFeed(true)
        setSelectedReelm(null)
        sessionStorage.setItem('reelms_highlight_post', value)
      }
    } catch { /* noop */ }
  }, [reelms])

  // Spotify — detect OAuth callback and start/stop polling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('spotify') === 'connected') {
      userPutDoc('spotify_connected', true).catch(() => {})
      setSpotifyConnected(true)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('spotify') === 'error') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [uid])

  useEffect(() => {
    if (!spotifyConnected) { setSpotifyNowPlaying(null); return }
    const poll = async () => {
      try {
        const token = await getIdToken().catch(() => null)
        if (!token) return
        const res = await fetch(`${BACKEND_URL}/spotify/now-playing/${uid}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!data.connected) {
          userPutDoc('spotify_connected', false).catch(() => {})
          setSpotifyConnected(false)
          setSpotifyNowPlaying(null)
          return
        }
        setSpotifyNowPlaying(data.playing && data.track ? data.track : null)
      } catch { /* noop */ }
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => clearInterval(id)
  }, [spotifyConnected, uid])

  // Spotify — poll "now playing" for friends shown in the right panel.
  useEffect(() => {
    if (!spotifyConnected) { setSpotifyFriendsNowPlaying({}); return }
    const members = selectedReelm?.members || []
    if (!members.length) { setSpotifyFriendsNowPlaying({}); return }

    const friendSet = new Set((friends || []).map(f => f.id))
    const friendIds = Array.from(new Set(members.map(m => m.userId).filter(id => id && id !== uid && friendSet.has(id)))).slice(0, 8)
    if (!friendIds.length) { setSpotifyFriendsNowPlaying({}); return }

    let cancelled = false
    const poll = async () => {
      try {
        const results = await Promise.allSettled(friendIds.map(async (targetUid) => {
          const token = await getIdToken().catch(() => null)
          if (!token) return { uid: targetUid, track: null }
          const res = await fetch(`${BACKEND_URL}/spotify/now-playing/${targetUid}`, { headers: { Authorization: `Bearer ${token}` } })
          const data = await res.json()
          if (data?.connected && data?.playing && data?.track) return { uid: targetUid, track: data.track }
          return { uid: targetUid, track: null }
        }))

        if (cancelled) return
        const next = {}
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.track) {
            next[r.value.uid] = r.value.track
          }
        }
        setSpotifyFriendsNowPlaying(next)
      } catch {
        if (!cancelled) setSpotifyFriendsNowPlaying({})
      }
    }

    poll()
    const id = setInterval(poll, 10000)
    return () => { cancelled = true; clearInterval(id) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnected, uid, selectedReelm?.id, friends])

  const connectSpotify = async () => {
    const token = await getIdToken().catch(() => null)
    if (!token) return
    const res = await fetch(`${BACKEND_URL}/spotify/start`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.url) return
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(data.url)
    } else {
      window.open(data.url, '_blank', 'noopener')
    }
  }

  const disconnectSpotify = async () => {
    try {
      const token = await getIdToken().catch(() => null)
      await fetch(`${BACKEND_URL}/spotify/disconnect/${encodeURIComponent(uid)}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
    } catch { /* noop */ }
    userPutDoc('spotify_connected', false).catch(() => {})
    setSpotifyConnected(false)
    setSpotifyNowPlaying(null)
  }


  // Fetch changelog once on mount
  useEffect(() => {
    if (window.electronAPI) return
    fetch('/changelog.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setChangelog(data.releases || [])
          setCurrentVersion(data.current || null)
        }
      })
      .catch(() => {})
  }, [])

  const [dashToasts, setDashToasts] = useState([])
  const pushDashToast = useCallback(({ id, text, link = null, action = null, persistent = false }) => {
    setDashToasts(prev => [{ id, text, link, action, persistent }, ...prev].slice(0, 8))
  }, [])
  const dismissDashToast = useCallback((id) => {
    setDashToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const _makeNotif = (text, link = null) => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, text, time: Date.now(), link })
  const addNotification = (text, link = null) => {
    const n = _makeNotif(text, link)
    setNotifications(prev => {
      const next = [n, ...prev]
      scheduleUserPersist('notifications', next)
      return next
    })
    pushDashToast({ id: n.id, text, link })
  }
  const deleteNotification = (id) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id)
      scheduleUserPersist('notifications', next)
      return next
    })
  }
  const _pushNotifTo = (targetUid, text) => {
    void socialNotify(String(targetUid), text).catch(() => {})
  }

  const isFriend = (userId) => friends.some(f => f.id === userId)
  const hasSentRequest = (userId) => friendRequestsOut.map(String).includes(String(userId))
  const sendMsgRequest = async (targetUser, preview = '') => {
    try {
      const targetUser_ = (await userProfileGetById(targetUser.id)) || targetUser
      if (targetUser_.allowMessageRequests === false) return
      if (messageRequestsOut.map(String).includes(String(targetUser.id))) return
      await socialMessageRequest(targetUser.id, {
        id: uid,
        name: currentUser.name,
        username: currentUser.username,
        photo: currentUser.photo || null,
      }, preview)
      setMessageRequestsOut((o) => [...(Array.isArray(o) ? o : []), String(targetUser.id)])
    } catch { /* noop */ }
  }
  const hasSentMsgRequest = (targetId) => messageRequestsOut.map(String).includes(String(targetId))

  const sendFriendRequest = async (targetUser) => {
    try {
      const tid = String(targetUser.id)
      if (friendRequestsOut.map(String).includes(tid)) return
      await socialFriendRequest(tid, {
        id: uid,
        name: currentUser.name,
        username: currentUser.username,
        photo: currentUser.photo || null,
      })
      setFriendRequestsOut((o) => [...(Array.isArray(o) ? o : []), tid])
    } catch { /* noop */ }
  }
  const acceptFriendRequest = async (requester) => {
    try {
      await socialFriendAccept(requester, {
        id: uid,
        name: currentUser.name,
        username: currentUser.username,
        photo: currentUser.photo || null,
      })
      const rid = String(requester.id)
      setFriendRequests((r) => r.filter((x) => String(x.id) !== rid))
      setFriends((f) =>
        f.some((x) => String(x.id) === rid)
          ? f
          : [...f, { id: requester.id, name: requester.name, username: requester.username, photo: requester.photo || null }]
      )
      playSound.friend()
    } catch { /* noop */ }
  }
  const rejectFriendRequest = async (requesterId) => {
    try {
      await socialFriendReject(requesterId)
      const rid = String(requesterId)
      setFriendRequests((r) => r.filter((x) => String(x.id) !== rid))
    } catch { /* noop */ }
  }
  const removeFriend = async (friendId) => {
    try {
      await socialRemoveFriend(friendId)
      const fid = String(friendId)
      setFriends((f) => f.filter((x) => String(x.id) !== fid))
    } catch { /* noop */ }
  }
  const clearUnread = (barKey) => {
    setUnreadCounts(prev => {
      if (!prev[barKey]) return prev
      const next = { ...prev }
      delete next[barKey]
      scheduleUserPersist('unread_counts', next)
      return next
    })
  }
  const [friendProfileTarget, setFriendProfileTarget] = useState(null) // { friend, anchorRect }
  const [nicknames, setNicknames] = useState({})
  const [showFriendSelector, setShowFriendSelector] = useState(false)
  const [friendSelectorQuery, setFriendSelectorQuery] = useState('')
  const [dmProfileExpanded, setDmProfileExpanded] = useState(false)
  const [showDmFriendMenu, setShowDmFriendMenu] = useState(false)
  const [dmFriendProfile, setDmFriendProfile] = useState(null)
  const [dmSideTab, setDmSideTab] = useState('profile') // 'profile' | 'vapor'
  const setGroupSideTab = () => {} // reserved for future use
  const [vaporDurations, setVaporDurations] = useState({}) // { [chatId]: duration_ms | 'read' | null }
  const [showGroupCreator, setShowGroupCreator] = useState(null) // null | 'friends' | 'setup'
  const [groupSelectedFriends, setGroupSelectedFriends] = useState([])
  const [groupNameInput, setGroupNameInput] = useState('')
  const [groupPhotoInput, setGroupPhotoInput] = useState(null)
  const groupPhotoInputRef = useRef(null)
  const groupEditPhotoInputRef = useRef(null)
  const [groupNameEditing, setGroupNameEditing] = useState(false)
  const [groupNameEditValue, setGroupNameEditValue] = useState('')
  const [groupSideExpanded, setGroupSideExpanded] = useState(null) // null | 'permissions' | 'vapor'
  const [recentlyBumpedChatId, setRecentlyBumpedChatId] = useState(null)
  const [pinnedItemIds, setPinnedItemIds] = useState([])

  const saveNickname = (friendId, nick) => {
    const next = { ...nicknames, [friendId]: nick }
    if (!nick) delete next[friendId]
    setNicknames(next)
    scheduleUserPersist('nicknames', next)
  }

  const openFriendProfile = (friend, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setFriendProfileTarget({ friend, anchorRect: rect })
    userProfileGetById(friend.id).then(data => {
      if (data) setFriendProfileTarget({ friend: data, anchorRect: rect })
    }).catch(() => {})
  }

  const dmConvId = (uid1, uid2) => `dm_${[uid1, uid2].sort().join('_')}`

  const startDM = (friend) => {
    const convId = dmConvId(uid, friend.id)
    const existing = chats.find(c => c.convId === convId)
    if (existing) {
      setSelectedChat(existing)
      setSelectedReelm(null)
      setShowFriendSelector(false)
      setShowMenu(false)
      clearUnread(convId)
      return
    }
    const newChat = {
      id: convId,
      convId,
      name: nicknames[friend.id] || friend.name,
      friendId: friend.id,
      type: 'dm',
      photo: friend.photo || null,
      updatedAt: Date.now()
    }
    setChats(prev => [newChat, ...prev])
    setSelectedChat(newChat)
    setSelectedReelm(null)
    setShowFriendSelector(false)
    setShowMenu(false)
  }

  const createGroup = () => {
    const members = [
      { id: uid, name: currentUser.name, photo: currentUser.photo || null },
      ...groupSelectedFriends.map(f => ({ id: f.id, name: nicknames[f.id] || f.name, photo: f.photo || null }))
    ]
    const autoName = groupNameInput.trim() || (() => {
      const names = [...groupSelectedFriends.map(f => nicknames[f.id] || f.name), 'you']
      return names.join(', ')
    })()
    const groupId = `group_${Date.now()}`
    const newGroup = {
      id: groupId,
      type: 'group',
      name: autoName,
      photo: groupPhotoInput || null,
      members,
      ownerId: uid,
      createdAt: Date.now(),
      createdByName: currentUser.name,
      updatedAt: Date.now()
    }
    setChats(prev => [newGroup, ...prev])
    setSelectedChat(newGroup)
    setSelectedReelm(null)
    setShowGroupCreator(null)
    setGroupSelectedFriends([])
    setGroupNameInput('')
    setGroupPhotoInput(null)
    setShowMenu(false)
  }

  const [selectedChat, setSelectedChat] = useState(null)
  const [profileStatus, setProfileStatus] = useState('online')
  const [profileBio, setProfileBio] = useState(() => currentUser?.bio || '')
  const [profileSocialLinks, setProfileSocialLinks] = useState({})
  const [profileActivePlatforms, setProfileActivePlatforms] = useState(['instagram', 'tiktok'])
  useEffect(() => {
    if (!currentUser?.id) return
    setProfileBio(currentUser.bio || '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])
  const PANEL_DEFAULT = 250
  const [leftWidth, setLeftWidth] = useState(PANEL_DEFAULT)
  const [rightWidth, setRightWidth] = useState(PANEL_DEFAULT)
  const dragState = useRef(null)
  const barScrollRef = useRef(null)
  const barPositionsRef = useRef({})
  useEffect(() => { scheduleUserPersist('lpw', String(leftWidth)) }, [leftWidth])
  useEffect(() => { scheduleUserPersist('rpw', String(rightWidth)) }, [rightWidth])
  const barInitializedRef = useRef(false)
  const barPrevIdSetRef = useRef(null)
  useLayoutEffect(() => {
    const container = barScrollRef.current
    if (!container) return
    const items = container.querySelectorAll('[data-bar-id]')
    // Reset any in-progress transforms before measuring so getBoundingClientRect returns the true DOM position
    items.forEach(el => { el.style.transition = 'none'; el.style.transform = '' })
    const currentIds = Array.from(items).map(el => el.dataset.barId)
    const prevIdSet = barPrevIdSetRef.current
    const setChanged = !prevIdSet || currentIds.length !== prevIdSet.size || currentIds.some(id => !prevIdSet.has(id))
    barPrevIdSetRef.current = new Set(currentIds)
    const prev = barPositionsRef.current
    const next = {}
    items.forEach(el => { next[el.dataset.barId] = el.getBoundingClientRect().left })
    const hadPrev = barInitializedRef.current
    barInitializedRef.current = true
    barPositionsRef.current = next
    if (!hadPrev || setChanged) return
    items.forEach(el => {
      const id = el.dataset.barId
      const prevLeft = prev[id]
      const currLeft = next[id]
      if (prevLeft === undefined || currLeft === undefined) return
      const dx = prevLeft - currLeft
      if (Math.abs(dx) < 2) return
      el.style.transform = `translateX(${dx}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.2, 0.64, 1)'
        el.style.transform = ''
        el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transform = '' }, { once: true })
      })
    })
  })
  // Remote control requests now arrive via socketVcSignal (vc:event), handled in handleVcEvent
  useEffect(() => { scheduleUserPersist('sociallinks', profileSocialLinks) }, [profileSocialLinks])
  useEffect(() => { scheduleUserPersist('socialorder', profileActivePlatforms) }, [profileActivePlatforms])
  useEffect(() => {
    if (!uid || chats.length === 0) return
    const toSave = chats.map(c => {
      const clean = { ...c }
      if (clean.photo?.startsWith('data:')) clean.photo = null
      if (clean.members) clean.members = clean.members.map(m => ({
        ...m, photo: m.photo?.startsWith('data:') ? null : m.photo
      }))
      return clean
    })
    scheduleUserPersist('chats', toSave)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats])
  const [messages, setMessages] = useState({})
  const [messageInput, setMessageInput] = useState('')
  const messageInputRef = useRef('')
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const [msgReactions, setMsgReactions] = useState({})
  const [showMsgEmojiFor, setShowMsgEmojiFor] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [showInputEmoji, setShowInputEmoji] = useState(false)
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionSelIdx, setMentionSelIdx] = useState(0)
  const [newMsgId, setNewMsgId] = useState(null)
  const [moderationWarning, setModerationWarning] = useState('')
  useEffect(() => {
    if (msgListRef.current) {
      msgListRef.current.scrollTop = msgListRef.current.scrollHeight
    }
  }, [messages, selectedChat, selectedReelm])
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [barCtxMenu, setBarCtxMenu] = useState(null) // { x, y, item }

  useEffect(() => {
    if (!barCtxMenu) return
    const handler = (e) => { if (!e.target.closest('.bar-ctx-menu')) setBarCtxMenu(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [barCtxMenu])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragState.current) return
      const dx = e.clientX - dragState.current.startX
      if (dragState.current.side === 'left') {
        setLeftWidth(Math.max(140, Math.min(320, dragState.current.startWidth + dx)))
      } else {
        setRightWidth(Math.max(140, Math.min(320, dragState.current.startWidth - dx)))
      }
    }
    const onMouseUp = () => { dragState.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const prevMessagesRef = useRef(null)
  useEffect(() => {
    // Skip first run — prevMessagesRef is null on initial load, so we just record the baseline
    if (prevMessagesRef.current === null) {
      prevMessagesRef.current = messages
      return
    }
    const prev = prevMessagesRef.current
    const activeBarKey = selectedChat ? selectedChat.id : selectedReelm?.id
    Object.keys(messages).forEach(key => {
      const barKey = key.includes('_') ? key.split('_')[0] : key
      const prevLen = (prev[key] || []).length
      const currLen = (messages[key] || []).length
      if (currLen > prevLen) {
        const now = Date.now()
        setChats(c => c.some(ch => ch.id === barKey) ? c.map(ch => ch.id === barKey ? { ...ch, updatedAt: now } : ch) : c)
        setReelms(r => r.some(rl => rl.id === barKey) ? r.map(rl => rl.id === barKey ? { ...rl, updatedAt: now } : rl) : r)
        if (barKey !== activeBarKey) {
          setUnreadCounts(c => {
            const next = { ...c, [barKey]: (c[barKey] || 0) + (currLen - prevLen) }
            scheduleUserPersist('unread_counts', next)
            return next
          })
        }
      }
    })
    prevMessagesRef.current = messages
  }, [messages, selectedChat, selectedReelm])

  useEffect(() => {
    const msgKey = selectedChat
      ? selectedChat.id
      : (selectedReelm && selectedChannel ? `${selectedReelm.id}_${selectedChannel.id}` : null)
    if (!msgKey) return
    const vanishExpired = (m, now) => {
      const v = m.vanishAt
      if (v == null) return false
      const ms = typeof v === 'number' ? v : null
      if (ms == null) return false
      return ms <= now
    }
    const msgTimeToDate = (t) => {
      if (t instanceof Date) return t
      if (typeof t === 'number') return new Date(t)
      return new Date()
    }
    const now = Date.now()
    messagesGet(msgKey).then(msgs => {
      const filtered = msgs.filter(m => !vanishExpired(m, now))
      setMessages(prev => ({ ...prev, [msgKey]: filtered.map(m => ({ ...m, time: msgTimeToDate(m.time) })) }))
    }).catch(() => {})
    socketJoinChannel(msgKey)
    // Only leave reelm channels on switch (to free server resources when navigating channels).
    // DM/group channels must stay joined so background messages update the bar in real-time.
    return () => { if (!selectedChat) socketLeaveChannel(msgKey) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.id, selectedReelm?.id, selectedChannel?.id])

  useEffect(() => { setDmProfileExpanded(false); setDmFriendProfile(null); setDmSideTab('profile'); setGroupSideTab('members') }, [selectedChat?.id])
  useEffect(() => {
    if (selectedChat?.type !== 'dm' || !selectedChat.friendId) return
    userProfileGetById(selectedChat.friendId).then(data => { if (data) setDmFriendProfile(data) }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.friendId])

  useEffect(() => {
    if (!channelCtxMenu) return
    const handler = (e) => {
      if (!e.target.closest('.reelm-channel-ctx-menu')) setChannelCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [channelCtxMenu])

  useEffect(() => {
    if (!showReelmMenu) return
    const handler = (e) => {
      if (!e.target.closest('.reelm-name-menu') && !e.target.closest('.reelm-sidebar-name')) setShowReelmMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showReelmMenu])

  useEffect(() => {
    if (!showDmFriendMenu) return
    const handler = (e) => {
      if (!e.target.closest('.dm-friend-ctx-menu') && !e.target.closest('.dm-friend-name')) setShowDmFriendMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDmFriendMenu])

  useEffect(() => {
    if (!selectedReelm?.id || !selectedChannel?.id || uid === 'guest') return
    setLastChannels((prev) => {
      if (prev[selectedReelm.id] === selectedChannel.id) return prev
      const next = { ...prev, [selectedReelm.id]: selectedChannel.id }
      scheduleUserPersist('last_channels', next)
      return next
    })
  }, [selectedChannel?.id, selectedReelm?.id, uid])

  useEffect(() => {
    if (!selectedReelm) { setSelectedChannel(null); return }
    const allChannels = selectedReelm.categories.flatMap(c => c.channels)
    const lastChId = lastChannels[selectedReelm.id]
    const lastCh = lastChId ? allChannels.find(ch => ch.id === lastChId) : null
    const defaultCh = selectedReelm.categories.find(c => c.type === 'announcement')?.channels?.[0] || allChannels[0] || null
    const pick = lastCh || defaultCh
    setSelectedChannel((prev) => (prev?.id === pick?.id ? prev : pick))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReelm?.id, lastChannels])

  // Flying rooms: tick for live countdown display
  useEffect(() => {
    const id = setInterval(() => setFlyingRoomTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Flying rooms: auto-expire
  const reelmsRef = useRef([])
  useEffect(() => { reelmsRef.current = reelms }, [reelms])
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      const toAnnounce = []
      reelmsRef.current.forEach(r => {
        r.categories.forEach(c => {
          c.channels.forEach(ch => {
            if (ch.isFlyingRoom && ch.expiresAt <= now) {
              const annChId = r.announcementChannelId || r.categories.find(cat => cat.type === 'announcement')?.channels?.[0]?.id
              if (annChId) toAnnounce.push({ reelmId: r.id, channelName: ch.name, annChId })
            }
          })
        })
      })
      setReelms(prev => {
        let changed = false
        const next = prev.map(r => ({
          ...r,
          categories: r.categories.map(c => {
            const filtered = c.channels.filter(ch => !ch.isFlyingRoom || ch.expiresAt > now)
            if (filtered.length !== c.channels.length) changed = true
            return { ...c, channels: filtered }
          })
        }))
        if (!changed) return prev
        return next
      })
      setSelectedReelm(prev => {
        if (!prev) return prev
        return {
          ...prev,
          categories: prev.categories.map(c => ({
            ...c,
            channels: c.channels.filter(ch => !ch.isFlyingRoom || ch.expiresAt > now)
          }))
        }
      })
      setSelectedChannel(prev => (prev?.isFlyingRoom && prev.expiresAt <= now) ? null : prev)
      toAnnounce.forEach(({ reelmId, channelName, annChId }) => {
        postSystemMessage(reelmId, annChId, `✦ ${channelName} has flown away.`)
      })
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const createFlyingRoom = (reelmId, catId, name, durationMs) => {
    const reelm = reelmsRef.current.find(r => r.id === reelmId) || selectedReelm
    const cat = reelm?.categories.find(c => c.id === catId)
    if (!cat) return
    const channelName = name.trim() || 'flying-room'
    const newChannel = {
      id: 'fr-' + Date.now(),
      name: channelName,
      type: cat.type === 'announcement' ? 'text' : cat.type,
      isFlyingRoom: true,
      expiresAt: Date.now() + durationMs,
      ...(cat.type === 'voice' ? { capacity: 8, current: 0 } : {})
    }
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : { ...c, channels: [...c.channels, newChannel] })
    })
    setReelms(prev => prev.map(r => r.id !== reelmId ? r : updater(r)))
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setSelectedChannel(newChannel)
    const durLabel = FLYING_ROOM_DURATIONS.find(d => d.ms === durationMs)?.label || formatTimeLeft(Date.now() + durationMs)
    const annChId = reelm.announcementChannelId || reelm.categories.find(c => c.type === 'announcement')?.channels?.[0]?.id
    if (annChId) {
      postSystemMessage(reelmId, annChId, `✦ ${currentUser.name} created a vapor room called "${channelName}" — Join before the room goes vapor in ${durLabel}.`)
    }
  }

  const STUN = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
          // TURN sunucusu örneği (UDP/TCP)
          {
            urls: 'turn:turn.ornek-sunucunuz.com:3478', // Örn: Metered, Twilio veya kendi Coturn sunucunuz
            username: 'kullanici_adi',
            credential: 'sifre',
          },
          // Güvenli (TLS) TURN sunucusu örneği
          {
            urls: 'turns:turn.ornek-sunucunuz.com:5349',
            username: 'kullanici_adi',
            credential: 'sifre',
          }
    ],
    iceCandidatePoolSize: 10, // pre-gather candidates for instant connection
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  }

  const playRemoteStream = (userId, stream) => {
    // Clean up previous nodes for this user
    const old = remoteAudiosRef.current[userId]
    if (old?.source) { try { old.source.disconnect() } catch { /* noop */ } }
    if (old?.panner) { try { old.panner.disconnect() } catch { /* noop */ } }

    // Create or resume AudioContext
    if (!spatialContextRef.current || spatialContextRef.current.state === 'closed') {
      spatialContextRef.current = new AudioContext()
      const l = spatialContextRef.current.listener
      if (l.positionX) { l.positionX.value = 0; l.positionY.value = 0; l.positionZ.value = 0 }
      else l.setPosition(0, 0, 0)
    }
    const ctx = spatialContextRef.current
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    const source = ctx.createMediaStreamSource(stream)
    const { enabled, depth } = spatialSettingsRef.current
    const spread = (depth / 50) * 10

    if (!enabled) {
      source.connect(ctx.destination)
      pannerNodesRef.current[userId] = null
      remoteAudiosRef.current[userId] = { source, panner: null }
      return
    }

    const panner = ctx.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 15
    panner.rolloffFactor = 1.5

    const pos = voicePositionsRef.current[userId] || { x: 0.5, y: 0.5 }
    if (panner.positionX) {
      panner.positionX.value = (pos.x - 0.5) * spread
      panner.positionY.value = 0
      panner.positionZ.value = (pos.y - 0.5) * spread
    } else {
      panner.setPosition((pos.x - 0.5) * spread, 0, (pos.y - 0.5) * spread)
    }

    source.connect(panner)
    panner.connect(ctx.destination)
    pannerNodesRef.current[userId] = panner
    remoteAudiosRef.current[userId] = { source, panner }
  }

  const sendScreenStreamIdsToPeer = (peerKeyRaw) => {
    const peerKey = String(peerKeyRaw)
    const ids = screenStreamRef.current?.getVideoTracks().map(t => t.id) || []
    if (!ids.length) return
    ids.forEach(id => screenTrackIdsRef.current.add(id))
    const payload = JSON.stringify({ type: 'screen_stream_id', ids })
    let tries = 0
    const send = () => {
      const dc = dataChannelsRef.current[peerKey]
      if (dc?.readyState === 'open') {
        try { dc.send(payload) } catch { /* noop */ }
        return true
      }
      return false
    }
    if (send()) return
    const t = setInterval(() => {
      if (send() || ++tries > 60) clearInterval(t)
    }, 50)
  }

  const handleControlEvent = (fromUserId, event) => {
    if (!event || typeof event !== 'object') return
    if (event.type === 'screen_stream_id' && Array.isArray(event.ids)) {
      event.ids.forEach(id => screenTrackIdsRef.current.add(id))
      return
    }
    const ctrlTypes = new Set(['ctrl_mouse', 'ctrl_wheel', 'ctrl_key'])
    if (ctrlTypes.has(event.type)) {
      const active = remoteControlActiveRef.current
      if (!active || active.pending) return
      if (String(active.sharingUserId) !== String(uid)) return
      if (String(active.controllerId) !== String(fromUserId)) return
    }
    if (window.electronAPI?.execControlEvent) {
      window.electronAPI.execControlEvent(event)
    }
  }

  const sendControlEvent = (targetUserId, payload) => {
    const active = remoteControlActiveRef.current
    if (!active || active.pending) return
    if (String(active.controllerId) !== String(uid)) return
    if (String(active.sharingUserId) !== String(targetUserId)) return
    if (payload?.type === 'ctrl_mouse' && payload.event === 'mousemove') {
      const now = Date.now()
      if (now - lastCtrlMouseMoveSentRef.current < 25) return
      lastCtrlMouseMoveSentRef.current = now
    }
    const peerKey = String(targetUserId)
    const dc = dataChannelsRef.current[peerKey]
    if (dc?.readyState === 'open') {
      try { dc.send(JSON.stringify(payload)) } catch { /* noop */ }
    }
  }

  const isActivelyControllingPeer = (peerUserId) => {
    const a = remoteControlActive
    if (!a || a.pending) return false
    return String(a.controllerId) === String(uid) && String(a.sharingUserId) === String(peerUserId)
  }

  const getScreenControlHandlers = (peerUserId) => {
    if (!isActivelyControllingPeer(peerUserId)) return {}
    const peer = String(peerUserId)
    const onMouse = (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const w = Math.max(rect.width, 1)
      const h = Math.max(rect.height, 1)
      sendControlEvent(peer, { type: 'ctrl_mouse', event: e.type, x: (e.clientX - rect.left) / w, y: (e.clientY - rect.top) / h, button: e.button })
    }
    return {
      style: { cursor: 'crosshair' },
      onMouseMove: onMouse,
      onMouseDown: onMouse,
      onMouseUp: onMouse,
      onWheel: (e) => {
        e.preventDefault()
        sendControlEvent(peer, { type: 'ctrl_wheel', deltaX: e.deltaX, deltaY: e.deltaY })
      },
      onContextMenu: (e) => { e.preventDefault() },
    }
  }

  const createPeer = (targetId, stream, isInitiator) => {
    const peerKey = String(targetId)
    if (peersRef.current[peerKey]) return peersRef.current[peerKey]
    const pc = new RTCPeerConnection(STUN)
    peersRef.current[peerKey] = pc
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current))
    }
    // Trickle ICE — send candidates immediately as discovered
    pc.onicecandidate = e => {
      if (e.candidate) socketVcSignal(peerKey, { type: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.ontrack = e => {
      const track = e.track
      const stream = e.streams[0]
      if (track.kind === 'video') {
        // Distinguish screen vs camera by checking if the stream ID matches a known screen stream.
        // We use a data-channel message ('screen_stream_id') sent right after addTrack on the sender side.
        // Until that message arrives, fall back to checking whether the stream contains any audio track
        // from the *same stream* (camera streams always share the local audio stream).
        const knownScreenIds = screenTrackIdsRef.current
        const isScreen = knownScreenIds.has(track.id) || (stream && stream.getAudioTracks().length === 0 && stream.getVideoTracks().length > 0)
        if (isScreen) {
          knownScreenIds.add(track.id)
          setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, isScreenSharing: true, screenStream: stream } : p))
        } else {
          setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, isVideoOn: true, stream } : p))
        }
      } else {
        setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, stream } : p))
        playRemoteStream(peerKey, stream)
      }
    }
    let makingOffer = false
    const sendOffer = async () => {
      if (makingOffer || pc.signalingState !== 'stable') return
      makingOffer = true
      try {
        const offer = await pc.createOffer({ voiceActivityDetection: false })
        if (pc.signalingState !== 'stable') return
        await pc.setLocalDescription(offer)
        socketVcSignal(peerKey, { type: 'offer', sdp: pc.localDescription })
      } catch { /* noop */ } finally { makingOffer = false }
    }
    pc.onnegotiationneeded = sendOffer
    if (isInitiator) {
      const dc = pc.createDataChannel('reelms_control', { ordered: true })
      dataChannelsRef.current[peerKey] = dc
      dc.onopen = () => { sendScreenStreamIdsToPeer(peerKey) }
      dc.onmessage = e => { try { handleControlEvent(peerKey, JSON.parse(e.data)) } catch { /* noop */ } }
      // Initial offer — onnegotiationneeded fires async after createDataChannel+addTrack,
      // but we also call sendOffer explicitly as a safety net for browsers that coalesce events.
      sendOffer()
    } else {
      pc.ondatachannel = e => {
        dataChannelsRef.current[peerKey] = e.channel
        e.channel.onmessage = ev => { try { handleControlEvent(peerKey, JSON.parse(ev.data)) } catch { /* noop */ } }
      }
    }
    return pc
  }

  // Handles all incoming vc:event messages from Socket.IO.
  // Stored in a ref so socket callbacks always call the latest closure.
  const handleVcEvent = (msg) => {
    const { type, from } = msg
    if (!type || !from) return
    if (type === 'join') {
      setVoiceParticipants(prev => prev.find(p => String(p.userId) === String(from)) ? prev : [...prev, { userId: from, userName: msg.userName, userPhoto: msg.userPhoto, isMuted: false, isVideoOn: false }])
      createPeer(from, localStreamRef.current, true)
      // Tell the newcomer we're here
      socketVcSignal(from, { type: 'here', userId: uid, userName: currentUserRef.current?.name, userPhoto: currentUserRef.current?.photo || null })
    } else if (type === 'here') {
      setVoiceParticipants(prev => prev.find(p => String(p.userId) === String(from)) ? prev : [...prev, { userId: from, userName: msg.userName, userPhoto: msg.userPhoto, isMuted: false, isVideoOn: false }])
      createPeer(from, localStreamRef.current, false)
    } else if (type === 'leave') {
      const fk = String(from)
      setVoiceParticipants(prev => prev.filter(p => String(p.userId) !== fk))
      const pc = peersRef.current[fk]; if (pc) { pc.close(); delete peersRef.current[fk] }
      const audioNode = remoteAudiosRef.current[fk]
      if (audioNode) { try { audioNode.source?.disconnect(); audioNode.panner?.disconnect() } catch { /* noop */ } ; delete remoteAudiosRef.current[fk] }
      delete pannerNodesRef.current[fk]
      delete dataChannelsRef.current[fk]
      setRemoteControlActive(prev => {
        if (!prev) return null
        if (String(from) === String(prev.sharingUserId) || String(from) === String(prev.controllerId)) return null
        return prev
      })
      setRemoteControlReq(prev => (prev && String(prev.requesterId) === fk ? null : prev))
    } else if (type === 'offer') {
      let pc = peersRef.current[String(from)]
      if (!pc) pc = createPeer(from, localStreamRef.current, false)
      pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .then(() => pc.createAnswer({ voiceActivityDetection: false }))
        .then(answer => pc.setLocalDescription(answer))
        .then(() => socketVcSignal(from, { type: 'answer', sdp: pc.localDescription }))
        .catch(() => {})
    } else if (type === 'answer') {
      const pc = peersRef.current[String(from)]; if (pc) pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(() => {})
    } else if (type === 'ice') {
      const pc = peersRef.current[String(from)]; if (pc) pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {})
    } else if (type === 'mute') {
      setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(from) ? { ...p, isMuted: msg.isMuted } : p))
    } else if (type === 'video') {
      setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(from) ? { ...p, isVideoOn: msg.isVideoOn } : p))
    } else if (type === 'screen') {
      setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(from) ? { ...p, isScreenSharing: msg.isScreenSharing } : p))
    } else if (type === 'remote_ctrl_req' && String(msg.targetUserId) === String(uid)) {
      setRemoteControlReq({ requesterId: from, requesterName: msg.requesterName, targetUserId: uid })
    } else if (type === 'remote_ctrl_accept' && String(msg.requesterId) === String(uid)) {
      setRemoteControlActive({ controllerId: uid, controllerName: currentUserRef.current?.name, sharingUserId: from, sharingUserName: msg.sharingUserName })
    } else if (type === 'remote_ctrl_decline' && String(msg.requesterId) === String(uid)) {
      setRemoteControlActive(null)
    } else if (type === 'nudge' && String(msg.targetUserId) === String(uid)) {
      addNotification(`${msg.senderName} nudged you!`, { type: 'dm', userId: String(from) })
      playSound.nudge()
      setActiveNudge({ id: from, name: msg.senderName })
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 1000)
      setTimeout(() => setActiveNudge(null), 6000) // auto hide toast
    }
  }
  vcEventHandlerRef.current = handleVcEvent
  currentUserRef.current = currentUser

  const channelFullToastTimerRef = useRef(null)
  const showChannelFullToast = () => {
    setChannelFullToast(true)
    if (channelFullToastTimerRef.current) clearTimeout(channelFullToastTimerRef.current)
    channelFullToastTimerRef.current = setTimeout(() => setChannelFullToast(false), 3000)
  }


  const showMediaUnavailable = (kind = 'media') => {
    const label = kind === 'screen' ? 'Ekran paylaşımı' : kind === 'camera' ? 'Kamera' : 'Sesli sohbet'
    const message = `${label} için tarayıcıda güvenli bağlantı gerekiyor. Localhost veya HTTPS üzerinde test edin; normal HTTP bağlantısında mikrofon/kamera/ekran paylaşımı tarayıcı tarafından engellenebilir.`
    console.warn(message)
    if (typeof window !== 'undefined') window.alert(message)
  }

  const joinVoiceChannel = async (reelmId, channelId, channelName) => {
    // If already in a different media channel, leave it first
    if (vcRoomRef.current && vcRoomRef.current.channelId !== channelId) {
      leaveVoiceChannel()
    }
    // Capacity check
    const reelm = reelms.find(r => r.id === reelmId)
    const ch = reelm?.categories.flatMap(c => c.channels).find(c => c.id === channelId)
    if (ch && ch.capacity > 0) {
      const currentCount = vcCounts[channelId] ?? 0
      if (currentCount >= ch.capacity) { showChannelFullToast(); return }
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showMediaUnavailable('voice')
        return
      }
      const envDoc = await userGetDoc('environment').catch(() => ({})) || {}
      const noiseSuppression = envDoc.noiseSuppression ?? true
      const echoCancellation = envDoc.echoCancellation ?? true
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression, echoCancellation, autoGainControl: noiseSuppression },
        video: false,
      })
      localStreamRef.current = stream
      const myInfo = { userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, isMuted: false, isVideoOn: false, stream }
      setVoiceParticipants([myInfo])
      setVoiceChannel({ channelId, reelmId, channelName })
      setVoiceMuted(false); setVoiceVideoOn(false); setVoiceScreenSharing(false)
      vcRoomRef.current = { reelmId, channelId }
      // Announce join via Socket.IO — server broadcasts to room, replies come through handleVcEvent
      socketVcJoin(reelmId, channelId, currentUser.name, currentUser.photo || null)
      // Join spatial position channel
      socketJoinChannel(`${reelmId}_vc_${channelId}`)
      const initX = 0.5, initY = 0.5
      voicePositionsRef.current = { [uid]: { x: initX, y: initY } }
      setVoicePositions({ [uid]: { x: initX, y: initY } })
      socketEmitVoicePosition(reelmId, channelId, initX, initY)
    } catch (err) { console.warn('Voice join failed:', err) }
  }

  const spatialEmitThrottleRef = useRef(0)
  const handleSpatialMove = (x, y) => {
    // Update locally immediately
    voicePositionsRef.current = { ...voicePositionsRef.current, [uid]: { x, y } }
    setVoicePositions(prev => ({ ...prev, [uid]: { x, y } }))
    // Update listener position
    const ctx = spatialContextRef.current
    if (ctx) {
      const spread = (spatialSettingsRef.current.depth / 50) * 10
      const l = ctx.listener
      if (l.positionX) { l.positionX.value = (x - 0.5) * spread; l.positionZ.value = (y - 0.5) * spread }
      else l.setPosition((x - 0.5) * spread, 0, (y - 0.5) * spread)
    }
    // Throttle socket emit to ~20fps
    const now = Date.now()
    if (now - spatialEmitThrottleRef.current < 50) return
    spatialEmitThrottleRef.current = now
    if (voiceChannel) socketEmitVoicePosition(voiceChannel.reelmId, voiceChannel.channelId, x, y)
  }

  const leaveVoiceChannel = () => {
    const vc = vcRoomRef.current
    if (vc) { socketVcLeave(vc.reelmId, vc.channelId); vcRoomRef.current = null }
    if (voiceChannel) { const k = `${voiceChannel.reelmId}_vc_${voiceChannel.channelId}`; socketLeaveChannel(k) }
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    screenStreamRef.current?.getTracks().forEach(t => t.stop()); screenStreamRef.current = null
    Object.values(peersRef.current).forEach(pc => pc.close()); peersRef.current = {}
    dataChannelsRef.current = {}
    screenTrackIdsRef.current.clear()
    Object.values(remoteAudiosRef.current).forEach(a => { try { a.source?.disconnect(); a.panner?.disconnect() } catch { /* noop */ } }); remoteAudiosRef.current = {}
    pannerNodesRef.current = {}
    voicePositionsRef.current = {}
    if (spatialContextRef.current) { spatialContextRef.current.close().catch(() => {}); spatialContextRef.current = null }
    setVoicePositions({})
    setVoiceChannel(null); setVoiceParticipants([]); setVoiceMuted(false); setVoiceVideoOn(false); setVoiceScreenSharing(false)
    setRemoteControlActive(null)
    setRemoteControlReq(null)
    setSpeakingUsers(new Set())
    const analyzers = audioAnalyzersRef.current
    Object.values(analyzers).forEach(a => { try { a.context.close() } catch { /* noop */ } })
    audioAnalyzersRef.current = {}
  }

  useEffect(() => {
    if (!blurBg || !expandedVideoUser || expandedVideoUser.userId !== uid) {
      if (blurAnimFrameRef.current) { cancelAnimationFrame(blurAnimFrameRef.current); blurAnimFrameRef.current = null }
      if (blurSegRef.current) { blurSegRef.current.close(); blurSegRef.current = null }
      return
    }
    const stream = expandedVideoUser.stream
    if (!stream) return
    let cancelled = false
    let offscreen = null
    const seg = new SelfieSegmentation({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${f}`
    })
    seg.setOptions({ modelSelection: 1, selfieMode: false })
    blurSegRef.current = seg
    seg.onResults((results) => {
      if (cancelled) return
      const canvas = blurCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const W = canvas.width, H = canvas.height
      if (!offscreen || offscreen.width !== W || offscreen.height !== H) {
        offscreen = new OffscreenCanvas(W, H)
      }
      ctx.save()
      ctx.filter = 'blur(18px)'
      ctx.drawImage(results.image, -24, -24, W + 48, H + 48)
      ctx.restore()
      const octx = offscreen.getContext('2d')
      octx.clearRect(0, 0, W, H)
      octx.drawImage(results.image, 0, 0, W, H)
      octx.globalCompositeOperation = 'destination-in'
      octx.drawImage(results.segmentationMask, 0, 0, W, H)
      ctx.drawImage(offscreen, 0, 0)
    })
    let lastTime = 0
    const processFrame = async (time) => {
      if (cancelled) return
      blurAnimFrameRef.current = requestAnimationFrame(processFrame)
      if (time - lastTime < 33) return
      lastTime = time
      const vid = blurHiddenVideoRef.current
      const canvas = blurCanvasRef.current
      if (vid && vid.readyState >= 2 && canvas) {
        if (canvas.width !== vid.videoWidth || canvas.height !== vid.videoHeight) {
          canvas.width = vid.videoWidth || 640
          canvas.height = vid.videoHeight || 360
        }
        await seg.send({ image: vid })
      }
    }
    seg.initialize().then(() => { if (!cancelled) requestAnimationFrame(processFrame) })
    return () => {
      cancelled = true
      if (blurAnimFrameRef.current) { cancelAnimationFrame(blurAnimFrameRef.current); blurAnimFrameRef.current = null }
      seg.close()
      blurSegRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurBg, expandedVideoUser, uid])

  const requestRemoteControl = (targetUserId, targetUserName) => {
    const peerKey = String(targetUserId)
    const inVoiceWithPeer = !!voiceChannel && voiceParticipants.some(p => String(p.userId) === peerKey)
    if (!inVoiceWithPeer) {
      addNotification('Remote control requires both of you to be in the same voice or Live Action channel.')
      return
    }
    socketVcSignal(peerKey, { type: 'remote_ctrl_req', requesterId: uid, requesterName: currentUser.name, targetUserId: peerKey })
    setRemoteControlActive({ controllerId: uid, controllerName: currentUser.name, sharingUserId: peerKey, sharingUserName: targetUserName, pending: true })
  }

  const acceptRemoteControl = () => {
    if (!remoteControlReq) return
    if (!window.electronAPI?.execControlEvent) {
      addNotification('Screen control only works when you use the Reelms desktop app (screen sharing host).')
      setRemoteControlReq(null)
      return
    }
    socketVcSignal(remoteControlReq.requesterId, { type: 'remote_ctrl_accept', requesterId: remoteControlReq.requesterId, sharingUserId: uid, sharingUserName: currentUser.name })
    setRemoteControlActive({ controllerId: remoteControlReq.requesterId, controllerName: remoteControlReq.requesterName, sharingUserId: uid, sharingUserName: currentUser.name })
    setRemoteControlReq(null)
  }

  const declineRemoteControl = () => {
    if (!remoteControlReq) return
    socketVcSignal(remoteControlReq.requesterId, { type: 'remote_ctrl_decline', requesterId: remoteControlReq.requesterId })
    setRemoteControlReq(null)
  }

  useEffect(() => {
    const analyzers = audioAnalyzersRef.current
    voiceParticipants.forEach(p => {
      if (!p.stream || p.isMuted) {
        if (analyzers[p.userId]) { try { analyzers[p.userId].context.close() } catch { /* noop */ } ; delete analyzers[p.userId] }
        return
      }
      if (!analyzers[p.userId]) {
        try {
          const context = new AudioContext()
          const source = context.createMediaStreamSource(p.stream)
          const analyser = context.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analyzers[p.userId] = { context, analyser }
        } catch { /* noop */ }
      }
    })
    Object.keys(analyzers).forEach(userId => {
      if (!voiceParticipants.find(p => p.userId === userId)) {
        try { analyzers[userId].context.close() } catch { /* noop */ }
        delete analyzers[userId]
      }
    })
    const data = new Uint8Array(64)
    let animFrame
    let prevSpeakingIds = ''
    const tick = () => {
      const speaking = new Set()
      Object.entries(analyzers).forEach(([userId, { analyser }]) => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > 8) speaking.add(userId)
      })
      // Only update state when the set of speaking users actually changes
      const ids = [...speaking].sort().join(',')
      if (ids !== prevSpeakingIds) {
        prevSpeakingIds = ids
        setSpeakingUsers(speaking)
      }
      animFrame = requestAnimationFrame(tick)
    }
    if (Object.keys(analyzers).length > 0) tick()
    return () => cancelAnimationFrame(animFrame)
  }, [voiceParticipants])

  const vcBroadcast = (payload) => {
    const vc = vcRoomRef.current
    if (vc) socketVcBroadcast(vc.reelmId, vc.channelId, payload)
  }

  const voiceToggleMute = () => {
    const next = !voiceMuted
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next })
    setVoiceMuted(next)
    setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isMuted: next } : p))
    vcBroadcast({ type: 'mute', userId: uid, isMuted: next })
  }

  const voiceToggleVideo = async () => {
    if (!voiceVideoOn) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showMediaUnavailable('camera'); return }
        const vs = await navigator.mediaDevices.getUserMedia({ video: true })
        const vt = vs.getVideoTracks()[0]
        localStreamRef.current.addTrack(vt)
        Object.values(peersRef.current).forEach(pc => { try { pc.addTrack(vt, localStreamRef.current) } catch { /* noop */ } })
        setVoiceVideoOn(true)
        setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isVideoOn: true, stream: localStreamRef.current } : p))
        vcBroadcast({ type: 'video', userId: uid, isVideoOn: true })
      } catch (e) { console.warn('Camera error', e) }
    } else {
      localStreamRef.current?.getVideoTracks().forEach(t => { t.stop(); try { localStreamRef.current.removeTrack(t) } catch { /* noop */ } })
      setVoiceVideoOn(false)
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isVideoOn: false } : p))
      vcBroadcast({ type: 'video', userId: uid, isVideoOn: false })
    }
  }

  const voiceToggleScreen = async () => {
    if (!voiceScreenSharing) {
      if (selectedChannel?.screenShareModOnly) {
        const member = selectedReelm?.members?.find(m => String(m.userId) === String(uid))
        const isAdmin = (member?.roleIds || []).some(rid => selectedReelm?.roles?.find(r => r.id === rid)?.name === 'Admin')
        if (!isAdmin) return
      }
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { showMediaUnavailable('screen'); return }
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        screenStreamRef.current = ss
        const screenVideoTrackIds = ss.getVideoTracks().map(t => t.id)
        // Register our own screen track IDs so ontrack on the other side can identify them
        screenVideoTrackIds.forEach(id => screenTrackIdsRef.current.add(id))
        Object.keys(peersRef.current).forEach((peerKey) => {
          const pc = peersRef.current[peerKey]
          ss.getTracks().forEach(t => { try { pc.addTrack(t, ss) } catch { /* noop */ } })
          sendScreenStreamIdsToPeer(peerKey)
        })
        const stopScreen = () => {
          screenTrackIdsRef.current.clear()
          screenStreamRef.current = null
          setVoiceScreenSharing(false)
          setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(uid) ? { ...p, isScreenSharing: false, screenStream: null } : p))
          vcBroadcast({ type: 'screen', userId: uid, isScreenSharing: false })
          setRemoteControlActive(prev => (prev && String(prev.sharingUserId) === String(uid) ? null : prev))
        }
        ss.getVideoTracks()[0].onended = stopScreen
        setVoiceScreenSharing(true)
        setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isScreenSharing: true, screenStream: ss } : p))
        vcBroadcast({ type: 'screen', userId: uid, isScreenSharing: true })
      } catch { /* noop */ }
    } else {
      if (screenStreamRef.current) {
        const screenTracks = screenStreamRef.current.getTracks()
        Object.values(peersRef.current).forEach(pc => {
          pc.getSenders().filter(s => screenTracks.some(t => t === s.track)).forEach(s => { try { pc.removeTrack(s) } catch { /* noop */ } })
        })
        screenTracks.forEach(t => t.stop())
        screenStreamRef.current = null
      }
      screenTrackIdsRef.current.clear()
      setVoiceScreenSharing(false)
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isScreenSharing: false, screenStream: null } : p))
      vcBroadcast({ type: 'screen', userId: uid, isScreenSharing: false })
    }
  }

  const hydrateReelmCore = async (reelmId) => {
    if (!reelmId) return null
    const [meta, structure, roles, members] = await Promise.all([
      reelmGetDoc(reelmId, 'meta').catch(() => null),
      reelmGetDoc(reelmId, 'structure').catch(() => null),
      reelmGetDoc(reelmId, 'roles').catch(() => []),
      reelmGetDoc(reelmId, 'members').catch(() => []),
    ])
    if (!meta) return null
    return {
      ...meta,
      roles: Array.isArray(roles) ? roles : [],
      members: Array.isArray(members) ? members : [],
      categories: Array.isArray(structure?.categories) ? structure.categories : [],
      joined: true,
    }
  }

  const mergeReelmIntoState = (nextReelm) => {
    if (!nextReelm?.id) return
    setReelms(prev => {
      const next = prev.some(r => String(r.id) === String(nextReelm.id))
        ? prev.map(r => String(r.id) === String(nextReelm.id) ? { ...r, ...nextReelm } : r)
        : [nextReelm, ...prev]
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => (String(prev?.id || '') === String(nextReelm.id) || !prev ? { ...(prev || {}), ...nextReelm } : prev))
  }

  const persistReelmCore = (reelm) => {
    if (!reelm?.id) return
    reelmPutDoc(reelm.id, 'meta', {
      id: reelm.id,
      name: reelm.name,
      code: reelm.code,
      ownerId: reelm.ownerId || null,
      announcementChannelId: reelm.announcementChannelId || null,
      image: reelm.image || null,
      updatedAt: Date.now(),
    }).catch(() => {})
    reelmPutDoc(reelm.id, 'structure', { categories: reelm.categories || [] }).catch(() => {})
    if (Array.isArray(reelm.roles)) reelmPutDoc(reelm.id, 'roles', reelm.roles).catch(() => {})
    if (Array.isArray(reelm.members)) reelmPutDoc(reelm.id, 'members', reelm.members).catch(() => {})
  }

  const createDefaultReelm = (name, template = null, t = k => k) => {
    const reelmId = Date.now().toString()
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const mkId = () => 'ch-' + Math.random().toString(36).substring(2, 8)
    const mkCat = () => 'cat-' + Math.random().toString(36).substring(2, 8)

    let announcementChannelId, categories
    if (template) {
      const bChannels = template.beginning.map(n => ({ id: mkId(), name: n, type: 'announcement' }))
      announcementChannelId = bChannels[0].id
      categories = [
        { id: mkCat(), name: t('cat_beginning'), type: 'announcement', icon: 'general', collapsed: false, channels: bChannels },
        { id: mkCat(), name: t('cat_text'), type: 'text', icon: 'text', collapsed: false,
          channels: template.text.map(n => ({ id: mkId(), name: n, type: 'text' })) },
        { id: mkCat(), name: t('cat_voice'), type: 'voice', icon: 'multimedia', collapsed: false,
          channels: template.mm.map((n, i) => ({ id: mkId(), name: n, type: 'voice', capacity: i === 0 ? 8 : 4, current: 0 })) },
        { id: mkCat(), name: t('cat_live'), type: 'live', icon: 'liveaction', collapsed: false,
          channels: template.live.map(n => ({ id: mkId(), name: n, type: 'live' })) },
      ]
    } else {
      announcementChannelId = 'ch-tumu'
      categories = [
        { id: 'cat-baslangic', name: t('cat_beginning'), type: 'announcement', icon: 'general', collapsed: false,
          channels: [{ id: 'ch-tumu', name: t('ch_everything'), type: 'announcement' }] },
        { id: 'cat-text', name: t('cat_text'), type: 'text', icon: 'text', collapsed: false,
          channels: [{ id: 'ch-general', name: t('ch_chat'), type: 'text' }] },
        { id: 'cat-voice', name: t('cat_voice'), type: 'voice', icon: 'multimedia', collapsed: false,
          channels: [
            { id: 'ch-voice-room', name: t('ch_voice_room'), type: 'voice', capacity: 8, current: 0 },
            { id: 'ch-video-room', name: t('ch_video_room'), type: 'voice', capacity: 4, current: 0 },
          ] },
        { id: 'cat-live', name: t('cat_live'), type: 'live', icon: 'liveaction', collapsed: false,
          channels: [{ id: 'ch-ortam', name: t('ch_space'), type: 'live', screenShareModOnly: true }] },
      ]
    }

    return {
      id: reelmId, code, name, updatedAt: Date.now(), ownerId: uid,
      announcementChannelId,
      roles: [
        { id: 'role-admin-' + reelmId, name: 'Admin', color: '#f87171' },
        { id: 'role-member-' + reelmId, name: 'Member', color: '#60a5fa' },
      ],
      members: [{ userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, roleIds: ['role-admin-' + reelmId] }],
      categories,
    }
  }

  const handleCreateReelm = async () => {
    const name = reelmNameInput.trim()
    if (!name) return
    const draftReelm = createDefaultReelm(name, activeTemplate, getT(language))
    let newReelm = draftReelm
    try {
      newReelm = await createReelmRemote(draftReelm) || draftReelm
    } catch (err) {
      console.warn('Remote reelm create failed; falling back to compatibility writes:', err)
      persistReelmCore(draftReelm)
    }

    setReelms(prev => {
      const next = [newReelm, ...prev.filter(r => String(r.id) !== String(newReelm.id))]
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(newReelm)
    socketJoinReelm(newReelm.id)
    setSelectedChat(null)
    setReelmNameInput('')
    setSelectedTemplateId(null)
    setCreateReelmStep(null)
    setShowMenu(false)

    const annChId = newReelm.announcementChannelId || newReelm.categories?.find(c => c.type === 'announcement')?.channels?.[0]?.id
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const creationMessages = [
      `Today was the day... ${dateStr}, ${name} created. ✦`,
      `And just like that, ${name} existed. ${dateStr}.`,
      `${name} has entered the chat. Permanently. (${dateStr})`,
      `Somewhere, a server whispered: ${name} is now real. ${dateStr}.`,
      `Big day. ${dateStr}. ${name} was born into this world.`,
    ]
    const msg = creationMessages[Math.floor(Math.random() * creationMessages.length)]
    if (annChId) postSystemMessage(newReelm.id, annChId, msg)
  }

  const handleJoinReelm = async () => {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    const existing = reelms.find(r => String(r.code || '').toUpperCase() === code)
    if (existing) {
      setSelectedReelm(existing)
      socketJoinReelm(existing.id)
      setSelectedChat(null)
      setCreateReelmStep(null)
      setShowMenu(false)
      return
    }
    setJoining(true)
    setJoinError('')
    try {
      let newReelm = null
      try {
        newReelm = await joinReelmByCode(code)
      } catch (err) {
        // Backward compatible fallback for older local APIs.
        const meta = await reelmByCode(code)
        if (meta?.id) {
          const [structure, roles, members] = await Promise.all([
            reelmGetDoc(meta.id, 'structure').catch(() => null),
            reelmGetDoc(meta.id, 'roles').catch(() => []),
            reelmGetDoc(meta.id, 'members').catch(() => []),
          ])
          newReelm = {
            ...meta,
            roles: Array.isArray(roles) ? roles : [],
            members: Array.isArray(members) ? members : [],
            joined: true,
            categories: structure?.categories || meta.categories || [
              { id: 'cat-general', name: 'General', type: 'text', channels: [{ id: 'ch-general', name: 'general', type: 'text' }] },
            ],
          }
        }
      }
      if (!newReelm) { setJoinError('Reelm not found. Check the code and try again.'); setJoining(false); return }
      setReelms(prev => {
        const next = [newReelm, ...prev.filter(r => String(r.id) !== String(newReelm.id))]
        scheduleUserPersist('reelms', next)
        return next
      })
      setSelectedReelm(newReelm)
      socketJoinReelm(newReelm.id)
      setSelectedChat(null)
      setCreateReelmStep(null)
      setShowMenu(false)
    } catch {
      setJoinError('Something went wrong. Please try again.')
    }
    setJoining(false)
  }

  const toggleCategory = (reelmId, catId) => {
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : {
        ...r,
        categories: r.categories.map(c => c.id !== catId ? c : { ...c, collapsed: !c.collapsed })
      })
      scheduleUserPersist('reelms', next)
      return next
    })
    if (selectedReelm?.id === reelmId) {
      setSelectedReelm(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id !== catId ? c : { ...c, collapsed: !c.collapsed })
      }))
    }
  }

  const addChannel = (reelmId, catId) => {
    const cat = selectedReelm?.categories.find(c => c.id === catId)
    if (!cat) return
    const newChannel = {
      id: 'ch-' + Date.now(),
      name: cat.type === 'text' ? 'new-channel' : cat.type === 'voice' ? 'New Room' : cat.type === 'live' ? 'new-space' : 'new-channel',
      type: cat.type,
      ...(cat.type === 'voice' ? { capacity: 8, current: 0 } : {})
    }
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : {
        ...r,
        categories: r.categories.map(c => c.id !== catId ? c : { ...c, channels: [...c.channels, newChannel] })
      })
      scheduleUserPersist('reelms', next)
      return next
    })
    const updatedSelected = selectedReelm ? {
      ...selectedReelm,
      categories: selectedReelm.categories.map(c => c.id !== catId ? c : { ...c, channels: [...c.channels, newChannel] })
    } : null
    if (updatedSelected) {
      setSelectedReelm(updatedSelected)
      persistReelmCore(updatedSelected)
    }
    setEditingChannelId(newChannel.id)
    setEditingChannelName('')
    if (cat.type === 'voice') setNewVoiceChannelId(newChannel.id)
  }

  const saveChannelName = (reelmId, catId, chId) => {
    const name = editingChannelName.trim()
    if (!name) { setEditingChannelId(null); setNewVoiceChannelId(null); return }
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : {
        ...c,
        channels: c.channels.map(ch => ch.id !== chId ? ch : { ...ch, name })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setEditingChannelId(null)
  }

  const saveChannelCapacity = (reelmId, catId, chId, cap) => {
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : {
        ...c,
        channels: c.channels.map(ch => ch.id !== chId ? ch : { ...ch, capacity: cap })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
  }

  const deleteChannel = (reelmId, catId, chId) => {
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : {
        ...c, channels: c.channels.filter(ch => ch.id !== chId)
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    if (selectedChannel?.id === chId) setSelectedChannel(null)
  }

  const updateReelmImage = (reelmId, imageDataUrl) => {
    const updater = r => ({ ...r, image: imageDataUrl })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
  }

  const leaveReelm = (reelmId) => {
    setReelms(prev => {
      const next = prev.filter(r => r.id !== reelmId)
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(null)
    setShowReelmMenu(false)
  }

  const updateReelm = (updatedReelm) => {
    setReelms(prev => {
      const next = prev.map(r => r.id === updatedReelm.id ? updatedReelm : r)
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(updatedReelm)
    persistReelmCore(updatedReelm)
  }

  const handleMenuItemClick = (action) => {
    if (action === 'createReelm') {
      setCreateReelmStep('naming')
      setReelmNameInput('')
      return
    }
    if (action === 'joinReelm') {
      setCreateReelmStep('joining')
      setJoinCodeInput('')
      setJoinError('')
      return
    }
    if (action === 'startChat') {
      setShowFriendSelector(true)
      setFriendSelectorQuery('')
      return
    }
    if (action === 'startGroupChat') {
      setShowGroupCreator('friends')
      setGroupSelectedFriends([])
      setGroupNameInput('')
      setGroupPhotoInput(null)
      setShowMenu(false)
      return
    }
    setShowMenu(false)
  }

  const isMod = Boolean(currentUser?.isModerator)
  const [showModInbox, setShowModInbox] = useState(false)
  const totalUnread = chats.reduce((s, c) => s + (unreadCounts[c.id] || 0), 0)

  const openReport = (type, targetId, targetContent, targetUserId, targetUserName, context) => {
    setReportModal({ type, targetId, targetContent: (targetContent || '').slice(0, 200), targetUserId, targetUserName, context: context || '' })
  }

  const _submitReport = (reason) => {
    if (!reportModal) return
    const report = {
      id: Date.now().toString(),
      reporterId: uid,
      reporterName: currentUser.name || 'Unknown',
      ...reportModal,
      reason,
      reelmId: selectedReelm?.id || '',
      timestamp: Date.now(),
      resolved: false,
    }
    const next = [report, ...reports]
    setReports(next)
    appPutDoc('reports', next).catch(() => {})
    modReportSend(report).catch(() => {})
    setReportModal(null)
  }

  const modDeleteMessage = (msgKey, msgId) => {
    messageDelete(msgKey, msgId).catch(() => {})
    setMessages(prev => ({ ...prev, [msgKey]: (prev[msgKey] || []).filter(m => String(m.id) !== String(msgId)) }))
  }

  const modDeletePost = async (postId) => {
    const rId = selectedReelm?.id || 'global'
    try {
      const raw = await reelmGetDoc(rId, 'feed_posts')
      const posts = (Array.isArray(raw) ? raw : []).filter(p => p.id !== postId)
      patchReelmCache(rId, { feed_posts: posts })
      await reelmPutDoc(rId, 'feed_posts', posts)
      setModDeleteTick(t => t + 1)
    } catch { /* noop */ }
  }

  const _modDeleteReelm = (reelmId) => {
    setReelms(prev => prev.filter(r => r.id !== reelmId))
    if (selectedReelm?.id === reelmId) setSelectedReelm(null)
  }

  const postSystemMessage = (reelmId, channelId, text) => {
    const msgKey = `${reelmId}_${channelId}`
    const msg = { id: Date.now(), text, sender: { id: 'system', name: 'Reelms', photo: null }, time: Date.now(), isSystem: true }
    messageSend(msgKey, msg).catch(() => {})
  }

  const mentionOptions = useMemo(() => {
    if (!mentionQuery || !selectedReelm) return []
    const q = mentionQuery.query.toLowerCase()
    const opts = []
    if ('everyone'.startsWith(q)) opts.push({ type: 'everyone', displayName: 'everyone', sub: 'Herkesten bahset' })
    const reelmRoles = selectedReelm.roles || []
    reelmRoles.forEach(r => { if (!q || r.name.toLowerCase().includes(q)) opts.push({ type: 'role', displayName: r.name, color: r.color, sub: 'Rol' }) })
    const reelmMembers = selectedReelm.members || []
    reelmMembers.forEach(m => { if (!q || m.userName.toLowerCase().includes(q)) opts.push({ type: 'user', userId: m.userId, displayName: m.userName, photo: m.userPhoto, sub: m.userName }) })
    return opts.slice(0, 7)
  }, [mentionQuery, selectedReelm])

  const insertMention = (opt) => {
    const cur = messageInputRef.current
    const start = mentionQuery.triggerStart
    const end = start + 1 + mentionQuery.query.length
    const newText = cur.slice(0, start) + `@${opt.displayName} ` + cur.slice(end)
    messageInputRef.current = newText
    setMessageInput(newText)
    setMentionQuery(null)
    setMentionSelIdx(0)
  }

  const notifyMentions = (text) => {
    if (!selectedReelm || !selectedChannel || !text) return
    const reelmMembers = selectedReelm.members || []
    const roles = selectedReelm.roles || []
    const notify = new Set()
    text.split(/\s+/).forEach(word => {
      if (!word.startsWith('@')) return
      const name = word.slice(1).replace(/\W/g, '').toLowerCase()
      if (name === 'everyone') {
        reelmMembers.forEach(m => { if (String(m.userId) !== String(uid)) notify.add(String(m.userId)) })
        return
      }
      const role = roles.find(r => r.name.toLowerCase() === name)
      if (role) { reelmMembers.filter(m => m.roleIds?.includes(role.id) && String(m.userId) !== String(uid)).forEach(m => notify.add(String(m.userId))); return }
      const member = reelmMembers.find(m => m.userName.toLowerCase() === name)
      if (member && String(member.userId) !== String(uid)) notify.add(String(member.userId))
    })
    notify.forEach(targetUid => _pushNotifTo(targetUid, `${currentUser.name} mentioned you in #${selectedChannel.name} channel`))
  }

  const sendMessage = async () => {
    const text = messageInputRef.current.trim()
    const attach = pendingAttachment
    if (!text && !attach) return
    const msgKey = selectedChat ? selectedChat.id : `${selectedReelm?.id}_${selectedChannel?.id}`
    if (!msgKey) return

    const now = Date.now()
    if (attach) setPendingAttachment(null)
    messageInputRef.current = ''
    setMessageInput('')

    // Send image/video first
    if (attach) {
      const vanish = selectedChat && currentUser.vanishingMediaDuration
        ? (() => { const dur = { '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[currentUser.vanishingMediaDuration]; return dur ? { vanishAt: now + dur } : {} })()
        : {}
      const imageMsg = {
        id: now,
        sender: { id: currentUser.id, name: currentUser.name, photo: currentUser.photo || null },
        time: now, mediaUrl: attach.dataUrl, mediaType: attach.mediaType, ...vanish
      }
      setMessages(prev => {
        const existing = prev[msgKey] || []
        if (existing.some(m => m.id === imageMsg.id)) return prev
        return { ...prev, [msgKey]: [...existing, { ...imageMsg, time: new Date(imageMsg.time) }] }
      })
      messageSend(msgKey, imageMsg).catch(() => {})
      setNewMsgId(now)
    }

    // Then send text
    if (text) {
      const textId = attach ? now + 1 : now
      const msg = { id: textId, text, sender: { id: currentUser.id, name: currentUser.name, photo: currentUser.photo || null }, time: now }
      setMessages(prev => {
        const existing = prev[msgKey] || []
        if (existing.some(m => m.id === msg.id)) return prev
        return { ...prev, [msgKey]: [...existing, { ...msg, time: new Date(msg.time) }] }
      })
      messageSend(msgKey, msg).catch(() => {})
      notifyMentions(text)

      // Moderate text in reelm channels in background (not DMs — privacy)
      if (selectedReelm && selectedChannel) {
        moderateText(text, selectedReelm?.ageRating).then(mod => {
          if (!mod.allowed) {
            setMessages(prev => {
              const existing = prev[msgKey] || []
              return { ...prev, [msgKey]: existing.filter(m => m.id !== textId) }
            })
            setModerationWarning(mod.message || 'Message blocked by content policy.')
            setTimeout(() => setModerationWarning(''), 4000)
          }
        }).catch(() => {})
      }
      setNewMsgId(textId)
    }

    if (selectedChat) {
      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, updatedAt: now } : c))
      setSelectedChat(prev => ({ ...prev, updatedAt: now }))
      setRecentlyBumpedChatId(selectedChat.id)
      setTimeout(() => setRecentlyBumpedChatId(null), 600)
    } else if (selectedReelm) {
      setReelms(prev => prev.map(r => r.id === selectedReelm.id ? { ...r, updatedAt: now } : r))
      setSelectedReelm(prev => ({ ...prev, updatedAt: now }))
      setRecentlyBumpedChatId(selectedReelm.id)
      setTimeout(() => setRecentlyBumpedChatId(null), 600)
    }
  }

  // Clear pending attachment when switching channel or chat
  useEffect(() => { setPendingAttachment(null) }, [selectedChannel?.id, selectedChat?.id])

  // Track active chat key for sound routing
  useEffect(() => {
    if (selectedChat?.id) activeMsgKeyRef.current = selectedChat.id
    else if (selectedReelm?.id && selectedChannel?.id) activeMsgKeyRef.current = `${selectedReelm.id}_${selectedChannel.id}`
    else activeMsgKeyRef.current = null
  }, [selectedChat?.id, selectedReelm?.id, selectedChannel?.id])

  const toggleReaction = (msgKey, msgId, emoji) => {
    const myUid = String(uid)
    const id = String(msgId)
    setMsgReactions(prev => {
      const ch = { ...(prev[msgKey] || {}) }
      const mr = { ...(ch[id] || {}) }
      const users = [...(mr[emoji] || [])]
      const idx = users.indexOf(myUid)
      if (idx >= 0) users.splice(idx, 1); else users.push(myUid)
      if (users.length) mr[emoji] = users; else delete mr[emoji]
      if (Object.keys(mr).length) ch[id] = mr; else delete ch[id]
      return { ...prev, [msgKey]: ch }
    })
    setShowMsgEmojiFor(null)
    reactionsToggle(msgKey, id, emoji, myUid).catch(() => {})
  }

  useEffect(() => {
    const key = selectedChat?.id ?? (selectedReelm?.id && selectedChannel?.id ? `${selectedReelm.id}_${selectedChannel.id}` : null)
    if (!key) return
    reactionsGet(key).then(d => { if (d?.data) setMsgReactions(prev => ({ ...prev, [key]: d.data })) }).catch(() => {})
  }, [selectedChat?.id, selectedChannel?.id, selectedReelm?.id])

  const sendAttachment = (file, type) => {
    if (!file) return
    const msgKey = selectedChat ? selectedChat.id : `${selectedReelm?.id}_${selectedChannel?.id}`
    if (!msgKey) return
    const reader = new FileReader()
    reader.onload = ev => {
      const msg = {
        id: Date.now(),
        sender: { id: currentUser.id, name: currentUser.name, photo: currentUser.photo || null },
        time: Date.now(),
        ...(type === 'doc'
          ? { fileUrl: ev.target.result, fileName: file.name, fileSize: file.size }
          : { mediaUrl: ev.target.result, mediaType: file.type.startsWith('video/') ? 'video' : 'image' }
        ),
        ...(selectedChat && currentUser.vanishingMediaDuration ? (() => {
          const dur = { '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[currentUser.vanishingMediaDuration]
          return dur ? { vanishAt: Date.now() + dur } : {}
        })() : {})
      }
      messageSend(msgKey, msg).catch(() => {})
      setNewMsgId(msg.id)
    }
    reader.readAsDataURL(file)
  }

  const serverRole = null
  const currentActivity = currentUser?.activity || null
  const setActivity = (act) => {
    updateUserData({ activity: act || null })
  }

  // Automatic game/app detection via Electron IPC (only in desktop app)
  const currentActivityRef = useRef(currentActivity)
  useEffect(() => { currentActivityRef.current = currentActivity }, [currentActivity])
  useEffect(() => {
    if (!window.electronAPI?.onActivityUpdate) return
    window.electronAPI.onActivityUpdate((detected) => {
      const existing = currentActivityRef.current
      // Don't override a manually-set activity (no auto flag)
      if (existing?.name && !existing?.auto) return
      if (detected) {
        if (!existing || existing.name !== detected.name) {
          updateUserData({ activity: { ...detected } })
        }
      } else if (existing?.auto) {
        // Auto-clear when the process is no longer running
        updateUserData({ activity: null })
      }
    })
  }, [])

  if (!currentUser) {
    if (!authUser?.uid) return null
    return (
      <div
        className={`dashboard-root${isShaking ? ' app-shake-active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'rgba(185, 152, 135, 0.85)',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
        }}
      >
        Loading profile…
      </div>
    )
  }

  return (
    <div
      className={[
        'dashboard-root',
        customization.bgImage ? 'has-bg' : '',
        customization.bgImage && isBgLight ? 'bg-light' : '',
        !customization.showCategoryIcons ? 'hide-category-icons' : '',
        !customization.showTimestamps ? 'hide-timestamps' : '',
        activeTheme.noGradient ? 'theme-no-gradient' : '',
      ].filter(Boolean).join(' ')}
      style={{
        '--bg-image': customization.bgImage ? `url("${customization.bgImage}")` : 'none',
        // Outside panels: ~60% blur. Panels add extra blur on top (via backdrop-filter).
        '--bg-blur-outside': customization.reduceBlur ? '12px' : '16px',
        '--bg-blur-panel-extra': customization.reduceBlur ? '10px' : '12px',
      }}
    >
      {customization.bgImage && (
        <div className="dashboard-bg" key={customization.bgImage} />
      )}
      <div className="dashboard-fg">
        <header className="app-header" style={showMenu ? { filter: 'blur(4px)' } : {}}>
          <div className="logo-area" style={{ cursor: 'pointer' }} onClick={goHome}>
            <img src={reelmsLogo} alt="Reelms" className="logo" style={{ filter: headerIconThemeFilter(effectiveAccent) }} />
            <span className="app-name">Reelms</span>
          </div>
          <div className="header-icons-group">
            <button className="header-settings-btn" onClick={toggleFriendsPopup} style={{ opacity: showFriendsPopup ? 0 : 1 }}>
              <img src={friendsIcon} alt="Friends" className="header-icon" style={{ filter: 'hue-rotate(220deg) saturate(1.96) brightness(0.14)' }} />
            </button>
            <button className="header-settings-btn" onClick={toggleNotifPopup} style={{ opacity: showNotificationsPopup ? 0 : 1 }}>
              <span className="notif-icon-wrap">
                <img src={notificationIcon} alt="Notifications" className="header-icon" style={{ filter: 'hue-rotate(220deg) saturate(1.96) brightness(0.14)' }} />
                {notifications.length > notifSeenCount && (
                  <span className="notif-badge">{capBadge(notifications.length - notifSeenCount)}</span>
                )}
              </span>
            </button>
            <button className="header-settings-btn" style={{ marginLeft: '5px' }} onClick={() => { setShowSettings(v => !v); setSelectedReelm(null); setSelectedChat(null); setShowDiscover(false); setShowFriendsPanel(false) }}>
              <SettingsIcon />
            </button>
          </div>
        </header>

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="dashboard-mid-row su-drop su-drop-1" style={showMenu ? { filter: 'blur(4px)' } : {}}>
            <div className="chats-row">
              <button
                className="new-chat-btn"
                onClick={() => setShowMenu(!showMenu)}
                title="New"
              >
                <img src={newIcon} alt="New" className="header-new-icon" style={{ filter: newIconThemeFilter(effectiveAccent) }} />
              </button>
              <div className="chats-row-divider" />
              {msgRequests.length > 0 && (
                <button
                  className={`bar-item${showMsgRequests ? ' bar-item-active' : ''}`}
                  title="Message requests"
                  onClick={() => { setShowMsgRequests(v => !v); setSelectedChat(null); setSelectedReelm(null); setShowDiscover(false); setShowSettings(false) }}
                  style={{ position: 'relative', flexShrink: 0 }}
                >
                  <span className="bar-item-wrap">
                    <div className="bar-item-avatar" style={{ fontSize: '15px' }}>✉</div>
                    <span className="bar-item-badge">{msgRequests.length > 9 ? '9+' : msgRequests.length}</span>
                  </span>
                </button>
              )}
              <div className="chats-list-horizontal">
                {(() => {
                  const allItemsFlat = [
                    ...reelms.map(r => ({ ...r, itemType: 'reelm' })),
                    ...chats.filter(c => !blocked.some(b => b.id === c.friendId)).map(c => ({ ...c, itemType: 'chat' }))
                  ]
                  const pinnedItems = pinnedItemIds.map(id => allItemsFlat.find(i => i.id === id)).filter(Boolean)
                  const unpinnedItems = allItemsFlat.filter(i => !pinnedItemIds.includes(i.id)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                  const allItems = [...pinnedItems, ...unpinnedItems]
                  if (allItems.length === 0) return <p className="no-chats-text-bar">Start a conversation</p>
                  return (
                    <div className="chats-scroll-horizontal" ref={barScrollRef}>
                      {allItems.map(item => (
                        <div
                          key={item.id}
                          data-bar-id={item.id}
                          className={'bar-item' + ((item.itemType === 'reelm' ? selectedReelm?.id : selectedChat?.id) === item.id ? ' bar-item-active' : '')}
                          onClick={() => {
                            clearUnread(item.id)
                            if (item.itemType === 'reelm') { setSelectedReelm(item); setSelectedChat(null); setShowDiscover(false); setShowFriendsPanel(false); setShowSettings(false); setReelmLoading(true); setTimeout(() => setReelmLoading(false), 350) }
                            else { setSelectedChat(item); setSelectedReelm(null); setSelectedChannel(null); setShowDiscover(false); setShowFriendsPanel(false); setShowSettings(false) }
                          }}
                          onContextMenu={(e) => { e.preventDefault(); setBarCtxMenu({ x: e.clientX, y: e.clientY, item }) }}
                          title={item.name}
                        >
                          <span className={`bar-item-wrap${item.id === recentlyBumpedChatId ? ' bar-item-bumped' : ''}`}>
                            <div className="bar-item-avatar">
                              {item.image
                                ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : item.name?.charAt(0).toUpperCase()
                              }
                            </div>
                            {unreadCounts[item.id] > 0 && (
                              <span className="bar-item-badge">{capBadge(unreadCounts[item.id])}</span>
                            )}
                            {pinnedItemIds.includes(item.id) && <span className="bar-item-pin-dot" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="dashboard-top-right" style={{ width: rightWidth }}>
              <div className={`profile-card${showProfilePopup ? ' profile-card-active' : ''}`} onClick={() => setShowProfilePopup(true)}>
                <img src={currentUser.photo || avatarUIcon} alt="Avatar" className="profile-avatar" />
                <div className="profile-info">
                  <div className="profile-name-row">
                    <span className={`profile-name${(currentUser.name || '').length > 14 ? ' profile-name--small' : ''}${spotifyNowPlaying ? ' profile-name--listening' : ''}`}>{currentUser.name}</span>
                    <span className="profile-status-dot" style={{ background: { online: '#4ade80', idle: '#fbbf24', busy: '#f87171', invisible: '#9ca3af' }[profileStatus] }} />
                  </div>
                  {spotifyNowPlaying && (
                    <div className="profile-nowplaying" aria-live="polite">
                      <span className="profile-nowplaying-track">{spotifyNowPlaying.name}</span>
                      <span className="profile-nowplaying-sep"> • </span>
                      <span className="profile-nowplaying-artist">{spotifyNowPlaying.artist}</span>
                    </div>
                  )}
                  {serverRole && <span className="profile-role">{serverRole}</span>}
                  {currentActivity?.name && <ActivityBadge activity={currentActivity} />}
                </div>
              </div>
            </div>
          </div>

          {barCtxMenu && (
            <div
              className="bar-ctx-menu"
              style={{ position: 'fixed', left: barCtxMenu.x, top: barCtxMenu.y, zIndex: 9999 }}
            >
              {barCtxMenu.item.type === 'dm' && (
                <button
                  className="bar-ctx-menu-item"
                  onClick={() => {
                    const friend = { id: barCtxMenu.item.friendId, name: barCtxMenu.item.name, photo: barCtxMenu.item.photo }
                    const fakeE = { currentTarget: { getBoundingClientRect: () => ({ left: barCtxMenu.x, top: barCtxMenu.y, right: barCtxMenu.x, bottom: barCtxMenu.y, width: 0, height: 0 }) } }
                    setBarCtxMenu(null)
                    openFriendProfile(friend, fakeE)
                  }}
                >
                  View friend's profile
                </button>
              )}
              {pinnedItemIds.includes(barCtxMenu.item.id) ? (
                <button
                  className="bar-ctx-menu-item"
                  onClick={() => {
                    const id = barCtxMenu.item.id
                    setBarCtxMenu(null)
                    setPinnedItemIds(prev => {
                      const next = prev.filter(p => p !== id)
                      scheduleUserPersist('pinned_items', next)
                      return next
                    })
                  }}
                >
                  Remove pin
                </button>
              ) : (
                <button
                  className={`bar-ctx-menu-item${pinnedItemIds.length >= 5 ? ' bar-ctx-menu-item--disabled' : ''}`}
                  onClick={() => {
                    if (pinnedItemIds.length >= 5) return
                    const id = barCtxMenu.item.id
                    setBarCtxMenu(null)
                    setPinnedItemIds(prev => {
                      const next = [...prev, id]
                      scheduleUserPersist('pinned_items', next)
                      return next
                    })
                  }}
                >
                  {pinnedItemIds.length >= 5 ? 'Pin (max. 5)' : 'Pin'}
                </button>
              )}
              {barCtxMenu.item.itemType === 'chat' && (
                <button
                  className="bar-ctx-menu-item bar-ctx-menu-item--danger"
                  onClick={() => {
                    const item = barCtxMenu.item
                    setBarCtxMenu(null)
                    setPinnedItemIds(prev => {
                      const next = prev.filter(p => p !== item.id)
                      if (next.length !== prev.length) scheduleUserPersist('pinned_items', next)
                      return next
                    })
                    setChats(prev => prev.filter(c => c.id !== item.id))
                    if (selectedChat?.id === item.id) setSelectedChat(null)
                  }}
                >
                  Delete chat
                </button>
              )}
            </div>
          )}

          {showInviteModal && selectedReelm && (
            <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
              <div className="invite-modal" onClick={e => e.stopPropagation()}>
                <div className="invite-modal-title">Invite friends</div>
                <div className="invite-modal-reelm-name">{selectedReelm.name}</div>
                <div className="invite-modal-code-label">Reelm Code</div>
                <div className="invite-modal-code-row">
                  <span className="invite-modal-code">{selectedReelm.code || '——'}</span>
                  <button
                    className="invite-modal-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedReelm.code || '')
                      setCopiedInvite(true)
                      setTimeout(() => setCopiedInvite(false), 1800)
                    }}
                  >
                    {copiedInvite ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="invite-modal-link-label">Invite Link</div>
                <div className="invite-modal-code-row">
                  <span className="invite-modal-link">reelms.io/r/{selectedReelm.code || '——'}</span>
                  <button
                    className="invite-modal-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://www.reelms.io/r/${selectedReelm.code || ''}`)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 1800)
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button className="invite-modal-close" onClick={() => setShowInviteModal(false)}>Close</button>
              </div>
            </div>
          )}

          <div className="panel-system" style={showMenu ? { filter: 'blur(4px)' } : {}}>
            {reelmLoading && <div className="reelm-loading-overlay" />}
            {showReelmSettings && selectedReelm ? (
              <ReelmSettings
                reelm={selectedReelm}
                currentUser={currentUser}
                friends={friends}
                onUpdate={updateReelm}
                onClose={() => setShowReelmSettings(false)}
                onAnnouncement={({ type, userName }) => {
                  const annChId = selectedReelm.announcementChannelId
                    || selectedReelm.categories?.find(c => c.type === 'announcement')?.channels?.[0]?.id
                  if (!annChId) return
                  if (type === 'join') postSystemMessage(selectedReelm.id, annChId, `👋 ${userName} joined the reelm!`)
                }}
              />
            ) : showSettings ? (
              <div className="settings-layout">
                <div className="settings-sidebar">
                  <h2 className="settings-title">{t('settings')}</h2>
                  <nav className="settings-nav">
                    {[
                      { id: 'account',       label: t('your_account') },
                      { id: 'customization', label: t('customization') },
                      { id: 'usage',         label: t('usage') },
                      { id: 'desktop',       label: 'Desktop App' },
                      { id: 'privacy',       label: t('privacy_safety') },
                      { id: 'environment',   label: t('environment') },
                      { id: 'about',         label: t('about') },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={`settings-nav-item${selectedSettingsCategory === item.id ? ' settings-nav-item-active' : ''}`}
                        onClick={() => setSelectedSettingsCategory(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                    <div className="settings-nav-divider" />
                    <button
                      type="button"
                      className={`settings-nav-item${selectedSettingsCategory === 'ignite' ? ' settings-nav-item-active' : ''}`}
                      onClick={() => setSelectedSettingsCategory('ignite')}
                    >
                      <span className="settings-ignite-label">
                        Reelms <span className="settings-ignite-word">Ignite</span>
                      </span>
                    </button>
                  </nav>
                  <button className="settings-help-center-btn" onClick={() => {
                    setHelpForm({ name: currentUser?.displayName || '', email: currentUser?.email || '', message: '' })
                    setHelpStatus('idle')
                    setShowHelpCenter(true)
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                    {getT(language)('help_center')}
                  </button>
                </div>
                <div className="settings-content">
                  <div className="settings-topbar">
                    <button type="button" className="settings-signout-btn" onClick={onLogOut}>{t('sign_out')}</button>
                    <button type="button" className="settings-close-btn" onClick={() => setShowSettings(false)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <div key={selectedSettingsCategory} className="settings-content-panel">
                    {selectedSettingsCategory === 'account' && (
                      <AccountSettingsPanel
                        user={currentUser}
                        onUpdate={updateUserData}
                        onLogOut={onLogOut}
                        profileBio={profileBio}
                        onBioChange={setProfileBio}
                        uid={uid}
                        reelms={reelms}
                        onUnblock={unblockUserFn}
                        spotifyConnected={spotifyConnected}
                        onSpotifyConnect={connectSpotify}
                        onSpotifyDisconnect={disconnectSpotify}
                      />
                    )}
                    {selectedSettingsCategory === 'privacy' && (
                      <PrivacySafetyPanel
                        user={currentUser}
                        onUpdate={updateUserData}
                        uid={uid}
                        onUnblock={unblockUserFn}
                        blockedList={blocked}
                        sessionsList={sessionsList}
                        onSessionsUpdate={(next) => {
                          setSessionsList(next)
                          userPutDoc('sessions', next).catch(() => {})
                        }}
                      />
                    )}
                    {selectedSettingsCategory === 'customization' && (
                      <CustomizationPanel
                        customization={customization}
                        onChange={updateCustomization}
                        bodyFont={bodyFont}
                        BODY_FONTS={BODY_FONTS}
                        onFontChange={updateBodyFont}
                      />
                    )}
                    {selectedSettingsCategory === 'environment' && (
                      <EnvironmentPanel uid={uid} />
                    )}
                    {selectedSettingsCategory === 'usage' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                      <div className="accs-section">
                        <div className="accs-section-title">{t('when_entering_reelm')}</div>
                        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.45)', lineHeight: 1.5 }}>
                          {t('when_entering_reelm_desc')}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {[{ val: 'chat', label: t('chat') }, { val: 'feed', label: t('feed') }].map(opt => (
                            <button
                              key={opt.val}
                              onClick={() => updateReelmLandingView(opt.val)}
                              style={{
                                padding: '8px 22px',
                                borderRadius: 12,
                                border: `1.5px solid ${reelmLandingView === opt.val ? 'rgba(var(--ta-rgb), 0.7)' : 'rgba(var(--ta-rgb), 0.18)'}`,
                                background: reelmLandingView === opt.val ? 'rgba(var(--ta-rgb), 0.12)' : 'none',
                                color: reelmLandingView === opt.val ? 'rgba(var(--ta-rgb), 0.95)' : 'rgba(var(--ta-rgb), 0.45)',
                                fontFamily: 'inherit',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="accs-section">
                        <div className="accs-section-title">{t('panels')}</div>
                        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.45)', lineHeight: 1.5 }}>
                          {t('panels_desc')}
                        </p>
                        <button
                          onClick={() => {
                            setLeftWidth(PANEL_DEFAULT)
                            setRightWidth(PANEL_DEFAULT)
                            userPutDoc('lpw', String(PANEL_DEFAULT)).catch(() => {})
                            userPutDoc('rpw', String(PANEL_DEFAULT)).catch(() => {})
                          }}
                          style={{ padding: '8px 20px', borderRadius: 12, border: '1.5px solid rgba(var(--ta-rgb), 0.18)', background: 'none', color: 'rgba(var(--ta-rgb), 0.6)', fontFamily: 'inherit', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--ta-rgb), 0.5)'; e.currentTarget.style.color = 'rgba(var(--ta-rgb), 0.9)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--ta-rgb), 0.18)'; e.currentTarget.style.color = 'rgba(var(--ta-rgb), 0.6)' }}
                        >{t('reset_panels')}</button>
                      </div>
                      <div className="accs-section">
                        <div className="accs-section-title">{t('language')}</div>
                        <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.45)', lineHeight: 1.5 }}>
                          {t('language_desc')}
                        </p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {LANGUAGES.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => onLanguageChange(lang.code)}
                              style={{
                                padding: '8px 22px',
                                borderRadius: 12,
                                border: `1.5px solid ${language === lang.code ? 'rgba(var(--ta-rgb), 0.7)' : 'rgba(var(--ta-rgb), 0.18)'}`,
                                background: language === lang.code ? 'rgba(var(--ta-rgb), 0.12)' : 'none',
                                color: language === lang.code ? 'rgba(var(--ta-rgb), 0.95)' : 'rgba(var(--ta-rgb), 0.45)',
                                fontFamily: 'inherit',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >{lang.name}</button>
                          ))}
                        </div>
                      </div>
                      <div className="accs-section">
                        <div className="accs-section-title">{t('sounds')}</div>
                        <p style={{ margin: '0 0 18px', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.45)', lineHeight: 1.5 }}>
                          {t('sounds_desc')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {SOUND_CATEGORIES.map(cat => (
                            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '0.82rem', color: 'rgba(var(--ta-rgb), 0.65)', minWidth: 180 }}>{cat.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <select
                                  value={soundSettings[cat.key] || ''}
                                  onChange={e => {
                                    const next = { ...soundSettings, [cat.key]: e.target.value }
                                    setSoundSettings(next)
                                    userPutDoc('sounds', next).catch(() => {})
                                    if (e.target.value) previewSound(e.target.value)
                                  }}
                                  style={{
                                    flex: 1,
                                    background: 'rgba(var(--ta-rgb), 0.07)',
                                    border: '1px solid rgba(var(--ta-rgb), 0.16)',
                                    borderRadius: 10,
                                    padding: '7px 10px',
                                    color: 'rgba(230, 210, 200, 0.85)',
                                    fontFamily: 'inherit',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                  }}
                                >
                                  <option value="">— Off —</option>
                                  {availableSounds.map(f => (
                                    <option key={f} value={f}>{f.replace(/\.[^.]+$/, '')}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => soundSettings[cat.key] && previewSound(soundSettings[cat.key])}
                                  disabled={!soundSettings[cat.key]}
                                  title="Preview"
                                  style={{
                                    background: 'none',
                                    border: '1px solid rgba(var(--ta-rgb), 0.16)',
                                    borderRadius: 8,
                                    color: 'rgba(var(--ta-rgb), 0.55)',
                                    cursor: soundSettings[cat.key] ? 'pointer' : 'default',
                                    opacity: soundSettings[cat.key] ? 1 : 0.3,
                                    padding: '6px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      </div>
                    )}
                    {selectedSettingsCategory === 'desktop' && (
                      <DesktopDownloadSettingsPanel />
                    )}
                    {selectedSettingsCategory === 'about' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        <div className="accs-section">
                          <div className="accs-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            Reelms
                            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'rgba(var(--ta-rgb), 0.4)', background: 'rgba(var(--ta-rgb), 0.07)', borderRadius: 8, padding: '2px 8px' }}>
                              Beta 1.0/2062026
                            </span>
                          </div>
                          {updateAvailable ? (
                            <div className="about-update-notice">
                              <div className="about-update-dot" />
                              <span className="about-update-text">{t('update_available')}</span>
                              <button className="about-update-btn" onClick={() => window.location.reload()}>{t('update')}</button>
                            </div>
                          ) : (
                            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.4)', lineHeight: 1.5 }}>
                              {t('app_up_to_date')}
                            </p>
                          )}
                        </div>
                        <div className="accs-section">
                          <div className="accs-section-title">{t('release_notes')}</div>
                          {changelog.length === 0 ? (
                            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.4)' }}>Loading…</p>
                          ) : changelog.map(release => (
                            <div key={release.version} className="about-release">
                              <div className="about-release-header">
                                <span className="about-release-version">v{release.version}</span>
                                <span className="about-release-date">{release.date}</span>
                                {release.highlights && (
                                  <span className="about-release-highlight">{release.highlights}</span>
                                )}
                              </div>
                              <ul className="about-release-notes">
                                {release.notes.map((note, i) => (
                                  <li key={i}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedSettingsCategory === 'ignite' && (
                      <div className="ignite-beta-panel">
                        <div className="ignite-beta-logo">
                          Reelms <span className="settings-ignite-word">Ignite</span>
                        </div>
                        <p className="ignite-beta-msg">{getT(language)('ignite_beta_notice')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : showFeed && selectedReelm ? (
              <>
                <div className="panel panel-left" style={{ flex: `0 0 ${leftWidth}px` }}>
                  <div className="reelm-sidebar">
                    <div className={`reelm-cover-wrap${selectedReelm.image ? ' reelm-cover-wrap--has-image' : ''}`} style={{ pointerEvents: 'none' }}>
                      {selectedReelm.image
                        ? <img src={selectedReelm.image} alt="cover" className="reelm-cover-img" />
                        : <div className="reelm-cover-placeholder"></div>
                      }
                      {selectedReelm.image && <div className="reelm-cover-blur-strip" />}
                      <div className="reelm-sidebar-name-row">
                        <span className="reelm-sidebar-name" style={{ cursor: 'default' }}>{selectedReelm.name}</span>
                      </div>
                    </div>
                    <div className="feed-left-nav" onDragOver={e => e.preventDefault()}>
                      {feedNavOrder.map((key, idx) => {
                        const item = ALL_FEED_NAV.find(n => n.key === key)
                        if (!item) return null
                        return (
                          <div
                            key={item.key}
                            className="feed-nav-row"
                            draggable
                            onDragStart={e => e.dataTransfer.setData('text/plain', String(idx))}
                            onDrop={e => {
                              e.preventDefault()
                              const from = parseInt(e.dataTransfer.getData('text/plain'))
                              if (from === idx) return
                              const newOrder = [...feedNavOrder]
                              const [removed] = newOrder.splice(from, 1)
                              newOrder.splice(idx, 0, removed)
                              updateFeedNavOrder(newOrder)
                            }}
                          >
                            <button
                              className={`feed-nav-btn${feedTab === item.key ? ' feed-nav-btn-active' : ''}`}
                              onClick={() => setFeedTab(item.key)}
                            >
                              {item.icon && <img src={item.icon} alt="" className="feed-nav-icon" />}
                              {item.label}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="left-panel-bottom-bar">
                    <button className={`lpb-btn${showDiscover ? ' lpb-btn-active' : ''}`} onClick={() => { setShowDiscover(true); setSelectedReelm(null); setShowFeed(false); setDiscoverQuery('') }}><img src={discoverIcon} alt="Discover" className="lpb-icon" /></button>
                    <button className={`lpb-feed-wrap lpb-btn lpb-feed-active`} onClick={() => setShowFeed(false)}>
                      <img src={feedIcon} alt="Feed" className="lpb-feed-icon" />
                    </button>
                    <button className="lpb-btn" onClick={() => { setShowFeed(false); setSelectedReelm(null); setShowChatList(true); setChatListFilter('all') }}>
                      <span className="lpb-icon-wrap">
                        <img src={messagesIcon} alt="Messages" className="lpb-icon" />
                        {totalUnread > 0 && <span className="lpb-badge">{capBadge(totalUnread)}</span>}
                      </span>
                    </button>
                  </div>
                </div>
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'left', startX: e.clientX, startWidth: leftWidth } }}
                />
                {showModInbox && isMod
                  ? <ModInboxPanel onClose={() => setShowModInbox(false)} />
                  : <FeedPage key={selectedReelm.id} currentUser={currentUser} uid={uid} tab={feedTab} selectedReelm={selectedReelm} isMod={isMod} onReport={openReport} onModDeletePost={modDeletePost} modDeleteTick={modDeleteTick} appStoriesTick={appStoriesTick} onShare={setShareTarget} pushNotifTo={_pushNotifTo} />}
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'right', startX: e.clientX, startWidth: rightWidth } }}
                />
                <div className="panel panel-right" style={{ flex: `0 0 ${rightWidth}px` }}>
                  {(() => {
                    const members = selectedReelm.members || []
                    if (members.length === 0) return null
                    const STATUS_COLOR = { online: '#4ade80', idle: '#fbbf24', busy: '#f87171', invisible: '#9ca3af', offline: '#6b7280' }
                    const getMemberStatus = (m) => m.userId === uid ? profileStatus : 'offline'
                    const online = members.filter(m => getMemberStatus(m) !== 'offline' && getMemberStatus(m) !== 'invisible')
                    const offline = members.filter(m => getMemberStatus(m) === 'offline' || getMemberStatus(m) === 'invisible')
                    const roles = selectedReelm.roles || []
                    const renderMember = (m) => {
                      const isMe = m.userId === uid
                      const nowPlaying = !isMe ? spotifyFriendsNowPlaying[m.userId] : null
                      const memberRoles = roles.filter(r => (m.roleIds || []).includes(r.id))
                      return (
                        <div key={m.userId} className="rp-member-card" onClick={e => openFriendProfile({ id: m.userId, name: m.userName, photo: m.userPhoto }, e)}>
                          <div className="rp-member-avatar-wrap">
                            <div className="rp-member-avatar">
                              {m.userPhoto
                                ? <img src={m.userPhoto} alt={m.userName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : (m.userName || '?').charAt(0).toUpperCase()
                              }
                            </div>
                            <span className="rp-member-status-dot" style={{ background: STATUS_COLOR[getMemberStatus(m)] }} />
                          </div>
                          <div className="rp-member-info">
                            <span className={`rp-member-name${nowPlaying ? ' rp-member-name--listening' : ''}`}>{m.userId === uid ? currentUser.name : m.userName}</span>
                            {nowPlaying && (
                              <div className="rp-member-nowplaying" aria-live="polite">
                                <span className="rp-member-nowplaying-track">{nowPlaying.name}</span>
                                <span className="rp-member-nowplaying-sep"> • </span>
                                <span className="rp-member-nowplaying-artist">{nowPlaying.artist}</span>
                              </div>
                            )}
                            {memberRoles.length > 0 && (
                              <div className="rp-member-roles">
                                {memberRoles.map(r => (
                                  <span key={r.id} className="rp-role-badge" style={{ color: r.color, borderColor: r.color + '55', background: r.color + '18' }}>{r.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="rp-members-panel">
                        <span className="rp-members-header">In this Reelm</span>
                        {online.length > 0 && (
                          <div className="rp-members-group">
                            {online.map(renderMember)}
                          </div>
                        )}
                        {online.length > 0 && offline.length > 0 && <div className="rp-members-divider" />}
                        {offline.length > 0 && (
                          <div className="rp-members-group rp-members-group-offline">
                            {offline.map(renderMember)}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : ((isMod ? false : (showChatList || selectedChat)) || selectedReelm) ? (
              <>
                <div className="panel panel-left" style={{ flex: `0 0 ${leftWidth}px` }}>
                  {showChatList && !selectedReelm && (
                    <div className="chat-list-sidebar-panel">
                      <div className="chat-list-sidebar-header">
                        <span className="chat-list-sidebar-title">{t('messages')}</span>
                        <div className="chat-list-filter-row">
                          {[{ key: 'all', label: t('all_filter') }, { key: 'unread', label: t('unread_filter') }, { key: 'groups', label: t('groups_filter') }].map(cat => (
                            <button
                              key={cat.key}
                              className={`chat-list-cat-btn${chatListFilter === cat.key ? ' chat-list-cat-btn-active' : ''}`}
                              onClick={() => setChatListFilter(cat.key)}
                            >{cat.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="chat-list-sidebar-items">
                        {(() => {
                          let filtered = chats
                          if (chatListFilter === 'unread') filtered = chats.filter(c => unreadCounts[c.id] > 0)
                          if (chatListFilter === 'groups') filtered = []
                          if (filtered.length === 0) return <p className="chat-list-empty">{t('no_chats_yet')}</p>
                          return filtered.map(c => (
                            <div
                              key={c.id}
                              className={`chat-list-row${selectedChat?.id === c.id ? ' chat-list-row--active' : ''}`}
                              onClick={() => { setSelectedChat(c); setSelectedChannel(null); setSelectedReelm(null); clearUnread(c.id) }}
                            >
                              <div className="discover-result-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}>
                                {c.photo
                                  ? <img src={c.photo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                  : (c.name || '?').charAt(0).toUpperCase()
                                }
                              </div>
                              <div className="discover-result-info">
                                <span className="discover-result-name">{nicknames[c.friendId] || c.name}</span>
                              </div>
                              {unreadCounts[c.id] > 0 && (
                                <span className="notif-badge" style={{ position: 'static', marginLeft: 'auto' }}>{capBadge(unreadCounts[c.id])}</span>
                              )}
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  )}
                  {!showChatList && selectedChat && (() => {
                    if (selectedChat.type === 'group') {
                      const vapor = vaporDurations[selectedChat.id]
                      const VAPOR_OPTS = [
                        { labelKey: 'vapor_after_read', value: 'read' },
                        { labelKey: 'vapor_12h', value: 12 * 3600000 },
                        { labelKey: 'vapor_24h', value: 24 * 3600000 },
                        { labelKey: 'vapor_48h', value: 48 * 3600000 },
                        { labelKey: 'vapor_1w', value: 7 * 86400000 },
                        { labelKey: 'vapor_1m', value: 30 * 86400000 },
                      ]
                      const _isOwner = selectedChat.ownerId === uid
                      const createdDate = selectedChat.createdAt
                        ? new Date(selectedChat.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                        : null
                      return (
                        <div className="dm-sidebar group-sidebar">
                          <button className="dm-back-btn" onClick={() => setSelectedChat(null)}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>

                          {/* Group avatar — click to change */}
                          <div className="group-avatar-edit-wrap" onClick={() => groupEditPhotoInputRef.current?.click()} title="Change group photo">
                            <div className="dm-friend-avatar" style={{ width: 54, height: 54, fontSize: '1.3rem' }}>
                              {selectedChat.photo
                                ? <img src={selectedChat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : selectedChat.name?.charAt(0).toUpperCase()
                              }
                            </div>
                            <div className="group-avatar-edit-overlay">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3.414 1.414 1.414-3.414A4 4 0 019 13z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          </div>
                          <input ref={groupEditPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => {
                              const photo = ev.target.result
                              setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, photo } : c))
                              setSelectedChat(prev => ({ ...prev, photo }))
                            }
                            reader.readAsDataURL(file)
                            e.target.value = ''
                          }} />

                          {/* Group name — click to edit */}
                          {groupNameEditing ? (
                            <div className="group-name-edit-row">
                              <input
                                className="group-name-input"
                                value={groupNameEditValue}
                                autoFocus
                                onChange={e => setGroupNameEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const name = groupNameEditValue.trim()
                                    if (name) {
                                      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, name } : c))
                                      setSelectedChat(prev => ({ ...prev, name }))
                                    }
                                    setGroupNameEditing(false)
                                  } else if (e.key === 'Escape') {
                                    setGroupNameEditing(false)
                                  }
                                }}
                                onBlur={() => {
                                  const name = groupNameEditValue.trim()
                                  if (name) {
                                    setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, name } : c))
                                    setSelectedChat(prev => ({ ...prev, name }))
                                  }
                                  setGroupNameEditing(false)
                                }}
                              />
                            </div>
                          ) : (
                            <div className="group-name-row" onClick={() => { setGroupNameEditValue(selectedChat.name); setGroupNameEditing(true) }} title="Edit group name">
                              <span className="dm-friend-name">{selectedChat.name}</span>
                              <svg className="group-name-edit-icon" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3.414 1.414 1.414-3.414A4 4 0 019 13z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}

                          <div className="group-side-divider" />

                          {/* Menu items */}
                          <div className="group-side-menu">
                            <button className="group-side-menu-item" onClick={() => { setShowGroupCreator('friends'); setGroupSelectedFriends([]); setGroupNameInput(selectedChat.name); setGroupPhotoInput(null) }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              {t('add_members')}
                            </button>

                            <button className={`group-side-menu-item${groupSideExpanded === 'permissions' ? ' group-side-menu-item--active' : ''}`} onClick={() => setGroupSideExpanded(v => v === 'permissions' ? null : 'permissions')}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                              {t('permissions_label')}
                              <svg className={`group-side-chevron${groupSideExpanded === 'permissions' ? ' group-side-chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {groupSideExpanded === 'permissions' && (
                              <div className="group-side-expand">
                                <p className="chat-side-placeholder">{t('permissions_coming_soon')}</p>
                              </div>
                            )}

                            <button className={`group-side-menu-item${groupSideExpanded === 'vapor' ? ' group-side-menu-item--active' : ''}`} onClick={() => setGroupSideExpanded(v => v === 'vapor' ? null : 'vapor')}>
                              <span style={{ fontSize: '0.8rem', width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>✦</span>
                              {t('vapor_chat_title')}{vapor ? ' ·' : ''}
                              {vapor && <span className="group-vapor-on-dot" />}
                              <svg className={`group-side-chevron${groupSideExpanded === 'vapor' ? ' group-side-chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {groupSideExpanded === 'vapor' && (
                              <div className="group-side-expand">
                                <span className="vapor-chat-desc">{t('vapor_chat_desc')}</span>
                                <div className="vapor-opts" style={{ marginTop: 6 }}>
                                  {VAPOR_OPTS.map(opt => (
                                    <button key={opt.value} className={`vapor-pill${vapor === opt.value ? ' vapor-pill--active' : ''}`}
                                      onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: vapor === opt.value ? null : opt.value }))}>
                                      {t(opt.labelKey)}
                                    </button>
                                  ))}
                                  {vapor && <button className="vapor-pill vapor-pill--off" onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: null }))}>{t('turn_off')}</button>}
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ flex: 1 }} />

                          {/* Group info + leave */}
                          <div className="group-side-footer">
                            {(createdDate || selectedChat.createdByName) && (
                              <p className="group-side-meta">
                                {selectedChat.createdByName ? `${selectedChat.createdByName} ${t('created_group_text')}` : t('group_created')}
                                {createdDate ? ` · ${createdDate}` : ''}
                              </p>
                            )}
                            <button className="dm-profile-action-btn dm-profile-action-danger" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setChats(prev => prev.filter(c => c.id !== selectedChat.id)); setSelectedChat(null) }}>
                              {t('leave_group')}
                            </button>
                          </div>
                        </div>
                      )
                    }
                    const displayName = nicknames[selectedChat.friendId] || selectedChat.name
                    const fp = dmFriendProfile
                    const dmSocialPlatforms = [
                      { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: '#E1306C', baseUrl: 'https://www.instagram.com/' },
                      { key: 'twitter', label: 'X', Icon: XIcon, color: '#e0c9bc', baseUrl: 'https://x.com/' },
                      { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon, color: '#b0b0b0', baseUrl: 'https://www.tiktok.com/@' },
                      { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, color: '#0A66C2', baseUrl: 'https://www.linkedin.com/in/' },
                      { key: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon, color: '#25D366', baseUrl: 'https://wa.me/' },
                      { key: 'discord', label: 'Discord', Icon: DiscordSocialIcon, color: '#5865F2', baseUrl: null },
                      { key: 'snapchat', label: 'Snapchat', Icon: SnapchatIcon, color: '#FFFC00', baseUrl: 'https://www.snapchat.com/add/' },
                    ]
                    const activeSocials = fp?.socialorder?.length
                      ? fp.socialorder.filter(k => fp.sociallinks?.[k])
                      : Object.keys(fp?.sociallinks || {}).filter(k => fp.sociallinks[k])
                    const friendNowPlaying = spotifyFriendsNowPlaying[selectedChat.friendId]
                    return (
                      <div className="dm-sidebar">
                        <button className="dm-back-btn" onClick={() => setSelectedChat(null)}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <div style={{ position: 'relative' }}>
                          <div className={`dm-friend-card${dmProfileExpanded ? ' dm-friend-card--expanded' : ''}`} onClick={() => setDmProfileExpanded(v => !v)} style={{ cursor: 'pointer' }}>
                            <div className="dm-friend-avatar">
                              {selectedChat.photo
                                ? <img src={selectedChat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : displayName.charAt(0).toUpperCase()
                              }
                            </div>
                            <span className="dm-friend-name" onClick={e => { e.stopPropagation(); setShowDmFriendMenu(v => !v) }}>{displayName}</span>
                            <svg className={`dm-profile-chevron${dmProfileExpanded ? ' dm-profile-chevron--open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          {showDmFriendMenu && (
                            <div className="dm-friend-ctx-menu">
                              {fp?.allowProfileSharing !== false && (
                                <button className="reelm-name-menu-item" onClick={() => { navigator.clipboard?.writeText(`https://reelms.io/u/${fp.username || fp.id}`); setShowDmFriendMenu(false) }}>{t('share_profile')}</button>
                              )}
                              <div className="reelm-name-menu-divider" />
                              <button className="reelm-name-menu-item reelm-name-menu-leave" onClick={() => { if (fp) { removeFriend(fp.id); setSelectedChat(null) } setShowDmFriendMenu(false) }}>{t('remove_friend')}</button>
                              <button className="reelm-name-menu-item reelm-name-menu-leave" onClick={() => { if (fp) { blockUserFn(fp); setSelectedChat(null) } setShowDmFriendMenu(false) }}>{t('block')}</button>
                            </div>
                          )}
                        </div>
                        <div className={`dm-profile-slide${dmProfileExpanded ? ' dm-profile-slide--open' : ''}`}>
                          <div className="dm-profile-slide-inner">
                            {fp?.username && (
                              <span className="dm-profile-username">@{fp.username.startsWith('@') ? fp.username.slice(1) : fp.username}</span>
                            )}
                            {fp?.activity?.name && <ActivityBadge activity={fp.activity} />}
                            {fp?.bio && <p className="dm-profile-bio">{fp.bio}</p>}
                            {friendNowPlaying && (
                              <div className="dm-profile-nowplaying">
                                <SpotifyIcon size={13} />
                                <span className="dm-profile-nowplaying-track">{friendNowPlaying.name}</span>
                                <span className="dm-profile-nowplaying-sep"> · </span>
                                <span className="dm-profile-nowplaying-artist">{friendNowPlaying.artist}</span>
                              </div>
                            )}
                            {activeSocials.length > 0 && (
                              <div className="dm-profile-socials">
                                {activeSocials.map(key => {
                                  const platform = dmSocialPlatforms.find(p => p.key === key)
                                  if (!platform) return null
                                  const { Icon, color, baseUrl, label } = platform
                                  const handle = fp.sociallinks[key]
                                  return (
                                    <button
                                      key={key}
                                      className="dm-profile-social-chip"
                                      style={{ color }}
                                      title={`${label}: ${handle}`}
                                      onClick={e => { e.stopPropagation(); if (baseUrl) window.open(baseUrl + handle, '_blank') }}
                                    >
                                      <Icon />
                                      <span>{handle}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="chat-side-tabs">
                          {['profile', 'vapor'].map(tab => (
                            <button key={tab} className={`chat-side-tab${dmSideTab === tab ? ' chat-side-tab--active' : ''}`} onClick={() => setDmSideTab(tab)}>
                              {tab === 'vapor' ? `✦ ${t('vapor_tab')}` : t('profile_tab')}
                            </button>
                          ))}
                        </div>
                        {dmSideTab === 'profile' && (
                          <div className="dm-profile-panel">
                            <div className="dm-profile-nickname">
                              <span className="fpp-section-label">{t('nickname_label')}</span>
                              <input
                                className="fpp-nickname-input"
                                style={{ width: '100%' }}
                                value={nicknames[selectedChat.friendId] || ''}
                                onChange={e => saveNickname(selectedChat.friendId, e.target.value)}
                                placeholder={displayName}
                              />
                            </div>
                          </div>
                        )}
                        {dmSideTab === 'vapor' && (() => {
                          const dmVapor = vaporDurations[selectedChat.id]
                          const DM_VAPOR_OPTS = [
                            { labelKey: 'vapor_after_read', value: 'read' },
                            { labelKey: 'vapor_12h', value: 12 * 3600000 },
                            { labelKey: 'vapor_24h', value: 24 * 3600000 },
                            { labelKey: 'vapor_48h', value: 48 * 3600000 },
                            { labelKey: 'vapor_1w', value: 7 * 86400000 },
                            { labelKey: 'vapor_1m', value: 30 * 86400000 },
                          ]
                          return (
                            <div className="chat-side-section">
                              <div className="vapor-chat-header">
                                <span className="vapor-chat-title">✦ {t('vapor_chat_title')}</span>
                                <span className="vapor-chat-desc">{t('vapor_chat_desc')}</span>
                              </div>
                              <div className="vapor-opts">
                                {DM_VAPOR_OPTS.map(opt => (
                                  <button key={opt.value} className={`vapor-pill${dmVapor === opt.value ? ' vapor-pill--active' : ''}`}
                                    onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: dmVapor === opt.value ? null : opt.value }))}>
                                    {t(opt.labelKey)}
                                  </button>
                                ))}
                                {dmVapor && <button className="vapor-pill vapor-pill--off" onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: null }))}>{t('turn_off')}</button>}
                              </div>
                              {dmVapor && <p className="vapor-active-label">✦ {t('vapor_chat_on')}</p>}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })()}
                  {selectedReelm && (
                    <div className="reelm-sidebar">
                      <div className={`reelm-cover-wrap${selectedReelm.image ? ' reelm-cover-wrap--has-image' : ''}`} onClick={() => reelmImageInputRef.current?.click()}>
                        {selectedReelm.image
                          ? <img src={selectedReelm.image} alt="cover" className="reelm-cover-img" />
                          : <div className="reelm-cover-placeholder"><span>+</span></div>
                        }
                        {selectedReelm.image && <div className="reelm-cover-blur-strip" />}
                        <div className="reelm-sidebar-name-row" onClick={e => e.stopPropagation()}>
                          <span className="reelm-sidebar-name" onClick={() => setShowReelmMenu(v => !v)}>{selectedReelm.name}</span>
                          {showReelmMenu && (
                            <div className="reelm-name-menu">
                              {(() => {
                                const _mm = selectedReelm.members?.find(m => m.userId === uid)
                                const _mr = (selectedReelm.roles || []).filter(r => (_mm?.roleIds || []).includes(r.id))
                                const _ia = selectedReelm.ownerId === uid || _mr.some(r => /admin|moderator|founder|owner/i.test(r.name))
                                return _ia ? (<>
                                  <div className="reelm-name-menu-item reelm-name-menu-insights">
                                    <svg className="reelm-insights-icon" width="12" height="11" viewBox="0 0 12 11" fill="currentColor"><rect x="0" y="6" width="2.5" height="5" rx="1"/><rect x="4.75" y="0" width="2.5" height="11" rx="1"/><rect x="9.5" y="3.5" width="2.5" height="7.5" rx="1"/></svg>
                                    <span>Insights</span>
                                    <span className="reelm-name-menu-coming-soon">coming soon</span>
                                  </div>
                                  <div className="reelm-name-menu-divider" />
                                </>) : null
                              })()}
                              {selectedReelm.ownerId === uid && (
                                <button className="reelm-name-menu-item" onClick={() => { setShowReelmSettings(true); setShowReelmMenu(false) }}>{t('reelm_settings_menu')}</button>
                              )}
                              <button className="reelm-name-menu-item" onClick={() => { setShowInviteModal(true); setShowReelmMenu(false) }}>{t('invite_friends_menu')}</button>
                              <button className="reelm-name-menu-item" onClick={() => { setShareTarget({ type: 'reelm', title: selectedReelm.name, subtitle: 'Join this Reelm now', image: selectedReelm.image || null, data: selectedReelm }); setShowReelmMenu(false) }}>{t('share_reelm')}</button>
                              <div className="reelm-name-menu-divider" />
                              <button className="reelm-name-menu-item reelm-name-menu-leave" onClick={() => leaveReelm(selectedReelm.id)}>{t('leave_reelm')}</button>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          ref={reelmImageInputRef}
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => {
                              const img = new Image()
                              img.onload = () => {
                                const MAX = 256
                                const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                                const canvas = document.createElement('canvas')
                                canvas.width = Math.round(img.width * scale)
                                canvas.height = Math.round(img.height * scale)
                                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                                updateReelmImage(selectedReelm.id, canvas.toDataURL('image/jpeg', 0.7))
                              }
                              img.src = ev.target.result
                            }
                            reader.readAsDataURL(file)
                            e.target.value = ''
                          }}
                        />
                      </div>
                      <div className="reelm-categories-scroll">
                      {selectedReelm.categories.map(cat => (
                        <div key={cat.id} className="reelm-category">
                          <div className="reelm-category-header">
                            <span className="reelm-category-name" onClick={() => toggleCategory(selectedReelm.id, cat.id)}>
                              {(() => {
                                const key = cat.icon || (cat.type === 'announcement' ? 'general' : cat.type === 'text' ? 'text' : cat.type === 'voice' ? 'multimedia' : 'liveaction')
                                const src = { general: channelGeneralIcon, text: channelTextIcon, multimedia: channelMultimediaIcon, liveaction: channelLiveactionIcon }[key]
                                return <span className="reelm-category-icon"><img src={src} className="reelm-category-icon-img" alt="" style={{ filter: categoryIconFilter(activeTheme.accent) }} /></span>
                              })()}
                              {cat.name}
                            </span>
                            <div className="reelm-category-arrow-wrap">
                              <button
                                className="reelm-category-arrow"
                                onClick={(e) => { e.stopPropagation(); setOpenCategoryMenu(openCategoryMenu === cat.id ? null : cat.id) }}
                              >
                                <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                                  <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              {openCategoryMenu === cat.id && (
                                <div className="reelm-category-menu">
                                  <button className="reelm-category-menu-item" onClick={() => { addChannel(selectedReelm.id, cat.id); setOpenCategoryMenu(null) }}>
                                    New channel
                                  </button>
                                  <button className="reelm-category-menu-item reelm-category-menu-flying" onClick={() => {
                                    setFlyingRoomModal({ reelmId: selectedReelm.id, catId: cat.id })
                                    setFlyingRoomName('')
                                    setFlyingRoomDuration(60 * 60 * 1000)
                                    setOpenCategoryMenu(null)
                                  }}>
                                    ✦ Create a vapor room
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {!cat.collapsed && (
                            <div className="reelm-channels">
                              {cat.channels.map(ch => (
                                <div key={ch.id} className={`reelm-channel${ch.isFlyingRoom ? ' reelm-channel-flying' : ''}`} onClick={() => {
                                    setChannelCtxMenu(null); setSelectedChannel(ch)
                                    if (ch.type === 'voice' && (selectedReelm.autoJoinVoice !== false) && voiceChannel?.channelId !== ch.id) {
                                      joinVoiceChannel(selectedReelm.id, ch.id, ch.name)
                                    }
                                  }}
                                  onContextMenu={e => {
                                    e.preventDefault()
                                    const myMember = selectedReelm.members?.find(m => m.userId === uid)
                                    const myRoles = (selectedReelm.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                                    const isAuthorized = selectedReelm.ownerId === uid || myRoles.some(r => /admin|moderator|founder|owner/i.test(r.name))
                                    if (!isAuthorized) return
                                    setChannelCtxMenu({ x: e.clientX, y: e.clientY, catId: cat.id, chId: ch.id, chType: ch.type, catChannelCount: cat.channels.length })
                                  }}
                                >
                                  <span className={"reelm-channel-label" + (selectedChannel?.id === ch.id ? " reelm-channel-label-active" : "")}>
                                    {(ch.type === 'announcement' || ch.type === 'text') && (
                                      <span className="reelm-channel-prefix">#</span>
                                    )}
                                    {editingChannelId === ch.id ? (
                                      <input
                                        className="reelm-channel-name-input"
                                        value={editingChannelName}
                                        onChange={e => setEditingChannelName(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') saveChannelName(selectedReelm.id, cat.id, ch.id)
                                          if (e.key === 'Escape') setEditingChannelId(null)
                                        }}
                                        onBlur={() => saveChannelName(selectedReelm.id, cat.id, ch.id)}
                                        placeholder={ch.type === 'voice' ? 'Room name' : 'channel-name'}
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="reelm-channel-name">{ch.name}</span>
                                    )}
                                  </span>
                                  {ch.type === 'voice' && editingChannelId !== ch.id && newVoiceChannelId !== ch.id && (
                                    <span className="reelm-channel-capacity">{vcCounts[ch.id] ?? 0}/{ch.capacity == null || ch.capacity === 0 ? '+' : ch.capacity}</span>
                                  )}
                                  {ch.isFlyingRoom && editingChannelId !== ch.id && (
                                    <span className="reelm-flying-badge" title={`Expires in ${formatTimeLeft(ch.expiresAt)}`}>
                                      {flyingRoomTick >= 0 && formatTimeLeft(ch.expiresAt)}
                                    </span>
                                  )}
                                  {newVoiceChannelId === ch.id && (
                                    <div className="reelm-ch-capacity-picker" onClick={e => e.stopPropagation()}>
                                      {[2, 4, 8, 16].map(cap => (
                                        <button key={cap} className={`reelm-ch-cap-pick-btn${ch.capacity === cap ? ' active' : ''}`}
                                          onClick={() => { saveChannelCapacity(selectedReelm.id, cat.id, ch.id, cap); setNewVoiceChannelId(null) }}>{cap}</button>
                                      ))}
                                      <button className={`reelm-ch-cap-pick-btn${ch.capacity === 0 ? ' active' : ''}`}
                                        onClick={() => { saveChannelCapacity(selectedReelm.id, cat.id, ch.id, 0); setNewVoiceChannelId(null) }}>+</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                  {voiceChannel && voiceChannel.channelId !== selectedChannel?.id && (
                    <div className="voice-mini-bar">
                      <button
                        className="vmb-channel"
                        onClick={() => {
                          const reelm = reelms.find(r => r.id === voiceChannel.reelmId)
                          if (!reelm) return
                          const ch = reelm.categories.flatMap(c => c.channels).find(c => c.id === voiceChannel.channelId)
                          if (!ch) return
                          setSelectedReelm(reelm); setSelectedChannel(ch); setShowDiscover(false); setSelectedChat(null); setShowSettings(false)
                        }}
                        title="Go to voice channel"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="vmb-mic-icon">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span className="vmb-name">{voiceChannel.channelName}</span>
                      </button>
                      <button
                        className={`vmb-btn${voiceMuted ? ' vmb-btn-muted' : ''}`}
                        onClick={voiceToggleMute}
                        title={voiceMuted ? 'Unmute' : 'Mute'}
                      >
                        {voiceMuted ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                      </button>
                      <button className="vmb-btn vmb-btn-leave" onClick={leaveVoiceChannel} title="Leave">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="left-panel-bottom-bar">
                    <button className={`lpb-btn${showDiscover ? ' lpb-btn-active' : ''}`} onClick={() => { setShowDiscover(true); setSelectedReelm(null); setSelectedChat(null); setDiscoverQuery('') }}><img src={discoverIcon} alt="Discover" className="lpb-icon" /></button>
                    <button className={`lpb-feed-wrap lpb-btn${showFeed ? ' lpb-btn-active' : ''}`} onClick={() => { setShowFeed(true); setShowDiscover(false); setSelectedChat(null); setShowFriendsPanel(false); setShowSettings(false); setShowChatList(false) }}>
                      <img src={feedIcon} alt="Feed" className="lpb-feed-icon" />
                    </button>
                    <button className="lpb-btn" onClick={() => { setSelectedReelm(null); setShowChatList(true); setChatListFilter('all') }}>
                      <span className="lpb-icon-wrap">
                        <img src={messagesIcon} alt="Messages" className="lpb-icon" />
                        {totalUnread > 0 && <span className="lpb-badge">{capBadge(totalUnread)}</span>}
                      </span>
                    </button>
                  </div>
                </div>
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'left', startX: e.clientX, startWidth: leftWidth } }}
                />
                <div className="panel panel-middle">
                {showChatList && !selectedChat && !selectedReelm && (
                  <div className="chat-list-empty-middle">
                    <span>Select a conversation</span>
                  </div>
                )}
                {(selectedChannel?.type === 'voice' || selectedChannel?.type === 'live') && (() => {
                  const isLive = selectedChannel.type === 'live'
                  const isInCall = voiceChannel?.channelId === selectedChannel.id
                  return (
                    <div className={`voice-panel ${isLive && isInCall ? 'live-action-layout' : ''}`}>
                      {selectedChannel?.name && (
                        <div className="channel-header-float">
                          <span className="channel-header-name">{selectedChannel.name}</span>
                        </div>
                      )}
                      {!isInCall ? (
                        <div className="voice-join-screen">
                          <div className="voice-join-icon">
                            {isLive ? (
                              <img src={channelLiveactionIcon} alt="" width="38" height="38" style={{opacity:0.7}} />
                            ) : (
                              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <p className="voice-join-title">{selectedChannel.name}</p>
                          <p className="voice-join-hint">{isLive ? 'Live Action' : 'Voice Room'}</p>
                          <button className="voice-join-btn" onClick={() => joinVoiceChannel(selectedReelm.id, selectedChannel.id, selectedChannel.name)}>
                            Join Room
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className={isLive ? "live-action-center" : "voice-call-body"}>
                            {isLive && (
                            <div className="live-screen-area">
                              {voiceParticipants.filter(p => p.isScreenSharing).length === 0 ? (
                                <div className="live-no-screen">
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                                    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                  </svg>
                                  <span>No screen shared yet</span>
                                </div>
                              ) : (
                                voiceParticipants.filter(p => p.isScreenSharing).map(p => (
                                  <div key={p.userId} className="live-screen-tile">
                                    <div className="live-screen-header">
                                      <div className="live-screen-user-avatar">
                                        {p.userPhoto ? <img src={p.userPhoto} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/> : (p.userName||'?').charAt(0)}
                                      </div>
                                      <span className="live-screen-user-name">{p.userId === uid ? 'Your screen' : p.userName}</span>
                                      {p.userId !== uid && p.screenStream && (
                                        <button
                                          className={`live-remote-ctrl-btn${isActivelyControllingPeer(p.userId) ? ' live-remote-ctrl-btn--active' : ''}`}
                                          onClick={() => requestRemoteControl(p.userId, p.userName)}
                                          title="Request remote control"
                                          disabled={remoteControlActive?.pending && String(remoteControlActive.controllerId) === String(uid)}
                                        >
                                          <img src={channelLiveactionIcon} alt="Remote control" width="14" height="14" style={{filter:'brightness(0.8)',opacity:0.85}}/>
                                          <span>{isActivelyControllingPeer(p.userId) ? 'In control' : (remoteControlActive?.pending && String(remoteControlActive.sharingUserId) === String(p.userId) ? 'Pending…' : 'Request control')}</span>
                                        </button>
                                      )}
                                      {String(p.userId) === String(uid) && remoteControlActive?.sharingUserId === uid && !remoteControlActive?.pending && (
                                        <span className="live-controlled-badge">{remoteControlActive.controllerName} is controlling</span>
                                      )}
                                    </div>
                                    <div className="live-screen-preview">
                                      {p.screenStream ? (
                                          <video
                                            key={`screen-${p.userId}`}
                                            data-screen-user={p.userId}
                                            className="live-screen-video"
                                            autoPlay playsInline muted
                                            ref={el => { if (el && p.screenStream && el.srcObject !== p.screenStream) el.srcObject = p.screenStream }}
                                            {...getScreenControlHandlers(p.userId)}
                                          />
                                      ) : (
                                        <div className="live-screen-mock">
                                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.25">
                                            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                            <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          {!isLive && (() => {
                            const isScreenSharingActive = voiceParticipants.some(p => p.isScreenSharing)
                            const isCardView = !isScreenSharingActive && voiceParticipants.length > 8
                            return (
                              <>
                                {isScreenSharingActive && (
                                  <div className={`voice-screen-area${voiceScreenFullscreen ? ' voice-screen-fullscreen' : ''}`}>
                                    {voiceParticipants.filter(p => p.isScreenSharing).map(p => (
                                      <div key={p.userId} className="voice-screen-tile">
                                        {!voiceScreenFullscreen && (
                                          <div className="voice-screen-bar">
                                            <span className="voice-screen-bar-name">{String(p.userId) === String(uid) ? 'Your screen' : p.userName}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                              {String(p.userId) !== String(uid) && p.screenStream && (
                                                <button
                                                  type="button"
                                                  className={`live-remote-ctrl-btn${isActivelyControllingPeer(p.userId) ? ' live-remote-ctrl-btn--active' : ''}`}
                                                  onClick={() => requestRemoteControl(p.userId, p.userName)}
                                                  title="Request remote control"
                                                >
                                                  <img src={channelLiveactionIcon} alt="" width="14" height="14" style={{ filter: 'brightness(0.8)', opacity: 0.85 }} />
                                                  <span>{isActivelyControllingPeer(p.userId) ? 'In control' : 'Request control'}</span>
                                                </button>
                                              )}
                                              <button type="button" className="voice-screen-bar-btn" onClick={() => setVoiceScreenFullscreen(true)} title="Fullscreen">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {p.screenStream ? (
                                          <video
                                            key={`screen-bar-${p.userId}`}
                                            data-screen-user={p.userId}
                                            className="voice-screen-video"
                                            autoPlay playsInline muted
                                            ref={el => { if (el && p.screenStream && el.srcObject !== p.screenStream) el.srcObject = p.screenStream }}
                                            onClick={voiceScreenFullscreen && !isActivelyControllingPeer(p.userId) ? () => setVoiceScreenFullscreen(false) : undefined}
                                            {...getScreenControlHandlers(p.userId)}
                                          />
                                        ) : (
                                          <div className="live-screen-mock">
                                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" opacity="0.2">
                                              <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                              <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!isScreenSharingActive && !isCardView && (
                                  <div className="voice-participants">
                                  {voiceParticipants.map(p => {
                                    const isBlockedParticipant = blocked.some(b => b.id === p.userId)
                                    return (
                                    <div
                                      key={p.userId}
                                      className={`voice-tile${(p.isMuted || isBlockedParticipant) ? ' voice-tile-muted' : ''}${p.userId === uid ? ' voice-tile-self' : ''}${speakingUsers.has(p.userId) && !p.isMuted && !isBlockedParticipant ? ' voice-tile-speaking' : ''}${isBlockedParticipant ? ' voice-tile-blocked' : ''}`}
                                      onClick={() => {
                                        if (p.isVideoOn && p.stream) { setExpandedVideoUser(p); return }
                                        if (p.userId !== uid) setVoiceTileMenuUser({ userId: p.userId, userName: p.userName, userPhoto: p.userPhoto })
                                      }}
                                    >
                                      <div className="voice-tile-media">
                                        {p.isVideoOn && p.stream ? (
                                          <video key={`vid-${p.userId}`} className="voice-tile-video" autoPlay playsInline muted={p.userId === uid}
                                            style={p.userId === uid && v('mirrorCamera', true) ? { transform: 'scaleX(-1)' } : undefined}
                                            ref={el => { if (el && p.stream && el.srcObject !== p.stream) el.srcObject = p.stream }} />
                                        ) : (
                                          <div className="voice-tile-avatar">
                                            {p.userPhoto
                                              ? <img src={p.userPhoto} alt="" />
                                              : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>
                                            }
                                          </div>
                                        )}
                                        {p.isMuted && (
                                          <div className="voice-tile-mute-badge">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <span className="voice-tile-name">{p.userId === uid ? 'You' : p.userName}</span>
                                    </div>
                                    )
                                  })}
                                  </div>
                                )}
                                {isCardView && (
                                  <div className="voice-participants voice-participants--card-mode">
                                    <div className="voice-card-stack" onClick={() => setShowVoiceParticipantsPopup(true)}>
                                      {voiceParticipants.slice(0, 5).map((p, i) => (
                                        <div key={p.userId} className="voice-card-avatar" style={{ left: i * 34 }}>
                                          {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                        </div>
                                      ))}
                                      {voiceParticipants.length > 5 && (
                                        <div className="voice-card-more" style={{ left: 5 * 34 }}>+{voiceParticipants.length - 5}</div>
                                      )}
                                    </div>
                                    {showVoiceParticipantsPopup && (
                                      <div className="voice-participants-popup-card">
                                        <div className="voice-popup-card-header">
                                          <span>{voiceParticipants.length} participants</span>
                                          <button className="voice-popup-card-close" onClick={() => setShowVoiceParticipantsPopup(false)}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                            </svg>
                                          </button>
                                        </div>
                                        <div className="voice-popup-card-grid">
                                          {voiceParticipants.map(p => {
                                            const isSpeaking = speakingUsers.has(p.userId) && !p.isMuted
                                            return (
                                              <div key={p.userId} className={`voice-popup-avatar${isSpeaking ? ' voice-popup-avatar--speaking' : ''}`}>
                                                <div className="voice-popup-avatar-img">
                                                  {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <span className="voice-popup-name">{p.userId === uid ? 'You' : p.userName}</span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {voiceTileMenuUser && (
                                  <div className="voice-tile-menu-overlay" onClick={() => setVoiceTileMenuUser(null)}>
                                    <div className="voice-tile-menu-card" onClick={e => e.stopPropagation()}>
                                      <div className="voice-tile-menu-avatar">
                                        {voiceTileMenuUser.userPhoto
                                          ? <img src={voiceTileMenuUser.userPhoto} alt="" />
                                          : <span>{(voiceTileMenuUser.userName || '?').charAt(0).toUpperCase()}</span>
                                        }
                                      </div>
                                      <span className="voice-tile-menu-name">{voiceTileMenuUser.userName}</span>
                                      <button className="voice-tile-menu-close" onClick={() => setVoiceTileMenuUser(null)}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          </div>
                          <div className={`voice-controls ${isLive ? 'live-action-controls' : ''}`}>
                            {(isLive || voiceParticipants.some(p => p.isScreenSharing)) && (
                              <div className="voice-controls-left">
                                <div className="voice-bar-participants">
                                  {voiceParticipants.map(p => {
                                    const isSpeaking = speakingUsers.has(p.userId) && !p.isMuted
                                    return (
                                      <div key={p.userId} className={`voice-bar-avatar${isSpeaking ? ' voice-bar-avatar--speaking' : ''}`} title={p.userId === uid ? 'You' : p.userName}>
                                        {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="voice-controls-actions">
                              <button className={`voice-ctrl-btn${voiceMuted ? ' voice-ctrl-on' : ''}`} onClick={voiceToggleMute} title={voiceMuted ? 'Unmute' : 'Mute'}>
                                <span className="voice-ctrl-icon">
                                  {voiceMuted ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                </span>
                                <span className="voice-ctrl-label">{voiceMuted ? 'Unmute' : 'Mute'}</span>
                              </button>
                              <button className={`voice-ctrl-btn${voiceVideoOn ? ' voice-ctrl-on' : ''}`} onClick={voiceToggleVideo} title="Camera">
                                <span className="voice-ctrl-icon">
                                  {voiceVideoOn ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                </span>
                                <span className="voice-ctrl-label">{voiceVideoOn ? 'Stop Video' : 'Video'}</span>
                              </button>
                              {(() => {
                                const canShare = !selectedChannel?.screenShareModOnly || (() => {
                                  const mem = selectedReelm?.members?.find(m => String(m.userId) === String(uid))
                                  return (mem?.roleIds || []).some(rid => selectedReelm?.roles?.find(r => r.id === rid)?.name === 'Admin')
                                })()
                                return (
                                  <button
                                    className={`voice-ctrl-btn${voiceScreenSharing ? ' voice-ctrl-on' : ''}${!canShare ? ' voice-ctrl-disabled' : ''}`}
                                    onClick={voiceToggleScreen}
                                    disabled={!canShare}
                                    title={canShare ? 'Screen Share' : 'Only admins can screen share in this channel'}
                                  >
                                    <span className="voice-ctrl-icon">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        {voiceScreenSharing && <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.8"/>}
                                      </svg>
                                    </span>
                                    <span className="voice-ctrl-label">{voiceScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                                  </button>
                                )
                              })()}
                              {!isLive && (
                                <div className="voice-ctrl-spatial-wrap">
                                  <button
                                    className={`voice-ctrl-btn voice-ctrl-btn-round${showSpatialPanel ? ' voice-ctrl-on' : ''}`}
                                    onClick={() => setShowSpatialPanel(p => !p)}
                                    title="Spatial Audio"
                                  >
                                    <span className="voice-ctrl-icon">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke="currentColor" strokeWidth="2"/>
                                      </svg>
                                    </span>
                                  </button>
                                  {showSpatialPanel && (
                                    <div className="spatial-popup">
                                      <div className="spatial-popup-header">
                                        <span className="spatial-popup-title">Spatial Audio</span>
                                        <button className="spatial-popup-close" onClick={() => setShowSpatialPanel(false)}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                          </svg>
                                        </button>
                                      </div>
                                      <SpatialRoom
                                        voicePositions={voicePositions}
                                        voiceParticipants={voiceParticipants}
                                        myUid={uid}
                                        myUser={currentUser}
                                        reelmId={voiceChannel?.reelmId}
                                        channelId={voiceChannel?.channelId}
                                        onMyMove={handleSpatialMove}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              <button className="voice-ctrl-btn voice-ctrl-btn-round voice-ctrl-leave" onClick={leaveVoiceChannel} title="Leave">
                                <span className="voice-ctrl-icon">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                </span>
                              </button>
                            </div>
                          </div>
                          {expandedVideoUser && (
                            <div className="video-expand-overlay" onClick={() => { setExpandedVideoUser(null); setBlurBg(false) }}>
                              <div className="video-expand-popup" onClick={e => e.stopPropagation()}>
                                {expandedVideoUser.userId === uid && blurBg ? (
                                  <>
                                    <video
                                      style={{ display: 'none' }}
                                      autoPlay playsInline muted
                                      ref={el => { blurHiddenVideoRef.current = el; if (el && expandedVideoUser.stream && el.srcObject !== expandedVideoUser.stream) el.srcObject = expandedVideoUser.stream }}
                                    />
                                    <canvas
                                      ref={blurCanvasRef}
                                      className="video-expand-video"
                                      width={640}
                                      height={360}
                                      style={v('mirrorCamera', true) ? { transform: 'scaleX(-1)' } : undefined}
                                    />
                                  </>
                                ) : (
                                  <video
                                    className="video-expand-video"
                                    autoPlay playsInline
                                    muted={expandedVideoUser.userId === uid}
                                    style={expandedVideoUser.userId === uid && v('mirrorCamera', true) ? { transform: 'scaleX(-1)' } : undefined}
                                    ref={el => { if (el && expandedVideoUser.stream && el.srcObject !== expandedVideoUser.stream) el.srcObject = expandedVideoUser.stream }}
                                  />
                                )}
                                <div className="video-expand-name">{expandedVideoUser.userId === uid ? 'You' : expandedVideoUser.userName}</div>
                                <button className="video-expand-close" onClick={() => { setExpandedVideoUser(null); setBlurBg(false) }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                                {expandedVideoUser.userId === uid && (
                                  <button
                                    className={`video-blur-pill${blurBg ? ' video-blur-pill--on' : ''}`}
                                    onClick={() => setBlurBg(b => !b)}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    {getT(language)('use_blur')}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })()}
                  {(() => {
                    const showBar = selectedChat || (selectedChannel && (selectedChannel.type === 'text' || selectedChannel.type === 'announcement'))
                    if (!showBar) return null
                    const isAnnouncement = !selectedChat && selectedChannel?.type === 'announcement'
                    const myMember = selectedReelm?.members?.find(m => m.userId === uid)
                    const myRoles = (selectedReelm?.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                    const canPost = selectedChat ? true : (!isAnnouncement || selectedReelm?.ownerId === uid || myRoles.some(r => /admin|moderator|founder|owner/i.test(r.name)))
                    const msgKey = selectedChat ? selectedChat.id : `${selectedReelm?.id}_${selectedChannel?.id}`
                    const msgs = messages[msgKey] || []
                    const channelTitle = selectedChat
                      ? selectedChat.name
                      : selectedChannel?.name
                    return (
                      <>
                        {channelTitle && (
                          <div className="channel-header-float">
                            {selectedChat && (
                              <div className="channel-header-avatar">
                                {selectedChat.photo
                                  ? <img src={selectedChat.photo} alt={selectedChat.name} />
                                  : (selectedChat.name || '?').charAt(0).toUpperCase()
                                }
                              </div>
                            )}
                            <span className="channel-header-name">
                              {!selectedChat && (selectedChannel?.type === 'announcement' || selectedChannel?.type === 'text') && <span className="channel-header-prefix">#</span>}
                              {channelTitle}
                              {selectedChannel?.isFlyingRoom && <span className="channel-header-flying">✦ {flyingRoomTick >= 0 && formatTimeLeft(selectedChannel.expiresAt)}</span>}
                            </span>
                          </div>
                        )}
                        <div className="msg-list" ref={msgListRef}>
                          <div className="msg-list-spacer" />
                          {(() => {
                            const isBubbleMode = !!selectedChat
                            const formatTime = (t) => (t instanceof Date ? t : new Date(t)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            const formatDateLabel = (t) => {
                              const d = t instanceof Date ? t : new Date(t)
                              const today = new Date(); today.setHours(0,0,0,0)
                              const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
                              const msgDay = new Date(d); msgDay.setHours(0,0,0,0)
                              if (msgDay.getTime() === today.getTime()) return 'Today'
                              if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'
                              return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
                            }
                            let lastDateLabel = null
                            const msgKey2 = selectedChat ? selectedChat.id : `${selectedReelm?.id}_${selectedChannel?.id}`
                            return msgs.map(msg => {
                              const msgDateLabel = formatDateLabel(msg.time)
                              const showDateSep = msgDateLabel !== lastDateLabel
                              if (showDateSep) lastDateLabel = msgDateLabel
                              const sender = (msg.sender && typeof msg.sender === 'object') ? msg.sender : { id: '', name: '?', photo: null, image: null }
                              const isOwn = sender.id === uid
                              if (msg.isSystem) return (
                                <div key={msg.id} className={`msg-system-row${msg.id === newMsgId ? ' msg-row-new' : ''}`}>
                                  <span className="msg-system-text">{msg.text}</span>
                                  <span className="msg-system-time">{formatTime(msg.time)}</span>
                                </div>
                              )
                              if (!isBubbleMode) return (
                                <React.Fragment key={msg.id}>
                                  {showDateSep && <div className="bubble-date-sep"><span>{msgDateLabel}</span></div>}
                                <div className={`msg-row${msg.id === newMsgId ? ' msg-row-new' : ''}${isMod ? ' msg-row-mod' : ''}${blocked.some(b => b.id === sender.id) ? ' msg-row-blocked' : ''}`}>
                                  <div className="msg-avatar">
                                    {(sender.photo || sender.image)
                                      ? <img src={sender.photo || sender.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                      : (sender.name || '?').charAt(0).toUpperCase()
                                    }
                                  </div>
                                  <div className="msg-body">
                                    <div className="msg-header">
                                      <span className="msg-name">{sender.name}</span>
                                      <span className="msg-time">{formatTime(msg.time)}</span>
                                      {isMod && <button className="mod-msg-delete-btn" title="Delete message" onClick={() => modDeleteMessage(msgKey2, msg.id)}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                      </button>}
                                      <div className="msg-react-ctrl">
                                        <button className="msg-react-btn msg-react-plus" title="+1" onClick={() => toggleReaction(msgKey2, msg.id, '+')}><img src={newIcon} alt="+" style={{ width: '12px', height: '12px', display: 'block', opacity: 0.65 }} /></button>
                                        <div className="msg-react-emoji-wrap">
                                          <button className="msg-react-btn" title="Tepki ekle" onClick={() => setShowMsgEmojiFor(f => f?.msgId === String(msg.id) ? null : { msgKey: msgKey2, msgId: String(msg.id) })}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>
                                          </button>
                                          {showMsgEmojiFor?.msgId === String(msg.id) && (
                                            <div className="msg-emoji-picker-wrap">
                                              <EmojiPickerReact emojiStyle={EmojiStyle.APPLE} height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={d => toggleReaction(msgKey2, msg.id, d.emoji)} />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {msg.text && <div className="msg-text">{renderMentions(msg.text, uid, selectedReelm?.members, selectedReelm?.roles)}</div>}
                                    {msg.mediaUrl && msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="" className="msg-media-img" onClick={() => setLightboxImg(msg.mediaUrl)} />}
                                    {msg.mediaUrl && msg.mediaType === 'video' && <video src={msg.mediaUrl} className="msg-media-video" controls />}
                                    {msg.fileUrl && (
                                      <a href={msg.fileUrl} download={msg.fileName} className="msg-doc-card">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        <div className="msg-doc-info"><span className="msg-doc-name">{msg.fileName}</span><span className="msg-doc-size">{msg.fileSize ? (msg.fileSize/1024<1024 ? (msg.fileSize/1024).toFixed(1)+' KB' : (msg.fileSize/1048576).toFixed(1)+' MB') : ''}</span></div>
                                      </a>
                                    )}
                                    {Object.keys(msgReactions[msgKey2]?.[String(msg.id)] || {}).length > 0 && (
                                      <div className="msg-reactions">
                                        {Object.entries(msgReactions[msgKey2]?.[String(msg.id)] || {}).map(([emoji, users]) => (
                                          <button key={emoji} className={`${emoji === '+' ? 'reaction-pill--plus' : `reaction-pill${users.includes(String(uid)) ? ' reaction-pill--mine' : ''}`}`} onClick={() => toggleReaction(msgKey2, msg.id, emoji)}>
                                            {emoji === '+' ? null : emoji} <span>{users.length}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                </React.Fragment>
                              )
                              // Bubble mode (DM or group)
                              return (
                                <div key={msg.id}>
                                  {showDateSep && <div className="bubble-date-sep"><span>{msgDateLabel}</span></div>}
                                  <div className={`bubble-row${isOwn ? ' bubble-row--own' : ' bubble-row--other'}${msg.id === newMsgId ? ' msg-row-new' : ''}`}>
                                    {!isOwn && (
                                      <div className="bubble-avatar bubble-avatar--clickable" onClick={e => sender.id && openFriendProfile({ id: sender.id, name: sender.name, photo: sender.photo || sender.image || null }, e)}>
                                        {(sender.photo || sender.image)
                                          ? <img src={sender.photo || sender.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                          : (sender.name || '?').charAt(0).toUpperCase()
                                        }
                                      </div>
                                    )}
                                    <div className="bubble-content">
                                      {!isOwn && selectedChat?.type === 'group' && <span className="bubble-sender-name">{sender.name}</span>}
                                      <div className="bubble-and-time">
                                        {msg.mediaUrl && msg.mediaType === 'image' && !msg.text && !msg.fileUrl ? (
                                          <img src={msg.mediaUrl} alt="" className="msg-media-img" onClick={() => setLightboxImg(msg.mediaUrl)} style={{ cursor: 'pointer' }} />
                                        ) : (
                                        <div className={`bubble${isOwn ? ' bubble--own' : ' bubble--other'}`}>
                                          {msg.text && <span className="bubble-text">{renderMentions(msg.text, uid, selectedReelm?.members, selectedReelm?.roles)}</span>}
                                          {msg.mediaUrl && msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="" className="msg-media-img" onClick={() => setLightboxImg(msg.mediaUrl)} />}
                                          {msg.mediaUrl && msg.mediaType === 'video' && <video src={msg.mediaUrl} className="msg-media-video" controls />}
                                          {msg.fileUrl && (
                                            <a href={msg.fileUrl} download={msg.fileName} className="msg-doc-card">
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                              <div className="msg-doc-info"><span className="msg-doc-name">{msg.fileName}</span></div>
                                            </a>
                                          )}
                                        </div>
                                        )}
                                        <div className="msg-react-ctrl">
                                          <button className="msg-react-btn msg-react-plus" title="+1" onClick={() => toggleReaction(msgKey2, msg.id, '+')}><img src={newIcon} alt="+" style={{ width: '12px', height: '12px', display: 'block', opacity: 0.65 }} /></button>
                                          <div className="msg-react-emoji-wrap">
                                            <button className="msg-react-btn" title="Tepki ekle" onClick={() => setShowMsgEmojiFor(f => f?.msgId === String(msg.id) ? null : { msgKey: msgKey2, msgId: String(msg.id) })}>
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>
                                            </button>
                                            {showMsgEmojiFor?.msgId === String(msg.id) && (
                                              <div className="msg-emoji-picker-wrap">
                                                <EmojiPickerReact emojiStyle={EmojiStyle.APPLE} height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={d => toggleReaction(msgKey2, msg.id, d.emoji)} />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="bubble-time">{formatTime(msg.time)}</span>
                                      </div>
                                      {Object.keys(msgReactions[msgKey2]?.[String(msg.id)] || {}).length > 0 && (
                                        <div className="msg-reactions msg-reactions--bubble">
                                          {Object.entries(msgReactions[msgKey2]?.[String(msg.id)] || {}).map(([emoji, users]) => (
                                            <button key={emoji} className={`reaction-pill${users.includes(String(uid)) ? ' reaction-pill--mine' : ''}`} onClick={() => toggleReaction(msgKey2, msg.id, emoji)}>
                                              {emoji} <span>{users.length}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                        {!canPost && (
                          <div className="msg-bar-locked">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            Only admins can post in this channel.
                          </div>
                        )}
                        {moderationWarning && (
                          <div className="moderation-warning">{moderationWarning}</div>
                        )}
                        {canPost && <div className="msg-bar-wrap">
                          {mentionQuery && mentionOptions.length > 0 && (
                            <div className="mention-dropdown">
                              {mentionOptions.map((opt, i) => (
                                <div
                                  key={`${opt.type}-${opt.displayName}`}
                                  className={`mention-option${i === mentionSelIdx ? ' mention-option--sel' : ''}`}
                                  onMouseEnter={() => setMentionSelIdx(i)}
                                  onMouseDown={e => { e.preventDefault(); insertMention(opt) }}
                                >
                                  {opt.type === 'user' && (
                                    <div className="mention-option-avatar">
                                      {opt.photo
                                        ? <img src={opt.photo} alt="" />
                                        : opt.displayName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  {opt.type === 'role' && (
                                    <div className="mention-option-role-dot" style={{ background: opt.color }} />
                                  )}
                                  {opt.type === 'everyone' && (
                                    <div className="mention-option-everyone">@</div>
                                  )}
                                  <div className="mention-option-text">
                                    <span className="mention-option-name"
                                      style={opt.type === 'role' ? { color: opt.color } : undefined}>
                                      @{opt.displayName}
                                    </span>
                                    {opt.type !== 'user' && <span className="mention-option-sub">{opt.sub}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="msg-bar">
                          <div className={`msg-input-wrap${pendingAttachment ? ' msg-input-wrap--has-attach' : ''}`}>
                            <input
                              className="msg-input"
                              placeholder={isAnnouncement ? 'Post an announcement...' : 'Talk...'}
                              value={messageInput}
                              onChange={e => {
                                const val = e.target.value
                                messageInputRef.current = val
                                setMessageInput(val)
                                const cursor = e.target.selectionStart
                                const before = val.slice(0, cursor)
                                const match = before.match(/@(\w*)$/)
                                if (match) { setMentionQuery({ query: match[1], triggerStart: cursor - match[0].length }); setMentionSelIdx(0) }
                                else setMentionQuery(null)
                              }}
                              onKeyDown={e => {
                                if (mentionQuery && mentionOptions.length > 0) {
                                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionSelIdx(i => Math.min(i + 1, mentionOptions.length - 1)) }
                                  else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionSelIdx(i => Math.max(i - 1, 0)) }
                                  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mentionSelIdx]); return }
                                  else if (e.key === 'Escape') { setMentionQuery(null); return }
                                }
                                if (e.key === 'Enter' && !e.shiftKey) sendMessage()
                              }}
                            />
                            {pendingAttachment && (
                              <div className="msg-attach-preview">
                                {pendingAttachment.mediaType === 'image' ? (
                                  <img className="msg-attach-thumb" src={pendingAttachment.dataUrl} alt="" />
                                ) : (
                                  <div className="msg-attach-thumb msg-attach-thumb--video">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                  </div>
                                )}
                                <button className="msg-attach-remove" onClick={() => setPendingAttachment(null)}>
                                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none">
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                            <button className="msg-send-btn" onClick={sendMessage}>
                              <img src={sendIcon} alt="Send" width="30" height="30" />
                            </button>
                          </div>
                          <div className="msg-actions">
                            <div className="msg-action-emoji-wrap">
                              <button className="msg-action-btn" title="Emoji" onClick={() => setShowInputEmoji(v => !v)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/></svg>
                              </button>
                              {showInputEmoji && (
                                <div className="input-emoji-picker-wrap">
                                  <EmojiPickerReact emojiStyle={EmojiStyle.APPLE} height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={d => {
                                    const curr = messageInputRef.current || ''
                                    const next = curr + d.emoji
                                    messageInputRef.current = next
                                    setMessageInput(next)
                                    setShowInputEmoji(false)
                                  }} />
                                </div>
                              )}
                            </div>
                            <button className="msg-action-btn" title="Birlikte Yap">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <button className="msg-action-btn" title="Medya" onClick={() => mediaInputRef.current?.click()}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                                <circle cx="8.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M3 17l5-5 3.5 4 2.5-2.5 5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button className="msg-action-btn" title="Belge" onClick={() => docInputRef.current?.click()}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                                <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <input ref={mediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => {
                              const file = e.target.files[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onload = ev => setPendingAttachment({ dataUrl: ev.target.result, mediaType: file.type.startsWith('video/') ? 'video' : 'image' })
                                reader.readAsDataURL(file)
                              }
                              e.target.value = ''
                            }} />
                            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" style={{ display: 'none' }} onChange={e => { sendAttachment(e.target.files[0], 'doc'); e.target.value = '' }} />
                            <button className="msg-action-btn" title="Sesli Mesaj">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <button className="msg-action-btn" title="Oyun">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="2" y="6" width="20" height="12" rx="6" stroke="currentColor" strokeWidth="1.8"/>
                                <path d="M6 12h4M8 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                <circle cx="15" cy="11" r="1" fill="currentColor"/>
                                <circle cx="17" cy="13" r="1" fill="currentColor"/>
                              </svg>
                            </button>
                            <div className="msg-plus-wrap">
                              <button className="msg-action-btn" onClick={() => setShowPlusMenu(v => !v)} title="Daha Fazla">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                  <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                                  <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                                </svg>
                              </button>
                              {showPlusMenu && (
                                <div className="msg-plus-menu">
                                  <button className="msg-plus-menu-item" onClick={() => setShowPlusMenu(false)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                                      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                      <line x1="9" y1="9" x2="9" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                    </svg>
                                    Anket
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          </div>
                        </div>}
                      </>
                    )
                  })()}
                </div>
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'right', startX: e.clientX, startWidth: rightWidth } }}
                />
                <div className="panel panel-right" style={{ flex: `0 0 ${rightWidth}px` }}>
                  {selectedChat ? (() => {
                    const isDM = selectedChat.type === 'dm'
                    const groupMembers = isDM ? [] : (selectedChat.members || [])
                    const sendPoke = (targetId, targetName) => {
                      socketVcSignal(targetId, { type: 'poke', senderId: uid, senderName: currentUser.name, targetUserId: targetId })
                      addNotification(`${targetName} was poked.`)
                    }
                    return (
                      <div className="rp-chat-panel">
                        {!isDM && groupMembers.length > 0 && (
                          <div className="rp-members-panel" style={{ paddingTop: 0 }}>
                            <span className="rp-members-header">Members</span>
                            <div className="rp-members-group">
                              {groupMembers.filter((m, i, a) => a.findIndex(x => x.id === m.id) === i).map(m => (
                                <div key={m.id} className="rp-member-card" onClick={e => openFriendProfile({ id: m.id, name: m.name, photo: m.photo }, e)}>
                                  <div className="rp-member-avatar-wrap">
                                    <div className="rp-member-avatar">
                                      {m.photo
                                        ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        : (m.name || '?').charAt(0).toUpperCase()
                                      }
                                    </div>
                                  </div>
                                  <div className="rp-member-info">
                                    <span className="rp-member-name">{m.id === uid ? currentUser.name : m.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="rp-chat-actions">
                          {isDM && (
                            <button
                              className="rp-chat-action-btn"
                                title="Request Remote Control"
                              onClick={() => requestRemoteControl(selectedChat.friendId, selectedChat.name)}
                            >
                              <img src={channelLiveactionIcon} alt="" width="16" height="16" style={{ filter: 'brightness(0.75) sepia(0.3)', opacity: 0.85 }} />
                                <span>Request Remote Control</span>
                            </button>
                          )}
                            <button className="rp-chat-action-btn" title="Do Together">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                              <span>Do Together</span>
                          </button>
                          <button
                            className="rp-chat-action-btn"
                              title="Nudge"
                            onClick={() => {
                              if (isDM) {
                                  sendNudge(selectedChat.friendId, selectedChat.name)
                              } else {
                                  groupMembers.filter(m => m.id !== uid).forEach(m => sendNudge(m.id, m.name))
                              }
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                              <span>Nudge</span>
                          </button>
                        </div>
                      </div>
                    )
                  })() : selectedReelm && (() => {
                    const members = selectedReelm.members || []
                    if (members.length === 0) return null
                    const STATUS_COLOR = { online: '#4ade80', idle: '#fbbf24', busy: '#f87171', invisible: '#9ca3af', offline: '#6b7280' }
                    const getMemberStatus = (m) => m.userId === uid ? profileStatus : 'offline'
                    const online = members.filter(m => getMemberStatus(m) !== 'offline' && getMemberStatus(m) !== 'invisible')
                    const offline = members.filter(m => getMemberStatus(m) === 'offline' || getMemberStatus(m) === 'invisible')
                    const roles = selectedReelm.roles || []
                    const renderMember = (m) => {
                      const memberRoles = roles.filter(r => (m.roleIds || []).includes(r.id))
                      return (
                        <div key={m.userId} className="rp-member-card" onClick={e => openFriendProfile({ id: m.userId, name: m.userName, photo: m.userPhoto }, e)}>
                          <div className="rp-member-avatar-wrap">
                            <div className="rp-member-avatar">
                              {m.userPhoto
                                ? <img src={m.userPhoto} alt={m.userName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : (m.userName || '?').charAt(0).toUpperCase()
                              }
                            </div>
                            <span className="rp-member-status-dot" style={{ background: STATUS_COLOR[getMemberStatus(m)] }} />
                          </div>
                          <div className="rp-member-info">
                            <span className="rp-member-name">{m.userId === uid ? currentUser.name : m.userName}</span>
                            {memberRoles.length > 0 && (
                              <div className="rp-member-roles">
                                {memberRoles.map(r => (
                                  <span key={r.id} className="rp-role-badge" style={{ color: r.color, borderColor: r.color + '55', background: r.color + '18' }}>{r.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="rp-members-panel">
                        <span className="rp-members-header">In this Reelm</span>
                        {online.length > 0 && (
                          <div className="rp-members-group">
                            {online.map(renderMember)}
                          </div>
                        )}
                        {online.length > 0 && offline.length > 0 && <div className="rp-members-divider" />}
                        {offline.length > 0 && (
                          <div className="rp-members-group rp-members-group-offline">
                            {offline.map(renderMember)}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : showMsgRequests ? (
              <div className="panel panel-middle discover-panel">
                <div className="discover-header">
                  <h2 className="discover-title">Message Requests</h2>
                </div>
                <div className="discover-results">
                  {msgRequests.length === 0
                    ? <p className="discover-empty">No message requests.</p>
                    : msgRequests.map(req => (
                      <div key={req.id} className="discover-result-row">
                        <div className="discover-result-avatar">
                          {req.fromPhoto
                            ? <img src={req.fromPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (req.fromName || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="discover-result-info">
                          <span className="discover-result-name">{req.fromName}{req.fromUsername ? ` (@${req.fromUsername})` : ''}</span>
                          {req.preview && <span className="discover-result-type" style={{maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{req.preview}</span>}
                        </div>
                        <div style={{display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
                          <button className="friend-add-btn" onClick={() => {
                            const updated = msgRequests.filter(r => r.id !== req.id)
                            setMsgRequests(updated)
                            saveMsgRequests(updated)
                            const convId = [uid, req.fromId].sort().join('_dm_')
                            const newChat = { id: convId, convId, name: req.fromName, friendId: req.fromId, type: 'dm', photo: req.fromPhoto || null, updatedAt: Date.now() }
                            setChats(prev => prev.some(c => c.id === convId) ? prev : [newChat, ...prev])
                            setSelectedChat(newChat); setShowMsgRequests(false)
                          }}>Accept</button>
                          <button className="friend-reject-btn" onClick={() => {
                            const updated = msgRequests.filter(r => r.id !== req.id)
                            setMsgRequests(updated)
                            saveMsgRequests(updated)
                          }}>Decline</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ) : showDiscover ? (
              <div className="panel panel-middle discover-panel">
                {(() => {
                  const q = discoverQuery.trim().toLowerCase()
                  const results = q ? [
                    ...reelms.filter(r => r.name?.toLowerCase().includes(q)).map(r => ({ ...r, _type: 'reelm' })),
                    ...chats.filter(c => c.name?.toLowerCase().includes(q)).map(c => ({ ...c, _type: 'chat' })),
                    ...discoverUsers.filter(u => u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)).map(u => ({ ...u, _type: 'user' })),
                  ] : []
                  return (
                    <>
                      <button className="discover-back-btn" onClick={() => { setShowDiscover(false); setShowFeed(true) }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <div className="discover-header">
                        <h2 className="discover-title">Discover</h2>
                        <div className="discover-search-wrap">
                          <svg className="discover-search-icon" viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <circle cx="8.5" cy="8.5" r="5.5" stroke="rgba(185,152,135,0.6)" strokeWidth="1.6"/>
                            <path d="M13 13l3.5 3.5" stroke="rgba(185,152,135,0.6)" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                          <input
                            className="discover-search-input"
                            type="text"
                            placeholder="Search reelms, people..."
                            value={discoverQuery}
                            onChange={e => setDiscoverQuery(e.target.value)}
                            autoFocus
                          />
                          {discoverQuery && (
                            <button className="discover-clear-btn" onClick={() => setDiscoverQuery('')}>
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                                <path d="M3 3l10 10M13 3L3 13" stroke="rgba(185,152,135,0.7)" strokeWidth="1.6" strokeLinecap="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="discover-results">
                        {!q && (
                          <p className="discover-empty">Start typing to search across Reelms, chats and people.</p>
                        )}
                        {q && results.length === 0 && (
                          <p className="discover-empty">No results for "{discoverQuery}"</p>
                        )}
                        {results.map((item, i) => (
                          <div key={i} className="discover-result-row" onClick={() => {
                            if (item._type === 'reelm') { handleSelectReelm(item) }
                            else if (item._type === 'chat') { setSelectedChat(item); setSelectedChannel(null); setSelectedReelm(null); setShowDiscover(false); setShowSettings(false) }
                          }}>
                            <div className="discover-result-avatar">
                              {item.image
                                ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : (item.name || item.contact || '?').charAt(0).toUpperCase()
                              }
                            </div>
                            <div className="discover-result-info">
                              <span className="discover-result-name">{item.name || item.contact}</span>
                              <span className="discover-result-type">
                                {item._type === 'reelm' ? 'Reelm' : item._type === 'chat' ? 'Chat' : 'User'}
                              </span>
                            </div>
                            {item._type === 'user' && item.id !== uid && (
                              <div onClick={e => e.stopPropagation()} style={{display:'flex', gap:6, alignItems:'center'}}>
                                {isFriend(item.id)
                                  ? <span className="friend-badge-label">Friends</span>
                                  : hasSentRequest(item.id)
                                    ? <span className="friend-badge-label friend-badge-pending">Pending</span>
                                    : <button className="friend-add-btn" onClick={() => sendFriendRequest(item)}>Add Friend</button>
                                }
                                {!isFriend(item.id) && (
                                  hasSentMsgRequest(item.id)
                                    ? <span className="friend-badge-label friend-badge-pending" style={{fontSize:'11px'}}>Requested</span>
                                    : <button className="friend-add-btn friend-msg-btn" onClick={() => sendMsgRequest(item)}>Message</button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : showFriendsPanel ? (
              <div className="panel panel-middle discover-panel">
                <button className="discover-back-btn" onClick={() => { setShowFriendsPanel(false); setShowFeed(true) }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="discover-header">
                  <h2 className="discover-title">{t('friends')}</h2>
                </div>
                <div className="discover-results">
                  {friendRequests.length > 0 && (
                    <>
                      <p className="friends-section-label">{t('friend_requests')} ({friendRequests.length})</p>
                      {friendRequests.map((r, i) => (
                        <div key={i} className="discover-result-row">
                          <div className="discover-result-avatar">
                            {r.photo
                              ? <img src={r.photo} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : (r.name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="discover-result-info">
                            <span className="discover-result-name">{r.name}</span>
                            <span className="discover-result-type">{r.username ? `@${r.username}` : t('user_label')}</span>
                          </div>
                          <div className="friend-req-actions">
                            <button className="friend-add-btn" onClick={() => acceptFriendRequest(r)}>{t('accept')}</button>
                            <button className="friend-reject-btn" onClick={() => rejectFriendRequest(r.id)}>{t('reject')}</button>
                          </div>
                        </div>
                      ))}
                      <div className="friends-section-divider" />
                    </>
                  )}
                  {friends.length === 0
                    ? <p className="discover-empty">{t('no_friends_yet')}</p>
                    : friends.map((f, i) => (
                        <div key={i} className="discover-result-row" onClick={(e) => { if (!e.defaultPrevented) openFriendProfile(f, e) }} style={{ cursor: 'pointer' }}>
                          <div className="discover-result-avatar">
                            {f.photo
                              ? <img src={f.photo} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : (f.name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="discover-result-info">
                            <span className="discover-result-name">{f.name}</span>
                            <span className="discover-result-type">{f.username ? `@${f.username}` : t('user_label')}</span>
                          </div>
                          <button className="friend-reject-btn" onClick={(e) => { e.preventDefault(); removeFriend(f.id) }}>{t('remove')}</button>
                        </div>
                      ))
                  }
                </div>
              </div>
            ) : isMod ? (
              <div className="panel panel-middle" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ModInboxPanel onClose={() => {}} />
              </div>
            ) : (
              <div className="panel panel-middle">
                {(() => {
                  const reelmsWithUpdates = reelms.filter(r => unreadCounts[r.id] > 0)
                  const totalReelmMsgs = reelmsWithUpdates.reduce((s, r) => s + (unreadCounts[r.id] || 0), 0)
                  const mostRecentReelm = [...reelms].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
                  const chatsWithUpdates = chats.filter(c => unreadCounts[c.id] > 0)
                  const totalChatMsgs = chatsWithUpdates.reduce((s, c) => s + (unreadCounts[c.id] || 0), 0)
                  return (
                <div className="welcome-grid">
                  <div
                    className="welcome-card welcome-card-rect su-drop su-drop-2"
                    style={{ cursor: mostRecentReelm ? 'pointer' : 'default' }}
                    onClick={() => { if (mostRecentReelm) handleSelectReelm(mostRecentReelm) }}
                  >
                    <div>
                      <span className="welcome-card-title" style={{ fontFamily: "'Dela Gothic One', sans-serif" }}>Your Reelms, recently</span>
                      {totalReelmMsgs > 0
                        ? <span className="welcome-card-summary">{totalReelmMsgs} message{totalReelmMsgs !== 1 ? 's' : ''} from {reelmsWithUpdates.length} reelm{reelmsWithUpdates.length !== 1 ? 's' : ''}</span>
                        : <span className="welcome-card-empty">You're all caught up.</span>
                      }
                    </div>
                    <div className="welcome-card-reelm-photos">
                      {reelmsWithUpdates.slice(0, 4).map(r => (
                        <div key={r.id} className="welcome-card-reelm-photo">
                          {r.image
                            ? <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : <span style={{ fontSize: '0.75rem' }}>{(r.name || '?').charAt(0)}</span>
                          }
                        </div>
                      ))}
                      {reelmsWithUpdates.length === 0 && <img src={feedIcon} alt="Feed" className="welcome-card-icon" />}
                    </div>
                  </div>
                  <div className="welcome-cards-row">
                    <div
                      className="welcome-card welcome-card-square su-drop su-drop-3"
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setShowChatList(true); setChatListFilter('all') }}
                    >
                      <div>
                        <span className="welcome-card-title" style={{ fontFamily: "'Dela Gothic One', sans-serif" }}>Recent chats</span>
                        {totalChatMsgs > 0
                          ? <span className="welcome-card-summary">{totalChatMsgs} message{totalChatMsgs !== 1 ? 's' : ''} from {chatsWithUpdates.length} chat{chatsWithUpdates.length !== 1 ? 's' : ''}</span>
                          : <span className="welcome-card-empty">You're all caught up.</span>
                        }
                      </div>
                      <img src={newdmIcon} alt="Messages" className="welcome-card-icon" />
                    </div>
                    <div
                      className="welcome-card welcome-card-square su-drop su-drop-4"
                      style={{ cursor: notifications.length > 0 ? 'pointer' : 'default' }}
                      onClick={() => { if (notifications.length > 0) toggleNotifPopup() }}
                    >
                      <div>
                        <span className="welcome-card-title" style={{ fontFamily: "'Dela Gothic One', sans-serif" }}>Updates</span>
                        {notifications.length > 0
                          ? <span className="welcome-card-summary">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
                          : <span className="welcome-card-empty">You're all caught up.</span>
                        }
                      </div>
                      <img src={notificationIcon} alt="Notifications" className="welcome-card-icon" />
                    </div>
                  </div>
                </div>
                  )
                })()}
                <button
                  className="welcome-discover-btn su-drop su-drop-4"
                  onClick={() => { setShowDiscover(true); setDiscoverQuery('') }}
                >
                  <img src={discoverIcon} alt="Discover" className="welcome-discover-icon" />
                </button>
              </div>
            )}
          </div>

          {showProfilePopup && (
            <ProfilePopup
              user={currentUser}
              width={365}
              onClose={() => setShowProfilePopup(false)}
              onPhotoChange={(photo) => updateUserData({ photo })}
              cover={currentUser?.cover}
              onCoverChange={(cover) => updateUserData({ cover })}
              status={profileStatus}
              onStatusChange={setProfileStatus}
              bio={profileBio}
              onBioChange={setProfileBio}
              socialLinks={profileSocialLinks}
              onSocialLinksChange={setProfileSocialLinks}
              activePlatforms={profileActivePlatforms}
              onActivePlatformsChange={val => {
                const next = typeof val === 'function' ? val(profileActivePlatforms) : val
                setProfileActivePlatforms(next)
              }}
              iconFilter={newIconThemeFilter(effectiveAccent)}
              reelms={reelms}
              uid={uid}
              spotifyConnected={spotifyConnected}
              spotifyNowPlaying={spotifyNowPlaying}
              onSpotifyConnect={connectSpotify}
              onSpotifyDisconnect={disconnectSpotify}
              activity={currentActivity}
              onActivityChange={setActivity}
            />
          )}
          {friendProfileTarget && (() => {
            const f = friendProfileTarget.friend
            const canShare = f?.allowProfileSharing !== false
            return (
              <FriendProfilePopup
                friend={f}
                anchorRect={friendProfileTarget.anchorRect}
                onClose={() => setFriendProfileTarget(null)}
                onRemove={removeFriend}
                onBlock={blockUserFn}
                nickname={nicknames[f.id] || ''}
                onNicknameChange={(nick) => saveNickname(f.id, nick)}
                canShare={canShare}
                onMessage={() => {
                  const fInFriends = friends.find(fr => fr.id === f.id) || f
                  startDM(fInFriends)
                }}
                onCreateGroup={(friend) => {
                  setShowGroupCreator('friends')
                  setGroupSelectedFriends([friend])
                  setGroupNameInput('')
                  setGroupPhotoInput(null)
                }}
                onRequestRemoteControl={(friend) => requestRemoteControl(friend.id, friend.name)}
              />
            )
          })()}
        </div>
        {showMenu && (
          <div className="menu-backdrop" onClick={() => { setShowMenu(false); setCreateReelmStep(null); setSelectedTemplateId(null) }}>
            <div className="menu-card-border" onClick={(e) => e.stopPropagation()}>
              <div className="menu-card">
                {createReelmStep === 'naming' ? (
                  <div className="create-reelm-form">
                    <button className="create-reelm-back" onClick={() => { setCreateReelmStep(null); setSelectedTemplateId(null) }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="create-reelm-title">Name your Reelm</span>
                    <input
                      className="create-reelm-input"
                      value={reelmNameInput}
                      onChange={e => setReelmNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateReelm()}
                      placeholder="My Reelm"
                      autoFocus
                      maxLength={50}
                    />
                    <button
                      className={`create-reelm-template-trigger${activeTemplate ? ' has-template' : ''}`}
                      onClick={() => setCreateReelmStep('templates')}
                    >
                      {activeTemplate
                        ? <>{activeTemplate.emoji} <strong>{activeTemplate.name}</strong> · <span style={{ opacity: 0.6 }}>Change</span></>
                        : '✦ Start from a template'}
                    </button>
                    <button
                      className="create-reelm-btn"
                      onClick={handleCreateReelm}
                      disabled={!reelmNameInput.trim()}
                    >Create</button>
                  </div>
                ) : createReelmStep === 'templates' ? (
                  <div className="create-reelm-form create-reelm-templates-form">
                    <button className="create-reelm-back" onClick={() => setCreateReelmStep('naming')}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="create-reelm-title">Choose a template</span>
                    <div className="reelm-template-grid">
                      {reelmTemplates.map(tpl => (
                        <button
                          key={tpl.id}
                          className={`reelm-template-card${selectedTemplateId === tpl.id ? ' reelm-template-card--active' : ''}`}
                          onClick={() => { setSelectedTemplateId(tpl.id); setCreateReelmStep('naming') }}
                        >
                          <div className="reelm-template-icon">{tpl.emoji}</div>
                          <div className="reelm-template-name">{tpl.name}</div>
                          <div className="reelm-template-desc">{tpl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : createReelmStep === 'joining' ? (
                  <div className="create-reelm-form">
                    <button className="create-reelm-back" onClick={() => { setCreateReelmStep(null); setJoinError('') }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="create-reelm-title">Join a Reelm</span>
                    <input
                      className="create-reelm-input"
                      value={joinCodeInput}
                      onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter' && !joining) handleJoinReelm() }}
                      placeholder="Enter reelm code"
                      maxLength={12}
                      autoFocus
                    />
                    {joinError && <p className="create-reelm-error">{joinError}</p>}
                    <button
                      className="create-reelm-btn"
                      onClick={handleJoinReelm}
                      disabled={!joinCodeInput.trim() || joining}
                    >{joining ? 'Joining…' : 'Join'}</button>
                  </div>
                ) : (
                  <>
                    <div className="menu-items-row">
                      <button 
                        className="menu-item-with-icon"
                        onClick={() => handleMenuItemClick('createReelm')}
                      >
                        <img src={feedIcon} alt="Create Reelm" className="menu-item-icon menu-item-icon-create" />
                        <span>Create a Reelm</span>
                      </button>
                      <button 
                        className="menu-item-with-icon"
                        onClick={() => handleMenuItemClick('joinReelm')}
                      >
                        <img src={readyreelmIcon} alt="Join Reelm" className="menu-item-icon menu-item-icon-join" />
                        <span>Join a Reelm</span>
                      </button>
                    </div>
                    
                    <div className="menu-divider"></div>
                    
                    <div className="menu-items-row">
                      <button 
                        className="menu-item-with-icon"
                        onClick={() => handleMenuItemClick('startChat')}
                      >
                        <img src={newdmIcon} alt="Start a chat" className="menu-item-icon menu-item-icon-newdm" />
                        <span>Start a chat</span>
                      </button>
                      <button 
                        className="menu-item-with-icon"
                        onClick={() => handleMenuItemClick('startGroupChat')}
                      >
                        <img src={newgroupIcon} alt="Start a group chat" className="menu-item-icon menu-item-icon-newgroup" />
                        <span>Start a group chat</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {showGroupCreator === 'friends' && (
          <div className="menu-backdrop" onClick={() => setShowGroupCreator(null)}>
            <div className="menu-card-border friend-selector-panel" onClick={e => e.stopPropagation()}>
              <div className="menu-card">
                <span className="friend-selector-title">Add people</span>
                <input
                  className="friend-selector-search"
                  type="text"
                  placeholder="Search friends..."
                  value={friendSelectorQuery}
                  onChange={e => setFriendSelectorQuery(e.target.value)}
                  autoFocus
                />
                <div className="friend-selector-list">
                  {friends
                    .filter(f => !friendSelectorQuery || f.name?.toLowerCase().includes(friendSelectorQuery.toLowerCase()) || f.username?.toLowerCase().includes(friendSelectorQuery.toLowerCase()))
                    .map((f, i) => {
                      const selected = groupSelectedFriends.some(s => s.id === f.id)
                      return (
                        <button key={i} className={`friend-selector-item${selected ? ' friend-selector-item--selected' : ''}`} onClick={() => {
                          setGroupSelectedFriends(prev => selected ? prev.filter(s => s.id !== f.id) : [...prev, f])
                        }}>
                          <div className="friend-selector-avatar">
                            {f.photo
                              ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : (f.name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="friend-selector-info">
                            <span className="friend-selector-name">{nicknames[f.id] || f.name}</span>
                            {f.username && <span className="friend-selector-username">@{f.username}</span>}
                          </div>
                          {selected && <span className="friend-selector-check">✓</span>}
                        </button>
                      )
                    })
                  }
                  {friends.length === 0 && <p className="friend-selector-empty">No friends yet.</p>}
                </div>
                <button
                  className="friend-selector-next-btn"
                  disabled={groupSelectedFriends.length === 0}
                  onClick={() => setShowGroupCreator('setup')}
                >Next →</button>
              </div>
            </div>
          </div>
        )}
        {showGroupCreator === 'setup' && (
          <div className="menu-backdrop" onClick={() => setShowGroupCreator(null)}>
            <div className="menu-card-border friend-selector-panel" onClick={e => e.stopPropagation()}>
              <div className="menu-card">
                <span className="friend-selector-title">New group</span>
                <div className="group-setup-photo-row">
                  <div className="group-setup-avatar" onClick={() => groupPhotoInputRef.current?.click()}>
                    {groupPhotoInput
                      ? <img src={groupPhotoInput} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : <span style={{ fontSize: 22, color: 'rgba(185,152,135,0.5)' }}>+</span>
                    }
                  </div>
                  <input
                    ref={groupPhotoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        const img = new Image()
                        img.onload = () => {
                          const MAX = 128
                          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                          const canvas = document.createElement('canvas')
                          canvas.width = Math.round(img.width * scale)
                          canvas.height = Math.round(img.height * scale)
                          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                          setGroupPhotoInput(canvas.toDataURL('image/jpeg', 0.7))
                        }
                        img.src = ev.target.result
                      }
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }}
                  />
                  <input
                    className="group-name-input"
                    placeholder={groupSelectedFriends.map(f => nicknames[f.id] || f.name).concat(['you']).join(', ')}
                    value={groupNameInput}
                    onChange={e => setGroupNameInput(e.target.value)}
                  />
                </div>
                <div className="group-setup-members">
                  {groupSelectedFriends.map(f => (
                    <span key={f.id} className="group-setup-member-chip">
                      {nicknames[f.id] || f.name}
                      <button onClick={() => setGroupSelectedFriends(prev => prev.filter(s => s.id !== f.id))}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="friend-selector-next-btn" style={{ flex: 1, background: 'none', border: '1px solid rgba(185,152,135,0.25)' }} onClick={() => setShowGroupCreator('friends')}>← Back</button>
                  <button className="friend-selector-next-btn" style={{ flex: 2 }} onClick={createGroup}>Create group</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showFriendSelector && (
          <div className="menu-backdrop" onClick={() => { setShowFriendSelector(false); setShowMenu(false) }}>
            <div className="menu-card-border friend-selector-panel" onClick={e => e.stopPropagation()}>
              <div className="menu-card">
                <span className="friend-selector-title">Start a chat</span>
                <input
                  className="friend-selector-search"
                  type="text"
                  placeholder="Search friends..."
                  value={friendSelectorQuery}
                  onChange={e => setFriendSelectorQuery(e.target.value)}
                  autoFocus
                />
                <div className="friend-selector-list">
                  {friends
                    .filter(f => !friendSelectorQuery || f.name?.toLowerCase().includes(friendSelectorQuery.toLowerCase()) || f.username?.toLowerCase().includes(friendSelectorQuery.toLowerCase()))
                    .map((f, i) => (
                      <button key={i} className="friend-selector-item" onClick={() => startDM(f)}>
                        <div className="friend-selector-avatar">
                          {f.photo
                            ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (f.name || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="friend-selector-info">
                          <span className="friend-selector-name">{nicknames[f.id] || f.name}</span>
                          {f.username && <span className="friend-selector-username">@{f.username}</span>}
                        </div>
                      </button>
                    ))
                  }
                  {friends.length === 0 && <p className="friend-selector-empty">No friends yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
        {(showFriendsPopup || showNotificationsPopup) && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 149 }} onClick={() => { setShowFriendsPopup(false); setShowNotificationsPopup(false) }} />
        )}
        {showFriendsPopup && (
          <button className="hpopup-float-icon" style={{ right: '120px' }} onClick={toggleFriendsPopup}>
            <img src={friendsIcon} alt="Friends" className="header-icon" style={{ filter: headerIconThemeFilter(effectiveAccent) }} />
          </button>
        )}
        {showNotificationsPopup && (
          <button className="hpopup-float-icon" style={{ right: '74px' }} onClick={toggleNotifPopup}>
            <img src={notificationIcon} alt="Notifications" className="header-icon" style={{ filter: headerIconThemeFilter(effectiveAccent) }} />
          </button>
        )}
        {showFriendsPopup && (
          <div className="hpopup hpopup-friends" onClick={e => e.stopPropagation()}>
            <div className="hpopup-top-row">
              <span className="hpopup-title" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontWeight: 'normal' }}>{t('friends')}</span>
              {friendRequests.length > 0 && <span className="notif-badge--inline">{friendRequests.length}</span>}
            </div>
            <div className="hpopup-content">
              {friendRequests.length > 0 && (
                <>
                  <p className="friends-section-label" style={{ padding: '0 16px', marginBottom: '4px' }}>{t('requests_label')}</p>
                  {friendRequests.map((r, i) => (
                    <div key={i} className="hpopup-row">
                      <div className="hpopup-avatar">{(r.name || '?').charAt(0).toUpperCase()}</div>
                      <span className="hpopup-name" style={{ flex: 1 }}>{r.name}</span>
                      <div className="friend-req-actions">
                        <button className="friend-add-btn friend-add-btn--compact" onClick={() => acceptFriendRequest(r)}>✓</button>
                        <button className="friend-reject-btn friend-reject-btn--compact" onClick={() => rejectFriendRequest(r.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                  {friends.length > 0 && <div className="friends-section-divider" style={{ margin: '6px 16px' }} />}
                </>
              )}
              {friends.length === 0 && friendRequests.length === 0
                ? <p className="hpopup-empty">No friends</p>
                : friends.map((f, i) => (
                    <div key={i} className="hpopup-row" onClick={(e) => openFriendProfile(f, e)} style={{ cursor: 'pointer' }}>
                      <div className="hpopup-avatar">{(f.name || '?').charAt(0).toUpperCase()}</div>
                      <span className="hpopup-name">{f.name}</span>
                    </div>
                  ))
              }
            </div>
            <div className="hpopup-footer">
              <button className="hpopup-see-all" onClick={() => { setShowFriendsPanel(true); setShowFriendsPopup(false); setShowDiscover(false); setSelectedReelm(null); setSelectedChat(null) }}>
                {t('see_all')}
              </button>
            </div>
          </div>
        )}
        {showNotificationsPopup && (
          <div className="hpopup hpopup-notifs" onClick={e => e.stopPropagation()}>
            <div className="hpopup-top-row">
              <span className="hpopup-title" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontWeight: 'normal' }}>{t('notifications')}</span>
            </div>
            <div className="hpopup-content">
              {notifications.length === 0
                ? <p className="hpopup-empty">{t('no_notifications')}</p>
                : notifications.map((n) => (
                    <div
                      key={n.id}
                      className="hpopup-row"
                      onClick={() => {
                        if (n.link?.type === 'dm') {
                          const chat = chats.find(c => c.type === 'dm' && String(c.friendId) === String(n.link.userId))
                          if (chat) { setSelectedChat(chat); setShowFeed(false) }
                        } else if (n.link?.type === 'reelm') {
                          const r = reelms.find(x => String(x.id) === String(n.link.reelmId))
                          if (r) { setSelectedReelm(r); setShowFeed(false) }
                        }
                        deleteNotification(n.id)
                        setShowNotificationsPopup(false)
                      }}
                    >
                      <span className="hpopup-name" style={{ flex: 1 }}>{n.text}</span>
                      <button className="notif-delete-btn" onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}>✕</button>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>
      {showHelpCenter && (
        <div className="hc-overlay" onClick={() => setShowHelpCenter(false)}>
          <div className="hc-modal" onClick={e => e.stopPropagation()}>
            <div className="hc-header">
              <span className="hc-title">{getT(language)('help_center')}</span>
              <button className="hc-close" onClick={() => setShowHelpCenter(false)}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {helpStatus === 'sent' ? (
              <div className="hc-sent">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>{getT(language)('feedback_sent')}</p>
              </div>
            ) : (
              <form className="hc-form" onSubmit={async e => {
                e.preventDefault()
                if (!helpForm.message.trim()) return
                setHelpStatus('sending')
                try {
                  await feedbackSend(helpForm.name, helpForm.email, helpForm.message)
                  setHelpStatus('sent')
                } catch {
                  setHelpStatus('error')
                }
              }}>
                <div className="hc-row">
                  <label className="hc-label">{getT(language)('display_name')}</label>
                  <input
                    className="hc-input"
                    type="text"
                    value={helpForm.name}
                    onChange={e => setHelpForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={getT(language)('your_name_ph')}
                  />
                </div>
                <div className="hc-row">
                  <label className="hc-label">{getT(language)('email')}</label>
                  <input
                    className="hc-input"
                    type="email"
                    value={helpForm.email}
                    onChange={e => setHelpForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={getT(language)('email_placeholder')}
                  />
                </div>
                <div className="hc-row">
                  <label className="hc-label">{getT(language)('feedback_message')}</label>
                  <textarea
                    className="hc-textarea"
                    value={helpForm.message}
                    onChange={e => setHelpForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={getT(language)('feedback_placeholder')}
                    rows={5}
                  />
                </div>
                {helpStatus === 'error' && (
                  <p className="hc-error">{getT(language)('feedback_error')}</p>
                )}
                <button
                  type="submit"
                  className="hc-submit"
                  disabled={helpStatus === 'sending' || !helpForm.message.trim()}
                >
                  {helpStatus === 'sending' ? getT(language)('loading') : getT(language)('send')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {remoteControlReq && (
        <div className="remote-ctrl-req-overlay">
          <div className="remote-ctrl-req-card" onClick={e => e.stopPropagation()}>
            <div className="remote-ctrl-req-icon">
              <img src={channelLiveactionIcon} alt="" width="24" height="24" style={{filter:'brightness(1.2) sepia(0.4)'}}/>
            </div>
            <div className="remote-ctrl-req-text">
              <span className="remote-ctrl-req-name">{remoteControlReq.requesterName}</span>
              <span className="remote-ctrl-req-desc">{t('wants_control')}</span>
            </div>
            <div className="remote-ctrl-req-actions">
              <button className="remote-ctrl-req-accept" onClick={acceptRemoteControl}>{t('allow')}</button>
              <button className="remote-ctrl-req-decline" onClick={declineRemoteControl}>{t('decline')}</button>
            </div>
          </div>
        </div>
      )}
      {flyingRoomModal && (
        <div className="flying-room-overlay" onClick={() => setFlyingRoomModal(null)}>
          <div className="flying-room-modal" onClick={e => e.stopPropagation()}>
            <div className="flying-room-header">
              <span className="flying-room-icon">✦</span>
              <span className="flying-room-title">{t('create_vapor_title')}</span>
              <button className="flying-room-close" onClick={() => setFlyingRoomModal(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <p className="flying-room-desc">{t('vapor_rooms_desc')}</p>
            <input
              className="flying-room-name-input"
              placeholder={t('room_name_ph')}
              value={flyingRoomName}
              onChange={e => setFlyingRoomName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && flyingRoomName.trim()) {
                  createFlyingRoom(flyingRoomModal.reelmId, flyingRoomModal.catId, flyingRoomName, flyingRoomDuration)
                  setFlyingRoomModal(null)
                }
                if (e.key === 'Escape') setFlyingRoomModal(null)
              }}
              autoFocus
            />
            <div className="flying-room-duration-label">{t('how_long_live')}</div>
            <div className="flying-room-durations">
              {FLYING_ROOM_DURATIONS.map(d => (
                <button
                  key={d.ms}
                  className={`flying-room-pill${flyingRoomDuration === d.ms ? ' flying-room-pill-active' : ''}`}
                  onClick={() => setFlyingRoomDuration(d.ms)}
                >{t(d.localeKey)}</button>
              ))}
            </div>
            <div className="flying-room-actions">
              <button className="flying-room-cancel" onClick={() => setFlyingRoomModal(null)}>{t('cancel')}</button>
              <button
                className="flying-room-create"
                disabled={!flyingRoomName.trim()}
                onClick={() => {
                  createFlyingRoom(flyingRoomModal.reelmId, flyingRoomModal.catId, flyingRoomName, flyingRoomDuration)
                  setFlyingRoomModal(null)
                }}
              >{t('create_room')}</button>
            </div>
          </div>
        </div>
      )}
      {channelCtxMenu && ReactDOM.createPortal(
        <div className="reelm-channel-ctx-menu" style={{ top: channelCtxMenu.y, left: channelCtxMenu.x }}
          onMouseDown={e => e.stopPropagation()}>
          <button className="reelm-channel-ctx-item" onClick={() => {
            setEditingChannelId(channelCtxMenu.chId)
            setEditingChannelName(selectedReelm.categories.flatMap(c => c.channels).find(ch => ch.id === channelCtxMenu.chId)?.name || '')
            setChannelCtxMenu(null)
          }}>{t('edit_name')}</button>
          <button className="reelm-channel-ctx-item" onClick={() => setChannelCtxMenu(null)}>{t('edit_permissions')}</button>
          {channelCtxMenu.chType === 'voice' && (() => {
            const ctxCh = selectedReelm?.categories.flatMap(c => c.channels).find(c => c.id === channelCtxMenu.chId)
            const currentCap = ctxCh?.capacity ?? 8
            return (
              <div className="reelm-channel-ctx-capacity">
                <div className="reelm-channel-ctx-capacity-label">{t('capacity')}</div>
                <div className="reelm-channel-ctx-capacity-grid">
                  {[2, 4, 8, 16].map(cap => (
                    <button
                      key={cap}
                      className={`reelm-channel-ctx-cap-btn${currentCap === cap ? ' active' : ''}`}
                      onClick={() => saveChannelCapacity(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId, cap)}
                    >{cap}</button>
                  ))}
                  <button
                    className={`reelm-channel-ctx-cap-btn reelm-channel-ctx-cap-unlimited${currentCap === 0 ? ' active' : ''}`}
                    onClick={() => saveChannelCapacity(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId, 0)}
                  >{t('unlimited')}</button>
                </div>
              </div>
            )
          })()}
          <button
            className={`reelm-channel-ctx-item reelm-channel-ctx-danger${channelCtxMenu.catChannelCount <= 1 ? ' reelm-channel-ctx-disabled' : ''}`}
            disabled={channelCtxMenu.catChannelCount <= 1}
            onClick={() => {
              if (channelCtxMenu.catChannelCount <= 1) return
              deleteChannel(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId)
              setChannelCtxMenu(null)
            }}>{t('delete_channel')}</button>
        </div>,
        document.body
      )}
      {shareTarget && (
        <ShareModal
          target={shareTarget}
          onClose={() => setShareTarget(null)}
          activeTheme={activeTheme}
        />
      )}
      {channelFullToast && (
        <div className="channel-full-toast">{getT(language)('channel_full')}</div>
      )}
      {activeNudge && (
        <div className="nudge-toast">
          <div className="nudge-toast-title">
            <span style={{ fontSize: 20 }}>👋</span> {activeNudge.name} {t('nudge_msg')}
          </div>
          <div className="nudge-toast-actions">
            <button className="nudge-toast-btn" onClick={() => {
              sendNudge(activeNudge.id, activeNudge.name);
              setActiveNudge(null);
            }}>{t('nudge_back')}</button>
            <button className="nudge-toast-btn nudge-toast-btn--primary" onClick={() => {
              setActiveNudge(null);
              const f = friends.find(fr => fr.id === activeNudge.id) || { id: activeNudge.id, name: activeNudge.name };
              startDM(f);
            }}>{t('send_message_btn')}</button>
          </div>
        </div>
      )}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
          <img src={lightboxImg} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }} />
          <a href={lightboxImg} download onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: '32px', right: '32px', display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(30,20,50,0.85)', border: '1px solid rgba(185,152,135,0.3)', borderRadius: '999px', padding: '10px 20px', color: '#b99887', fontSize: '0.82rem', fontFamily: "'Dela Gothic One', sans-serif", textDecoration: 'none', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Kaydet
          </a>
          <button onClick={() => setLightboxImg(null)} style={{ position: 'fixed', top: '24px', right: '28px', background: 'rgba(30,20,50,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}
      <ToastStack
        toasts={dashToasts}
        onDismiss={dismissDashToast}
        onNavigate={(link) => {
          if (!link) return
          if (link.type === 'dm') {
            const chat = chats.find(c => c.type === 'dm' && String(c.friendId) === String(link.userId))
            if (chat) { setSelectedChat(chat); setShowFeed(false) }
          } else if (link.type === 'reelm') {
            const r = reelms.find(x => String(x.id) === String(link.reelmId))
            if (r) { setSelectedReelm(r); setShowFeed(false) }
          }
        }}
      />
    </div>
  )
}

function SignUpScreen({ onSignUpComplete, onGoBack }) {
  const t = useT()
  const [step, setStep] = useState(1)
  const [exiting, setExiting] = useState(false)
  const [contactType] = useState('email')
  const [contact, setContact] = useState('')
  const [inputError, setInputError] = useState('')
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [name, setName] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [dateError, setDateError] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [legalModal, setLegalModal] = useState(null) // 'terms' | 'privacy' | null

  const isAtLeast14 = () => {
    if (!day || !month || !year) return false
    const birthDate = new Date(year, month - 1, day)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 14
    }
    return age >= 14
  }

  const handleGoogleSignUp = () => {
    if (isElectron) electronSignInWithGoogle()
    else webSignInWithGoogle()
  }

  const createAccount = async () => {
    if (isCreating) return

    if (!password.trim()) {
      setPasswordError('Please enter a password.')
      return
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }

    setIsCreating(true)
    setPasswordError('')

    try {
      const cred = isElectron
        ? await electronRegister(contact.trim(), password, { username: username.trim(), displayName: name.trim(), name: name.trim() })
        : await webRegister(contact.trim(), password, { username: username.trim(), displayName: name.trim(), name: name.trim() })

      const userData = {
        ...(cred.profile || {}),
        id: cred.user.uid,
        uid: cred.user.uid,
        name: name.trim(),
        displayName: name.trim(),
        username: username.trim(),
        birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        contactType,
        contact: contact.trim(),
        createdAt: cred.profile?.createdAt || new Date().toISOString(),
        updatedAt: Date.now(),
        notifyNewDevice: cred.profile?.notifyNewDevice ?? true
      }

      await userProfilePut(userData)
      try {
        await recordUserSession(parseDeviceInfo, userData.notifyNewDevice)
      } catch { /* noop */ }

      setIsCreating(false)
      onSignUpComplete()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use' || err.code === 'auth/email-taken') {
        setPasswordError('This e-mail is already in use.')
      } else if (err.code === 'auth/username-taken') {
        setPasswordError('This username is already taken. Please go back and choose another username.')
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('Password must be at least 8 characters long.')
      } else if (err.code === 'auth/invalid-email') {
        setPasswordError('Please enter a valid e-mail address.')
      } else if (err.code === 'auth/invalid-username') {
        setPasswordError('Username must be 3-30 characters and use letters, numbers, dots, dashes or underscores.')
      } else {
        setPasswordError('Account creation failed. Please try again.')
      }
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    if (step === 1) { onGoBack?.(); return }
    setExiting(true)
    setTimeout(() => { setStep(s => s - 1); setExiting(false) }, 360)
  }

  const handleContinue = async () => {
    if (isChecking || exiting) return
    if (step <= 3) {
      if (step === 1) {
        if (!name.trim()) { setInputError('Please enter your name.'); return }
        if (!day || !month || !year) { setDateError('Please select your complete date of birth.'); return }
        if (!isAtLeast14()) { setDateError('You must be at least 14 years old to create an account.'); return }
      }
      if (step === 2) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) {
          setInputError('Please enter a valid e-mail address.')
          return
        }
        setIsChecking(true)
        try {
          const result = await userCheckEmail(contact.trim())
          if (result?.exists || result === false) { setInputError('This e-mail is already in use.'); setIsChecking(false); return }
        } catch { /* sunucuya ulaşılamazsa devam et */ }
        setIsChecking(false)
      }
      if (step === 3) {
        if (!username.trim()) { setUsernameError('Please choose a username.'); return }
        if (username.length < 3) { setUsernameError('Username must be at least 3 characters long.'); return }
        if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
          setUsernameError('Username can only contain letters, numbers, dashes, and underscores.')
          return
        }
        setIsChecking(true)
        try {
          const result = await userCheckUsername(username.trim())
          if (result?.exists || result === false) { setUsernameError('This username is already taken.'); setIsChecking(false); return }
        } catch { /* sunucuya ulaşılamazsa devam et */ }
        setIsChecking(false)
      }
      setInputError('')
      setDateError('')
      setUsernameError('')
      setExiting(true)
      setTimeout(() => { setStep(s => s + 1); setExiting(false) }, 360)
    }
  }

  return (
    <div className='main-content'>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }} className='su-drop su-drop-1'>
        <button
          onClick={handleBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,152,135,0.7)', padding: '4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className='welcome-text' style={{ margin: 0 }}>Let's create your account.</h1>
      </div>
      <div className='signin-card-border su-drop su-drop-2'>
        <div className='signin-card'>
          {step === 1 && (
            <>
              <input
                type='text'
                className={`pill-input${exiting ? ' su-erase' : ''}`}
                placeholder='Your name'
                value={name}
                onChange={e => { setName(e.target.value); setInputError('') }}
                autoFocus
              />
              {inputError && (
                <p className='su-fadein input-error' style={{ animationDelay: '40ms' }}>{inputError}</p>
              )}
              <p className={`signup-hint su-fadein${exiting ? ' su-erase' : ''}`} style={{ animationDelay: '80ms', marginTop: '16px' }}>
                When's your birthday?
              </p>
              <DatePicker
                day={day}
                month={month}
                year={year}
                onDayChange={(d) => { setDay(d); setDateError('') }}
                onMonthChange={(m) => { setMonth(m); setDateError('') }}
                onYearChange={(y) => { setYear(y); setDateError('') }}
                error={dateError}
              />
            </>
          )}
          {step === 2 && (
            <>
              <input
                type='email'
                className={`pill-input su-fadein${exiting ? ' su-erase' : ''}`}
                placeholder='E-mail'
                value={contact}
                onChange={e => { setContact(e.target.value); setInputError('') }}
                autoFocus
              />
              {inputError && (
                <p className='su-fadein input-error'>{inputError}</p>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <input
                type='text'
                className={`pill-input su-fadein${exiting ? ' su-erase' : ''}`}
                placeholder='Choose a username'
                value={username}
                onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                autoFocus
              />
              {usernameError && (
                <p className='su-fadein input-error' style={{ animationDelay: '40ms' }}>{usernameError}</p>
              )}
              <p className={`signup-hint su-fadein${exiting ? ' su-erase' : ''}`} style={{ animationDelay: '80ms', marginTop: '12px' }}>
                3+ characters, letters, numbers, dashes, underscores only.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <div className='password-input-wrapper su-fadein'>
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  className='pill-input'
                  placeholder='Password'
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                  autoFocus
                  disabled={isCreating}
                />
                <button
                  className='eye-btn'
                  type='button'
                  onClick={() => setShowSignUpPassword(v => !v)}
                  tabIndex={-1}
                  disabled={isCreating}
                >
                  <EyeIcon open={showSignUpPassword} />
                </button>
              </div>
              {passwordError && (
                <p className='su-fadein input-error' style={{ animationDelay: '40ms' }}>{passwordError}</p>
              )}
              <p className='signup-hint su-fadein' style={{ animationDelay: '80ms' }}>
                Choose a strong password.
              </p>
            </>
          )}
          {step === 4 && (
            <p style={{ fontSize: '0.72rem', color: 'rgba(var(--ta-rgb), 0.45)', textAlign: 'center', margin: '12px 0 8px', lineHeight: 1.5 }}>
              {t('legal_consent_1')}
              <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(var(--ta-rgb), 0.7)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>{t('terms_of_service')}</button>
              {t('legal_consent_2')}
              <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(var(--ta-rgb), 0.7)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>{t('privacy_policy')}</button>
              {t('legal_consent_3')}
            </p>
          )}
          <button
            className='pill-btn-text'
            onClick={step === 4 ? createAccount : handleContinue}
            style={{ paddingTop: '4px', marginTop: step === 1 ? '24px' : '0', display: 'grid', placeItems: 'center' }}
            disabled={isCreating || isChecking}
          >
            {step === 4 ? (
              <>
                <span style={{ opacity: isCreating ? 0 : 1, gridArea: '1/1' }}>Create Account</span>
                {isCreating && (
                  <div style={{
                    gridArea: '1/1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={reelmsLogo}
                      alt="Creating account"
                      style={{
                        height: '20px',
                        animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
      <div className='social-login' style={{ marginTop: '28px' }}>
        <button className='social-btn social-btn-wide' onClick={handleGoogleSignUp} disabled={isCreating}><GoogleIcon /><span>Continue with Google</span></button>
      </div>
      <LegacyAuthDownloadCta compact />

      {legalModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={() => setLegalModal(null)}>
          <div style={{ background: 'var(--panel-bg, #1a1a2e)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '90%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                {legalModal === 'terms' ? t('terms_of_service') : t('privacy_policy')}
              </span>
              <button onClick={() => setLegalModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(var(--ta-rgb),0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', color: 'rgba(var(--ta-rgb),0.7)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              {legalModal === 'terms' ? (
                <>
                  <p>{t('last_updated')}</p>
                  <p>{t('terms_intro')}</p>
                  <p><strong>{t('terms_s1_title')}</strong><br />{t('terms_s1_body')}</p>
                  <p><strong>{t('terms_s2_title')}</strong><br />{t('terms_s2_body')}</p>
                  <p><strong>{t('terms_s3_title')}</strong><br />{t('terms_s3_body')}</p>
                  <p><strong>{t('terms_s4_title')}</strong><br />{t('terms_s4_body')}</p>
                  <p>{t('legal_contact')}</p>
                </>
              ) : (
                <>
                  <p>{t('last_updated')}</p>
                  <p>{t('privacy_intro')}</p>
                  <p><strong>{t('privacy_s1_title')}</strong><br />{t('privacy_s1_body')}</p>
                  <p><strong>{t('privacy_s2_title')}</strong><br />{t('privacy_s2_body')}</p>
                  <p><strong>{t('privacy_s3_title')}</strong><br />{t('privacy_s3_body')}</p>
                  <p><strong>{t('privacy_s4_title')}</strong><br />{t('privacy_s4_body')}</p>
                  <p><strong>{t('privacy_s5_title')}</strong><br />{t('privacy_s5_body')}</p>
                  <p>{t('legal_contact')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseDeviceInfo(ua) {
  let os = 'Unknown OS'
  if (/Windows NT 10|Windows NT 11/.test(ua)) os = 'Windows 10/11'
  else if (/Windows NT 6/.test(ua)) os = 'Windows'
  else if (/iPhone/.test(ua)) os = 'iPhone'
  else if (/iPad/.test(ua)) os = 'iPad'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  let browser = 'Unknown Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\//.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  return `${os} · ${browser}`
}

const BACKEND_URL = getApiBaseUrl()

const REPORT_REASONS = [
  'Spam',
  'Harassment or hate speech',
  'Inappropriate content',
  'Misinformation',
  'Violence or threats',
  'Other',
]
function _reelmKey(reelmId) {
  return reelmId || 'global'
}
function getArticles(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.articles ?? []
}
function saveArticle(article, reelmId) {
  const id = _reelmKey(reelmId)
  const arts = [article, ...getArticles(id)]
  patchReelmCache(id, { articles: arts })
  scheduleReelmPersist(id, 'articles', arts)
}
function updateArticle(articleId, updates, reelmId) {
  const id = _reelmKey(reelmId)
  const arts = getArticles(id).map(a => a.id === articleId ? { ...a, ...updates } : a)
  patchReelmCache(id, { articles: arts })
  scheduleReelmPersist(id, 'articles', arts)
}
function deleteArticle(articleId, reelmId) {
  const id = _reelmKey(reelmId)
  const arts = getArticles(id).filter(a => a.id !== articleId)
  patchReelmCache(id, { articles: arts })
  scheduleReelmPersist(id, 'articles', arts)
}
function getArticleDrafts(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.article_drafts ?? []
}
function saveArticleDraft(draft, reelmId) {
  const id = _reelmKey(reelmId)
  const drafts = [draft, ...getArticleDrafts(id).filter(d => d.id !== draft.id)]
  patchReelmCache(id, { article_drafts: drafts })
  scheduleReelmPersist(id, 'article_drafts', drafts)
}
function deleteArticleDraft(draftId, reelmId) {
  const id = _reelmKey(reelmId)
  const drafts = getArticleDrafts(id).filter(d => d.id !== draftId)
  patchReelmCache(id, { article_drafts: drafts })
  scheduleReelmPersist(id, 'article_drafts', drafts)
}
function getThreads(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.threads ?? []
}
function saveThread(thread, reelmId) {
  const id = _reelmKey(reelmId)
  const t = [thread, ...getThreads(id)]
  patchReelmCache(id, { threads: t })
  scheduleReelmPersist(id, 'threads', t)
}
function updateThread(threadId, updates, reelmId) {
  const id = _reelmKey(reelmId)
  const t = getThreads(id).map(x => x.id === threadId ? { ...x, ...updates } : x)
  patchReelmCache(id, { threads: t })
  scheduleReelmPersist(id, 'threads', t)
}
// eslint-disable-next-line no-unused-vars
function deleteThread(threadId, reelmId) {
  const id = _reelmKey(reelmId)
  const t = getThreads(id).filter(x => x.id !== threadId)
  patchReelmCache(id, { threads: t })
  scheduleReelmPersist(id, 'threads', t)
}
function getNews(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.news ?? []
}
function saveNews(item, reelmId) {
  const id = _reelmKey(reelmId)
  const n = [item, ...getNews(id)]
  patchReelmCache(id, { news: n })
  scheduleReelmPersist(id, 'news', n)
}
function updateNews(newsId, updates, reelmId) {
  const id = _reelmKey(reelmId)
  const n = getNews(id).map(x => x.id === newsId ? { ...x, ...updates } : x)
  patchReelmCache(id, { news: n })
  scheduleReelmPersist(id, 'news', n)
}
function deleteNews(newsId, reelmId) {
  const id = _reelmKey(reelmId)
  const n = getNews(id).filter(x => x.id !== newsId)
  patchReelmCache(id, { news: n })
  scheduleReelmPersist(id, 'news', n)
}
function timeAgo(ts) {
  const d = (Date.now() - new Date(ts)) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function articleReadTime(html) {
  const text = (html || '').replace(/<[^>]*>/g, ' ').trim()
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(words / 200) || 1
}

function DeepLinkRedirect({ type }) {
  const params = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const value = params.code || params.username || params.channelId || params.postId
    sessionStorage.setItem('reelms_pending_deeplink', JSON.stringify({ type, value }))
    const loggedIn = isElectron ? !!getElectronCurrentUser() : !!getWebCurrentUser()
    navigate(loggedIn ? '/dashboard' : '/signin', { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

// ─── Toast notification system ────────────────────────────────────────────────

function ToastPill({ toast, onDismiss, onNavigate }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (toast.persistent) return
    const t1 = setTimeout(() => setExiting(true), 4550)
    const t2 = setTimeout(() => onDismiss(), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id])

  const handleClick = () => {
    if (toast.action) { toast.action.fn(); onDismiss(); return }
    if (toast.link && onNavigate) onNavigate(toast.link)
    onDismiss()
  }

  return (
    <div
      className={`toast-pill toast-pill--clickable${exiting ? ' toast-pill--exiting' : ''}`}
      onClick={handleClick}
      role="button"
    >
      <span className="toast-pill-text">{toast.text}</span>
      {toast.action && (
        <button className="toast-pill-action" onClick={e => { e.stopPropagation(); toast.action.fn(); onDismiss() }}>
          {toast.action.label}
        </button>
      )}
      <button
        className="toast-pill-dismiss"
        onClick={e => { e.stopPropagation(); onDismiss() }}
        aria-label="Dismiss"
      >✕</button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss, onNavigate }) {
  const MAX = 8
  const visible = toasts.slice(0, MAX)
  const overflow = toasts.length - MAX
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {overflow > 0 && (
        <div className="toast-deck-extra">+{overflow} more</div>
      )}
      {visible.map(t => (
        <ToastPill key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function App() {
  const authSession = useCentralAuthSession()
  const [visible, setVisible] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    authSession.isAuthenticated || (isElectron ? !!getElectronCurrentUser() : !!getWebCurrentUser())
  )
  const [isShaking, setIsShaking] = useState(false)
  const [appToasts, setAppToasts] = useState([])
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const pushAppToast = useCallback(({ id, text, link = null, action = null, persistent = false }) => {
    const toastId = id || `at_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setAppToasts(prev => [{ id: toastId, text, link, action, persistent }, ...prev].slice(0, 8))
  }, [])

  const dismissAppToast = useCallback((id) => {
    setAppToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Version update check — runs at app start regardless of login state
  useEffect(() => {
    if (window.electronAPI) return
    let baseVersion = null
    let toastShown = false
    const check = async () => {
      try {
        const res = await fetch('/version.json?_=' + Date.now())
        if (!res.ok) return
        const data = await res.json()
        if (baseVersion === null) { baseVersion = data.v; return }
        if (data.v !== baseVersion && !toastShown) {
          toastShown = true
          setUpdateAvailable(true)
          pushAppToast({
            id: 'app-update',
            text: 'A new update is available',
            persistent: true,
            action: { label: 'Reload', fn: () => window.location.reload() },
          })
        }
      } catch { /* noop */ }
    }
    check()
    const id = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [pushAppToast])

  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem('reelms_lang')
    const defaultLanguage = 'en'

    if (!storedLanguage) {
      localStorage.setItem('reelms_lang', defaultLanguage)
      return defaultLanguage
    }

    return storedLanguage
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (authSession.status === 'authenticated') setIsLoggedIn(true)
    if (authSession.status === 'guest') setIsLoggedIn(false)
  }, [authSession.status])

  const updateLanguage = (code) => {
    setLanguage(code)
    localStorage.setItem('reelms_lang', code)
  }

  const t = getT(language)

  useEffect(() => {
    seedModerationAccount()
    return isElectron
      ? electronOnAuthStateChanged((u) => setIsLoggedIn(!!u))
      : webOnAuthStateChanged((u) => setIsLoggedIn(!!u))
  }, [])

  const navigateTo = (path) => {
    setVisible(false)
    setTimeout(() => {
      navigate(path)
      setVisible(true)
    }, 320)
  }

  const handleSignUpComplete = () => {
    authSession.refreshSession?.()
    setIsLoggedIn(true)
    navigate('/dashboard')
  }

  const handleSignInSuccess = () => {
    authSession.refreshSession?.()
    setIsLoggedIn(true)
    navigate('/dashboard')
  }

  const handleLogOut = async () => {
    await authSession.signOut()
    setIsLoggedIn(false)
    navigateTo('/signin')
  }

  return (
    <div className={`app ${isShaking ? 'app-shake-active' : ''}`}>
      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0); opacity: 0; }
          80%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dropIn {
          0%   { transform: scale(0.72); opacity: 0; filter: blur(2px); }
          65%  { transform: scale(1.04); opacity: 1; filter: blur(0px); }
          100% { transform: scale(1);    opacity: 1; filter: blur(0px); }
        }
        .su-drop {
          animation: dropIn 0.55s cubic-bezier(0.34, 1.38, 0.64, 1) both;
        }
        .su-drop-1 { animation-delay: 0ms; }
        .su-drop-2 { animation-delay: 95ms; }
        .su-drop-3 { animation-delay: 180ms; }
        .su-drop-4 { animation-delay: 260ms; }
        @keyframes eraseOut {
          0%   { opacity: 1; filter: blur(0px); transform: scale(1); }
          35%  { opacity: 0.5; filter: blur(3px); }
          100% { opacity: 0; filter: blur(9px); transform: scale(0.94); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .su-erase { animation: eraseOut 0.36s ease forwards; pointer-events: none; }
        .su-fadein { animation: fadeIn 0.38s ease both; }
        .signup-hint { margin: 0; font-size: 0.8rem; color: rgba(185, 152, 135, 0.55); text-align: center; line-height: 1.4; }
        .toggle-contact { font-size: 0.8rem; color: rgba(185, 152, 135, 0.55); text-align: center; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .toggle-contact:hover { color: #b99887; }
        .input-error { margin: 0; font-size: 0.78rem; color: rgba(220, 90, 70, 0.9); text-align: center; }
        
        .date-picker-container {
          animation: fadeIn 0.38s ease both;
          animation-delay: 120ms;
        }
        .date-inputs-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          margin-bottom: 8px;
        }
        .date-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid rgba(185, 152, 135, 0.2);
          border-radius: 18px;
          background-color: rgba(255, 255, 255, 0.05);
          color: #2d1f18;
          font-size: 0.9rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }
        .date-input:hover {
          border-color: rgba(185, 152, 135, 0.35);
          background-color: rgba(255, 255, 255, 0.08);
        }
        .date-input:focus {
          border-color: #b99887;
          background-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 3px rgba(185, 152, 135, 0.1);
        }
        .date-input option {
          background-color: #fff;
          color: #2d1f18;
          padding: 8px;
        }

      `}</style>
      <LanguageContext.Provider value={t}>
      <Routes>
        <Route path="/dashboard" element={isLoggedIn ? <DashboardScreen onLogOut={handleLogOut} onShake={setIsShaking} language={language} onLanguageChange={updateLanguage} updateAvailable={updateAvailable} pushToast={pushAppToast} /> : <Navigate to="/signin" replace />} />
        <Route path="/signin" element={
          isLoggedIn ? <Navigate to="/dashboard" replace /> : (
            <>
              <div className="auth-shapes" aria-hidden="true">
                <div className="auth-shape auth-shape-1" />
                <div className="auth-shape auth-shape-2" />
                <div className="auth-shape auth-shape-3" />
                <div className="auth-shape auth-shape-4" />
                <div className="auth-shape auth-shape-5" />
              </div>
              <header className="app-header">
                <div className="logo-area">
                  <img src={reelmsLogo} alt="Reelms Logo" className="logo" />
                  <span className="app-name">Reelms</span>
                </div>
              </header>
              <main className="app-main">
                <div style={{ width: '100%', maxWidth: '420px', opacity: visible ? 1 : 0, transition: 'opacity 0.32s ease' }}>
                  <SignInScreen onGoSignUp={() => navigateTo('/signup')} onSignInSuccess={handleSignInSuccess} />
                </div>
              </main>
              <div style={{ position: 'absolute', bottom: '30px', right: '30px', opacity: 0.5, fontSize: '12px', pointerEvents: 'none' }}>
                Reelm, LLC
              </div>
            </>
          )
        } />
        <Route path="/signup" element={
          isLoggedIn ? <Navigate to="/dashboard" replace /> : (
            <>
              <div className="auth-shapes" aria-hidden="true">
                <div className="auth-shape auth-shape-1" />
                <div className="auth-shape auth-shape-2" />
                <div className="auth-shape auth-shape-3" />
                <div className="auth-shape auth-shape-4" />
                <div className="auth-shape auth-shape-5" />
              </div>
              <header className="app-header">
                <div className="logo-area">
                  <img src={reelmsLogo} alt="Reelms Logo" className="logo" />
                  <span className="app-name">Reelms</span>
                </div>
              </header>
              <main className="app-main">
                <div style={{ width: '100%', maxWidth: '420px', opacity: visible ? 1 : 0, transition: 'opacity 0.32s ease' }}>
                  <SignUpScreen onSignUpComplete={handleSignUpComplete} onGoBack={() => navigateTo('/signin')} />
                </div>
              </main>
              <div style={{ position: 'absolute', bottom: '30px', right: '30px', opacity: 0.5, fontSize: '12px', pointerEvents: 'none' }}>
                Reelm, LLC
              </div>
            </>
          )
        } />
        <Route path="/r/:code" element={<DeepLinkRedirect type="reelm" />} />
        <Route path="/u/:username" element={<DeepLinkRedirect type="user" />} />
        <Route path="/c/:channelId" element={<DeepLinkRedirect type="channel" />} />
        <Route path="/p/:postId" element={<DeepLinkRedirect type="post" />} />
        <Route path="*" element={<Navigate to={isLoggedIn ? '/dashboard' : '/signin'} replace />} />
      </Routes>
      </LanguageContext.Provider>
      {appToasts.length > 0 && (
        <ToastStack toasts={appToasts} onDismiss={dismissAppToast} onNavigate={null} />
      )}
    </div>
  )
}
// ─── Share helpers ───────────────────────────────────────────────────────────

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateShareUrl(type, data) {
  switch (type) {
    case 'reelm':   return `https://reelms.io/r/${data.code}`
    case 'user':    return `https://reelms.io/u/${data.username}`
    case 'post':    return `https://reelms.io/p/${generateRandomString(26)}`
    case 'article': return `https://reelms.io/p/article/${generateRandomString(14)}`
    case 'topic':   return `https://reelms.io/p/topic/${generateRandomString(14)}`
    case 'news':    return `https://reelms.io/p/news/${generateRandomString(14)}`
    case 'group':   return `https://reelms.io/r/${generateRandomString(6)}`
    default:        return `https://reelms.io/p/${generateRandomString(26)}`
  }
}

function getShareLabel(type) {
  switch (type) {
    case 'reelm':
    case 'group':   return 'YOU ARE INVITED TO'
    case 'post':    return 'POST'
    case 'user':    return 'PROFILE'
    case 'article': return 'ARTICLE'
    case 'news':    return 'NEWS'
    case 'topic':   return 'FORUM TOPIC'
    default:        return 'POST'
  }
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y)
      line = words[n] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, y)
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

function ShareModal({ target, onClose, activeTheme }) {
  const [selectedThemeId, setSelectedThemeId] = useState(activeTheme.id)
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => generateShareUrl(target.type, target.data || {}), [target])
  const canvasRef = useRef(null)

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const theme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0]
    const W = 390, H = 650
    canvas.width = W * 2
    canvas.height = H * 2
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)

    // 1. Background
    ctx.fillStyle = theme.base
    ctx.fillRect(0, 0, W, H)

    // 2. Radial gradient overlay
    const grad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, W * 0.75)
    grad.addColorStop(0, theme.accent + '18')
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // 3. Logo (tinted with accent)
    try {
      await new Promise((resolve) => {
        const logoImg = new Image()
        logoImg.onload = () => {
          // Draw on temp canvas to tint
          const tmp = document.createElement('canvas')
          tmp.width = 26
          tmp.height = 26
          const tc = tmp.getContext('2d')
          tc.drawImage(logoImg, 0, 0, 26, 26)
          tc.globalCompositeOperation = 'source-atop'
          tc.fillStyle = theme.accent
          tc.fillRect(0, 0, 26, 26)
          ctx.drawImage(tmp, W / 2 - 52, 44, 26, 26)
          resolve()
        }
        logoImg.onerror = resolve
        logoImg.src = reelmsLogo
      })
    } catch { /* noop */ }

    // 4. "Reelms" text
    ctx.font = 'bold 17px "Dela Gothic One", serif'
    ctx.fillStyle = theme.accent
    ctx.textAlign = 'left'
    ctx.fillText('Reelms', W / 2 - 22, 65)

    // 5. Label
    const labelText = getShareLabel(target.type).split('').join('  ')
    ctx.font = '500 10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textAlign = 'center'
    ctx.fillText(labelText, W / 2, 105)

    // 6. Image area
    const imgX = (W - 265) / 2
    const imgY = 120
    const imgW = 265
    const imgH = 265
    const imgR = 28
    ctx.save()
    drawRoundRect(ctx, imgX, imgY, imgW, imgH, imgR)
    ctx.clip()
    if (target.image) {
      try {
        await new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            // Cover sizing
            const scale = Math.max(imgW / img.width, imgH / img.height)
            const sw = img.width * scale
            const sh = img.height * scale
            const sx = imgX + (imgW - sw) / 2
            const sy = imgY + (imgH - sh) / 2
            ctx.drawImage(img, sx, sy, sw, sh)
            resolve()
          }
          img.onerror = resolve
          img.src = target.image
        })
      } catch { /* noop */ }
    } else {
      ctx.fillStyle = theme.accent + '18'
      ctx.fillRect(imgX, imgY, imgW, imgH)
      // Faint icon placeholder
      ctx.strokeStyle = theme.accent + '40'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(imgX + imgW / 2, imgY + imgH / 2, 30, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()

    // 7. Title
    ctx.font = 'bold 20px "Dela Gothic One", serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    wrapCanvasText(ctx, target.title || '', W / 2, 435, W - 60, 26)

    // 8. Subtitle
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.58)'
    ctx.textAlign = 'center'
    ctx.fillText(target.subtitle || '', W / 2, 470)

    // 9. Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(24, 610)
    ctx.lineTo(366, 610)
    ctx.stroke()

    // 10. URL
    ctx.font = '12px "Courier New", monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.textAlign = 'center'
    ctx.fillText(shareUrl, W / 2, 634)
  }, [selectedThemeId, target, shareUrl])

  useEffect(() => { drawCard() }, [drawCard])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'reelms-share.png'
    a.click()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="menu-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <span className="share-modal-title">Share</span>
          <button className="share-modal-close" onClick={onClose}>✕</button>
        </div>
        <canvas ref={canvasRef} className="share-canvas" />
        <div className="share-theme-row">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`share-theme-dot${selectedThemeId === t.id ? ' share-theme-dot--active' : ''}`}
              style={{ background: t.accent }}
              title={t.name}
              onClick={() => setSelectedThemeId(t.id)}
            />
          ))}
        </div>
        <div className="share-actions">
          <button className="share-copy-btn" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
          <button className="share-download-btn" onClick={handleDownload}>
            Download image
          </button>
        </div>
      </div>
    </div>
  )
}

export default App