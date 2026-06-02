import { RuntimeConfigProvider } from './RuntimeConfigProvider.jsx'
import { AuthSessionProvider } from './AuthSessionProvider.jsx'
import { RealtimeProvider } from './RealtimeProvider.jsx'
import { LegacyBridgeProvider } from './LegacyBridgeProvider.jsx'

export function AppProviders({ children }) {
  return (
    <RuntimeConfigProvider>
      <AuthSessionProvider>
        <RealtimeProvider>
          <LegacyBridgeProvider>{children}</LegacyBridgeProvider>
        </RealtimeProvider>
      </AuthSessionProvider>
    </RuntimeConfigProvider>
  )
}
