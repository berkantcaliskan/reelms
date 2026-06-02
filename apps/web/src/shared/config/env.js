export function getWebEnv() {
  return {
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, ''),
    appMode: import.meta.env.MODE,
    buildTarget: import.meta.env.VITE_BUILD_TARGET || 'web'
  }
}
