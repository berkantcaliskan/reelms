import { getDesktopDownloadInfo } from '../services/downloadConfig.js'
import { DesktopDownloadButton } from './DesktopDownloadButton.jsx'
import { getT } from '../../../i18n.js'
import './desktopDownload.css'

function WindowsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="1" y="1" width="10.5" height="10.5" rx="0.5"/>
      <rect x="12.5" y="1" width="10.5" height="10.5" rx="0.5"/>
      <rect x="1" y="12.5" width="10.5" height="10.5" rx="0.5"/>
      <rect x="12.5" y="12.5" width="10.5" height="10.5" rx="0.5"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function IosIcon() {
  return (
    <svg width="20" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.35.79 3.17.8 1.21-.24 2.36-1 3.64-.84 1.57.2 2.75.89 3.52 2.15-3.24 1.96-2.71 5.97.29 7.13-.6 1.63-1.43 3.23-2.62 4.64zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.341a1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1 1 1 0 0 1 1 1m-10.046 0a1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1 1 1 0 0 1 1 1m10.356-6.598 1.976-3.421a.413.413 0 0 0-.152-.563.413.413 0 0 0-.563.152l-2.002 3.468A11.777 11.777 0 0 0 12.5 7.5c-1.742 0-3.379.41-4.84 1.13L5.66 5.161a.413.413 0 0 0-.563-.152.413.413 0 0 0-.152.563l1.976 3.421C4.108 10.444 2.5 13.164 2.5 16.25h19c0-3.086-1.608-5.806-3.667-7.507z" />
    </svg>
  )
}

const PLATFORMS = [
  { key: 'windows', name: 'Windows', Icon: WindowsIcon, color: '#0078D4' },
  { key: 'macos',   name: 'macOS',   Icon: AppleIcon,   color: '#888888' },
  { key: 'android', name: 'Android', Icon: AndroidIcon, color: '#3DDC84' },
  { key: 'ios',     name: 'iOS',     Icon: IosIcon,     color: '#147CE5' },
]

export function DesktopDownloadSettingsPanel({ language = 'en' }) {
  const info = getDesktopDownloadInfo()
  const t = getT(language)

  return (
    <div className="dmp-grid">
      {PLATFORMS.map(({ key, name, Icon, color, isDesktop }) => {
        const available = key === 'windows' && info.hasPublicUrl
        return (
          <div key={key} className="dmp-card">
            <div className="dmp-card__icon" style={{ background: color }}>
              <Icon />
            </div>
            <div className="dmp-card__body">
              <h3 className="dmp-card__title">{t(`platform_${key}`)}</h3>
              <p className="dmp-card__desc">{t(`platform_${key}_desc`)}</p>
              <p className="dmp-card__preparing">
                {t('platform_preparing_desc').replace('{name}', name)}
              </p>
              {available
                ? <DesktopDownloadButton size="sm">{t('platform_download')}</DesktopDownloadButton>
                : <span className="dmp-card__soon">{t('platform_coming_soon')}</span>
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
