import React, { useState, useEffect } from 'react'
import { normalizeMediaUrl } from '../../utils/mediaUtils'

const PROFILE_MEDIA_CACHE_NAME = 'reelms-profile-media-v2'
const profileMediaObjectUrlCache = new Map()

export function canCacheProfileMedia(src) {
  const value = String(src || '')
  return /^https?:\/\//i.test(value) && !value.startsWith('blob:') && !value.startsWith('data:') && !/(^|\.)googleusercontent\.com\//i.test(value) && !/lh3\.googleusercontent\.com/i.test(value)
}

export async function resolveCachedProfileMedia(src) {
  const value = String(src || '')
  if (!canCacheProfileMedia(value)) return value
  if (profileMediaObjectUrlCache.has(value)) return profileMediaObjectUrlCache.get(value)
  if (typeof window === 'undefined' || !window.caches || typeof fetch !== 'function') return value
  try {
    const cache = await window.caches.open(PROFILE_MEDIA_CACHE_NAME)
    const request = new Request(value, { mode: 'cors', credentials: 'omit' })
    let response = await cache.match(request).catch(() => null)
    if (!response) {
      const fresh = await fetch(request, { cache: 'force-cache' })
      if (fresh?.ok) {
        await cache.put(request, fresh.clone()).catch(() => {})
        response = fresh
      }
    }
    if (response?.ok) {
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      profileMediaObjectUrlCache.set(value, objectUrl)
      return objectUrl
    }
  } catch {}
  return value
}

export function CachedProfileImage({ src, alt = '', className = '', style, fallback = null, ...props }) {
  const safeSrc = normalizeMediaUrl(src)
  const [resolvedSrc, setResolvedSrc] = useState(safeSrc || '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const next = normalizeMediaUrl(src) || ''
    setFailed(false)
    setResolvedSrc(next)
    if (!next) return () => { alive = false }
    resolveCachedProfileMedia(next)
      .then((nextSrc) => { if (alive) setResolvedSrc(normalizeMediaUrl(nextSrc) || next) })
      .catch(() => { if (alive) setResolvedSrc(next) })
    return () => { alive = false }
  }, [src])

  if (!resolvedSrc || failed) return fallback
  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      className={`${className} cached-profile-img`.trim()}
      style={style}
      onError={(e) => { setFailed(true); props.onError?.(e) }}
    />
  )
}

export function CachedProfileCover({ src, className = '', style = {}, ...props }) {
  const safeSrc = normalizeMediaUrl(src)
  const [resolvedSrc, setResolvedSrc] = useState(safeSrc || '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const next = normalizeMediaUrl(src) || ''
    setFailed(false)
    setResolvedSrc(next)
    if (!next) return () => { alive = false }
    resolveCachedProfileMedia(next)
      .then((nextSrc) => { if (alive) setResolvedSrc(normalizeMediaUrl(nextSrc) || next) })
      .catch(() => { if (alive) setResolvedSrc(next) })
    return () => { alive = false }
  }, [src])

  const backgroundStyle = resolvedSrc && !failed ? { backgroundImage: `url("${String(resolvedSrc).replace(/"/g, '\\"')}")` } : {}
  return <div {...props} className={className} style={{ ...style, ...backgroundStyle }} onError={() => setFailed(true)} />
}
