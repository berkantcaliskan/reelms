export const SOUND_CATEGORIES = [
  { key: 'dot',          label: 'Aktif sohbet mesajı' },
  { key: 'message',      label: 'Diğer / arka plan mesajı' },
  { key: 'nudge',        label: 'Dürtme' },
  { key: 'notification', label: 'Bildirim' },
  { key: 'friend',       label: 'Arkadaşlık isteği / kabul' },
  { key: 'mention',      label: '@Bahsetme' },
]

export const SOUND_DEFAULTS = {
  dot:          'Dot.wav',
  message:      'Luminara.wav',
  nudge:        'Hunted House.wav',
  notification: 'Analog Raindrop.wav',
  friend:       'Dreaming Child.wav',
  mention:      'Waves.wav',
}

const current = { ...SOUND_DEFAULTS }
const cache = {}

export function applySoundSettings(s) {
  Object.assign(current, s)
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
}
