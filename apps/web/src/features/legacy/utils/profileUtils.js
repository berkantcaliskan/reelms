import { THEMES } from '../constants/themeConstants'
import { rgbCssValue } from './colorUtils'
import { getPersonPhoto, getPersonCover } from './mediaUtils'

export const BOT_BIO_KEY = { 'reelmradio': 'bot_radio_bio', 'reelms-intelligence': 'bot_intelligence_bio' }

export const STATUS_OPTIONS_LIST = [
  { key: 'online', label: 'Online', color: '#4ade80' },
  { key: 'idle', label: 'Idle', color: '#fbbf24' },
  { key: 'busy', label: 'Busy', color: '#f87171' },
  { key: 'dnd', label: 'Do not disturb', color: '#f87171' },
  { key: 'invisible', label: 'Invisible', color: '#9ca3af' },
  { key: 'offline', label: 'Offline', color: '#71717a' },
]

export function buildProfileThemeStyle(person) {
  const cfg = person?.profileTheme || person?.customization || null
  if (!cfg || typeof cfg !== 'object') return undefined
  const theme = THEMES.find(th => th.id === cfg.themeId) || THEMES[0]
  const accent = typeof cfg.customAccent === 'string' && cfg.customAccent ? cfg.customAccent : (theme.accent || '#fdfcfb')
  const base = typeof cfg.customBase === 'string' && cfg.customBase ? cfg.customBase : (theme.base || '#2c2522')
  const tertiary = theme.tertiary || '#181416'
  const tertiaryRgb = theme.tertiaryRgb || '14,12,18'
  const tertiaryGlass = theme.tertiaryGlass || `rgba(${tertiaryRgb}, 0.62)`
  return {
    '--fpp-theme-accent': accent,
    '--fpp-theme-accent-rgb': rgbCssValue(accent, rgbCssValue(theme.accentRgb, '185,152,135')),
    '--fpp-theme-base': base,
    '--fpp-theme-base-rgb': rgbCssValue(base, rgbCssValue(theme.baseRgb, '44,37,34')),
    '--fpp-theme-tertiary': tertiary,
    '--fpp-theme-tertiary-rgb': tertiaryRgb,
    '--fpp-theme-tertiary-glass': tertiaryGlass,
  }
}

export function normalizeFriendProfileTarget(profile = {}) {
  const raw = profile && typeof profile === 'object' ? profile : {}
  const id = String(raw.id || raw.uid || raw.userId || raw.friendId || '')
  const username = String(raw.username || raw.userName || '').replace(/^@+/, '')
  const name = String(raw.name || raw.displayName || raw.userName || username || 'Member')
  const photo = getPersonPhoto(raw)
  const cover = getPersonCover(raw)
  const socialLinks = raw.socialLinks && typeof raw.socialLinks === 'object' ? raw.socialLinks : (raw.sociallinks && typeof raw.sociallinks === 'object' ? raw.sociallinks : {})
  const activePlatforms = Array.isArray(raw.activePlatforms) ? raw.activePlatforms : (Array.isArray(raw.socialorder) ? raw.socialorder : Object.keys(socialLinks || {}).filter(k => socialLinks[k]))
  return {
    ...raw,
    id,
    uid: String(raw.uid || id),
    userId: String(raw.userId || id),
    name,
    displayName: String(raw.displayName || name),
    username,
    photo,
    profilePhoto: photo,
    photoURL: photo,
    avatar: photo,
    image: photo,
    imageUrl: photo,
    userPhoto: photo,
    cover,
    coverImage: cover,
    coverUrl: cover,
    headerImage: cover,
    banner: cover,
    socialLinks,
    activePlatforms,
    profileTheme: raw.profileTheme && typeof raw.profileTheme === 'object' ? raw.profileTheme : (raw.customization && typeof raw.customization === 'object' ? raw.customization : null),
  }
}
