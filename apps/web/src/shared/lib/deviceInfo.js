export function parseDeviceInfo(userAgent = navigator.userAgent) {
  const ua = String(userAgent || '')
  const browser = ua.includes('Edg/') ? 'Edge'
    : ua.includes('Chrome/') ? 'Chrome'
    : ua.includes('Safari/') && !ua.includes('Chrome/') ? 'Safari'
    : ua.includes('Firefox/') ? 'Firefox'
    : 'Unknown browser'

  const os = ua.includes('Windows') ? 'Windows'
    : ua.includes('Mac OS X') ? 'macOS'
    : ua.includes('Linux') ? 'Linux'
    : ua.includes('Android') ? 'Android'
    : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS'
    : 'Unknown OS'

  return {
    browser,
    os,
    userAgent: ua,
    createdAt: Date.now()
  }
}
