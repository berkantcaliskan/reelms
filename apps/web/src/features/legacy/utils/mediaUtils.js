export function normalizeMediaUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  if (/X-Amz-Algorithm=AWS4-HMAC-SHA256/i.test(raw)) return raw.split('?')[0]
  return raw
}

export function firstMediaUrl(...values) {
  for (const value of values) {
    const url = normalizeMediaUrl(value)
    if (url) return url
  }
  return null
}

export function getPersonPhoto(person) {
  if (!person || typeof person !== 'object') return null
  return firstMediaUrl(person.photo, person.profilePhoto, person.photoURL, person.avatar, person.image, person.imageUrl, person.userPhoto, person.fromPhoto)
}

export function getPersonCover(person) {
  if (!person || typeof person !== 'object') return null
  return firstMediaUrl(person.cover, person.coverImage, person.coverUrl, person.headerImage, person.banner, person.bannerImage, person.backgroundCover)
}

export function getUploadedMediaUrl(uploaded) {
  return firstMediaUrl(uploaded?.url, uploaded?.publicUrl, uploaded?.mediaUrl, uploaded?.href)
}
