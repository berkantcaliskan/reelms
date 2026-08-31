import { REELM_CACHE, patchReelmCache, scheduleReelmPersist } from '../../../reelmsAwsClient'

function _reelmKey(reelmId) {
  return reelmId || 'global'
}

export function getArticles(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.articles ?? []
}

export function saveArticle(article, reelmId) {
  const id = _reelmKey(reelmId)
  const arts = [article, ...getArticles(id)]
  patchReelmCache(id, { articles: arts })
  scheduleReelmPersist(id, 'articles', arts)
}

export function updateArticle(articleId, updates, reelmId) {
  const id = _reelmKey(reelmId)
  const arts = getArticles(id).map(a => a.id === articleId ? { ...a, ...updates } : a)
  patchReelmCache(id, { articles: arts })
  scheduleReelmPersist(id, 'articles', arts)
}

export function deleteArticle(articleId, reelmId) {
  const id = _reelmKey(reelmId)
  const arts = getArticles(id).filter(a => a.id !== articleId)
  patchReelmCache(id, { articles: arts })
  scheduleReelmPersist(id, 'articles', arts)
}

export function getArticleDrafts(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.article_drafts ?? []
}

export function saveArticleDraft(draft, reelmId) {
  const id = _reelmKey(reelmId)
  const drafts = [draft, ...getArticleDrafts(id).filter(d => d.id !== draft.id)]
  patchReelmCache(id, { article_drafts: drafts })
  scheduleReelmPersist(id, 'article_drafts', drafts)
}

export function deleteArticleDraft(draftId, reelmId) {
  const id = _reelmKey(reelmId)
  const drafts = getArticleDrafts(id).filter(d => d.id !== draftId)
  patchReelmCache(id, { article_drafts: drafts })
  scheduleReelmPersist(id, 'article_drafts', drafts)
}

export function getThreads(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.threads ?? []
}

export function saveThread(thread, reelmId) {
  const id = _reelmKey(reelmId)
  const t = [thread, ...getThreads(id)]
  patchReelmCache(id, { threads: t })
  scheduleReelmPersist(id, 'threads', t)
}

export function updateThread(threadId, updates, reelmId) {
  const id = _reelmKey(reelmId)
  const t = getThreads(id).map(x => x.id === threadId ? { ...x, ...updates } : x)
  patchReelmCache(id, { threads: t })
  scheduleReelmPersist(id, 'threads', t)
}

export function deleteThread(threadId, reelmId) {
  const id = _reelmKey(reelmId)
  const t = getThreads(id).filter(x => x.id !== threadId)
  patchReelmCache(id, { threads: t })
  scheduleReelmPersist(id, 'threads', t)
}

export function getNews(reelmId) {
  return REELM_CACHE[_reelmKey(reelmId)]?.news ?? []
}

export function saveNews(item, reelmId) {
  const id = _reelmKey(reelmId)
  const n = [item, ...getNews(id)]
  patchReelmCache(id, { news: n })
  scheduleReelmPersist(id, 'news', n)
}

export function updateNews(newsId, updates, reelmId) {
  const id = _reelmKey(reelmId)
  const n = getNews(id).map(x => x.id === newsId ? { ...x, ...updates } : x)
  patchReelmCache(id, { news: n })
  scheduleReelmPersist(id, 'news', n)
}

export function deleteNews(newsId, reelmId) {
  const id = _reelmKey(reelmId)
  const n = getNews(id).filter(x => x.id !== newsId)
  patchReelmCache(id, { news: n })
  scheduleReelmPersist(id, 'news', n)
}

export function timeAgo(ts) {
  const d = (Date.now() - new Date(ts)) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export function formatPostDate(ts) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (diff < 60000) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days <= 7) return `${days}d ago`
  const d = new Date(ts)
  const postYear = d.getFullYear()
  const thisYear = new Date(now).getFullYear()
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${postYear < thisYear ? ' ' + postYear : ''}`
}
