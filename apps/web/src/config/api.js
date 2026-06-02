export function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://127.0.0.1:5000'
  ).replace(/\/$/, '')
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
