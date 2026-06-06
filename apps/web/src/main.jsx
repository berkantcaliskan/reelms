import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import AppShell from './app/AppShell.jsx'
import { initTracker } from './shared/lib/tracker.js'


const REELMS_CLIENT_CACHE_VERSION = '2026-06-05-render-hardening-v2'
try {
  const key = 'reelms:client-cache-version'
  const current = localStorage.getItem(key)
  if (current !== REELMS_CLIENT_CACHE_VERSION) {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const itemKey = localStorage.key(i)
      if (!itemKey) continue
      // Only remove risky derived snapshots. Keep auth, language, customization and user preferences intact.
      if (
        itemKey.startsWith('reelms:member-reelms:') ||
        itemKey.startsWith('reelms:profile-cache:') ||
        itemKey.startsWith('reelms:core-cache:') ||
        itemKey.startsWith('reelms:doc-cache:') ||
        itemKey.startsWith('reelms:selected-reelm:')
      ) localStorage.removeItem(itemKey)
    }
    localStorage.setItem(key, REELMS_CLIENT_CACHE_VERSION)
  }
} catch { /* ignore cache guard errors */ }

initTracker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </HashRouter>
  </StrictMode>
)
