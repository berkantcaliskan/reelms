import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { appGetDoc, scheduleAppPersist, loadReelmDocuments, scheduleReelmPersist, REELM_CACHE } from '../../../reelmsAwsClient'
import { moderateText } from '../../../moderationClient'
import { getPersonPhoto } from '../../legacy/utils/mediaUtils'
import { ARTICLE_CATEGORIES } from '../../articles/constants/articleConstants'
import { ArticleEditor } from '../../articles/components/ArticleEditor'
import { ArticleView } from '../../articles/components/ArticleView'
import { articleReadTime } from '../../articles/utils/articleUtils'
import {
  getArticles, saveArticle, updateArticle, deleteArticle,
  getArticleDrafts, saveArticleDraft, deleteArticleDraft,
  getThreads, saveThread, updateThread,
  getNews, saveNews, updateNews, deleteNews,
  timeAgo, formatPostDate
} from '../utils/feedStorageUtils'
import likePostIcon from '../../../assets/icons/likepost-icon_reelms.svg'
import commentPostIcon from '../../../assets/icons/commentpost-icon.svg'
import resharePostIcon from '../../../assets/icons/resharepost-icon_reelms.svg'
import forwardPostIcon from '../../../assets/icons/forwardpost-icon_reelms.svg'
import newIcon from '../../../assets/icons/new-icon.svg'

