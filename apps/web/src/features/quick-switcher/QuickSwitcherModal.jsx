import React, { useState, useEffect, useRef, useMemo } from 'react'

export function QuickSwitcherModal({
  isOpen,
  onClose,
  reelms = [],
  chats = [],
  friends = [],
  onSelectChannel,
  onSelectChat,
  onJoinVoice,
}) {
  const [query, setQuery] = useState('')
  const [selIdx, setSelIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const results = useMemo(() => {
    if (!isOpen) return []
    const q = query.trim().toLowerCase()

    const items = []

    // Reelm channels
    for (const reelm of reelms) {
      const categories = Array.isArray(reelm?.categories) ? reelm.categories : []
      for (const cat of categories) {
        const channels = Array.isArray(cat?.channels) ? cat.channels : []
        for (const ch of channels) {
          const match = !q ||
            ch.name?.toLowerCase().includes(q) ||
            reelm.name?.toLowerCase().includes(q)
          if (match) {
            items.push({
              id: `ch_${reelm.id}_${ch.id}`,
              type: ch.type === 'voice' || ch.type === 'stage' ? 'voice' : 'channel',
              title: ch.name,
              subtitle: reelm.name,
              reelm,
              channel: ch,
            })
          }
        }
      }
    }

    // Direct message chats
    for (const chat of chats) {
      if (chat.type === 'dm') {
        const match = !q || chat.name?.toLowerCase().includes(q)
        if (match) {
          items.push({
            id: `dm_${chat.id}`,
            type: 'dm',
            title: chat.name || 'Direct Message',
            subtitle: 'Direct Message',
            chat,
          })
        }
      }
    }

    // Friends not yet chatted with
    for (const friend of friends) {
      const friendId = friend.id || friend.userId
      const alreadyHasDm = items.some(it => it.chat?.friendId === friendId)
      if (!alreadyHasDm) {
        const match = !q || friend.name?.toLowerCase().includes(q) || friend.username?.toLowerCase().includes(q)
        if (match) {
          items.push({
            id: `fr_${friendId}`,
            type: 'dm',
            title: friend.name || friend.username || 'Friend',
            subtitle: `@${friend.username || 'user'}`,
            friend,
          })
        }
      }
    }

    return items.slice(0, 25)
  }, [isOpen, query, reelms, chats, friends])

  useEffect(() => {
    setSelIdx(0)
  }, [results.length])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelIdx(i => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelIdx(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[selIdx]
      if (selected) {
        executeSelection(selected)
      }
    }
  }

  const executeSelection = (item) => {
    if (item.type === 'voice') {
      if (onJoinVoice) onJoinVoice(item.reelm.id, item.channel.id, item.channel.name)
    } else if (item.type === 'channel') {
      if (onSelectChannel) onSelectChannel(item.reelm, item.channel)
    } else if (item.type === 'dm') {
      if (item.chat && onSelectChat) onSelectChat(item.chat)
      else if (item.friend && onSelectChat) onSelectChat({ type: 'dm', friendId: item.friend.id, name: item.friend.name, photo: item.friend.photo })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="quick-switcher-overlay" onClick={onClose}>
      <div className="quick-switcher-modal" onClick={e => e.stopPropagation()}>
        <div className="quick-switcher-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="quick-switcher-search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="quick-switcher-input"
            placeholder="Where would you like to go? (Type # for channel, @ for user)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="quick-switcher-esc-badge">ESC</span>
        </div>

        <div className="quick-switcher-results">
          {results.map((item, idx) => (
            <div
              key={item.id}
              className={`quick-switcher-item${idx === selIdx ? ' quick-switcher-item--active' : ''}`}
              onMouseEnter={() => setSelIdx(idx)}
              onClick={() => executeSelection(item)}
            >
              <div className="quick-switcher-item-icon">
                {item.type === 'voice' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                ) : item.type === 'dm' ? (
                  <span className="quick-switcher-at-badge">@</span>
                ) : (
                  <span className="quick-switcher-hash-badge">#</span>
                )}
              </div>
              <div className="quick-switcher-item-info">
                <span className="quick-switcher-item-title">{item.title}</span>
                <span className="quick-switcher-item-sub">{item.subtitle}</span>
              </div>
              {idx === selIdx && (
                <span className="quick-switcher-enter-hint">Jump ↵</span>
              )}
            </div>
          ))}

          {results.length === 0 && (
            <div className="quick-switcher-empty">
              <span>No channels or chats match "{query}"</span>
            </div>
          )}
        </div>

        <div className="quick-switcher-footer">
          <span><b>↑↓</b> to navigate</span>
          <span><b>↵</b> to select</span>
          <span><b>ESC</b> to dismiss</span>
        </div>
      </div>
    </div>
  )
}
