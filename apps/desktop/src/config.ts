export function getDesktopApiUrl(): string {
  if (typeof window !== 'undefined' && ((window as any).reelms?.apiUrl || (window as any).electronAPI?.apiUrl)) {
    return ((window as any).reelms?.apiUrl || (window as any).electronAPI?.apiUrl).replace(/\/$/, '')
  }
  return (
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? 'https://api.reelms.io' : 'http://127.0.0.1:5000')
  ).replace(/\/$/, '')
}

export const API_BASE_URL = getDesktopApiUrl()
