import { useState } from 'react'
import { FormField } from '../../../shared/forms/FormField.jsx'
import { validateRequired } from '../../../shared/lib/validation'
import { AuthProviderButtons } from './AuthProviderButtons.jsx'
import { requestPasswordReset, signInWithPassword, signInWithGoogleProvider } from '../services/authService'

export function SignInForm({ onSuccess, onGoSignUp }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const identifierCheck = validateRequired(identifier, 'Email or username')
    const passwordCheck = validateRequired(password, 'Password')
    if (!identifierCheck.ok) return setError(identifierCheck.reason)
    if (!passwordCheck.ok) return setError(passwordCheck.reason)

    setIsSubmitting(true)
    try {
      const result = await signInWithPassword({ identifier, password })
      onSuccess?.(result)
    } catch (err) {
      setError(toAuthMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault()
    setError('')
    setResetSent(false)
    const identifierCheck = validateRequired(identifier, 'Email or username')
    if (!identifierCheck.ok) return setError(identifierCheck.reason)
    setIsSubmitting(true)
    try {
      await requestPasswordReset(identifier)
      setResetSent(true)
    } catch (err) {
      setError(err?.message || 'Could not send password reset e-mail.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (forgotMode) {
    return (
      <form className="auth-form-v2" onSubmit={handlePasswordReset}>
        <p className="auth-inline-note">Enter your e-mail or username and we will send a reset link if the account exists.</p>
        <FormField id="reset-identifier" label="Email or username" value={identifier} onChange={setIdentifier} placeholder="cem@reelms.io or cem" autoComplete="username" />
        {error ? <p className="auth-form-error" role="alert">{error}</p> : null}
        {resetSent ? <p className="auth-form-success" role="status">Password reset link sent if this account exists.</p> : null}
        <button className="auth-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send reset link'}</button>
        <p className="auth-inline-note"><button type="button" className="auth-link-button" onClick={() => { setForgotMode(false); setError('') }}>Back to sign in</button></p>
      </form>
    )
  }

  return (
    <form className="auth-form-v2" onSubmit={handleSubmit}>
      <AuthProviderButtons onGoogle={signInWithGoogleProvider} disabled={isSubmitting} />

      <div className="auth-divider"><span>or sign in with password</span></div>

      <FormField
        id="signin-identifier"
        label="Email or username"
        value={identifier}
        onChange={setIdentifier}
        placeholder="cem@reelms.io or cem"
        autoComplete="username"
      />

      <FormField
        id="signin-password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="Your password"
        autoComplete="current-password"
        rightSlot={(
          <button type="button" className="auth-link-button" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      />

      <p className="auth-inline-note"><button type="button" className="auth-link-button" onClick={() => { setForgotMode(true); setError('') }}>Forgot password?</button></p>

      {error ? <p className="auth-form-error" role="alert">{error}</p> : null}

      <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="auth-inline-note">
        New to Reelms?{' '}
        <button type="button" className="auth-link-button" onClick={onGoSignUp}>Create account</button>
      </p>
    </form>
  )
}

function toAuthMessage(err) {
  if (err?.code === 'auth/invalid-identifier') return 'Enter a valid e-mail or username.'
  if (err?.code === 'auth/profile-not-found') return 'Your account exists, but the profile could not be loaded.'
  if (err?.code === 'auth/user-not-found') return err?.message || 'No account is registered with this e-mail or username.'
  if (err?.code === 'auth/wrong-password') return 'The password is incorrect.'
  if (err?.code === 'auth/password-not-configured') return 'This account uses Google sign-in. Continue with Google or set a password first.'
  if (err?.code === 'auth/invalid-credential') return 'No matching account was found for these sign-in details.'
  if (err?.code === 'auth/session-replaced') return 'This account was opened somewhere else. Sign in again to continue here.'
  if (err?.code === 'auth/email-not-verified') return err?.message || 'Verify your e-mail before signing in.'
  if (err?.code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  return err?.message || 'Sign in failed. Please try again.'
}
