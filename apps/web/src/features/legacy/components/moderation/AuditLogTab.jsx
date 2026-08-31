import React, { useState, useEffect, useMemo } from 'react'
import { reelmGetDoc } from '../../../../reelmsAwsClient'
import { getPersonPhoto } from '../../utils/mediaUtils'

export function AuditLogView({ reelmId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reelmGetDoc(reelmId, 'audit_log')
      .then(data => {
        if (cancelled) return
        setLogs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLogs([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [reelmId, refreshTick])

  const ACTION_CONFIG = {
    MEMBER_BAN: { label: 'Banned Member', color: '#ef4444', category: 'moderation' },
    MEMBER_UNBAN: { label: 'Unbanned Member', color: '#10b981', category: 'moderation' },
    MEMBER_KICK: { label: 'Kicked Member', color: '#f97316', category: 'moderation' },
    MEMBER_TIMEOUT: { label: 'Timed Out Member', color: '#f59e0b', category: 'moderation' },
    MEMBER_TIMEOUT_REMOVE: { label: 'Removed Timeout', color: '#3b82f6', category: 'moderation' },
    MEMBER_ROLE_UPDATE: { label: 'Updated Roles', color: '#8b5cf6', category: 'roles' },
    ROLE_CREATE: { label: 'Created Role', color: '#8b5cf6', category: 'roles' },
    ROLE_UPDATE: { label: 'Updated Role', color: '#8b5cf6', category: 'roles' },
    ROLE_DELETE: { label: 'Deleted Role', color: '#ef4444', category: 'roles' },
    CHANNEL_CREATE: { label: 'Created Channel', color: '#06b6d4', category: 'channels' },
    CHANNEL_UPDATE: { label: 'Updated Channel', color: '#06b6d4', category: 'channels' },
    CHANNEL_DELETE: { label: 'Deleted Channel', color: '#ef4444', category: 'channels' },
    CHANNEL_SLOWMODE_UPDATE: { label: 'Updated Slowmode', color: '#06b6d4', category: 'channels' },
    MESSAGE_DELETE: { label: 'Deleted Message', color: '#f43f5e', category: 'messages' },
    MESSAGE_PIN: { label: 'Pinned Message', color: '#eab308', category: 'messages' },
    MESSAGE_UNPIN: { label: 'Unpinned Message', color: '#64748b', category: 'messages' },
    REELM_UPDATE: { label: 'Updated Settings', color: '#a855f7', category: 'settings' },
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(entry => {
      if (actionFilter !== 'ALL') {
        const config = ACTION_CONFIG[entry.action]
        if (config?.category !== actionFilter && entry.action !== actionFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const actorMatch = (entry.actor?.name || '').toLowerCase().includes(q) || (entry.actor?.username || '').toLowerCase().includes(q)
        const targetMatch = (entry.target?.name || '').toLowerCase().includes(q)
        const reasonMatch = (entry.reason || '').toLowerCase().includes(q)
        const summaryMatch = (entry.details?.summary || '').toLowerCase().includes(q)
        if (!actorMatch && !targetMatch && !reasonMatch && !summaryMatch) return false
      }
      return true
    })
  }, [logs, actionFilter, search])

  const formatTimestamp = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="audit-log-view">
      <div className="audit-log-controls">
        <div className="audit-log-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="audit-search-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="audit-log-search"
            placeholder="Search by moderator, target, or reason…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="audit-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="audit-log-filters">
          {[
            { id: 'ALL', label: 'All Actions' },
            { id: 'moderation', label: 'Moderation' },
            { id: 'roles', label: 'Roles' },
            { id: 'channels', label: 'Channels' },
            { id: 'settings', label: 'Settings' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`audit-filter-pill${actionFilter === f.id ? ' active' : ''}`}
              onClick={() => setActionFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            className="audit-refresh-btn"
            title="Refresh logs"
            onClick={() => setRefreshTick(t => t + 1)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="audit-log-empty">Loading audit actions…</div>
      ) : filteredLogs.length === 0 ? (
        <div className="audit-log-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--ta-rgb), 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p>No audit actions found</p>
          <span style={{ fontSize: '12px', opacity: 0.6 }}>Actions taken by moderators will appear here.</span>
        </div>
      ) : (
        <div className="audit-log-list">
          {filteredLogs.map(entry => {
            const config = ACTION_CONFIG[entry.action] || { label: entry.action, color: '#94a3b8' }
            return (
              <div key={entry.id} className="audit-log-entry">
                <div className="audit-log-entry-header">
                  <div className="audit-actor-info">
                    <div className="audit-actor-avatar">
                      {entry.actor?.photo ? (
                        <img src={entry.actor.photo} alt="" />
                      ) : (
                        <span>{(entry.actor?.name || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="audit-actor-meta">
                      <span className="audit-actor-name">{entry.actor?.name || 'Moderator'}</span>
                      {entry.actor?.username && (
                        <span className="audit-actor-username">@{entry.actor.username}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className="audit-action-badge"
                    style={{
                      background: `${config.color}22`,
                      color: config.color,
                      borderColor: `${config.color}44`
                    }}
                  >
                    {config.label}
                  </span>

                  <span className="audit-timestamp" title={new Date(entry.timestamp).toLocaleString()}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>

                {entry.target && (
                  <div className="audit-target-row">
                    <span className="audit-target-label">Target:</span>
                    <span className="audit-target-name">{entry.target.name || entry.target.username || entry.target.id}</span>
                  </div>
                )}

                {entry.reason && (
                  <div className="audit-reason-row">
                    <span className="audit-reason-label">Reason:</span>
                    <span className="audit-reason-text">{entry.reason}</span>
                  </div>
                )}

                {entry.details?.summary && (
                  <div className="audit-details-row">
                    <span className="audit-details-text">{entry.details.summary}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BanListView({ reelmId, banList = [], onUnbanMember }) {
  const [localBanList, setLocalBanList] = useState(banList)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLocalBanList(banList)
  }, [banList])

  const filteredBans = useMemo(() => {
    if (!search.trim()) return localBanList
    const q = search.toLowerCase()
    return localBanList.filter(entry =>
      (entry.name || '').toLowerCase().includes(q) ||
      (entry.username || '').toLowerCase().includes(q) ||
      (entry.message || entry.reason || '').toLowerCase().includes(q)
    )
  }, [localBanList, search])

  return (
    <div className="ban-list-view">
      <div className="audit-log-search-wrap" style={{ marginBottom: 14 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="audit-search-icon">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="audit-log-search"
          placeholder="Search banned members…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="audit-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {filteredBans.length === 0 ? (
        <div className="audit-log-empty">
          <p>No banned users in this Reelm.</p>
        </div>
      ) : (
        <div className="rs-members-list">
          {filteredBans.map(entry => {
            const entryId = String(entry.userId || entry.id || '')
            return (
              <div key={entryId} className="rs-member-row">
                <div className="rs-member-avatar">
                  {getPersonPhoto(entry)
                    ? <img src={getPersonPhoto(entry)} alt={entry.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : (entry.name || '?').charAt(0).toUpperCase()
                  }
                </div>
                <div className="rs-member-info">
                  <span className="rs-member-name">{entry.name || entry.username || 'Member'}</span>
                  <span className="discover-result-type">
                    {entry.username ? `@${entry.username}` : 'banned'}
                    {entry.message || entry.reason ? ` • ${entry.message || entry.reason}` : ''}
                  </span>
                </div>
                <button className="rs-add-btn" onClick={() => onUnbanMember?.(reelmId, entryId)}>Unban</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AuditLogTab({ reelmId, banList = [], onUnbanMember }) {
  const [activeSubTab, setActiveSubTab] = useState('log')
  return (
    <div className="rs-section audit-log-tab">
      <div className="rs-section-header" style={{ marginBottom: 16 }}>
        <span className="rs-section-title">Audit & Moderation</span>
        <div className="audit-subtab-nav">
          <button
            type="button"
            className={`subtab-btn${activeSubTab === 'log' ? ' subtab-btn--active' : ''}`}
            onClick={() => setActiveSubTab('log')}
          >
            Audit Log
          </button>
          <button
            type="button"
            className={`subtab-btn${activeSubTab === 'ban' ? ' subtab-btn--active' : ''}`}
            onClick={() => setActiveSubTab('ban')}
          >
            Ban List ({banList.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'log' && <AuditLogView reelmId={reelmId} />}
      {activeSubTab === 'ban' && <BanListView reelmId={reelmId} banList={banList} onUnbanMember={onUnbanMember} />}
    </div>
  )
}

export default AuditLogTab
