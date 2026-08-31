import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { articleReadTime } from '../utils/articleUtils'
import likePostIcon from '../../../assets/icons/likepost-icon_reelms.svg'
import commentPostIcon from '../../../assets/icons/commentpost-icon.svg'
import resharePostIcon from '../../../assets/icons/resharepost-icon_reelms.svg'
import forwardPostIcon from '../../../assets/icons/forwardpost-icon_reelms.svg'

export function ArticleView({ article, uid, onClose, onLike, onComment, onLinkWarning }) {
  const [readingMode, setReadingMode] = useState(false)
  const [commentText, setCommentText] = useState('')
  const isLiked = (article.likes || []).includes(uid)
  const mins = articleReadTime(article.contentHtml || article.content || '')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!bodyRef.current) return
    bodyRef.current.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href') || ''
        if (href.startsWith('http://') || href.startsWith('https://')) {
          e.preventDefault()
          onLinkWarning(href)
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article])

  return ReactDOM.createPortal(
    <div className={`article-view-overlay${readingMode ? ' article-view-reading-mode' : ''}`}>
      {/* Top bar */}
      <div className="article-view-topbar">
        <button className="article-view-back" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </button>
        <span className="article-view-readtime">{mins}d okuma</span>
        <button className={`article-view-light-btn${readingMode ? ' active' : ''}`} title="Reading mode" onClick={() => setReadingMode(v => !v)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
      </div>

      <div className="article-view-scroll">
        {article.coverImage && <img src={article.coverImage} className="article-view-cover" alt="" />}
        <h1 className="article-view-title">{article.title}</h1>

        {/* Author row */}
        <div className="article-view-author">
          <div className="feed-post-pill-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
            {article.userPhoto ? <img src={article.userPhoto} alt="" /> : <span>{(article.userName || '?')[0].toUpperCase()}</span>}
          </div>
          <div>
            <span className="article-view-author-name">{article.userName}</span>
            <span className="article-view-author-date"> · {new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Body */}
        <div
          className="article-view-body"
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: article.contentHtml || (article.content || '').replace(/\n/g, '<br/>') }}
        />

        {/* Citations */}
        {article.citations?.length > 0 && (
          <div className="article-view-citations">
            <h4 className="article-view-citations-title">Works Cited</h4>
            {article.citations.map((c, i) => <p key={i} className="article-view-citation-item">[{i + 1}] {c.text} — <span>{c.url}</span></p>)}
          </div>
        )}

        {/* Actions */}
        <div className="article-view-actions">
          <button className={`feed-post-action-btn${isLiked ? ' feed-post-action-liked' : ''}`} onClick={onLike}>
            <img src={likePostIcon} alt="like" className="feed-post-action-icon" />
            <span>{(article.likes || []).length || ''}</span>
          </button>
          <button className="feed-post-action-btn">
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
        <div className="article-view-comments">
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
            <input placeholder="Add a comment…" value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) { onComment(commentText.trim()); setCommentText('') } }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ArticleView
