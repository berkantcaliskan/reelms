import { Router } from 'express'
import { env } from '../../config/env.js'
import { getDoc, putDoc, userPk } from '../../modules/store/docStore.js'
import { authenticate } from '../middleware/authenticate.js'
import type { Server } from 'socket.io'

type SpotifyToken = { accessToken: string; refreshToken?: string; expiresAt: number }
const spotifyTokens = new Map<string, SpotifyToken>()
const spotifyStates = new Map<string, { uid: string; expiresAt: number }>()

export function createSpotifyRouter(io: Server) {
  const router = Router()

  function createSpotifyAuthUrl(uid: string) {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_REDIRECT_URI) return null
    const state = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
    spotifyStates.set(state, { uid, expiresAt: Date.now() + 10 * 60 * 1000 })
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.SPOTIFY_CLIENT_ID,
      scope: 'streaming user-read-email user-read-private user-read-currently-playing user-read-playback-state user-modify-playback-state',
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      state
    })
    return `https://accounts.spotify.com/authorize?${params}`
  }

  router.post('/spotify/start', authenticate, (req, res) => {
    const url = createSpotifyAuthUrl(String(req.userId || ''))
    if (!url) return res.status(503).json({ error: 'spotify_not_configured' })
    res.json({ url })
  })

  router.get('/spotify/login', (_req, res) => {
    res.status(401).send('Use authenticated POST /spotify/start')
  })

  router.get('/callback/spotify', async (req, res) => {
    const { code, state, error } = req.query
    const stateKey = String(state || '')
    const storedState = spotifyStates.get(stateKey)
    spotifyStates.delete(stateKey)
    if (error || !code || !storedState || storedState.expiresAt < Date.now()) return res.redirect(`${env.PUBLIC_WEB_URL}/?spotify=error`)
    const uid = storedState.uid
    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64') },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: String(code), redirect_uri: String(env.SPOTIFY_REDIRECT_URI) }).toString()
      })
      const tokens = await tokenRes.json() as any
      if (!tokens.access_token) throw new Error('No access token returned')
      spotifyTokens.set(uid, { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000 })
      await putDoc(userPk(uid), 'spotify_connected', true).catch(() => {})
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

  router.get('/spotify/now-playing/:uid', authenticate, async (req, res) => {
    const uid = String(req.params.uid)
    const requesterId = String(req.userId || '')
    if (uid !== requesterId) {
      const requesterFriends = (await getDoc<any[]>(userPk(requesterId), 'friends').catch(() => [])) || []
      if (!requesterFriends.some((friend) => String(friend?.id) === uid)) return res.status(403).json({ error: 'forbidden' })
    }
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

  router.get('/spotify/token', authenticate, async (req, res) => {
    const uid = String(req.userId || '')
    const stored = spotifyTokens.get(uid)
    if (!stored) return res.status(404).json({ error: 'not_connected' })
    let token = stored.accessToken
    if (Date.now() > stored.expiresAt - 30000) {
      const refreshed = await refreshSpotifyToken(uid)
      if (!refreshed) { spotifyTokens.delete(uid); return res.status(401).json({ error: 'token_expired' }) }
      token = refreshed
    }
    res.json({ token })
  })

  router.post('/spotify/disconnect/:uid', authenticate, (req, res) => {
    if (String(req.userId) !== String(req.params.uid)) return res.status(403).json({ error: 'forbidden' })
    spotifyTokens.delete(String(req.params.uid))
    res.json({ ok: true })
  })

  return router
}
