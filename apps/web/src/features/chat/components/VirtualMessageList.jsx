import React, { useState, useEffect, useRef, useCallback } from 'react'
import EmojiPickerReact, { EmojiStyle } from 'emoji-picker-react'
import newIcon from '../../../assets/icons/new-icon.svg'
import { SpoilerMedia } from '../../rich-message/SpoilerMedia'
import { DiscordEmbedCard } from '../DiscordEmbedCard'
import { VoiceMessage } from './VoiceMessage'
import { PollCard } from './PollCard'
import { extractYouTubeId, renderRichMessage } from '../utils/richTextRenderer'
import { hasReelmPermissionClient } from '../../reelm/utils/reelmPermissionUtils'

export function VirtualMessageList({
  msgs = [],
  isBubbleMode,
  uid,
  isMod,
  blocked = [],
  selectedChatSystemLocked,
  selectedReelm,
  selectedChat,
  msgKey2,
  newMsgId,
  t,
  canPinInChannel,
  pinnedMessage,
  setReplyingTo,
  setMsgCtxMenu,
  handleMsgTouchStart,
  handleMsgTouchMove,
  handleMsgTouchEnd,
  toggleReaction,
  showMsgEmojiFor,
  setShowMsgEmojiFor,
  setLightboxImg,
  openFriendProfile,
  dmReadReceipts = {},
  msgReactions = {},
  msgListRef,
  onVotePoll,
}) {
  const formatTime = useCallback((tm) => (tm instanceof Date ? tm : new Date(tm)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), [])
  const formatDateLabel = useCallback((tm) => {
    const d = tm instanceof Date ? tm : new Date(tm)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0)
    if (msgDay.getTime() === today.getTime()) return 'Today'
    if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }, [])

  const isNearBottomRef = useRef(true)
  const lastMsgCountRef = useRef(msgs.length)
  const [swipingMsgId, setSwipingMsgId] = useState(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const msgTouchStartRef = useRef({ x: 0, y: 0 })

  const handleScroll = useCallback(() => {
    const el = msgListRef?.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceFromBottom <= 180
  }, [msgListRef])

  useEffect(() => {
    const el = msgListRef?.current
    if (!el) return undefined
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [msgListRef, handleScroll])

  useEffect(() => {
    const el = msgListRef?.current
    if (!el || msgs.length === 0) return
    const isNew = msgs.length !== lastMsgCountRef.current
    lastMsgCountRef.current = msgs.length
    if (isNearBottomRef.current || isNew) {
      const raf = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [msgs.length, msgKey2, msgListRef])

  return (
    <>
      {msgs.map((msg, index) => {
        if (!msg) return null

        const prevMsg = index > 0 ? msgs[index - 1] : null
        const msgDateLabel = formatDateLabel(msg.time)
        const prevDateLabel = prevMsg ? formatDateLabel(prevMsg.time) : null
        const showDateSep = msgDateLabel !== prevDateLabel

        const senderId = String(msg.sender?.id || msg.sender?.uid || msg.sender?.userId || msg.senderId || msg.userId || msg.authorId || '')
        const senderName = msg.sender?.name || msg.sender?.displayName || msg.sender?.userName || msg.senderName || msg.authorName || '?'
        const senderPhoto = msg.sender?.photo || msg.sender?.image || msg.sender?.avatar || msg.sender?.photoURL || msg.senderPhoto || msg.userPhoto || msg.authorPhoto || null
        const senderUsername = msg.sender?.username || msg.sender?.userName || msg.senderUsername || null
        const sender = {
          id: senderId,
          name: senderName,
          photo: senderPhoto,
          image: senderPhoto,
          username: senderUsername,
        }
        
        const isOwn = String(sender.id || '') === String(uid)
        const canDeleteMsg = Boolean(selectedChat) || isMod || isOwn || (selectedReelm && hasReelmPermissionClient(selectedReelm, uid, 'manageModeration'))
        const isPinned = Boolean(pinnedMessage && (!pinnedMessage.expiresAt || Date.now() < pinnedMessage.expiresAt) && String(pinnedMessage.id) === String(msg.id))
        const msgData = { id: msg.id, text: msg.text || '', sender, time: msg.time, mediaUrl: msg.mediaUrl, mediaType: msg.mediaType }

        const isSystemMsg = Boolean(
          msg.isSystem ||
          msg.sender?.id === 'system' ||
          msg.sender?.name === 'System' ||
          msg.sender?.name === 'Reelms' ||
          (typeof msg.text === 'string' && (
            msg.text.includes('existed.') ||
            msg.text.includes('created. ✦') ||
            msg.text.includes('has entered the chat.') ||
            msg.text.includes('Somewhere, a server whispered:') ||
            msg.text.includes('was born into this world.') ||
            msg.text.startsWith('✦ ') ||
            msg.text.startsWith('👋 ')
          ))
        )

        const isSwipingThis = swipingMsgId === msg.id

        return (
          <React.Fragment key={msg.id || `msg-${index}`}>
            {showDateSep && <div className="bubble-date-sep"><span>{msgDateLabel}</span></div>}
            {isSystemMsg ? (
              <div className={`msg-system-row${msg.id === newMsgId ? ' msg-row-new' : ''}`}>
                <span className="msg-system-text">{msg.text}</span>
                <span className="msg-system-time">{formatTime(msg.time)}</span>
              </div>
            ) : !isBubbleMode ? (
              <div className="msg-row-wrap" style={{ position: 'relative', overflow: 'visible' }}>
                {isSwipingThis && swipeOffset > 10 && (
                  <div
                    className="msg-swipe-reply-icon"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: `translateY(-50%) scale(${Math.min(1, swipeOffset / 32)})`,
                      opacity: Math.min(1, swipeOffset / 28),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(var(--ta-rgb), 0.15)',
                      color: 'var(--ta)',
                      zIndex: 2
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 17 4 12 9 7"/>
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                    </svg>
                  </div>
                )}
                <div
                  className={`msg-row${msg.id === newMsgId ? ' msg-row-new' : ''}${isMod ? ' msg-row-mod' : ''}${blocked.some(b => b.id === sender.id) ? ' msg-row-blocked' : ''}`}
                  style={isSwipingThis ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : { transition: 'transform 0.18s ease' }}
                  onDoubleClick={() => !selectedChatSystemLocked && setReplyingTo({ id: msg.id, text: msg.text || '', senderName: sender.name, senderId: sender.id })}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMsgCtxMenu({
                      x: Math.min(e.clientX, window.innerWidth - 160),
                      y: Math.min(e.clientY, window.innerHeight - 120),
                      msgId: msg.id,
                      chatKey: msgKey2,
                      canDelete: canDeleteMsg,
                      canPin: !selectedChatSystemLocked && canPinInChannel,
                      isPinned,
                      msgData,
                      isOwn,
                      msgText: msg.text || '',
                      replyInfo: { id: msg.id, text: msg.text || '', senderName: sender.name, senderId: sender.id }
                    })
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0]
                    if (t) msgTouchStartRef.current = { x: t.clientX, y: t.clientY }
                    handleMsgTouchStart?.(e, msg, msgKey2, canDeleteMsg, isOwn, canPinInChannel, isPinned)
                  }}
                  onTouchMove={(e) => {
                    handleMsgTouchMove?.(e)
                    if (selectedChatSystemLocked) return
                    const t = e.touches[0]
                    if (!t) return
                    const dx = t.clientX - msgTouchStartRef.current.x
                    const dy = Math.abs(t.clientY - msgTouchStartRef.current.y)
                    if (dx > 8 && dx > dy * 1.2) {
                      setSwipingMsgId(msg.id)
                      setSwipeOffset(Math.min(dx * 0.7, 56))
                    }
                  }}
                  onTouchEnd={() => {
                    handleMsgTouchEnd?.()
                    if (swipingMsgId === msg.id && swipeOffset >= 34) {
                      if (navigator.vibrate) try { navigator.vibrate(25) } catch {}
                      setReplyingTo({ id: msg.id, text: msg.text || '', senderName: sender.name, senderId: sender.id })
                    }
                    setSwipingMsgId(null)
                    setSwipeOffset(0)
                  }}
                >
                <div
                  className="msg-avatar msg-avatar--clickable"
                  onClick={e => {
                    e.stopPropagation()
                    const targetUid = sender.id || msg.senderId || msg.userId
                    if (targetUid) {
                      openFriendProfile({ id: targetUid, name: sender.name, photo: sender.photo || sender.image || null, username: sender.username || null }, e)
                    }
                  }}
                  title={sender.name}
                >
                  {(sender.photo || sender.image)
                    ? <img src={sender.photo || sender.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : (sender.name || '?').charAt(0).toUpperCase()
                  }
                </div>
                <div className="msg-body">
                  <div className="msg-header">
                    <span
                      className="msg-name msg-name--clickable"
                      onClick={e => {
                        e.stopPropagation()
                        const targetUid = sender.id || msg.senderId || msg.userId
                        if (targetUid) {
                          openFriendProfile({ id: targetUid, name: sender.name, photo: sender.photo || sender.image || null, username: sender.username || null }, e)
                        }
                      }}
                      title={sender.name}
                    >
                      {sender.name}
                    </span>
                    <span className="msg-time">{formatTime(msg.time)}</span>
                    {msg.isQueued && (
                      <span className="msg-queued-pill" title="Çevrimdışı — Bağlantı geldiğinde otomatik gönderilecek">
                        <span className="msg-queued-icon">🕒</span> {t ? (t('queued') || 'Kuyrukta') : 'Kuyrukta'}
                      </span>
                    )}
                    {!selectedChatSystemLocked && (
                      <div className="msg-react-ctrl">
                        <button className="msg-react-btn msg-react-plus" title="+1" onClick={() => toggleReaction(msgKey2, msg.id, '+')}>
                          <img src={newIcon} alt="+" style={{ width: '12px', height: '12px', display: 'block', opacity: 0.65 }} />
                        </button>
                        <div className="msg-react-emoji-wrap" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                          <button className="msg-react-btn" title="Tepki ekle" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMsgEmojiFor?.(f => f?.msgId === String(msg.id) ? null : { msgKey: msgKey2, msgId: String(msg.id) }) }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>
                          </button>
                          {showMsgEmojiFor?.msgId === String(msg.id) && (
                            <div className="msg-emoji-picker-wrap" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                              <EmojiPickerReact emojiStyle={EmojiStyle.APPLE} height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={d => toggleReaction(msgKey2, msg.id, d.emoji)} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.replyTo && (
                    <div
                      className="msg-reply-quote"
                      onClick={e => {
                        if (msg.replyTo.senderId) {
                          e.stopPropagation()
                          openFriendProfile({ id: msg.replyTo.senderId, name: msg.replyTo.senderName }, e)
                        }
                      }}
                      style={{ cursor: msg.replyTo.senderId ? 'pointer' : 'default' }}
                    >
                      <span className="msg-reply-quote-name">{msg.replyTo.senderName}</span>
                      <span className="msg-reply-quote-text">{msg.replyTo.text ? msg.replyTo.text.slice(0, 120) : '📎'}</span>
                    </div>
                  )}
                  {msg.text && (
                    <div className="msg-text">
                      {renderRichMessage(msg.richText || msg.text, uid, selectedReelm?.members, selectedReelm?.roles, !!msg.richText)}
                      {(msg.isEdited || msg.editedAt) && <span className="msg-edited-tag">({t ? t('edited') : 'Düzenlendi'})</span>}
                    </div>
                  )}
                  {msg.text && (() => { const ytId = extractYouTubeId(msg.text); return ytId ? (
                    <div className="msg-yt-embed">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                        title="YouTube video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null })()}
                  {msg.mediaUrl && msg.mediaType === 'image' && (
                    <SpoilerMedia isSpoiler={Boolean(msg.isSpoiler || msg.mediaSpoiler)} mediaType="image">
                      <img src={msg.mediaUrl} alt="" className="msg-media-img" onClick={() => setLightboxImg?.(msg.mediaUrl)} />
                    </SpoilerMedia>
                  )}
                  {msg.mediaUrl && msg.mediaType === 'video' && (
                    <SpoilerMedia isSpoiler={Boolean(msg.isSpoiler || msg.mediaSpoiler)} mediaType="video">
                      <video src={msg.mediaUrl} className="msg-media-video" controls />
                    </SpoilerMedia>
                  )}
                  {msg.mediaUrl && msg.mediaType === 'audio' && <VoiceMessage src={msg.mediaUrl} />}
                  {(msg.type === 'poll' || msg.poll) && (
                    <PollCard poll={msg.poll} onVote={(optIdx) => onVotePoll && onVotePoll(msgKey2, msg.id, optIdx)} myUid={uid} disabled={selectedChatSystemLocked} />
                  )}
                  {msg.mediaUrl && (msg.mediaType === 'gif' || msg.mediaType === 'sticker') && (
                    <SpoilerMedia isSpoiler={Boolean(msg.isSpoiler || msg.mediaSpoiler)} mediaType={msg.mediaType}>
                      <img src={msg.mediaUrl} alt="" className={msg.mediaType === 'sticker' ? 'msg-sticker-img' : 'msg-gif-img'} />
                    </SpoilerMedia>
                  )}
                  {msg.fileUrl && (
                    <a href={msg.fileUrl} download={msg.fileName} className="msg-doc-card">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div className="msg-doc-info"><span className="msg-doc-name">{msg.fileName}</span><span className="msg-doc-size">{msg.fileSize ? (msg.fileSize/1024<1024 ? (msg.fileSize/1024).toFixed(1)+' KB' : (msg.fileSize/1048576).toFixed(1)+' MB') : ''}</span></div>
                    </a>
                  )}
                  {Array.isArray(msg.embeds) && msg.embeds.map((emb, embIdx) => (
                    <DiscordEmbedCard key={embIdx} embed={emb} />
                  ))}
                  {Object.keys(msgReactions[msgKey2]?.[String(msg.id)] || {}).length > 0 && (
                    <div className="msg-reactions">
                      {Object.entries(msgReactions[msgKey2]?.[String(msg.id)] || {}).map(([emoji, users]) => (
                        <button key={emoji} className={`${emoji === '+' ? 'reaction-pill--plus' : `reaction-pill${users.includes(String(uid)) ? ' reaction-pill--mine' : ''}`}`} onClick={() => toggleReaction(msgKey2, msg.id, emoji)}>
                          {emoji === '+' ? <span>+{users.length}</span> : <>{emoji} <span>{users.length}</span></>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : (
              <div className="msg-row-wrap" style={{ position: 'relative', overflow: 'visible' }}>
                {isSwipingThis && swipeOffset > 10 && (
                  <div
                    className="msg-swipe-reply-icon"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: `translateY(-50%) scale(${Math.min(1, swipeOffset / 32)})`,
                      opacity: Math.min(1, swipeOffset / 28),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(var(--ta-rgb), 0.15)',
                      color: 'var(--ta)',
                      zIndex: 2
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 17 4 12 9 7"/>
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                    </svg>
                  </div>
                )}
                <div
                  className={`bubble-row${isOwn ? ' bubble-row--own' : ' bubble-row--other'}${msg.id === newMsgId ? ' msg-row-new' : ''}`}
                  style={isSwipingThis ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : { transition: 'transform 0.18s ease' }}
                  onDoubleClick={() => !selectedChatSystemLocked && setReplyingTo({ id: msg.id, text: msg.text || '', senderName: sender.name, senderId: sender.id })}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMsgCtxMenu({
                      x: Math.min(e.clientX, window.innerWidth - 160),
                      y: Math.min(e.clientY, window.innerHeight - 120),
                      msgId: msg.id,
                      chatKey: msgKey2,
                      canDelete: canDeleteMsg,
                      canPin: !selectedChatSystemLocked && canPinInChannel,
                      isPinned,
                      msgData,
                      isOwn,
                      msgText: msg.text || '',
                      replyInfo: { id: msg.id, text: msg.text || '', senderName: sender.name, senderId: sender.id }
                    })
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0]
                    if (t) msgTouchStartRef.current = { x: t.clientX, y: t.clientY }
                    handleMsgTouchStart?.(e, msg, msgKey2, canDeleteMsg, isOwn, canPinInChannel, isPinned)
                  }}
                  onTouchMove={(e) => {
                    handleMsgTouchMove?.(e)
                    if (selectedChatSystemLocked) return
                    const t = e.touches[0]
                    if (!t) return
                    const dx = t.clientX - msgTouchStartRef.current.x
                    const dy = Math.abs(t.clientY - msgTouchStartRef.current.y)
                    if (dx > 8 && dx > dy * 1.2) {
                      setSwipingMsgId(msg.id)
                      setSwipeOffset(Math.min(dx * 0.7, 56))
                    }
                  }}
                  onTouchEnd={() => {
                    handleMsgTouchEnd?.()
                    if (swipingMsgId === msg.id && swipeOffset >= 34) {
                      if (navigator.vibrate) try { navigator.vibrate(25) } catch {}
                      setReplyingTo({ id: msg.id, text: msg.text || '', senderName: sender.name, senderId: sender.id })
                    }
                    setSwipingMsgId(null)
                    setSwipeOffset(0)
                  }}
                >
                  <div
                    className="bubble-avatar bubble-avatar--clickable"
                    onClick={e => {
                      e.stopPropagation()
                      const targetUid = sender.id || msg.senderId || msg.userId
                      if (targetUid) {
                        openFriendProfile({ id: targetUid, name: sender.name, photo: sender.photo || sender.image || null, username: sender.username || null }, e)
                      }
                    }}
                    title={sender.name}
                  >
                    {(sender.photo || sender.image)
                      ? <img src={sender.photo || sender.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : (sender.name || '?').charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="bubble-content">
                    <span
                      className="bubble-sender-name bubble-sender-name--clickable"
                      onClick={e => {
                        e.stopPropagation()
                        const targetUid = sender.id || msg.senderId || msg.userId
                        if (targetUid) {
                          openFriendProfile({ id: targetUid, name: sender.name, photo: sender.photo || sender.image || null, username: sender.username || null }, e)
                        }
                      }}
                      title={sender.name}
                    >
                      {sender.name}
                    </span>
                    <div className="bubble-and-time">
                      {msg.mediaUrl && (msg.mediaType === 'gif' || msg.mediaType === 'sticker') && !msg.text ? (
                        <img src={msg.mediaUrl} alt="" className={msg.mediaType === 'sticker' ? 'msg-sticker-img' : 'msg-gif-img'} />
                      ) : msg.mediaUrl && msg.mediaType === 'image' && !msg.text && !msg.fileUrl ? (
                        <img src={msg.mediaUrl} alt="" className="msg-media-img" onClick={() => setLightboxImg?.(msg.mediaUrl)} style={{ cursor: 'pointer' }} />
                      ) : (
                      <div className={`bubble${isOwn ? ' bubble--own' : ' bubble--other'}`}>
                        {msg.replyTo && (
                          <div className="msg-reply-quote msg-reply-quote--bubble">
                            <span className="msg-reply-quote-name">{msg.replyTo.senderName}</span>
                            <span className="msg-reply-quote-text">{msg.replyTo.text ? msg.replyTo.text.slice(0, 120) : '📎'}</span>
                          </div>
                        )}
                        {msg.text && (
                          <span className="bubble-text">
                            {renderRichMessage(msg.richText || msg.text, uid, selectedReelm?.members, selectedReelm?.roles, !!msg.richText)}
                            {(msg.isEdited || msg.editedAt) && <span className="msg-edited-tag">({t ? t('edited') : 'Düzenlendi'})</span>}
                          </span>
                        )}
                        {msg.mediaUrl && msg.mediaType === 'image' && (
                          <SpoilerMedia isSpoiler={Boolean(msg.isSpoiler || msg.mediaSpoiler)} mediaType="image">
                            <img src={msg.mediaUrl} alt="" className="msg-media-img" onClick={() => setLightboxImg?.(msg.mediaUrl)} />
                          </SpoilerMedia>
                        )}
                        {msg.mediaUrl && msg.mediaType === 'video' && (
                          <SpoilerMedia isSpoiler={Boolean(msg.isSpoiler || msg.mediaSpoiler)} mediaType="video">
                            <video src={msg.mediaUrl} className="msg-media-video" controls />
                          </SpoilerMedia>
                        )}
                        {msg.mediaUrl && msg.mediaType === 'audio' && <VoiceMessage src={msg.mediaUrl} />}
                        {(msg.type === 'poll' || msg.poll) && (
                          <PollCard poll={msg.poll} onVote={(optIdx) => onVotePoll && onVotePoll(msgKey2, msg.id, optIdx)} myUid={uid} disabled={selectedChatSystemLocked} />
                        )}
                        {msg.mediaUrl && (msg.mediaType === 'gif' || msg.mediaType === 'sticker') && (
                          <SpoilerMedia isSpoiler={Boolean(msg.isSpoiler || msg.mediaSpoiler)} mediaType={msg.mediaType}>
                            <img src={msg.mediaUrl} alt="" className={msg.mediaType === 'sticker' ? 'msg-sticker-img' : 'msg-gif-img'} />
                          </SpoilerMedia>
                        )}
                        {msg.fileUrl && (
                          <a href={msg.fileUrl} download={msg.fileName} className="msg-doc-card">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <div className="msg-doc-info"><span className="msg-doc-name">{msg.fileName}</span></div>
                          </a>
                        )}
                      </div>
                      )}
                      {!selectedChatSystemLocked && <div className="msg-react-ctrl">
                        <button className="msg-react-btn msg-react-plus" title="+1" onClick={() => toggleReaction(msgKey2, msg.id, '+')}><img src={newIcon} alt="+" style={{ width: '12px', height: '12px', display: 'block', opacity: 0.65 }} /></button>
                        <div className="msg-react-emoji-wrap" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                          <button className="msg-react-btn" title="Tepki ekle" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMsgEmojiFor?.(f => f?.msgId === String(msg.id) ? null : { msgKey: msgKey2, msgId: String(msg.id) }) }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>
                          </button>
                          {showMsgEmojiFor?.msgId === String(msg.id) && (
                            <div className="msg-emoji-picker-wrap" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                              <EmojiPickerReact emojiStyle={EmojiStyle.APPLE} height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={d => toggleReaction(msgKey2, msg.id, d.emoji)} />
                            </div>
                          )}
                        </div>
                      </div>}
                      <span className="bubble-time">{msg.isQueued ? '🕒 ' : ''}{formatTime(msg.time)}</span>
                    </div>
                    {Object.keys(msgReactions[msgKey2]?.[String(msg.id)] || {}).length > 0 && (
                      <div className="msg-reactions msg-reactions--bubble">
                        {Object.entries(msgReactions[msgKey2]?.[String(msg.id)] || {}).map(([emoji, users]) => (
                          <button key={emoji} className={`reaction-pill${users.includes(String(uid)) ? ' reaction-pill--mine' : ''}`} onClick={() => toggleReaction(msgKey2, msg.id, emoji)}>
                            {emoji} <span>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isOwn && dmReadReceipts[msgKey2] && String(dmReadReceipts[msgKey2].lastMsgId) === String(msg.id) && dmReadReceipts[msgKey2].photo && (
                    <div className="bubble-read-receipt">
                      <img src={dmReadReceipts[msgKey2].photo} alt="" className="bubble-receipt-avatar" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

export default VirtualMessageList
