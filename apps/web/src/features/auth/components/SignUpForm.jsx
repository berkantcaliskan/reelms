import { useMemo, useState } from 'react'
import { FormField } from '../../../shared/forms/FormField.jsx'
import { isEmail, normalizeUsername, validatePassword, validateRequired, validateUsername } from '../../../shared/lib/validation'
import { registerWithPassword, signInWithGoogleProvider } from '../services/authService'
import { AuthProviderButtons } from './AuthProviderButtons.jsx'

export function SignUpForm({ onSuccess, onGoSignIn }) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username])

  function focusNextField(event, nextId) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    document.getElementById(nextId)?.focus()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const nameCheck = validateRequired(displayName, 'Display name')
    const usernameCheck = validateUsername(normalizedUsername)
    const emailCheck = validateRequired(email, 'Email')
    const passwordCheck = validatePassword(password)

    if (!nameCheck.ok) return setError(nameCheck.reason)
    if (!usernameCheck.ok) return setError(usernameCheck.reason)
    if (!emailCheck.ok || !isEmail(email)) return setError('Enter a valid email address.')
    if (!passwordCheck.ok) return setError(passwordCheck.reason)

    setIsSubmitting(true)
    try {
      const result = await registerWithPassword({
        displayName: displayName.trim(),
        username: normalizedUsername,
        email,
        password
      })
      if (result.emailVerificationRequired) {
        setSuccess('Account created. Check your e-mail to verify your account before signing in.')
        return
      }
      onSuccess?.(result)
    } catch (err) {
      setError(toRegisterMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="auth-form-v2" onSubmit={handleSubmit}>
      <AuthProviderButtons onGoogle={signInWithGoogleProvider} disabled={isSubmitting} />

      <div className="auth-divider"><span>or create with email</span></div>
      <p className="auth-keyboard-hint">Press Enter to move forward, Tab to navigate fields.</p>

      <FormField
        id="signup-display-name"
        label="Display name"
        value={displayName}
        onChange={setDisplayName}
        placeholder="Cem"
        autoComplete="name"
        autoFocus
        onKeyDown={(event) => focusNextField(event, 'signup-username')}
      />

      <FormField
        id="signup-username"
        label="Username"
        value={username}
        onChange={setUsername}
        placeholder="cem"
        autoComplete="username"
        onKeyDown={(event) => focusNextField(event, 'signup-email')}
      />

      {username && normalizedUsername !== username ? (
        <p className="auth-inline-note">Username will be saved as <strong>{normalizedUsername}</strong>.</p>
      ) : null}

      <FormField
        id="signup-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="cem@reelms.io"
        autoComplete="email"
        onKeyDown={(event) => focusNextField(event, 'signup-password')}
      />

      <FormField
        id="signup-password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        onKeyDown={(event) => { if (event.key === 'Enter') handleSubmit(event) }}
      />

      {error ? <p className="auth-form-error" role="alert">{error}</p> : null}
      {success ? <p className="auth-form-success" role="status">{success}</p> : null}

      <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="auth-inline-note">
        Already have an account?{' '}
        <button type="button" className="auth-link-button" onClick={onGoSignIn}>Sign in</button>
      </p>
    </form>
  )
}

function toRegisterMessage(err) {
  if (err?.code === 'auth/username-taken') return 'This username is already taken.'
  if (err?.code === 'auth/email-taken') return 'This email is already registered.'
  if (err?.code === 'auth/email-already-in-use') return 'This email is already registered.'
  if (err?.code === 'auth/weak-password') return 'Password must be at least 8 characters.'
  if (err?.code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (err?.code === 'auth/invalid-username') return 'Username must be 3-30 characters and use letters, numbers, dots, dashes or underscores.'
  return 'Account could not be created. Please try again.'
}
