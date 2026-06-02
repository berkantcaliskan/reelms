import { Router } from 'express'
import { env } from '../../config/env.js'
import { putDoc, userPk } from '../../modules/store/docStore.js'
import type { Server } from 'socket.io'

type SpotifyToken = { accessToken: string; refreshToken?: string; expiresAt: number }
const spotifyTokens = new Map<string, SpotifyToken>()

export function createSpotifyRouter(io: Server) {
  const router = Router()

  router.get('/spotify/login', (req, res) => {
    const uid = String(req.query.uid || '')
    if (!uid) return res.status(400).send('uid required')
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_REDIRECT_URI) return res.status(503).send('Spotify not configured')
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.SPOTIFY_CLIENT_ID,
      scope: 'user-read-currently-playing user-read-playback-state',
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      state: uid
    })
    res.redirect(`https://accounts.spotify.com/authorize?${params}`)
  })

  router.get('/callback/spotify', async (req, res) => {
    const { code, state: uid, error } = req.query
    if (error || !code || !uid) return res.redirect(`${env.PUBLIC_WEB_URL}/?spotify=error`)
    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64') },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: String(code), redirect_uri: String(env.SPOTIFY_REDIRECT_URI) }).toString()
      })
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) throw new Error('No access token returned')
      spotifyTokens.set(String(uid), { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000 })
      await putDoc(userPk(String(uid)), 'spotify_connected', true).catch(() => {})
      io.to(`u:${uid}`).emit('reelms:doc', { scope: 'user', sk: 'spotify_connected' })
      res.redirect(`${env.PUBLIC_WEB_URL}/?spotify=connected&uid=${uid}`)
    } catch (err) {
      console.error('Spotify callback error:', err)
      res.redirect(`${env.PUBLIC_WEB_URL}/?spotify=error`)
    }
  })

  async function refreshSpotifyToken(uid: string) {
    const stored = spotifyTokens.get(uid)
    if (!stored?.refreshToken || !env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return null
    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64') },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: stored.refreshToken }).toString()
      })
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) return null
      spotifyTokens.set(uid, { ...stored, accessToken: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 })
      return tokens.access_token
    } catch { return null }
  }

  router.get('/spotify/now-playing/:uid', async (req, res) => {
    const uid = req.params.uid
    const stored = spotifyTokens.get(uid)
    if (!stored) return res.json({ connected: false })
    let token = stored.accessToken
    if (Date.now() > stored.expiresAt - 30000) {
      const refreshed = await refreshSpotifyToken(uid)
      if (!refreshed) { spotifyTokens.delete(uid); return res.json({ connected: false }) }
      token = refreshed
    }
    try {
      const npRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${token}` } })
      if (npRes.status === 204 || !npRes.ok) return res.json({ connected: true, playing: false })
      const data = await npRes.json() as any
      if (!data?.item) return res.json({ connected: true, playing: false })
      res.json({
        connected: true,
        playing: data.is_playing,
        track: {
          name: data.item.name,
          artist: data.item.artists.map((a: any) => a.name).join(', '),
          album: data.item.album.name,
          albumArt: data.item.album.images[1]?.url || data.item.album.images[0]?.url || null,
          url: data.item.external_urls.spotify,
          progress: data.progress_ms,
          duration: data.item.duration_ms
        }
      })
    } catch { res.json({ connected: true, playing: false }) }
  })

  router.post('/spotify/disconnect/:uid', (req, res) => {
    spotifyTokens.delete(req.params.uid)
    res.json({ ok: true })
  })

  return router
}
