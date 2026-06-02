const AUTH_PROFILE_KEY = 'reelms.auth.profile'

export function saveCachedAuthProfile(profile) {
  if (!profile) return
  try {
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Cache writes must never break auth.
  }
}

export function getCachedAuthProfile() {
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearCachedAuthProfile() {
  try {
    localStorage.removeItem(AUTH_PROFILE_KEY)
  } catch {
    // Cache cleanup must never break sign out.
  }
}
