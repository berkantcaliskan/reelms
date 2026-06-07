/// <reference types="vite/client" />

interface Window {
  reelms?: {
    platform: string
    getAppInfo: () => Promise<{ version: string; isPackaged: boolean; apiUrl: string }>
    openExternal: (url: string) => Promise<void>
    openGoogleAuth: () => Promise<void>
    installUpdate: () => Promise<void>
    onUpdateAvailable: (callback: (payload: unknown) => void) => () => void
    onUpdateDownloaded: (callback: (payload: unknown) => void) => () => void
    onAuthCode: (callback: (code: string) => void) => () => void
  }
}
