import { lazy, Suspense } from 'react'

const LegacyReelmsApp = lazy(() => import('./LegacyReelmsApp.jsx'))

/**
 * Strangler boundary for the imported legacy client.
 *
 * This is the safety valve that lets us keep every visual/function from the old
 * app while moving production code into feature folders one slice at a time.
 * Do not add new product work to LegacyReelmsApp.jsx. Build new features under
 * src/features/<feature-name> and then replace the matching region here.
 */
export function ReelmsLegacyBoundary() {
  return (
    <Suspense fallback={<div className="reelms-app-loading">Loading Reelms…</div>}>
      <LegacyReelmsApp />
    </Suspense>
  )
}
