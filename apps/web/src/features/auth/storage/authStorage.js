const AUTH_PROFILE_KEY = 'reelms.auth.profile'

function profileKey(profileOrUid) {
  const uid = typeof profileOrUid === 'string'
    ? profileOrUid
    : (profileOrUid?.uid || profileOrUid?.id || '')
  return uid ? `${AUTH_PROFILE_KEY}:${uid}` : AUTH_PROFILE_KEY
}

export function saveCachedAuthProfile(profile) {
  if (!profile) return
  try {
    const key = profileKey(profile)
    sessionStorage.setItem(key, JSON.stringify(profile))
    sessionStorage.setItem(`${AUTH_PROFILE_KEY}:current`, key)
    sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile))
    // Remove old global localStorage cache. It leaked one account's profile into another account on the same PC.
    localStorage.removeItem(AUTH_PROFILE_KEY)
  } catch {
    // Cache writes must never break auth.
  }
}

export function getCachedAuthProfile(uid = null) {
  try {
    const key = uid ? profileKey(uid) : (sessionStorage.getItem(`${AUTH_PROFILE_KEY}:current`) || AUTH_PROFILE_KEY)
    const raw = sessionStorage.getItem(key) || sessionStorage.getItem(AUTH_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearCachedAuthProfile() {
  try {
    const currentKey = sessionStorage.getItem(`${AUTH_PROFILE_KEY}:current`)
    if (currentKey) sessionStorage.removeItem(currentKey)
    sessionStorage.removeItem(`${AUTH_PROFILE_KEY}:current`)
    sessionStorage.removeItem(AUTH_PROFILE_KEY)
    localStorage.removeItem(AUTH_PROFILE_KEY)
  } catch {
    // Cache cleanup must never break sign out.
  }
}
