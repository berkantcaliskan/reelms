import { mediaUploadToS3 } from '../../../reelmsAwsClient'

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

export async function prepareProfileImageUpload(file, kind = 'profile-image') {
  if (!file) return null
  const isImage = /^image\//i.test(file.type || '')
  if (!isImage) throw new Error('Only image files are supported')

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image decode failed'))
    el.src = dataUrl
  })

  const isCover = kind === 'profile-cover' || kind === 'profile-background'
  const maxSide = isCover ? 1920 : 720
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, w, h)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', isCover ? 0.86 : 0.88))
  if (!blob) return file

  const cleanName = (file.name || kind).replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], cleanName, { type: 'image/webp' })
}

export async function uploadProfileImageFile(file, kind = 'profile-image') {
  const prepared = await prepareProfileImageUpload(file, kind)
  const uploaded = await mediaUploadToS3(prepared || file)
  const url = getUploadedMediaUrl(uploaded)
  if (!url) throw new Error('Upload completed but no public media URL was returned')
  return url
}
