export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && (window.reelms?.apiUrl || window.electronAPI?.apiUrl)) {
    return (window.reelms?.apiUrl || window.electronAPI?.apiUrl).replace(/\/$/, '')
  }
  if (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL) {
    return (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL).replace(/\/$/, '')
  }
  if (import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
    return 'https://api.reelms.io'
  }
  return 'http://127.0.0.1:5000'
}

/**
 * Public URL used by landing/auth/settings download CTAs.
 *
 * No broken OWNER/REPO placeholder is shipped in the app. Until a GitHub
 * Release or CloudFront distribution exists, this safely opens the internal
 * download route. When the release channel is ready, set this in apps/web/.env:
 *
 * VITE_WINDOWS_DOWNLOAD_URL=https://github.com/<owner>/<repo>/releases/latest/download/Reelms-Setup.exe
 * or
 * VITE_WINDOWS_DOWNLOAD_URL=https://download.reelms.io/win/Reelms-Setup.exe
 */
export function getWindowsDownloadUrl() {
  return import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || '#/download'
}

export function hasPublicWindowsDownloadUrl() {
  const url = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL
  return Boolean(url && /^https?:\/\//i.test(url))
}


export function getPublicWebUrl() {
  const fallback = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://reelms.io'
  return (
    import.meta.env.VITE_PUBLIC_WEB_URL ||
    import.meta.env.VITE_WEB_BASE_URL ||
    fallback
  ).replace(/\/$/, '')
}
