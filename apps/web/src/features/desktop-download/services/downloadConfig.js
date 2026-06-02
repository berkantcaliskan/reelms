import { getWindowsDownloadUrl, hasPublicWindowsDownloadUrl } from '../../../config/api.js'

export const DESKTOP_DOWNLOAD_RELEASE_CHANNEL = import.meta.env.VITE_DESKTOP_RELEASE_CHANNEL || 'Web Beta'
export const DESKTOP_DOWNLOAD_PLATFORM = 'Windows 10/11 • x64'

export function getDesktopDownloadInfo() {
  const hasPublicUrl = hasPublicWindowsDownloadUrl()

  return {
    url: getWindowsDownloadUrl(),
    hasPublicUrl,
    channel: DESKTOP_DOWNLOAD_RELEASE_CHANNEL,
    platform: DESKTOP_DOWNLOAD_PLATFORM,
    fileName: 'Reelms-Setup.exe',
    note: hasPublicUrl
      ? 'Windows uygulamasını indirip aynı Reelms hesabınla masaüstünden devam edebilirsin.'
      : 'Masaüstü sürüm yayınlandığında indirme bağlantısı burada aktif olacak. Şimdilik web beta üzerinden devam edebilirsin.'
  }
}

export function openDesktopDownload() {
  const { url } = getDesktopDownloadInfo()
  window.open(url, url.startsWith('#') ? '_self' : '_blank', 'noopener,noreferrer')
}
