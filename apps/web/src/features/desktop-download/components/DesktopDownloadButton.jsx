import { getDesktopDownloadInfo } from '../services/downloadConfig.js'
import './desktopDownload.css'

export function DesktopDownloadButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  label,
  showUnavailableState = true
}) {
  const info = getDesktopDownloadInfo()
  const isInternal = info.url.startsWith('#')
  const text = children || label || (info.hasPublicUrl ? 'Windows uygulamasını indir' : 'Masaüstü sürüm bilgisi')

  return (
    <a
      className={`desktop-download-button desktop-download-button--${variant} desktop-download-button--${size} ${!info.hasPublicUrl && showUnavailableState ? 'desktop-download-button--pending' : ''} ${className}`.trim()}
      href={info.url}
      target={isInternal ? undefined : '_blank'}
      rel={isInternal ? undefined : 'noreferrer'}
      aria-label={info.hasPublicUrl ? 'Reelms Windows setup indir' : 'Reelms masaüstü sürüm bilgisi'}
      title={info.hasPublicUrl ? `Download ${info.fileName}` : 'Masaüstü sürüm yayınlandığında aktif olacak'}
    >
      <span className="desktop-download-button__pulse" aria-hidden="true" />
      <span>{text}</span>
    </a>
  )
}
