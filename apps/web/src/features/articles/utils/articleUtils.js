export function articleReadTime(html) {
  const text = (html || '').replace(/<[^>]*>/g, ' ').trim()
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(words / 200) || 1
}
