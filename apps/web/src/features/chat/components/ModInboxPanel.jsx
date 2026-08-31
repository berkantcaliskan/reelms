import React, { useState, useEffect } from 'react'
import { modInboxGet } from '../../../reelmsAwsClient'

export function ModInboxPanel({ onClose }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    modInboxGet()
      .then(msgs => setEvents([...(msgs || [])].sort((a, b) => (a.time || 0) - (b.time || 0))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group events by calendar day
  const grouped = []
  let lastDay = null
  for (const ev of events) {
    const d = new Date(ev.time)
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (dayKey !== lastDay) {
      lastDay = dayKey
      grouped.push({ type: 'day', label: d.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), key: dayKey })
    }
    grouped.push({ type: 'event', ev })
  }

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mod-inbox-panel">
      <div className="mod-inbox-header">
        <button className="reelm-settings-back-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="mod-inbox-title">Moderation Inbox</span>
      </div>
      <div className="mod-inbox-list">
        {loading && <div className="mod-inbox-empty">Loading…</div>}
        {!loading && grouped.length === 0 && <div className="mod-inbox-empty">No events yet.</div>}
        {grouped.map((item, i) => {
          if (item.type === 'day') {
            return <div key={item.key} className="mod-inbox-day-sep">{item.label}</div>
          }
          const ev = item.ev
          const isFlag = ev.type === 'auto_flag'
          return (
            <div key={ev.id || i} className={`mod-inbox-event${isFlag ? ' mod-flag' : ' mod-report'}`}>
              <div className="mod-inbox-event-top">
                <span className={`mod-inbox-badge${isFlag ? ' badge-flag' : ' badge-report'}`}>
                  {isFlag ? 'AI blocked' : 'User report'}
                </span>
                {ev.needsReview && <span className="mod-inbox-badge badge-review">Needs review</span>}
                {ev.actionTaken && <span className="mod-inbox-badge badge-done">Action taken</span>}
                <span className="mod-inbox-time">{fmtTime(ev.time)}</span>
              </div>
              {isFlag ? (
                <div className="mod-inbox-body">
                  <div className="mod-inbox-text">"{ev.text}"</div>
                  {Array.isArray(ev.categories) && ev.categories.length > 0 && (
                    <div className="mod-inbox-cats">{ev.categories.map(String).join(' · ')}</div>
                  )}
                </div>
              ) : (
                <div className="mod-inbox-body">
                  <div className="mod-inbox-reporter">
                    <strong>{ev.reporterName || ev.reporterId}</strong> bildirdi
                    {ev.targetUserName ? <> — Hedef: <strong>{ev.targetUserName}</strong></> : null}
                    {ev.reason ? <> · <em>{ev.reason}</em></> : null}
                  </div>
                  {ev.targetContent && <div className="mod-inbox-text">"{ev.targetContent}"</div>}
                  <div className="mod-inbox-cats">
                    {ev.targetType}{ev.reelmId ? ` · reelm:${ev.reelmId}` : ''}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ModInboxPanel