export function FeedPage({ currentUser, uid, tab, selectedReelm, isMod, onReport, onModDeletePost, modDeleteTick, appStoriesTick, onShare, pushNotifTo }) {
  const reelmId = selectedReelm?.id || 'global'
  const NEWS_CATEGORIES = ['World', 'Technology', 'Science', 'Health', 'Business', 'Culture', 'Sports', 'Politics']
  const STORY_DUR = 8000

  const getUserRole = (userId) => {
    if (!selectedReelm) return null
    const members = selectedReelm.members || []
    const member = members.find(m => m.userId === userId)
    if (!member || !(member.roleIds || []).length) return null
    const roles = selectedReelm.roles || []
    const role = roles.find(r => member.roleIds.includes(r.id))
    return role ? role.name : null
  }

  const [stories, setStories] = useState([])
  const skipStoriesPersist = useRef(true)
  const skipPostsPersist = useRef(true)
  const [viewingGroup, setViewingGroup] = useState(null) // { groupIndex, storyIndex }
  const [showAddStory, setShowAddStory] = useState(false)
  const [addType, setAddType] = useState(null) // 'text' | 'photo' | 'video'
  const [storyText, setStoryText] = useState('')
  const [storyBg, setStoryBg] = useState('#2d1f2e')
  const [storyDuration, setStoryDuration] = useState(24)
  const [storyMedia, setStoryMedia] = useState(null)
  const storyFileInputRef = useRef(null)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [articleCat, setArticleCat] = useState(null)
  const [articleCatOpen, setArticleCatOpen] = useState(null)
  const [articleCatExpanded, setArticleCatExpanded] = useState(false)
  const [articleCatSearch, setArticleCatSearch] = useState(false)
  const [articleCatSearchText, setArticleCatSearchText] = useState('')
  const [articles, setArticles] = useState(() => getArticles(reelmId))
  const [openArticleMenu, setOpenArticleMenu] = useState(null)
  const [articleEditorOpen, setArticleEditorOpen] = useState(false)
  const [editorDraftId, setEditorDraftId] = useState(null)
  const [editorInitContent, setEditorInitContent] = useState(null)
  const [articleDrafts, setArticleDrafts] = useState(() => getArticleDrafts(reelmId))
  const [showDrafts, setShowDrafts] = useState(false)
  const [viewingArticle, setViewingArticle] = useState(null)
  const [linkWarning, setLinkWarning] = useState(null)
  const [openArticleComments, setOpenArticleComments] = useState(null)
  const [articleCommentText, setArticleCommentText] = useState('')
  const [threads, setThreads] = useState(() => getThreads(reelmId))
  const [newsItems, setNewsItems] = useState(() => getNews(reelmId))
  const [newNewsTitle, setNewNewsTitle] = useState('')
  const [newNewsBody, setNewNewsBody] = useState('')
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [newsCat, setNewsCat] = useState(null)
  const [newsSort, setNewsSort] = useState('newest')
  const [openNewsMenu, setOpenNewsMenu] = useState(null)
  const [openNewsComments, setOpenNewsComments] = useState(null)
  const [newsCommentText, setNewsCommentText] = useState('')
  const [forumTag, setForumTag] = useState(null)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadBody, setNewThreadBody] = useState('')
  const [newThreadTags, setNewThreadTags] = useState('')
  const [viewingThread, setViewingThread] = useState(null)
  const [threadReplyText, setThreadReplyText] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [nestedReplyTexts, setNestedReplyTexts] = useState({})

  const addNestedReply = (replies, parentId, newReply) => replies.map(r => {
    if (r.id === parentId) return { ...r, replies: [...(r.replies || []), newReply] }
    if ((r.replies || []).length > 0) return { ...r, replies: addNestedReply(r.replies, parentId, newReply) }
    return r
  })
  const [feedSort, setFeedSort] = useState('newest')
  const [feedDisplay, setFeedDisplay] = useState('posts')
  const [feedComposerExpanded, setFeedComposerExpanded] = useState(false)
  const [feedSortOpen, setFeedSortOpen] = useState(false)
  const [feedDisplayOpen, setFeedDisplayOpen] = useState(false)
  const [postText, setPostText] = useState('')
  const [feedModerationWarning, setFeedModerationWarning] = useState('')
  const [posts, setPosts] = useState([])
  const feedComposerRef = useRef(null)
  const feedSortRef = useRef(null)
  const feedDisplayRef = useRef(null)

  const FEED_SORT_OPTIONS = [
    { id: 'newest', label: 'Newest' },
    { id: 'oldest', label: 'Oldest' },
    { id: 'popular', label: 'Popular' },
    { id: 'related', label: 'Related' },
  ]

  const FEED_DISPLAY_OPTIONS = [
    { id: 'posts', label: 'Posts only' },
    { id: 'posts-forums', label: 'Posts + Forums' },
    { id: 'posts-articles', label: 'Posts + Articles' },
    { id: 'everything', label: 'Everything' },
  ]

  useEffect(() => {
    const handleFeedClickOutside = (e) => {
      if (feedComposerRef.current && !feedComposerRef.current.contains(e.target)) {
        if (!postText.trim()) {
          setFeedComposerExpanded(false)
          setShowPlusMenu(false)
        }
      }
      if (feedSortRef.current && !feedSortRef.current.contains(e.target)) {
        setFeedSortOpen(false)
      }
      if (feedDisplayRef.current && !feedDisplayRef.current.contains(e.target)) {
        setFeedDisplayOpen(false)
      }
    }
    document.addEventListener('mousedown', handleFeedClickOutside)
    return () => document.removeEventListener('mousedown', handleFeedClickOutside)
  }, [postText])

  useEffect(() => {
    if (uid === 'guest') {
      setStories([])
      skipStoriesPersist.current = true
      return undefined
    }
    let cancelled = false
    const isInitialSync = appStoriesTick === 0
    if (isInitialSync) skipStoriesPersist.current = true
    appGetDoc('stories')
      .then((s) => {
        if (cancelled) return
        setStories(Array.isArray(s) ? s : [])
        if (isInitialSync) skipStoriesPersist.current = false
      })
      .catch(() => {
        if (!cancelled && isInitialSync) skipStoriesPersist.current = false
      })
    return () => { cancelled = true }
  }, [uid, appStoriesTick])

  useEffect(() => {
    let cancelled = false
    skipPostsPersist.current = true
    const id = reelmId || 'global'
    loadReelmDocuments(id)
      .then(() => {
        if (cancelled) return
        const fp = REELM_CACHE[id]?.feed_posts
        setPosts(Array.isArray(fp) ? fp : [])
        skipPostsPersist.current = false
      })
      .catch(() => {
        if (!cancelled) skipPostsPersist.current = false
      })
    return () => { cancelled = true }
  }, [reelmId])

  useEffect(() => {
    if (modDeleteTick <= 0) return
    const id = reelmId || 'global'
    const cache = REELM_CACHE[id] || {}
    if (Array.isArray(cache.feed_posts)) setPosts(cache.feed_posts)
    if (Array.isArray(cache.articles)) setArticles(cache.articles)
    if (Array.isArray(cache.threads)) setThreads(cache.threads)
    if (Array.isArray(cache.news)) setNewsItems(cache.news)
  }, [modDeleteTick, reelmId])

  const [storyElapsed, setStoryElapsed] = useState(0)
  const [storyDurationMs, setStoryDurationMs] = useState(STORY_DUR)
  const storyGroupsRef = useRef([])
  const storiesRowRef = useRef(null)
  const [storiesEdge, setStoriesEdge] = useState({ left: false, right: true })

  const checkStoriesEdge = () => {
    const el = storiesRowRef.current
    if (!el) return
    setStoriesEdge({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    })
  }

  useEffect(() => {
    const el = storiesRowRef.current
    if (!el) return
    checkStoriesEdge()
    el.addEventListener('scroll', checkStoriesEdge)
    const ro = new ResizeObserver(checkStoriesEdge)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkStoriesEdge); ro.disconnect() }
  }, [])

  const [commentDrafts, setCommentDrafts] = useState({})
  const [replyDrafts, setReplyDrafts] = useState({})
  const [openPostMenu, setOpenPostMenu] = useState(null)
  const [openCommentMenu, setOpenCommentMenu] = useState(null)
  const [forwardPost, setForwardPost] = useState(null)
  const [forwardCopied, setForwardCopied] = useState(false)

  useEffect(() => {
    const handler = () => { setOpenPostMenu(null); setOpenCommentMenu(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const reelmLabel = selectedReelm?.name || 'a reelm'
  const togglePostLike = (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const likes = p.likes || []
      const wasLiked = likes.includes(uid)
      if (!wasLiked && String(p.userId) !== String(uid) && pushNotifTo) {
        const snippet = (p.text || '').trim().slice(0, 50)
        const tail = snippet ? `: "${snippet}${snippet.length >= 50 ? '…' : ''}"` : ''
        pushNotifTo(p.userId, `${currentUser.name} liked your post in ${reelmLabel}${tail}.`)
      }
      return { ...p, likes: wasLiked ? likes.filter(x => x !== uid) : [...likes, uid] }
    }))
  }
  const toggleCommentLike = (postId, commentId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, comments: (p.comments || []).map(c => {
        if (c.id !== commentId) return c
        const likes = c.likes || []
        const wasLiked = likes.includes(uid)
        if (!wasLiked && String(c.userId) !== String(uid) && pushNotifTo) {
          pushNotifTo(c.userId, `${currentUser.name} liked your comment in ${reelmLabel}.`)
        }
        return { ...c, likes: wasLiked ? likes.filter(x => x !== uid) : [...likes, uid] }
      })}
    }))
  }
  const toggleReplyLike = (postId, commentId, replyId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, comments: (p.comments || []).map(c => {
        if (c.id !== commentId) return c
        return { ...c, replies: (c.replies || []).map(r => {
          if (r.id !== replyId) return r
          const likes = r.likes || []
          const wasLiked = likes.includes(uid)
          if (!wasLiked && String(r.userId) !== String(uid) && pushNotifTo) {
            pushNotifTo(r.userId, `${currentUser.name} liked your reply in ${reelmLabel}.`)
          }
          return { ...r, likes: wasLiked ? likes.filter(x => x !== uid) : [...likes, uid] }
        })}
      })}
    }))
  }
  const addComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim()
    if (!text) return
    const mod = await moderateText(text, selectedReelm?.ageRating)
    if (!mod.allowed) {
      setFeedModerationWarning(mod.message || 'Blocked.')
      setTimeout(() => setFeedModerationWarning(''), 5000)
      return
    }
    const c = { id: Date.now().toString(), userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, text, createdAt: Date.now(), likes: [], replies: [] }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      if (String(p.userId) !== String(uid) && pushNotifTo) {
        pushNotifTo(p.userId, `${currentUser.name} commented on your post in ${reelmLabel}.`)
      }
      return { ...p, comments: [...(p.comments || []), c] }
    }))
    setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
  }
  const addReply = async (postId, commentId) => {
    const text = (replyDrafts[commentId] || '').trim()
    if (!text) return
    const mod = await moderateText(text, selectedReelm?.ageRating)
    if (!mod.allowed) {
      setFeedModerationWarning(mod.message || 'Blocked.')
      setTimeout(() => setFeedModerationWarning(''), 5000)
      return
    }
    const r = { id: Date.now().toString(), userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, text, createdAt: Date.now(), likes: [] }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      return { ...p, comments: (p.comments || []).map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), r] } : c) }
    }))
    setReplyDrafts(prev => ({ ...prev, [commentId]: '' }))
  }
  const handleSharePost = async () => {
    if (!postText.trim()) return
    const mod = await moderateText(postText, selectedReelm?.ageRating)
    if (!mod.allowed) {
      setFeedModerationWarning(mod.message || 'Blocked.')
      setTimeout(() => setFeedModerationWarning(''), 5000)
      return
    }
    const newPost = { id: Date.now().toString(), userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, text: postText.trim(), createdAt: Date.now(), likes: [], comments: [] }
    setPosts(prev => [newPost, ...prev])
    setPostText('')
    setFeedComposerExpanded(false)
    setShowPlusMenu(false)
  }

  useEffect(() => {
    if (skipStoriesPersist.current || uid === 'guest') return
    scheduleAppPersist('stories', stories)
  }, [stories, uid])

  useEffect(() => {
    if (skipPostsPersist.current) return
    scheduleReelmPersist(reelmId, 'feed_posts', posts)
  }, [posts, reelmId])

  const storyGroups = useMemo(() => {
    const now = Date.now()
    const active = stories.filter(s => s.expiresAt > now)
    const map = new Map()
    active.forEach(s => {
      if (!map.has(s.userId)) map.set(s.userId, [])
      map.get(s.userId).push(s)
    })
    const arr = []
    if (map.has(uid)) arr.push(map.get(uid))
    map.forEach((g, userId) => { if (userId !== uid) arr.push(g) })
    return arr
  }, [stories, uid])

  useEffect(() => { storyGroupsRef.current = storyGroups }, [storyGroups])

  useEffect(() => {
    if (tab !== 'news') return
    const canvas = document.getElementById(`news-particles-${selectedReelm?.id}`)
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const catPoints = () => {
      const pts = []
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        pts.push({ x: Math.cos(a) * 18, y: Math.sin(a) * 16 })
      }
      pts.push({ x: -12, y: -18 }, { x: -16, y: -26 }, { x: -8, y: -22 })
      pts.push({ x: 12, y: -18 }, { x: 16, y: -26 }, { x: 8, y: -22 })
      return pts
    }
    const shape = catPoints()

    for (let i = 0; i < 22; i++) {
      const pt = shape[Math.floor(Math.random() * shape.length)]
      const scale = 0.8 + Math.random() * 1.8
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        ox: pt.x * scale, oy: pt.y * scale,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.18 - Math.random() * 0.22,
        alpha: 0,
        targetAlpha: 0.04 + Math.random() * 0.07,
        r: 2 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    canvas.style.opacity = '1'

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() / 1000
      particles.forEach(p => {
        p.alpha += (p.targetAlpha - p.alpha) * 0.02
        p.x += p.vx + Math.sin(t * 0.4 + p.phase) * 0.15
        p.y += p.vy
        if (p.y < -40) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.arc(p.x + p.ox * 0.06, p.y + p.oy * 0.06, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(185,152,135,${p.alpha})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      canvas.style.opacity = '0'
    }
  }, [tab, selectedReelm?.id])

  const currentStory = viewingGroup
    ? storyGroups[viewingGroup.groupIndex]?.[viewingGroup.storyIndex]
    : null

  useEffect(() => {
    if (!viewingGroup || !currentStory) return
    if (currentStory.type === 'video') return
    setStoryElapsed(0)
    setStoryDurationMs(STORY_DUR)
    const startTime = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed >= STORY_DUR) {
        clearInterval(id)
        setViewingGroup(prev => {
          if (!prev) return null
          const { groupIndex, storyIndex } = prev
          const groups = storyGroupsRef.current
          const group = groups[groupIndex]
          if (!group) return null
          if (storyIndex < group.length - 1) return { groupIndex, storyIndex: storyIndex + 1 }
          if (groupIndex < groups.length - 1) return { groupIndex: groupIndex + 1, storyIndex: 0 }
          return null
        })
      } else {
        setStoryElapsed(elapsed)
      }
    }, 100)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingGroup?.groupIndex, viewingGroup?.storyIndex])

  const goNextStory = () => {
    setViewingGroup(prev => {
      if (!prev) return null
      const { groupIndex, storyIndex } = prev
      const groups = storyGroupsRef.current
      const group = groups[groupIndex]
      if (!group) return null
      if (storyIndex < group.length - 1) return { groupIndex, storyIndex: storyIndex + 1 }
      if (groupIndex < groups.length - 1) return { groupIndex: groupIndex + 1, storyIndex: 0 }
      return null
    })
  }

  const goPrevStory = () => {
    setViewingGroup(prev => {
      if (!prev) return null
      const { groupIndex, storyIndex } = prev
      const groups = storyGroupsRef.current
      if (storyIndex > 0) return { groupIndex, storyIndex: storyIndex - 1 }
      if (groupIndex > 0) {
        const prevGroup = groups[groupIndex - 1]
        if (!prevGroup) return prev
        return { groupIndex: groupIndex - 1, storyIndex: prevGroup.length - 1 }
      }
      return prev
    })
  }

  const addStory = () => {
    const now = Date.now()
    const story = {
      id: now.toString(),
      userId: uid,
      userName: currentUser.name,
      userPhoto: currentUser.photo || null,
      type: addType === 'text' ? 'text' : storyMedia?.type === 'video' ? 'video' : 'image',
      content: addType === 'text' ? storyText : storyMedia?.url,
      backgroundColor: addType === 'text' ? storyBg : null,
      duration: storyDuration,
      createdAt: now,
      expiresAt: now + storyDuration * 60 * 60 * 1000,
      likes: [],
    }
    setStories(prev => [story, ...prev])
    setShowAddStory(false)
    setAddType(null)
    setStoryText('')
    setStoryMedia(null)
  }

  const likeStory = (storyId) => {
    setStories(prev => prev.map(s => {
      if (s.id !== storyId) return s
      const liked = (s.likes || []).includes(uid)
      return { ...s, likes: liked ? (s.likes || []).filter(l => l !== uid) : [...(s.likes || []), uid] }
    }))
  }

  const RADIUS = 13
  const CIRC = 2 * Math.PI * RADIUS
  const progress = currentStory?.type === 'video'
    ? (storyDurationMs > 0 ? storyElapsed / storyDurationMs : 0)
    : storyElapsed / STORY_DUR
  const strokeOffset = CIRC * progress

  return (
    <div className="panel panel-middle feed-page">
      {/* Story Viewer Overlay */}
      {viewingGroup !== null && currentStory && (
        <div className="story-viewer-overlay" onClick={() => setViewingGroup(null)}>
          <div className="story-viewer-window" onClick={e => e.stopPropagation()}>
            {/* Progress bars */}
            <div className="story-progress-bars">
              {(storyGroups[viewingGroup.groupIndex] || []).map((s, i) => (
                <div key={s.id} className="story-progress-track">
                  <div className="story-progress-fill" style={{
                    width: i < viewingGroup.storyIndex
                      ? '100%'
                      : i === viewingGroup.storyIndex
                        ? `${Math.min(100, progress * 100)}%`
                        : '0%'
                  }} />
                </div>
              ))}
            </div>
            {/* Top bar */}
            <div className="story-viewer-top">
              <div className="story-viewer-user">
                <div className="story-viewer-avatar">
                  {currentStory.userPhoto
                    ? <img src={currentStory.userPhoto} alt="" />
                    : <span>{(currentStory.userName || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <span className="story-viewer-name">{currentStory.userName}</span>
              </div>
              <div className="story-countdown">
                <svg width={RADIUS * 2 + 8} height={RADIUS * 2 + 8}>
                  <circle cx={RADIUS + 4} cy={RADIUS + 4} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                  <circle
                    cx={RADIUS + 4} cy={RADIUS + 4} r={RADIUS}
                    fill="none" stroke="white" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={strokeOffset}
                    transform={`rotate(-90 ${RADIUS + 4} ${RADIUS + 4})`}
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                  />
                </svg>
              </div>
              <button className="story-close-btn" onClick={() => setViewingGroup(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {/* Story content */}
            {currentStory.type === 'text' && (
              <div className="story-content-text" style={{ background: currentStory.backgroundColor || '#2d1f2e' }}>
                <p className="story-text-content">{currentStory.content}</p>
              </div>
            )}
            {currentStory.type === 'image' && (
              <img src={currentStory.content} className="story-content-media" alt="" />
            )}
            {currentStory.type === 'video' && (
              <video
                src={currentStory.content}
                className="story-content-media"
                autoPlay
                playsInline
                onTimeUpdate={e => {
                  const v = e.target
                  if (v.duration && v.duration !== Infinity) {
                    setStoryDurationMs(v.duration * 1000)
                    setStoryElapsed(v.currentTime * 1000)
                  }
                }}
                onEnded={goNextStory}
              />
            )}
            {/* Navigation zones */}
            <div className="story-nav story-nav-prev" onClick={e => { e.stopPropagation(); goPrevStory() }} />
            <div className="story-nav story-nav-next" onClick={e => { e.stopPropagation(); goNextStory() }} />
            {/* Bottom respond pill */}
            <div className="story-bottom">
              <div className="story-respond-pill">
                <span className="story-respond-placeholder">Respond to this story</span>
                <button
                  className={`story-like-btn${(currentStory.likes || []).includes(uid) ? ' liked' : ''}`}
                  onClick={e => { e.stopPropagation(); likeStory(currentStory.id) }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"
                    fill={(currentStory.likes || []).includes(uid) ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Story Modal */}
      {showAddStory && (
        <div className="story-viewer-overlay" onClick={() => { setShowAddStory(false); setAddType(null); setStoryText(''); setStoryMedia(null) }}>
          <div className="add-story-modal" onClick={e => e.stopPropagation()}>
            <button className="story-close-btn add-story-close" onClick={() => { setShowAddStory(false); setAddType(null); setStoryText(''); setStoryMedia(null) }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {!addType ? (
              <div className="add-story-choose">
                <h3>Add to your story</h3>
                <div className="add-story-options">
                  <button className="add-story-option" onClick={() => setAddType('text')}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 6h16M4 12h10M4 18h14"/>
                    </svg>
                    <span>Text</span>
                  </button>
                  <button className="add-story-option" onClick={() => storyFileInputRef.current?.click()}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>Photo / Video</span>
                  </button>
                </div>
                <input
                  ref={storyFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const r = new FileReader()
                    r.onload = ev => {
                      setStoryMedia({ url: ev.target.result, type: file.type.startsWith('video/') ? 'video' : 'image' })
                      setAddType(file.type.startsWith('video/') ? 'video' : 'photo')
                    }
                    r.readAsDataURL(file)
                  }}
                />
              </div>
            ) : addType === 'text' ? (
              <div className="add-story-editor">
                <div className="add-story-preview" style={{ background: storyBg }}>
                  <textarea
                    className="add-story-textarea"
                    placeholder="What's on your mind?"
                    value={storyText}
                    onChange={e => setStoryText(e.target.value)}
                    autoFocus
                    maxLength={200}
                  />
                </div>
                <div className="add-story-bg-row">
                  {['#2d1f2e', '#1a1428', '#0c0c20', '#1a2e1f', '#2e1a1a', '#1a2328', '#2e2a1a'].map(c => (
                    <button key={c} className={`add-story-bg-btn${storyBg === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setStoryBg(c)} />
                  ))}
                </div>
                <div className="add-story-dur-row">
                  <span>Visible for</span>
                  {[8, 12, 24, 48].map(d => (
                    <button key={d} className={`add-story-dur-btn${storyDuration === d ? ' active' : ''}`} onClick={() => setStoryDuration(d)}>{d}h</button>
                  ))}
                </div>
                <button className="add-story-submit" onClick={addStory} disabled={!storyText.trim()}>Share Story</button>
              </div>
            ) : storyMedia ? (
              <div className="add-story-editor">
                <div className="add-story-preview add-story-preview-media">
                  {storyMedia.type === 'video'
                    ? <video src={storyMedia.url} controls className="add-story-media-el" />
                    : <img src={storyMedia.url} className="add-story-media-el" alt="" />
                  }
                </div>
                <div className="add-story-dur-row">
                  <span>Visible for</span>
                  {[8, 12, 24, 48].map(d => (
                    <button key={d} className={`add-story-dur-btn${storyDuration === d ? ' active' : ''}`} onClick={() => setStoryDuration(d)}>{d}h</button>
                  ))}
                </div>
                <button className="add-story-submit" onClick={addStory}>Share Story</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Feed inner content */}
      {tab === 'articles' ? (
        <>
        <div className="articles-page">
          {/* Header */}
          <div className="articles-header-row">
            <span className="articles-title">Articles</span>
            <div className="articles-header-actions">
              <button className={`articles-drafts-btn${showDrafts ? ' active' : ''}`} title="Drafts" onClick={() => setShowDrafts(v => !v)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button className="articles-new-btn" onClick={() => { setEditorDraftId(null); setEditorInitContent(null); setArticleEditorOpen(true) }}>
                <img src={newIcon} alt="New article" />
              </button>
            </div>
          </div>

          {/* Drafts panel */}
          {showDrafts && (
            <div className="articles-drafts-panel">
              <span className="articles-drafts-title">Drafts</span>
              {articleDrafts.length === 0
                ? <p className="articles-drafts-empty">No drafts saved.</p>
                : articleDrafts.map(draft => (
                  <div key={draft.id} className="articles-draft-item">
                    <div className="articles-draft-item-text" onClick={() => { setEditorDraftId(draft.id); setEditorInitContent(draft); setArticleEditorOpen(true); setShowDrafts(false) }}>
                      <span className="articles-draft-item-title">{draft.title || 'Untitled'}</span>
                      <span className="articles-draft-item-date">{new Date(draft.savedAt).toLocaleDateString()}</span>
                    </div>
                    <button className="articles-draft-item-del" onClick={() => { deleteArticleDraft(draft.id, reelmId); setArticleDrafts(getArticleDrafts(reelmId)) }} title="Delete">✕</button>
                  </div>
                ))
              }
            </div>
          )}

          {/* Category bar */}
          <div className="articles-cat-bar">
            <div className={`articles-cat-pills${articleCatExpanded ? ' expanded' : ''}`}>
              {ARTICLE_CATEGORIES
                .filter(cat => !articleCatSearchText || cat.label.toLowerCase().includes(articleCatSearchText.toLowerCase()))
                .map(cat => (
                  <button
                    key={cat.id}
                    className={`articles-cat-pill${articleCat === cat.id ? ' active' : ''}`}
                    onClick={() => setArticleCat(articleCat === cat.id ? null : cat.id)}
                  >
                    {cat.label}
                    {cat.subs && (
                      <span
                        className={`articles-cat-chevron${articleCatOpen === cat.id ? ' open' : ''}`}
                        onClick={e => { e.stopPropagation(); setArticleCatOpen(articleCatOpen === cat.id ? null : cat.id) }}
                      >
                        <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
                          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))
              }
            </div>
            <div className="articles-cat-controls">
              <button
                className={`articles-cat-expand-btn${articleCatExpanded ? ' open' : ''}`}
                onClick={() => setArticleCatExpanded(v => !v)}
                title={articleCatExpanded ? 'Show less' : 'Show more'}
              >
                <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
                  <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className={`articles-cat-search-btn${articleCatSearch ? ' active' : ''}`}
                onClick={() => { setArticleCatSearch(v => !v); setArticleCatSearchText('') }}
                title="Search categories"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Sub-category pills */}
          {articleCatOpen && (
            <div className="articles-sub-pills">
              {ARTICLE_CATEGORIES.find(c => c.id === articleCatOpen)?.subs?.map(sub => (
                <button
                  key={sub.id}
                  className={`articles-cat-pill articles-sub-pill${articleCat === sub.id ? ' active' : ''}`}
                  onClick={() => setArticleCat(articleCat === sub.id ? null : sub.id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Category search input */}
          {articleCatSearch && (
            <input
              className="articles-cat-search-input"
              placeholder="Search categories..."
              value={articleCatSearchText}
              onChange={e => setArticleCatSearchText(e.target.value)}
              autoFocus
            />
          )}

          {/* Articles content */}
          <div className="articles-content">
            {articles.length === 0
              ? <p className="articles-empty">No articles yet.</p>
              : articles
                  .filter(a => !articleCat || a.category === articleCat)
                  .map(article => {
                    const rawText = (article.contentHtml || article.content || '').replace(/<[^>]*>/g, ' ')
                    const firstParagraph = rawText.trim().split(/\n+/).find(l => l.trim()) || rawText.trim().slice(0, 300)
                    const mins = articleReadTime(article.contentHtml || article.content || '')
                    const isLiked = (article.likes || []).includes(uid)
                    return (
                      <div key={article.id} className="article-card" onClick={() => setViewingArticle(article)}>
                        {/* Header pill */}
                        <div className="feed-post-pill" onClick={e => e.stopPropagation()}>
                          <div className="feed-post-pill-avatar">
                            {article.userPhoto ? <img src={article.userPhoto} alt="" /> : <span>{(article.userName || '?')[0].toUpperCase()}</span>}
                          </div>
                          <div className="feed-post-pill-meta">
                            <div className="feed-post-pill-top">
                              <span className="feed-post-pill-name">{article.userName}</span>
                              <div className="feed-post-menu-wrap">
                                <button className="feed-post-menu-btn" onClick={e => { e.stopPropagation(); setOpenArticleMenu(openArticleMenu === article.id ? null : article.id) }}>
                                  <svg width="3" height="11" viewBox="0 0 3 11" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="1.5" cy="5.5" r="1.3"/><circle cx="1.5" cy="9.5" r="1.3"/></svg>
                                </button>
                                {openArticleMenu === article.id && (
                                  <div className="feed-post-menu-dropdown">
                                    {isMod
                                      ? <button className="feed-post-menu-item feed-post-menu-danger" onClick={e => { e.stopPropagation(); setOpenArticleMenu(null); deleteArticle(article.id, reelmId); setArticles(getArticles(reelmId)) }}>Delete article</button>
                                      : <button className="feed-post-menu-item" onClick={e => { e.stopPropagation(); setOpenArticleMenu(null); onReport && onReport('article', article.id, article.title, article.userId, article.userName, '') }}>Report</button>
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="feed-post-pill-bottom">{formatPostDate(article.createdAt)}</div>
                          </div>
                        </div>

                        {/* Body: text left, cover right */}
                        <div className="article-card-body">
                          <div className="article-card-text">
                            <h2 className="article-card-title">{article.title}</h2>
                            {firstParagraph && (
                              <p className="article-card-excerpt">
                                {firstParagraph}
                                <span className="article-card-readtime"> · {mins}d okuma</span>
                              </p>
                            )}
                          </div>
                          {article.coverImage && (
                            <div className="article-card-cover">
                              <img src={article.coverImage} alt="" />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="feed-post-actions article-card-actions" onClick={e => e.stopPropagation()}>
                          <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={() => {
                            const likes = isLiked ? (article.likes || []).filter(l => l !== uid) : [...(article.likes || []), uid]
                            updateArticle(article.id, { likes }, reelmId)
                            setArticles(getArticles(reelmId))
                          }}>
                            <img src={likePostIcon} alt="like" className="feed-post-action-icon" />
                            <span>{(article.likes || []).length || ''}</span>
                          </button>
                          <button className="feed-post-action-btn" onClick={() => setOpenArticleComments(openArticleComments === article.id ? null : article.id)}>
                            <img src={commentPostIcon} alt="comment" className="feed-post-action-icon" />
                            <span>{(article.comments || []).length || ''}</span>
                          </button>
                          <button className="feed-post-action-btn">
                            <img src={resharePostIcon} alt="reshare" className="feed-post-action-icon" />
                          </button>
                          <button className="feed-post-action-btn">
                            <img src={forwardPostIcon} alt="forward" className="feed-post-action-icon" />
                          </button>
                        </div>

                        {/* Comments */}
                        {openArticleComments === article.id && (
                          <div className="feed-post-comments article-card-comments" onClick={e => e.stopPropagation()}>
                            {(article.comments || []).map(c => (
                              <div key={c.id} className="feed-comment-pill">
                                <div className="feed-comment-avatar">
                                  {c.userPhoto ? <img src={c.userPhoto} alt="" /> : <span>{(c.userName || '?')[0].toUpperCase()}</span>}
                                </div>
                                <div className="feed-comment-content">
                                  <span className="feed-comment-name">{c.userName}</span>
                                  <span className="feed-comment-text">{c.text}</span>
                                </div>
                              </div>
                            ))}
                            <div className="feed-add-comment-row">
                              <input
                                placeholder="Add a comment…"
                                value={articleCommentText}
                                onChange={e => setArticleCommentText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && articleCommentText.trim()) {
                                    const comment = { id: Date.now().toString(), text: articleCommentText.trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString() }
                                    updateArticle(article.id, { comments: [...(article.comments || []), comment] }, reelmId)
                                    setArticles(getArticles(reelmId))
                                    setArticleCommentText('')
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
            }
          </div>

          {/* Article editor */}
          {articleEditorOpen && <ArticleEditor
            uid={uid}
            currentUser={currentUser}
            articleCat={articleCat}
            initialDraft={editorInitContent}
            onPublish={(data) => {
              const article = { id: 'article_' + Date.now(), ...data, userId: uid, userName: currentUser?.name || currentUser?.username || 'Unknown', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString(), likes: [], comments: [] }
              if (editorDraftId) { deleteArticleDraft(editorDraftId, reelmId); setArticleDrafts(getArticleDrafts(reelmId)) }
              saveArticle(article, reelmId); setArticles(getArticles(reelmId)); setArticleEditorOpen(false); setEditorDraftId(null); setEditorInitContent(null)
            }}
            onSaveDraft={(draft) => { saveArticleDraft(draft, reelmId); setArticleDrafts(getArticleDrafts(reelmId)); setArticleEditorOpen(false); setEditorDraftId(null); setEditorInitContent(null) }}
            onClose={() => { setArticleEditorOpen(false); setEditorDraftId(null); setEditorInitContent(null) }}
          />}

          {/* Article view */}
          {viewingArticle && <ArticleView
            article={viewingArticle}
            uid={uid}
            currentUser={currentUser}
            onClose={() => setViewingArticle(null)}
            onLike={() => {
              const a = viewingArticle
              const isLiked = (a.likes || []).includes(uid)
              const likes = isLiked ? (a.likes || []).filter(l => l !== uid) : [...(a.likes || []), uid]
              updateArticle(a.id, { likes }, reelmId); setArticles(getArticles(reelmId)); setViewingArticle({ ...a, likes })
            }}
            onComment={(text) => {
              const comment = { id: Date.now().toString(), text, userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString() }
              const a = viewingArticle
              updateArticle(a.id, { comments: [...(a.comments || []), comment] }, reelmId); setArticles(getArticles(reelmId)); setViewingArticle({ ...a, comments: [...(a.comments || []), comment] })
            }}
            onLinkWarning={(url) => setLinkWarning(url)}
          />}

          {/* Link warning */}
          {linkWarning && ReactDOM.createPortal(
            <div className="link-warning-overlay" onClick={() => setLinkWarning(null)}>
              <div className="link-warning-modal" onClick={e => e.stopPropagation()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span className="link-warning-title">Leaving Reelms</span>
                <p className="link-warning-desc">This link goes to an external site:<br/><span className="link-warning-url">{linkWarning}</span></p>
                <div className="link-warning-actions">
                  <button className="link-warning-cancel" onClick={() => setLinkWarning(null)}>Cancel</button>
                  <button className="link-warning-go" onClick={() => { window.open(linkWarning, '_blank', 'noopener'); setLinkWarning(null) }}>Continue</button>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
        </>
      ) : tab === 'forums' ? (
        <div className="forums-page">
          {/* Header */}
          <div className="forums-header-row">
            <span className="forums-header-title">Forums</span>
            <div className="articles-header-actions">
              <button className="articles-new-btn" onClick={() => setShowNewThread(true)}>
                <img src={newIcon} alt="New thread" />
              </button>
            </div>
          </div>

          {/* Tag ribbon */}
          {(() => {
            const allTags = [...new Set(threads.flatMap(t => t.tags || []))]
            return allTags.length > 0 ? (
              <div className="forums-tag-ribbon">
                <button className={`forums-tag-pill${!forumTag ? ' active' : ''}`} onClick={() => setForumTag(null)}>All</button>
                {allTags.map(tag => (
                  <button key={tag} className={`forums-tag-pill${forumTag === tag ? ' active' : ''}`} onClick={() => setForumTag(forumTag === tag ? null : tag)}>{tag}</button>
                ))}
              </div>
            ) : null
          })()}

          {/* Thread feed */}
          <div className="forums-feed">
            {threads.filter(t => !forumTag || (t.tags || []).includes(forumTag)).length === 0
              ? <p className="forums-empty">No threads yet. Start the first one.</p>
              : threads
                  .filter(t => !forumTag || (t.tags || []).includes(forumTag))
                  .map((thread, tIdx) => {
                    const isLiked = (thread.likes || []).includes(uid)
                    return (
                      <div key={thread.id} className="forum-card su-drop" style={{ animationDelay: `${tIdx * 60}ms` }} onClick={() => setViewingThread(thread)}>
                        <div className="forum-card-inner">
                          <div className="forum-card-header">
                            <div className="forum-card-author">
                              <div className="forum-card-avatar">
                                {thread.userPhoto ? <img src={thread.userPhoto} alt="" /> : <span>{(thread.userName || '?')[0].toUpperCase()}</span>}
                              </div>
                              <span className="forum-card-name">{thread.userName}</span>
                              <span className="forum-card-time">{timeAgo(thread.createdAt)}</span>
                            </div>
                            <div className="forum-card-badges">
                              {thread.vaporRoomActive && (
                                <span className="forum-card-vapor-badge">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                                  Vapor Room active
                                </span>
                              )}
                              <span className="forum-card-shield" title="End-to-End Encrypted & Anonymous">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              </span>
                            </div>
                          </div>
                          <h3 className="forum-card-title">{thread.title}</h3>
                          <p className="forum-card-preview">{thread.body}</p>
                          {(thread.tags || []).length > 0 && (
                            <div className="forum-card-tags">
                              {thread.tags.map(tag => <span key={tag} className="forum-card-tag">{tag}</span>)}
                            </div>
                          )}
                          <div className="forum-card-footer" onClick={e => e.stopPropagation()}>
                            <button className={`forum-card-action${isLiked ? ' liked' : ''}`} onClick={() => {
                              const likes = isLiked ? (thread.likes || []).filter(l => l !== uid) : [...(thread.likes || []), uid]
                              updateThread(thread.id, { likes }, reelmId); setThreads(getThreads(reelmId))
                            }}>
                              <img src={likePostIcon} alt="" style={{ width: 15, height: 15, opacity: 0.7 }} />
                              <span>{(thread.likes || []).length || ''}</span>
                            </button>
                            <button className="forum-card-action">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              <span>{(thread.replies || []).length || ''}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
            }
          </div>

          {/* New thread modal */}
          {showNewThread && ReactDOM.createPortal(
            <div className="forum-compose-overlay" onClick={() => setShowNewThread(false)}>
              <div className="forum-compose-modal" onClick={e => e.stopPropagation()}>
                <span className="forum-compose-title">New Thread</span>
                <input className="forum-compose-input" placeholder="Thread title…" value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)} maxLength={140} />
                <textarea className="forum-compose-textarea" placeholder="What's on your mind?" value={newThreadBody} onChange={e => setNewThreadBody(e.target.value)} />
                <input className="forum-compose-input forum-compose-tags" placeholder="#tag1  #tag2  #tag3" value={newThreadTags} onChange={e => setNewThreadTags(e.target.value)} />
                <div className="forum-compose-actions">
                  <button className="forum-compose-cancel" onClick={() => setShowNewThread(false)}>Cancel</button>
                  <button className="forum-compose-post" onClick={() => {
                    if (!newThreadTitle.trim()) return
                    const tags = newThreadTags.split(/\s+/).map(t => t.trim()).filter(t => t.startsWith('#') && t.length > 1)
                    const thread = { id: 'thread_' + Date.now(), title: newThreadTitle.trim(), body: newThreadBody.trim(), tags, userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString(), likes: [], replies: [], vaporRoomActive: false }
                    saveThread(thread, reelmId); setThreads(getThreads(reelmId)); setNewThreadTitle(''); setNewThreadBody(''); setNewThreadTags(''); setShowNewThread(false)
                  }}>Post</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Thread detail */}
          {viewingThread && ReactDOM.createPortal(
            <div className="forum-thread-overlay">
              <div className="forum-thread-topbar">
                <button className="article-view-back" onClick={() => setViewingThread(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>
                <button className="forum-thread-vapor-btn" onClick={() => { updateThread(viewingThread.id, { vaporRoomActive: !viewingThread.vaporRoomActive }, reelmId); setThreads(getThreads(reelmId)); setViewingThread({ ...viewingThread, vaporRoomActive: !viewingThread.vaporRoomActive }) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  {viewingThread.vaporRoomActive ? 'Close Vapor Room' : 'Launch Vapor Room'}
                </button>
              </div>
              <div className="forum-thread-scroll">
                <h1 className="forum-thread-title">{viewingThread.title}</h1>
                <div className="forum-thread-meta">
                  <div className="forum-card-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                    {viewingThread.userPhoto ? <img src={viewingThread.userPhoto} alt="" /> : <span>{(viewingThread.userName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <span className="forum-card-name">{viewingThread.userName}</span>
                  <span className="forum-card-time">{timeAgo(viewingThread.createdAt)}</span>
                  <span className="forum-card-shield" title="End-to-End Encrypted & Anonymous" style={{ marginLeft: 'auto' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </span>
                </div>
                {(viewingThread.tags || []).length > 0 && (
                  <div className="forum-card-tags" style={{ marginBottom: 20 }}>
                    {viewingThread.tags.map(tag => <span key={tag} className="forum-card-tag">{tag}</span>)}
                  </div>
                )}
                <p className="forum-thread-body">{viewingThread.body}</p>
                <div className="forum-thread-replies">
                  <span className="forum-thread-replies-label">{(viewingThread.replies || []).length} replies</span>
                  {(() => {
                    const renderNestedReplies = (replies, depth) => replies.map(r => {
                      const replyInput = replyingToId === r.id && (
                        <div className="forum-reply-input-row" style={{ marginTop: 8 }}>
                          <div className="forum-card-avatar" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
                            {getPersonPhoto(currentUser) ? <img src={getPersonPhoto(currentUser)} alt="" /> : <span>{(currentUser?.name || '?')[0].toUpperCase()}</span>}
                          </div>
                          <input
                            className="forum-reply-input"
                            placeholder={`Reply to ${r.userName}…`}
                            value={nestedReplyTexts[r.id] || ''}
                            onChange={e => setNestedReplyTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && (nestedReplyTexts[r.id] || '').trim()) {
                                const newReply = { id: Date.now().toString(), text: (nestedReplyTexts[r.id] || '').trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString(), replies: [] }
                                const newReplies = addNestedReply(viewingThread.replies, r.id, newReply)
                                const updated = { ...viewingThread, replies: newReplies }
                                updateThread(viewingThread.id, { replies: newReplies }, reelmId); setThreads(getThreads(reelmId)); setViewingThread(updated)
                                setNestedReplyTexts(prev => ({ ...prev, [r.id]: '' })); setReplyingToId(null)
                              }
                              if (e.key === 'Escape') setReplyingToId(null)
                            }}
                          />
                        </div>
                      )
                      const avatarSize = Math.max(20, 28 - depth * 2)
                      const innerContent = (
                        <>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div className="forum-card-avatar" style={{ width: avatarSize, height: avatarSize, fontSize: 10, flexShrink: 0 }}>
                              {r.userPhoto ? <img src={r.userPhoto} alt="" /> : <span>{(r.userName || '?')[0].toUpperCase()}</span>}
                            </div>
                            <div className="forum-reply-content">
                              <div className="forum-reply-header">
                                <span className="forum-card-name">{r.userName}</span>
                                <span className="forum-card-time">{timeAgo(r.createdAt)}</span>
                              </div>
                              <p className="forum-reply-text">{r.text}</p>
                              <button className="forum-reply-btn" onClick={() => setReplyingToId(replyingToId === r.id ? null : r.id)}>reply</button>
                            </div>
                          </div>
                          {replyInput}
                          {(r.replies || []).length > 0 && (
                            <div style={{ marginLeft: avatarSize + 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {renderNestedReplies(r.replies, depth + 1)}
                            </div>
                          )}
                        </>
                      )
                      if (depth === 0) {
                        return (
                          <div key={r.id} className="forum-reply-card forum-reply-card--col">
                            {innerContent}
                          </div>
                        )
                      }
                      return (
                        <div key={r.id} style={{ position: 'relative', paddingLeft: 14 }}>
                          <div className="forum-reply-nest-line" />
                          {innerContent}
                        </div>
                      )
                    })
                    return renderNestedReplies(viewingThread.replies || [], 0)
                  })()}
                  <div className="forum-reply-input-row">
                    <div className="forum-card-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                      {getPersonPhoto(currentUser) ? <img src={getPersonPhoto(currentUser)} alt="" /> : <span>{(currentUser?.name || '?')[0].toUpperCase()}</span>}
                    </div>
                    <input className="forum-reply-input" placeholder="Add a reply…" value={threadReplyText} onChange={e => setThreadReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && threadReplyText.trim()) {
                          const reply = { id: Date.now().toString(), text: threadReplyText.trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString(), replies: [] }
                          const updated = { ...viewingThread, replies: [...(viewingThread.replies || []), reply] }
                          updateThread(viewingThread.id, { replies: updated.replies }, reelmId); setThreads(getThreads(reelmId)); setViewingThread(updated); setThreadReplyText('')
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      ) : tab === 'news' ? (
        <div className="articles-page news-page">
          {/* Header */}
          <div style={{ position: 'relative' }}>
          <div className="articles-header-row">
            <span className="news-page-title">News</span>
            <button className="articles-new-btn" onClick={() => setShowNewsForm(v => !v)}>
              <img src={newIcon} alt="Post news" />
            </button>
          </div>

          {/* New news form */}
          {showNewsForm && (
            <div className="news-compose-card">
              <select
                className="news-compose-cat"
                value={newsCat || ''}
                onChange={e => setNewsCat(e.target.value || null)}
              >
                <option value="">Category…</option>
                {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="news-compose-title"
                placeholder="Headline…"
                value={newNewsTitle}
                onChange={e => setNewNewsTitle(e.target.value)}
                maxLength={140}
              />
              <textarea
                className="news-compose-body"
                placeholder="Write the full story…"
                value={newNewsBody}
                onChange={e => setNewNewsBody(e.target.value)}
                rows={4}
              />
              <div className="news-compose-actions">
                <button className="news-compose-cancel" onClick={() => { setShowNewsForm(false); setNewNewsTitle(''); setNewNewsBody(''); setNewsCat(null) }}>Cancel</button>
                <button
                  className="news-compose-submit"
                  disabled={!newNewsTitle.trim()}
                  onClick={() => {
                    const item = { id: Date.now().toString(), title: newNewsTitle.trim(), body: newNewsBody.trim(), category: newsCat, authorId: uid, authorName: currentUser.name || currentUser.username || 'User', authorPhoto: currentUser.photo || null, time: Date.now(), likes: [], comments: [] }
                    saveNews(item, reelmId)
                    setNewsItems(getNews(reelmId))
                    setNewNewsTitle(''); setNewNewsBody(''); setNewsCat(null); setShowNewsForm(false)
                  }}
                >Publish</button>
              </div>
            </div>
          )}
          </div>

          {/* Category pills */}
          <div className="news-cat-bar">
            {NEWS_CATEGORIES.map(c => (
              <button key={c} className={`articles-cat-pill${newsCat === c ? ' active' : ''}`} onClick={() => setNewsCat(newsCat === c ? null : c)}>{c}</button>
            ))}
          </div>

          {/* Sort bar */}
          <div className="feed-filter-row">
            {[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }, { id: 'popular', label: 'Popular' }].map(opt => (
              <button key={opt.id} className={`feed-filter-pill${newsSort === opt.id ? ' active' : ''}`} onClick={() => setNewsSort(opt.id)}>{opt.label}</button>
            ))}
          </div>

          {/* News cards */}
          <div className="articles-content">
            {(() => {
              let items = [...newsItems].filter(n => !newsCat || n.category === newsCat)
              if (newsSort === 'newest') items.sort((a, b) => b.time - a.time)
              else if (newsSort === 'oldest') items.sort((a, b) => a.time - b.time)
              else if (newsSort === 'popular') items.sort((a, b) => ((b.likes || []).length + (b.comments || []).length) - ((a.likes || []).length + (a.comments || []).length))
              if (items.length === 0) return <p className="articles-empty">No news in this reelm yet.</p>
              return items.map((item, nIdx) => {
                const isLiked = (item.likes || []).includes(uid)
                return (
                  <div key={item.id} className="news-card-full su-drop" style={{ animationDelay: `${nIdx * 55}ms` }}>
                    {/* pill header */}
                    <div className="feed-post-pill">
                      <div className="feed-post-pill-avatar">
                        {item.authorPhoto ? <img src={item.authorPhoto} alt="" /> : <span>{(item.authorName || '?')[0].toUpperCase()}</span>}
                      </div>
                      <div className="feed-post-pill-meta">
                        <div className="feed-post-pill-top">
                          <span className="feed-post-pill-name">{item.authorName}</span>
                          {item.category && <span className="news-card-cat-tag">{item.category}</span>}
                          <div className="feed-post-menu-wrap">
                            <button className="feed-post-menu-btn" onClick={e => { e.stopPropagation(); setOpenNewsMenu(openNewsMenu === item.id ? null : item.id) }}>
                              <svg width="3" height="11" viewBox="0 0 3 11" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="1.5" cy="5.5" r="1.3"/><circle cx="1.5" cy="9.5" r="1.3"/></svg>
                            </button>
                            {openNewsMenu === item.id && (
                              <div className="feed-post-menu-dropdown">
                                {(isMod || item.authorId === uid)
                                  ? <button className="feed-post-menu-item feed-post-menu-danger" onClick={() => { deleteNews(item.id, reelmId); setNewsItems(getNews(reelmId)); setOpenNewsMenu(null) }}>Delete</button>
                                  : <button className="feed-post-menu-item" onClick={() => { onReport && onReport('news', item.id, item.title, item.authorId, item.authorName, ''); setOpenNewsMenu(null) }}>Report</button>
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="feed-post-pill-bottom">{timeAgo(item.time)}</div>
                      </div>
                    </div>

                    {/* body */}
                    <div className="news-card-full-body">
                      <h2 className="news-card-full-title">{item.title}</h2>
                      {item.body && <p className="news-card-full-excerpt">{item.body}</p>}
                    </div>

                    {/* actions */}
                    <div className="feed-post-actions">
                      <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={() => {
                        const likes = isLiked ? (item.likes || []).filter(l => l !== uid) : [...(item.likes || []), uid]
                        updateNews(item.id, { likes }, reelmId); setNewsItems(getNews(reelmId))
                      }}>
                        <img src={likePostIcon} alt="like" className="feed-post-action-icon" />
                        <span>{(item.likes || []).length || ''}</span>
                      </button>
                      <button className="feed-post-action-btn" onClick={() => setOpenNewsComments(openNewsComments === item.id ? null : item.id)}>
                        <img src={commentPostIcon} alt="comment" className="feed-post-action-icon" />
                        <span>{(item.comments || []).length || ''}</span>
                      </button>
                      <button className="feed-post-action-btn">
                        <img src={resharePostIcon} alt="reshare" className="feed-post-action-icon" />
                      </button>
                      <button className="feed-post-action-btn">
                        <img src={forwardPostIcon} alt="forward" className="feed-post-action-icon" />
                      </button>
                    </div>

                    {/* comments */}
                    {openNewsComments === item.id && (
                      <div className="feed-post-comments">
                        {(item.comments || []).map(c => (
                          <div key={c.id} className="feed-comment-pill">
                            <div className="feed-comment-avatar">
                              {c.userPhoto ? <img src={c.userPhoto} alt="" /> : <span>{(c.userName || '?')[0].toUpperCase()}</span>}
                            </div>
                            <div className="feed-comment-content">
                              <span className="feed-comment-name">{c.userName}</span>
                              <span className="feed-comment-text">{c.text}</span>
                            </div>
                          </div>
                        ))}
                        <div className="feed-add-comment-row">
                          <input
                            placeholder="Add a comment…"
                            value={newsCommentText}
                            onChange={e => setNewsCommentText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newsCommentText.trim()) {
                                const comment = { id: Date.now().toString(), text: newsCommentText.trim(), userId: uid, userName: currentUser?.name || currentUser?.username || 'User', userPhoto: getPersonPhoto(currentUser) || null, createdAt: new Date().toISOString() }
                                updateNews(item.id, { comments: [...(item.comments || []), comment] }, reelmId)
                                setNewsItems(getNews(reelmId)); setNewsCommentText('')
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          {/* Particle canvas */}
          <canvas className="news-particle-canvas" id={`news-particles-${selectedReelm?.id}`} />
        </div>
      ) : (tab !== 'feed' && tab !== 'headlines') ? (
        <div className="feed-tab-panel">
          <p className="feed-tab-empty">
            {tab === 'new' && 'Create new content.'}
          </p>
        </div>
      ) : (
      <div className="feed-inner">
        {/* Stories */}
        <div
          className="feed-stories-wrap"
          style={{
            maskImage: `linear-gradient(to right, ${storiesEdge.left ? 'transparent 0px, black 48px,' : ''} black ${storiesEdge.left ? '' : '0px'}, black ${storiesEdge.right ? 'calc(100% - 48px), transparent 100%' : '100%'})`,
            WebkitMaskImage: `linear-gradient(to right, ${storiesEdge.left ? 'transparent 0px, black 48px,' : ''} black ${storiesEdge.left ? '' : '0px'}, black ${storiesEdge.right ? 'calc(100% - 48px), transparent 100%' : '100%'})`,
          }}
        >
        <div className="feed-stories-row" ref={storiesRowRef}>
          <button className="story-bubble story-bubble-add" onClick={() => setShowAddStory(true)}>
            <div className="story-bubble-img">
              {currentUser.photo
                ? <img src={currentUser.photo} alt="" />
                : <span>{(currentUser.name || '?')[0].toUpperCase()}</span>
              }
              <div className="story-add-badge">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <span className="story-bubble-label">Your story</span>
          </button>
          {storyGroups.map((group, gi) => {
            const first = group[0]
            return (
              <button
                key={first.userId + '-' + gi}
                className="story-bubble story-bubble-active"
                onClick={() => setViewingGroup({ groupIndex: gi, storyIndex: 0 })}
              >
                <div className="story-bubble-img story-bubble-ring">
                  {first.userPhoto
                    ? <img src={first.userPhoto} alt="" />
                    : <span>{(first.userName || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <span className="story-bubble-label">{first.userId === uid ? 'You' : first.userName}</span>
              </button>
            )
          })}
        </div>
        </div>

        {feedModerationWarning && (
          <div className="moderation-warning">{feedModerationWarning}</div>
        )}

        {/* Context Bar (Composer) */}
        <div
          ref={feedComposerRef}
          className={`feed-context-bar${feedComposerExpanded || postText.trim() ? ' feed-composer-expanded' : ' feed-composer-collapsed'}`}
          onClick={() => {
            if (!feedComposerExpanded) setFeedComposerExpanded(true)
          }}
        >
          <textarea
            className="feed-ctx-textarea"
            placeholder="What's on your mind?"
            value={postText}
            rows={feedComposerExpanded || postText.trim() ? 3 : 1}
            onFocus={() => setFeedComposerExpanded(true)}
            onChange={e => setPostText(e.target.value)}
          />
          <div className="feed-ctx-actions">
            <button className="feed-ctx-share-btn" title="Share post" onClick={handleSharePost}>Share</button>
            <button className="feed-ctx-btn" title="Add media">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <button className="feed-ctx-btn" title="Add document">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </button>
            <div className="feed-ctx-plus-wrap">
              <button className="feed-ctx-btn feed-ctx-plus-btn" title="More" onClick={(e) => { e.stopPropagation(); setShowPlusMenu(v => !v); }}>
                <img src={newIcon} alt="+" className="feed-ctx-new-icon" />
              </button>
              {showPlusMenu && (
                <div className="feed-plus-menu" onClick={e => e.stopPropagation()}>
                  <button className="feed-plus-item" onClick={() => setShowPlusMenu(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M9 9h6M9 12h4M9 15h6"/>
                    </svg>
                    <span>Poll</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter & Sort Dropdown Bar */}
        <div className="feed-filter-dropdown-bar">
          <div className="feed-dropdown-wrapper" ref={feedSortRef}>
            <button
              type="button"
              className={`feed-dropdown-trigger${feedSortOpen ? ' active' : ''}`}
              onClick={() => {
                setFeedSortOpen(v => !v)
                setFeedDisplayOpen(false)
              }}
            >
              <span className="feed-dropdown-label">Sort by:</span>
              <span className="feed-dropdown-val">
                {FEED_SORT_OPTIONS.find(o => o.id === feedSort)?.label || 'Newest'}
              </span>
              <svg className={`feed-dropdown-chevron${feedSortOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {feedSortOpen && (
              <div className="feed-dropdown-menu">
                {FEED_SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`feed-dropdown-item${feedSort === opt.id ? ' active' : ''}`}
                    onClick={() => {
                      setFeedSort(opt.id)
                      setFeedSortOpen(false)
                    }}
                  >
                    <span>{opt.label}</span>
                    {feedSort === opt.id && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="feed-dropdown-wrapper" ref={feedDisplayRef}>
            <button
              type="button"
              className={`feed-dropdown-trigger${feedDisplayOpen ? ' active' : ''}`}
              onClick={() => {
                setFeedDisplayOpen(v => !v)
                setFeedSortOpen(false)
              }}
            >
              <span className="feed-dropdown-label">Show:</span>
              <span className="feed-dropdown-val">
                {FEED_DISPLAY_OPTIONS.find(o => o.id === feedDisplay)?.label || 'Posts only'}
              </span>
              <svg className={`feed-dropdown-chevron${feedDisplayOpen ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {feedDisplayOpen && (
              <div className="feed-dropdown-menu">
                {FEED_DISPLAY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`feed-dropdown-item${feedDisplay === opt.id ? ' active' : ''}`}
                    onClick={() => {
                      setFeedDisplay(opt.id)
                      setFeedDisplayOpen(false)
                    }}
                  >
                    <span>{opt.label}</span>
                    {feedDisplay === opt.id && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="feed-posts">
          {(() => {
            let items = posts.map(p => ({ ...p, _type: 'post' }))
            if (feedDisplay === 'posts-forums' || feedDisplay === 'everything') {
              items = [...items, ...threads.map(t => ({ ...t, _type: 'thread' }))]
            }
            if (feedDisplay === 'posts-articles' || feedDisplay === 'everything') {
              items = [...items, ...articles.map(a => ({ ...a, _type: 'article' }))]
            }
            if (feedSort === 'newest') items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            else if (feedSort === 'oldest') items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            else if (feedSort === 'popular') items.sort((a, b) => ((b.likes || []).length + (b.replies || b.comments || []).length) - ((a.likes || []).length + (a.replies || a.comments || []).length))
            if (items.length === 0) return <p className="feed-empty-text">No posts yet.</p>
            return items.map(item => {
              if (item._type === 'thread') return (
                <div key={item.id} className="feed-post feed-cross-card" onClick={() => setViewingThread(item)}>
                  <div className="feed-cross-card-type"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Forum</div>
                  <div className="feed-post-pill">
                    <div className="feed-post-pill-avatar">{item.userPhoto ? <img src={item.userPhoto} alt="" /> : <span>{(item.userName || '?')[0].toUpperCase()}</span>}</div>
                    <div className="feed-post-pill-meta">
                      <div className="feed-post-pill-top"><span className="feed-post-pill-name">{item.userName}</span></div>
                      <div className="feed-post-pill-bottom">{timeAgo(item.createdAt)}</div>
                    </div>
                  </div>
                  <p className="feed-post-text-only" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 15, color: '#b99887' }}>{item.title}</p>
                  {item.body && <p className="feed-post-caption">{item.body.slice(0, 160)}{item.body.length > 160 ? '…' : ''}</p>}
                </div>
              )
              if (item._type === 'article') return (
                <div key={item.id} className="feed-post feed-cross-card" onClick={() => setViewingArticle(item)}>
                  <div className="feed-cross-card-type"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Article</div>
                  <div className="feed-post-pill">
                    <div className="feed-post-pill-avatar">{item.userPhoto ? <img src={item.userPhoto} alt="" /> : <span>{(item.userName || '?')[0].toUpperCase()}</span>}</div>
                    <div className="feed-post-pill-meta">
                      <div className="feed-post-pill-top"><span className="feed-post-pill-name">{item.userName}</span></div>
                      <div className="feed-post-pill-bottom">{timeAgo(item.createdAt)}</div>
                    </div>
                  </div>
                  <p className="feed-post-text-only" style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 15, color: '#b99887' }}>{item.title}</p>
                  {item.contentHtml && <p className="feed-post-caption">{(item.contentHtml || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 160)}…</p>}
                </div>
              )
              const post = item
              const isLiked = (post.likes || []).includes(uid)
              const postRole = getUserRole(post.userId)
              return (
              <div key={post.id} className="feed-post">
                {/* Header pill */}
                <div className="feed-post-pill">
                  <div className="feed-post-pill-avatar">
                    {post.userPhoto ? <img src={post.userPhoto} alt="" /> : <span>{(post.userName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <div className="feed-post-pill-meta">
                    <div className="feed-post-pill-top">
                      <span className="feed-post-pill-name">{post.userName}</span>
                      <div className="feed-post-menu-wrap" onClick={e => e.stopPropagation()}>
                        <button className="feed-post-menu-btn" onClick={() => setOpenPostMenu(openPostMenu === post.id ? null : post.id)}>
                          <svg width="3" height="11" viewBox="0 0 3 11" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.3"/><circle cx="1.5" cy="5.5" r="1.3"/><circle cx="1.5" cy="9.5" r="1.3"/></svg>
                        </button>
                        {openPostMenu === post.id && (
                          <div className="feed-post-menu-dropdown">
                            {isMod
                              ? <button className="feed-post-menu-item feed-post-menu-danger" onClick={() => { setOpenPostMenu(null); onModDeletePost(post.id) }}>Delete post</button>
                              : <button className="feed-post-menu-item" onClick={() => { setOpenPostMenu(null); onReport('post', post.id, post.text, post.userId, post.userName, '') }}>Report</button>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="feed-post-pill-bottom">
                      {postRole && <span>{postRole}, </span>}
                      <span>{formatPostDate(post.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {post.text && !post.media && <p className="feed-post-text-only">{post.text}</p>}
                {post.media && post.mediaType === 'image' && <img src={post.media} alt="" className="feed-post-media-img" />}
                {post.media && post.mediaType === 'video' && <video src={post.media} className="feed-post-media-video" controls />}
                {post.media && post.mediaType === 'file' && (
                  <div className="feed-post-file">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>{post.fileName || 'File'}</span>
                  </div>
                )}
                {post.caption && <p className="feed-post-caption">{post.caption}</p>}

                {/* Actions */}
                <div className="feed-post-actions">
                  <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={() => togglePostLike(post.id)}>
                    <img src={likePostIcon} className="feed-post-action-icon" alt="like" />
                    <span>{(post.likes || []).length}</span>
                  </button>
                  <button className="feed-post-action-btn">
                    <img src={commentPostIcon} className="feed-post-action-icon" alt="comment" />
                    <span>{(post.comments || []).length}</span>
                  </button>
                  <button className="feed-post-action-btn" onClick={() => onShare && onShare({ type: 'post', title: post.text?.slice(0, 60), subtitle: post.userName, image: post.mediaUrl || null, data: post })}>
                    <img src={resharePostIcon} className="feed-post-action-icon" alt="reshare" />
                    <span>{post.reshares || 0}</span>
                  </button>
                  <button className="feed-post-action-btn" onClick={() => { setForwardPost(post); setForwardCopied(false) }}>
                    <img src={forwardPostIcon} className="feed-post-action-icon" alt="forward" />
                    <span>Forward</span>
                  </button>
                </div>

                {/* Comments */}
                <div className="feed-post-comments">
                  {(post.comments || []).map(comment => {
                    const cLiked = (comment.likes || []).includes(uid)
                    return (
                      <div key={comment.id} className="feed-comment-pill">
                        <div className="feed-comment-avatar">
                          {comment.userPhoto ? <img src={comment.userPhoto} alt="" /> : <span>{(comment.userName || '?')[0].toUpperCase()}</span>}
                        </div>
                        <div className="feed-comment-content">
                          <div className="feed-comment-text-row">
                            <span className="feed-comment-name">{comment.userName}</span>{' '}{comment.text}
                          </div>
                          <div className="feed-comment-actions" onClick={e => e.stopPropagation()}>
                            <button className={`feed-comment-like-btn${cLiked ? ' liked' : ''}`} onClick={() => toggleCommentLike(post.id, comment.id)}>
                              <img src={likePostIcon} alt="like" />
                              {(comment.likes || []).length > 0 && <span>{(comment.likes || []).length}</span>}
                            </button>
                            <div className="feed-comment-menu-wrap">
                              <button className="feed-comment-menu-btn" onClick={() => setOpenCommentMenu(openCommentMenu === comment.id ? null : comment.id)}>
                                <svg width="3" height="12" viewBox="0 0 3 12" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.5"/><circle cx="1.5" cy="6" r="1.5"/><circle cx="1.5" cy="10.5" r="1.5"/></svg>
                              </button>
                              {openCommentMenu === comment.id && (
                                <div className="feed-comment-menu-dropdown">
                                  <button className="feed-comment-menu-item" onClick={() => setOpenCommentMenu(null)}>Report</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Replies */}
                          {(comment.replies || []).map(reply => {
                            const rLiked = (reply.likes || []).includes(uid)
                            return (
                              <div key={reply.id} className="feed-reply">
                                <div className="feed-reply-avatar">
                                  {reply.userPhoto ? <img src={reply.userPhoto} alt="" /> : <span>{(reply.userName || '?')[0].toUpperCase()}</span>}
                                </div>
                                <div className="feed-reply-content">
                                  <div className="feed-comment-text-row">
                                    <span className="feed-comment-name">{reply.userName}</span>{' '}{reply.text}
                                  </div>
                                  <div className="feed-comment-actions" onClick={e => e.stopPropagation()}>
                                    <button className={`feed-comment-like-btn${rLiked ? ' liked' : ''}`} onClick={() => toggleReplyLike(post.id, comment.id, reply.id)}>
                                      <img src={likePostIcon} alt="like" />
                                      {(reply.likes || []).length > 0 && <span>{(reply.likes || []).length}</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {/* Reply input */}
                          <div className="feed-reply-input-row">
                            <input
                              placeholder="Reply..."
                              value={replyDrafts[comment.id] || ''}
                              onChange={e => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { addReply(post.id, comment.id); e.preventDefault() } }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {/* Comment input */}
                  <div className="feed-add-comment-row">
                    <input
                      placeholder="Add a comment..."
                      value={commentDrafts[post.id] || ''}
                      onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { addComment(post.id); e.preventDefault() } }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        })()}
        </div>
      </div>
      )}

      {/* Forward modal */}
      {forwardPost && (
        <div className="feed-forward-overlay" onClick={() => setForwardPost(null)}>
          <div className="feed-forward-modal" onClick={e => e.stopPropagation()}>
            <span className="feed-forward-title">Forward Post</span>
            <div className="feed-forward-link-row">
              <input className="feed-forward-link-input" readOnly value={`reelms://post/${forwardPost.id}`} />
              <button className="feed-forward-copy-btn" onClick={() => { navigator.clipboard?.writeText(`reelms://post/${forwardPost.id}`); setForwardCopied(true) }}>
                {forwardCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button className="feed-forward-reelm-btn" onClick={() => setForwardPost(null)}>Share in Reelm</button>
            <button className="feed-forward-close-btn" onClick={() => setForwardPost(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedPage
