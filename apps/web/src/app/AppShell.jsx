import { Suspense } from 'react'
import { AppProviders } from './providers/AppProviders.jsx'
import { AppRoutes } from './routes/AppRoutes.jsx'
import { AppErrorBoundary } from '../shared/ui/AppErrorBoundary.jsx'
import { LoadingScreen } from '../shared/ui/LoadingScreen.jsx'
import '../styles/architecture.css'

export default function AppShell() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <Suspense fallback={<LoadingScreen />}>
          <AppRoutes />
        </Suspense>
      </AppProviders>
    </AppErrorBoundary>
  )
}
