import { createContext, useContext, useMemo } from 'react'
import { getApiBaseUrl } from '../../config/api.js'
import { getWebEnv } from '../../shared/config/env.js'

const RuntimeConfigContext = createContext(null)

export function RuntimeConfigProvider({ children }) {
  const value = useMemo(() => {
    const env = getWebEnv()
    return {
      ...env,
      apiBaseUrl: getApiBaseUrl(),
      platform: 'web',
      isDesktopBridgeAvailable: Boolean(window.electronAPI)
    }
  }, [])

  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>
}

export function useRuntimeConfig() {
  const value = useContext(RuntimeConfigContext)
  if (!value) throw new Error('useRuntimeConfig must be used inside RuntimeConfigProvider')
  return value
}
