import { useLocation } from 'react-router-dom'
import { DesktopDownloadButton } from './DesktopDownloadButton.jsx'
import './desktopDownload.css'

const HIDDEN_PATHS = new Set(['/landing', '/download'])

export function FloatingDesktopDownloadButton() {
  const location = useLocation()
  if (HIDDEN_PATHS.has(location.pathname)) return null

  return (
    <div className="desktop-download-floating" aria-label="Download Reelms desktop client">
      <DesktopDownloadButton variant="floating" size="sm">Desktop app</DesktopDownloadButton>
    </div>
  )
}
