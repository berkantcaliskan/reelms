import { useState } from 'react'
import { FormField } from '../../../shared/forms/FormField.jsx'
import { validateRequired } from '../../../shared/lib/validation'
import { AuthProviderButtons } from './AuthProviderButtons.jsx'
import { signInWithPassword, signInWithGoogleProvider } from '../services/authService'

export function SignInForm({ onSuccess, onGoSignUp }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  if (err?.code === 'auth/invalid-identifier') return 'Invalid email or username.'
  if (err?.code === 'auth/profile-not-found') return 'Profile could not be loaded.'
  if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') return 'Invalid email or password.'
  if (err?.code === 'auth/user-not-found') return 'No account found. Please sign up first.'
  if (err?.code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  return 'Sign in failed. Please try again.'
}
