import { useEffect, useState } from 'react'
import { AuthShell } from './AuthShell.jsx'
import { SignInForm } from './SignInForm.jsx'
import { SignUpForm } from './SignUpForm.jsx'
import { ResetPasswordForm } from './ResetPasswordForm.jsx'
import { verifyEmailToken } from '../services/authService'
import './auth.css'

function normalizeMode(mode) {
  return mode === 'signup' ? 'signup' : 'signin'
}

export function AuthScreen({ initialMode = 'signin', onAuthenticated }) {
  const [mode, setMode] = useState(() => normalizeMode(initialMode))
  const [resetToken, setResetToken] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusKind, setStatusKind] = useState('success')

  useEffect(() => {
    setMode(normalizeMode(initialMode))
  }, [initialMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('reset_password_token')
    const verifyToken = params.get('verify_email_token')
    const verified = params.get('email_verified')
    if (token) {
      setResetToken(token)
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      return
    }
    if (verifyToken) {
      setStatusMessage('Verifying your e-mail…')
      setStatusKind('success')
      verifyEmailToken(verifyToken).then(() => {
        setStatusMessage('E-mail verified. You can sign in now.')
        setStatusKind('success')
      }).catch(() => {
        setStatusMessage('This verification link is invalid or expired. Sign in to request a fresh one.')
        setStatusKind('error')
      }).finally(() => {
        window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      })
      return
    }
    if (verified === 'success') {
      setStatusMessage('E-mail verified. You can sign in now.')
      setStatusKind('success')
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    }
  }, [])

  const isSignUp = mode === 'signup'
  const isReset = Boolean(resetToken)

  return (
    <AuthShell
      mode={isReset ? 'signin' : mode}
      title={isReset ? 'Reset your password' : isSignUp ? 'Create your Reelms account' : 'Welcome back'}
      subtitle={
        isReset
          ? 'Set a new password, then sign in with your account.'
          : isSignUp
            ? 'Reserve your identity and enter the web beta with the same account you will use on desktop later.'
            : 'Sign in to continue to your realms, channels, friends and realtime spaces.'
      }
    >
      {statusMessage ? <p className={statusKind === 'error' ? 'auth-form-error' : 'auth-form-success'} role="status">{statusMessage}</p> : null}

      {isReset ? (
        <ResetPasswordForm token={resetToken} onDone={() => setResetToken('')} />
      ) : (
        <>
          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignUp}
              className={!isSignUp ? 'is-active' : ''}
              onClick={() => setMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignUp}
              className={isSignUp ? 'is-active' : ''}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </div>

          {isSignUp ? (
            <SignUpForm onSuccess={onAuthenticated} onGoSignIn={() => setMode('signin')} />
          ) : (
            <SignInForm onSuccess={onAuthenticated} onGoSignUp={() => setMode('signup')} />
          )}
        </>
      )}
    </AuthShell>
  )
}
