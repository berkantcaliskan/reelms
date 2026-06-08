import { Route, Routes } from 'react-router-dom'
import MarketingLanding from '../../MarketingLanding.jsx'
import { ReelmsLegacyBoundary } from '../../features/legacy/ReelmsLegacyBoundary.jsx'
import { AuthScreen } from '../../features/auth/index.js'
import { DesktopDownloadPage } from '../../features/desktop-download/index.js'

/**
 * Public route table.
 *
 * /signin and /signup intentionally stay on the legacy auth screen because the
 * old centered colorful auth design is the product skeleton. The modular auth
 * experiment remains available at /auth-next without affecting the real flow.
 */
const isMarketingDomain =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'www.reelms.io' || window.location.hostname === 'reelms.io')

export function AppRoutes() {
  if (isMarketingDomain) {
    return <Routes><Route path="*" element={<MarketingLanding />} /></Routes>
  }
  return (
    <Routes>
      <Route path="/landing" element={<MarketingLanding />} />
      <Route path="/download" element={<DesktopDownloadPage />} />
      <Route path="/auth-next" element={<AuthScreen />} />
      <Route path="/*" element={<ReelmsLegacyBoundary />} />
    </Routes>
  )
}
