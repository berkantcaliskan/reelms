import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCurrentUser,
  onAuthStateChanged,
  signOutCurrentUser,
  signInWithPassword,
  registerWithPassword,
  signInWithGoogleProvider
} from '../../features/auth/services/authService.js'
import { userProfileGetById } from '../../reelmsAwsClient.js'
import {
  clearCachedAuthProfile,
  getCachedAuthProfile,
  saveCachedAuthProfile
} from '../../features/auth/storage/authStorage.js'

const AuthSessionContext = createContext(null)

function makeFallbackProfile(authUser) {
  if (!authUser?.uid) return null

  return {
    uid: authUser.uid,
    id: authUser.uid,
    email: authUser.email || '',
    contact: authUser.email || '',
    username: authUser.email ? authUser.email.split('@')[0] : 'user',
    displayName: authUser.email ? authUser.email.split('@')[0] : 'User',
    name: authUser.email ? authUser.email.split('@')[0] : 'User',
    photo: null,
    avatar: '',
    isFallbackProfile: true
  }
}

export function AuthSessionProvider({ children }) {
  const mountedRef = useRef(true)
  const [authUser, setAuthUser] = useState(() => getCurrentUser())
  const [profile, setProfile] = useState(() => getCachedAuthProfile())
  const [status, setStatus] = useState(() => (getCurrentUser() ? 'hydrating' : 'guest'))
  const [lastError, setLastError] = useState(null)

  const hydrateProfile = useCallback(async (nextAuthUser = getCurrentUser(), options = {}) => {
    if (!nextAuthUser?.uid) {
      clearCachedAuthProfile()
      if (!mountedRef.current) return null
      setAuthUser(null)
      setProfile(null)
      setStatus('guest')
      return null
    }

    if (!mountedRef.current) return null

    setAuthUser(nextAuthUser)
    if (!options.silent) setStatus('loading-profile')

    try {
      const nextProfile = await userProfileGetById(nextAuthUser.uid)
      const stableProfile = nextProfile || getCachedAuthProfile() || makeFallbackProfile(nextAuthUser)

      if (!mountedRef.current) return stableProfile

      setProfile(stableProfile)
      saveCachedAuthProfile(stableProfile)
      setStatus('authenticated')
      setLastError(null)
      return stableProfile
    } catch (err) {
      const fallback = getCachedAuthProfile() || profile || makeFallbackProfile(nextAuthUser)

      if (!mountedRef.current) return fallback

      setProfile(fallback)
      if (fallback) saveCachedAuthProfile(fallback)
      setStatus('authenticated')
      setLastError(err)
      return fallback
    }
  }, [profile])

  useEffect(() => {
    mountedRef.current = true

    const unsubscribe = onAuthStateChanged((nextAuthUser) => {
      hydrateProfile(nextAuthUser)
    })

    hydrateProfile(getCurrentUser(), { silent: true })

    return () => {
      mountedRef.current = false
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [hydrateProfile])

  const refreshSession = useCallback(async () => {
    return hydrateProfile(getCurrentUser())
  }, [hydrateProfile])

  const signIn = useCallback(async (payload) => {
    setStatus('signing-in')
    const result = await signInWithPassword(payload)
    const nextAuthUser = result?.credential?.user || getCurrentUser()
    const nextProfile = result?.profile || await hydrateProfile(nextAuthUser)

    if (mountedRef.current) {
      setAuthUser(nextAuthUser)
      setProfile(nextProfile)
      saveCachedAuthProfile(nextProfile)
      setStatus('authenticated')
    }

    return { ...result, authUser: nextAuthUser, profile: nextProfile }
  }, [hydrateProfile])

  const register = useCallback(async (payload) => {
    setStatus('registering')
    const result = await registerWithPassword(payload)
    const nextAuthUser = result?.credential?.user || getCurrentUser()
    const nextProfile = result?.profile || await hydrateProfile(nextAuthUser)

    if (mountedRef.current) {
      setAuthUser(nextAuthUser)
      setProfile(nextProfile)
      saveCachedAuthProfile(nextProfile)
      setStatus('authenticated')
    }

    return { ...result, authUser: nextAuthUser, profile: nextProfile }
  }, [hydrateProfile])

  const signOut = useCallback(async () => {
    await signOutCurrentUser()
    clearCachedAuthProfile()
    if (!mountedRef.current) return
    setAuthUser(null)
    setProfile(null)
    setStatus('guest')
    setLastError(null)
  }, [])

  const value = useMemo(() => ({
    authUser,
    user: profile,
    profile,
    uid: profile?.id || profile?.uid || authUser?.uid || null,
    status,
    lastError,
    isAuthenticated: Boolean(authUser?.uid),
    signIn,
    register,
    signOut,
    refreshSession,
    signInWithGoogle: signInWithGoogleProvider
  }), [authUser, profile, status, lastError, signIn, register, signOut, refreshSession])

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  )
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext)
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider')
  return value
}
