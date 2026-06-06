import { useEffect, useRef, useState, useCallback } from 'react'
import { getApiBaseUrl } from '../../config/api.js'
import './SpotifyPlayer.css'

const BACKEND_URL = getApiBaseUrl()
const SDK_SCRIPT_ID = 'spotify-web-playback-sdk'

function PrevIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15L14 1.108A.7.7 0 0 1 15 1.7v12.6a.7.7 0 0 1-1.05.607L4 9.149V13.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"/>
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.108A.7.7 0 0 0 1 1.7v12.6a.7.7 0 0 0 1.05.607L12 9.149V13.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/>
    </svg>
  )
}

function VolumeIcon({ muted }) {
  if (muted) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325L6.188 3.61a.5.5 0 0 1 .53-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
      <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
      <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707z"/>
      <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325L6.188 3.61a.5.5 0 0 1 .53-.06z"/>
    </svg>
  )
}

export default function SpotifyPlayer({ uid, onNowPlayingChange, onControlsReady, onPlayerStateChange }) {
  const playerRef = useRef(null)
  const [playerState, setPlayerState] = useState(null)
  const [volume, setVolume] = useState(0.5)
  const [needsReconnect, setNeedsReconnect] = useState(false)

  const fetchToken = useCallback(async () => {
    const authToken = localStorage.getItem('reelms.token')
    if (!authToken) return null
    try {
      const res = await fetch(`${BACKEND_URL}/spotify/token`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.token || null
    } catch { return null }
  }, [])

  useEffect(() => {
    if (!uid) return

    function initPlayer() {
      if (playerRef.current) return

      const player = new window.Spotify.Player({
        name: 'Reelms',
        getOAuthToken: async cb => {
          const token = await fetchToken()
          if (token) cb(token)
        },
        volume
      })

      player.addListener('ready', ({ device_id }) => {
        console.log('[Spotify] Ready, device:', device_id)
        setNeedsReconnect(false)
        onControlsReady?.({
          togglePlay: () => playerRef.current?.togglePlay(),
          nextTrack:  () => playerRef.current?.nextTrack(),
          prevTrack:  () => playerRef.current?.previousTrack(),
          setVolume:  v  => playerRef.current?.setVolume(v),
        })
      })

      player.addListener('not_ready', ({ device_id }) => {
        console.log('[Spotify] Device offline:', device_id)
      })

      player.addListener('initialization_error', ({ message }) => {
        console.error('[Spotify] Init error:', message)
      })

      player.addListener('authentication_error', ({ message }) => {
        console.error('[Spotify] Auth error:', message)
        setNeedsReconnect(true)
      })

      player.addListener('account_error', ({ message }) => {
        console.error('[Spotify] Account error (Premium required):', message)
        setNeedsReconnect(true)
      })

      player.addListener('player_state_changed', state => {
        if (!state) {
          setPlayerState(null)
          onNowPlayingChange?.(null)
          return
        }
        const current = state.track_window?.current_track
        const nowPlaying = current ? {
          name: current.name,
          artist: current.artists.map(a => a.name).join(', '),
          albumArt: current.album.images[0]?.url || null,
          url: `https://open.spotify.com/track/${current.id}`
        } : null
        setPlayerState({ paused: state.paused, track: nowPlaying })
        onNowPlayingChange?.(nowPlaying)
        onPlayerStateChange?.({ paused: state.paused, track: nowPlaying })
      })

      player.connect()
      playerRef.current = player
    }

    if (window.Spotify) {
      initPlayer()
    } else {
      if (!document.getElementById(SDK_SCRIPT_ID)) {
        const script = document.createElement('script')
        script.id = SDK_SCRIPT_ID
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
      }
      window.onSpotifyWebPlaybackSDKReady = initPlayer
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
      }
      setPlayerState(null)
    }
  }, [uid, fetchToken])

  function togglePlay() { playerRef.current?.togglePlay() }
  function nextTrack() { playerRef.current?.nextTrack() }
  function prevTrack() { playerRef.current?.previousTrack() }

  function handleVolume(e) {
    const v = parseFloat(e.target.value)
    setVolume(v)
    playerRef.current?.setVolume(v)
  }

  if (!playerState?.track) return null

  const { track, paused } = playerState

  return (
    <div className="smp">
      <div className="smp-track">
        {track.albumArt && <img src={track.albumArt} alt="" className="smp-art" />}
        <div className="smp-info">
          <a className="smp-name" href={track.url} target="_blank" rel="noreferrer">{track.name}</a>
          <span className="smp-artist">{track.artist}</span>
        </div>
      </div>

      <div className="smp-controls">
        <button className="smp-btn" onClick={prevTrack} aria-label="Previous"><PrevIcon /></button>
        <button className="smp-btn smp-btn-play" onClick={togglePlay} aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button className="smp-btn" onClick={nextTrack} aria-label="Next"><NextIcon /></button>
      </div>

      <div className="smp-right">
        <VolumeIcon muted={volume === 0} />
        <input
          type="range"
          className="smp-volume"
          min="0" max="1" step="0.02"
          value={volume}
          onChange={handleVolume}
          aria-label="Volume"
        />
      </div>
    </div>
  )
}
