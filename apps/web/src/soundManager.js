export const SOUND_CATEGORIES = [
  { key: 'dot',          label: 'Aktif sohbet mesajı' },
  { key: 'message',      label: 'Diğer / arka plan mesajı' },
  { key: 'nudge',        label: 'Dürtme' },
  { key: 'notification', label: 'Bildirim' },
  { key: 'friend',       label: 'Arkadaşlık isteği / kabul' },
  { key: 'mention',      label: '@Bahsetme' },
  { key: 'voiceJoin',    label: 'Odaya giriş' },
  { key: 'voiceLeave',   label: 'Odadan çıkış' },
]

export const SOUND_DEFAULTS = {
  dot:          'Dot.wav',
  message:      'Luminara.wav',
  nudge:        'Hunted House.wav',
  notification: 'Analog Raindrop.wav',
  friend:       'Dreaming Child.wav',
  mention:      'Waves.wav',
  voiceJoin:    'Raindrops.wav',
  voiceLeave:   'Analog Raindrop.wav',
}

const current = { ...SOUND_DEFAULTS }
const cache = {}

export function applySoundSettings(s) {
  Object.assign(current, s)
  preloadSounds()
}

function getAudio(key) {
  const file = current[key]
  if (!file) return null
  if (!cache[file]) {
    const a = new Audio(`/sounds/${encodeURIComponent(file)}`)
    a.preload = 'auto'
    cache[file] = a
  }
  return cache[file]
}

export function preloadSounds() {
  try {
    Object.keys(current).forEach((key) => {
      const audio = getAudio(key)
      if (audio) audio.load?.()
    })
  } catch { /* ignore */ }
}

let unlocked = false
export function unlockSounds() {
  if (unlocked) return
  try {
    preloadSounds()
    const audio = getAudio('dot') || getAudio('message')
    if (!audio) return
    const wasMuted = audio.muted
    audio.muted = true
    audio.currentTime = 0
    audio.play().then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.muted = wasMuted
      unlocked = true
    }).catch(() => { audio.muted = wasMuted })
  } catch { /* ignore */ }
}

function play(key) {
  try {
    const a = getAudio(key)
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {})
  } catch { /* ignore */ }
}

export function previewSound(file) {
  try {
    const a = new Audio(`/sounds/${encodeURIComponent(file)}`)
    a.play().catch(() => {})
  } catch { /* ignore */ }
}

export const playSound = {
  dot:          () => play('dot'),
  message:      () => play('message'),
  notification: () => play('notification'),
  nudge:        () => play('nudge'),
  friend:       () => play('friend'),
  mention:      () => play('mention'),
  voiceJoin:    () => play('voiceJoin'),
  voiceLeave:   () => play('voiceLeave'),
}
