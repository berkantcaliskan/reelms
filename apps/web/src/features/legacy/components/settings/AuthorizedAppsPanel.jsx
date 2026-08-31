import React from 'react'
import { useT } from '../../../../i18n'
import { SpotifyIcon } from '../icons/AppIcons'

export function AuthorizedAppsPanel({ user, spotifyConnected, onSpotifyConnect, onSpotifyDisconnect }) {
  const t = useT()
  return (
    <div className="accs-panel">
      <div className="accs-section">
        <div className="accs-section-title">{t('authorized_apps') || 'Authorized Apps'}</div>
        <p className="accs-note" style={{ marginBottom: 16 }}>
          Manage authorized third-party applications, OAuth connections, and music integrations linked with your Reelms profile.
        </p>

        <div className="accs-connected-item">
          <div className="accs-connected-info">
            <span className="accs-connected-icon" style={{ color: '#1DB954' }}><SpotifyIcon size={22} /></span>
            <div>
              <span className="accs-connected-name">Spotify</span>
              <p className="accs-note" style={{ margin: 0 }}>
                {spotifyConnected ? t('spotify_connected') : t('spotify_connect_desc')}
              </p>
            </div>
          </div>
          {spotifyConnected
            ? <button className="accs-btn accs-btn-ghost accs-btn-spotify-disconnect" onClick={onSpotifyDisconnect}>{t('disconnect')}</button>
            : <button className="accs-btn accs-btn-ghost accs-btn-spotify" onClick={onSpotifyConnect}>{t('connect')}</button>
          }
        </div>
      </div>
    </div>
  )
}

export default AuthorizedAppsPanel
