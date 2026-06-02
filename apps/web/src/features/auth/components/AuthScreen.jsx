import { useEffect, useState } from 'react'
import { AuthShell } from './AuthShell.jsx'
import { SignInForm } from './SignInForm.jsx'
import { SignUpForm } from './SignUpForm.jsx'
import './auth.css'

function normalizeMode(mode) {
  return mode === 'signup' ? 'signup' : 'signin'
}

export function AuthScreen({ initialMode = 'signin', onAuthenticated }) {
  const [mode, setMode] = useState(() => normalizeMode(initialMode))

  useEffect(() => {
    setMode(normalizeMode(initialMode))
  }, [initialMode])

  const isSignUp = mode === 'signup'

  return (
    <AuthShell
      mode={mode}
      title={isSignUp ? 'Create your Reelms account' : 'Welcome back'}
      subtitle={
        isSignUp
          ? 'Reserve your identity and enter the web beta with the same account you will use on desktop later.'
          : 'Sign in to continue to your realms, channels, friends and realtime spaces.'
      }
    >
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
    </AuthShell>
  )
}
