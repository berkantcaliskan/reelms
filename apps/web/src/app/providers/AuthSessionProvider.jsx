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

function sameAuthUser(a, b) {
  if (!a && !b) return true
  if (!a || !b) return false
  return String(a.uid || '') === String(b.uid || '') && String(a.email || '') === String(b.email || '')
}

function stableProfileKey(profile) {
  if (!profile) return ''
  const id = profile.id || profile.uid || ''
  return JSON.stringify({
    id: String(id),
    uid: String(profile.uid || id),
    email: String(profile.email || profile.contact || ''),
    username: String(profile.username || ''),
    displayName: String(profile.displayName || ''),
    name: String(profile.name || ''),
    photo: String(profile.photo || profile.avatar || profile.photoURL || ''),
    fallback: Boolean(profile.isFallbackProfile)
  })
}

function sameProfile(a, b) {
  return stableProfileKey(a) === stableProfileKey(b)
}

export function AuthSessionProvider({ children }) {
  const mountedRef = useRef(true)
  const [authUser, setAuthUser] = useState(() => getCurrentUser())
  const [profile, setProfile] = useState(() => getCachedAuthProfile())
  const [status, setStatus] = useState(() => (getCurrentUser() ? 'hydrating' : 'guest'))
  const [lastError, setLastError] = useState(null)
  const profileRef = useRef(profile)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  const hydrateProfile = useCallback(async (nextAuthUser = getCurrentUser(), options = {}) => {
    if (!nextAuthUser?.uid) {
      clearCachedAuthProfile()
      if (!mountedRef.current) return null
      setAuthUser((prev) => (prev == null ? prev : null))
      setProfile((prev) => {
        if (prev == null) return prev
        profileRef.current = null
        return null
      })
      setStatus((prev) => (prev === 'guest' ? prev : 'guest'))
      return null
    }

    if (!mountedRef.current) return null

    setAuthUser((prev) => (sameAuthUser(prev, nextAuthUser) ? prev : nextAuthUser))
    if (!options.silent) setStatus((prev) => (prev === 'loading-profile' ? prev : 'loading-profile'))

    try {
      const nextProfile = await userProfileGetById(nextAuthUser.uid)
      const stableProfile = nextProfile || getCachedAuthProfile(nextAuthUser.uid) || makeFallbackProfile(nextAuthUser)

      if (!mountedRef.current) return stableProfile

      setProfile((prev) => {
        if (sameProfile(prev, stableProfile)) return prev
        profileRef.current = stableProfile
        return stableProfile
      })
      saveCachedAuthProfile(stableProfile)
      setStatus((prev) => (prev === 'authenticated' ? prev : 'authenticated'))
      setLastError((prev) => (prev == null ? prev : null))
      return stableProfile
    } catch (err) {
      const fallback = getCachedAuthProfile(nextAuthUser.uid) || (profileRef.current && String(profileRef.current.uid || profileRef.current.id || '') === String(nextAuthUser.uid) ? profileRef.current : null) || makeFallbackProfile(nextAuthUser)

      if (!mountedRef.current) return fallback

      setProfile((prev) => {
        if (sameProfile(prev, fallback)) return prev
        profileRef.current = fallback
        return fallback
      })
      if (fallback) saveCachedAuthProfile(fallback)
      setStatus((prev) => (prev === 'authenticated' ? prev : 'authenticated'))
      setLastError((prev) => (prev === err ? prev : err))
      return fallback
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const unsubscribe = onAuthStateChanged((nextAuthUser) => {
      hydrateProfile(nextAuthUser)
    })

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
    profileRef.current = null
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

let warnedMissingAuthProvider = false

function makeDetachedAuthSession() {
  const authUser = getCurrentUser()
  const profile = getCachedAuthProfile(authUser?.uid) || makeFallbackProfile(authUser)

  if (import.meta.env?.DEV && !warnedMissingAuthProvider) {
    warnedMissingAuthProvider = true
    console.warn('[Reelms Web] AuthSessionProvider was not found; using detached auth session fallback.')
  }

  return {
    authUser,
    user: profile,
    profile,
    uid: profile?.id || profile?.uid || authUser?.uid || null,
    status: authUser?.uid ? 'authenticated' : 'guest',
    lastError: null,
    isAuthenticated: Boolean(authUser?.uid),
    signIn: async (payload) => {
      const result = await signInWithPassword(payload)
      const nextAuthUser = result?.credential?.user || getCurrentUser()
      const nextProfile = result?.profile || makeFallbackProfile(nextAuthUser)
      if (nextProfile) saveCachedAuthProfile(nextProfile)
      return { ...result, authUser: nextAuthUser, profile: nextProfile }
    },
    register: async (payload) => {
      const result = await registerWithPassword(payload)
      const nextAuthUser = result?.credential?.user || getCurrentUser()
      const nextProfile = result?.profile || makeFallbackProfile(nextAuthUser)
      if (nextProfile) saveCachedAuthProfile(nextProfile)
      return { ...result, authUser: nextAuthUser, profile: nextProfile }
    },
    signOut: async () => {
      await signOutCurrentUser()
      clearCachedAuthProfile()
    },
    refreshSession: async () => profile,
    signInWithGoogle: signInWithGoogleProvider
  }
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext)
  return value || makeDetachedAuthSession()
}
