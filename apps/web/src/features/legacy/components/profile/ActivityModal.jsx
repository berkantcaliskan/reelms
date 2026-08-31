import React, { useState } from 'react'

export const ACTIVITY_TYPES = [
  { key: 'playing', icon: '🎮', label: 'Playing' },
  { key: 'using', icon: '💻', label: 'Using' },
  { key: 'watching', icon: '📺', label: 'Watching' },
  { key: 'custom', icon: '✨', label: 'Custom' },
]

export function ActivityBadge({ activity }) {
  const meta = ACTIVITY_TYPES.find(t => t.key === activity?.type) || ACTIVITY_TYPES[3]
  return (
    <div className="activity-badge">
      <span className="activity-badge-icon">{activity?.icon || meta.icon}</span>
      <span className="activity-badge-text">
        <span className="activity-badge-action">{meta.label}</span>
        {' '}
        <span className="activity-badge-name">{activity?.name}</span>
        {activity?.details && <span className="activity-badge-detail"> · {activity.details}</span>}
      </span>
    </div>
  )
}

export function ActivitySetterModal({ current, onSet, onClose }) {
  const [type, setType] = useState(current?.type || 'playing')
  const [name, setName] = useState(current?.name || '')
  const [details, setDetails] = useState(current?.details || '')
  const [icon, setIcon] = useState(current?.icon || '')

  const currentMeta = ACTIVITY_TYPES.find(t => t.key === type) || ACTIVITY_TYPES[0]

  const handleSave = () => {
    if (!name.trim()) return
    onSet?.({
      type,
      name: name.trim(),
      details: details.trim() || undefined,
      icon: icon.trim() || currentMeta.icon,
      startedAt: current?.startedAt || Date.now(),
    })
    onClose?.()
  }

  return (
    <div className="activity-setter-overlay" onClick={onClose}>
      <div className="activity-setter-modal" onClick={e => e.stopPropagation()}>
        <div className="activity-setter-header">
          <span>Set Activity</span>
          <button type="button" className="activity-setter-close" onClick={onClose}>✕</button>
        </div>
        <div className="activity-type-tabs">
          {ACTIVITY_TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              className={'activity-type-tab' + (type === t.key ? ' active' : '')}
              onClick={() => { setType(t.key); if (!icon) setIcon(t.icon) }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="activity-setter-fields">
          <input
            className="activity-setter-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={type === 'playing' ? 'Game name (e.g. Minecraft)' : type === 'using' ? 'App name (e.g. VS Code)' : type === 'watching' ? 'Show/Movie name' : 'What are you doing?'}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
          <input
            className="activity-setter-input"
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Details / status message (optional)"
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
          <input
            className="activity-setter-input"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            placeholder={'Custom emoji (default: ' + currentMeta.icon + ')'}
            maxLength={4}
          />
        </div>
        <div className="activity-setter-actions">
          {current?.name && (
            <button type="button" className="activity-setter-clear" onClick={() => { onSet?.(null); onClose?.() }}>
              Clear Activity
            </button>
          )}
          <button type="button" className="activity-setter-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="activity-setter-save" onClick={handleSave} disabled={!name.trim()}>Save</button>
        </div>
      </div>
    </div>
  )
}
