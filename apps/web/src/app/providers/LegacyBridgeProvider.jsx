import { createContext, useContext, useMemo } from 'react'

const LegacyBridgeContext = createContext(null)

export function LegacyBridgeProvider({ children }) {
  const value = useMemo(() => ({
    mode: 'legacy-strangler',
    allowLegacyClient: true,
    extractionStage: 'stage-1-boundary-created'
  }), [])

  return <LegacyBridgeContext.Provider value={value}>{children}</LegacyBridgeContext.Provider>
}

export function useLegacyBridge() {
  const value = useContext(LegacyBridgeContext)
  if (!value) throw new Error('useLegacyBridge must be used inside LegacyBridgeProvider')
  return value
}
