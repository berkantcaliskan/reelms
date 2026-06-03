import { useState } from 'react'
import { FormField } from '../../../shared/forms/FormField.jsx'
import { validatePassword } from '../../../shared/lib/validation'
import { confirmPasswordReset } from '../services/authService'

export function ResetPasswordForm({ token, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const check = validatePassword(password)
    if (!check.ok) return setError(check.reason)
    if (password !== confirm) return setError('Passwords do not match.')
    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, password)
      setSuccess('Password updated. You can sign in now.')
      onDone?.()
    } catch (err) {
      setError(err?.code === 'auth/invalid-action-code' ? 'This reset link is invalid or expired.' : err?.message || 'Password reset failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="auth-form-v2" onSubmit={handleSubmit}>
      <p className="auth-inline-note">Enter a new password for your Reelms account.</p>
      <FormField id="reset-password" label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
      <FormField id="reset-confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" autoComplete="new-password" />
      {error ? <p className="auth-form-error" role="alert">{error}</p> : null}
      {success ? <p className="auth-form-success" role="status">{success}</p> : null}
      <button className="auth-primary-button" type="submit" disabled={isSubmitting || Boolean(success)}>{isSubmitting ? 'Updating…' : 'Update password'}</button>
    </form>
  )
}
