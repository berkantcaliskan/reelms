import React, { useState, useEffect } from 'react'
import { getIdToken } from '../../../../reelmsAwsClient'
import { getApiBaseUrl } from '../../../../config/api'

const BACKEND_URL = getApiBaseUrl()

export const REELM_RADIO_BOT = {
  id: 'reelm-radio',
  name: 'Reelm Radio',
  username: 'reelmradio',
  description: 'Play music seamlessly in Reelm channels. Control playback with /play, /skip, /queue, and /stop commands or by mentioning @reelmradio.',
  tags: ['Music', 'YouTube', 'Free'],
}

export const REELMS_INTELLIGENCE_BOT = {
  id: 'reelms-intelligence',
  name: 'Reelms AI',
  username: 'reelmsai',
  description: 'Your channel AI companion. Ask questions, summarize discussions, and receive daily digests.',
  tags: ['AI', 'Summarizer', 'Assistant'],
}

export function CompanionsPanel({ reelms = [] }) {
  const [botStatus, setBotStatus] = useState({})
  const [loading, setLoading] = useState({})
  const [aiBotStatus, setAiBotStatus] = useState({})
  const [aiLoading, setAiLoading] = useState({})
  const [authToken, setAuthToken] = useState(null)
  const [openReelms, setOpenReelms] = useState({})

  const toggleReelms = (botId) => {
    setOpenReelms(prev => ({ ...prev, [botId]: !prev[botId] }))
  }

  useEffect(() => {
    let cancelled = false
    const loadToken = async () => {
      const token = await getIdToken().catch(() => null)
      if (!cancelled) setAuthToken(token)
    }
    loadToken()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!reelms.length || !authToken) return
    const checks = reelms.map(async (r) => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/reelms/${r.id}/bot-status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
        if (res.ok) {
          const data = await res.json()
          return [r.id, data.hasBot]
        }
      } catch {}
      return [r.id, false]
    })
    Promise.all(checks).then(results => {
      const map = {}
      results.forEach(([id, has]) => { map[id] = has })
      setBotStatus(map)
    })
  }, [reelms, authToken])

  useEffect(() => {
    if (!reelms.length || !authToken) return
    const checks = reelms.map(async (r) => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/reelms/${r.id}/ai-bot-status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
        if (res.ok) {
          const data = await res.json()
          return [r.id, data.hasBot]
        }
      } catch {}
      return [r.id, false]
    })
    Promise.all(checks).then(results => {
      const map = {}
      results.forEach(([id, has]) => { map[id] = has })
      setAiBotStatus(map)
    })
  }, [reelms, authToken])

  async function addBot(reelmId) {
    if (!authToken) return
    setLoading(prev => ({ ...prev, [reelmId]: true }))
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/reelms/${reelmId}/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ botId: 'reelm-radio' })
      })
      if (res.ok) setBotStatus(prev => ({ ...prev, [reelmId]: true }))
    } catch {}
    setLoading(prev => ({ ...prev, [reelmId]: false }))
  }

  async function addAIBot(reelmId) {
    if (!authToken) return
    setAiLoading(prev => ({ ...prev, [reelmId]: true }))
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/reelms/${reelmId}/add-ai-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }
      })
      if (res.ok) setAiBotStatus(prev => ({ ...prev, [reelmId]: true }))
    } catch {}
    setAiLoading(prev => ({ ...prev, [reelmId]: false }))
  }

  return (
    <div className="companions-panel">
      <div className="companions-section-label">Companions from Reelms</div>

      {/* Reelm Radio */}
      <div className="companion-card">
        <div className="companion-card-header">
          <div className="companion-avatar">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
          </div>
          <div className="companion-info">
            <div className="companion-name-row">
              <span className="companion-name">{REELM_RADIO_BOT.name}</span>
              <span className="companion-coming-soon-badge">Coming soon</span>
            </div>
            <div className="companion-username">@{REELM_RADIO_BOT.username}</div>
          </div>
          <div className="companion-tags">
            {REELM_RADIO_BOT.tags.map(tag => (
              <span key={tag} className="companion-tag">{tag}</span>
            ))}
          </div>
        </div>
        <p className="companion-desc">{REELM_RADIO_BOT.description}</p>
        <div className="companion-commands">
          {['/play', '/skip', '/queue', '/stop', '@reelmradio'].map(cmd => (
            <code key={cmd} className="companion-cmd">{cmd}</code>
          ))}
        </div>

        {reelms.length > 0 && (
          <div className="companion-reelms-section">
            <div className="companion-reelms-trigger-row">
              <button
                type="button"
                className="companion-reelms-trigger"
                onClick={() => toggleReelms('radio')}
              >
                <span>Add to your Reelms</span>
                <svg
                  className={`companion-chevron${openReelms['radio'] ? ' companion-chevron--open' : ''}`}
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className={`companion-reelm-dropdown${openReelms['radio'] ? ' companion-reelm-dropdown--open' : ''}`}>
              <div className="companion-reelm-list">
                {reelms.map(r => (
                  <div key={r.id} className="companion-reelm-row">
                    <div className="companion-reelm-avatar" style={r.image ? { backgroundImage: `url(${r.image})`, backgroundSize: 'cover' } : {}}>
                      {!r.image && (r.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="companion-reelm-name">{r.name}</span>
                    {botStatus[r.id] ? (
                      <span className="companion-reelm-added">Added ✓</span>
                    ) : (
                      <button
                        type="button"
                        className="companion-add-btn"
                        disabled={!!loading[r.id]}
                        onClick={() => addBot(r.id)}
                      >
                        {loading[r.id] ? '...' : 'Add'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reelms AI */}
      <div className="companion-card">
        <div className="companion-card-header">
          <div className="companion-avatar">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="companion-info">
            <div className="companion-name-row">
              <span className="companion-name">{REELMS_INTELLIGENCE_BOT.name}</span>
              <span className="companion-coming-soon-badge">Coming soon</span>
            </div>
            <div className="companion-username">@{REELMS_INTELLIGENCE_BOT.username}</div>
          </div>
          <div className="companion-tags">
            {REELMS_INTELLIGENCE_BOT.tags.map(tag => (
              <span key={tag} className="companion-tag">{tag}</span>
            ))}
          </div>
        </div>
        <p className="companion-desc">{REELMS_INTELLIGENCE_BOT.description}</p>
        <div className="companion-commands">
          {['/ai', '/summarize', '/digest', '/ai-reset', '@reelmsai'].map(cmd => (
            <code key={cmd} className="companion-cmd">{cmd}</code>
          ))}
        </div>

        {reelms.length > 0 && (
          <div className="companion-reelms-section">
            <div className="companion-reelms-trigger-row">
              <button
                type="button"
                className="companion-reelms-trigger"
                onClick={() => toggleReelms('ai')}
              >
                <span>Add to your Reelms</span>
                <svg
                  className={`companion-chevron${openReelms['ai'] ? ' companion-chevron--open' : ''}`}
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className={`companion-reelm-dropdown${openReelms['ai'] ? ' companion-reelm-dropdown--open' : ''}`}>
              <div className="companion-reelm-list">
                {reelms.map(r => (
                  <div key={r.id} className="companion-reelm-row">
                    <div className="companion-reelm-avatar" style={r.image ? { backgroundImage: `url(${r.image})`, backgroundSize: 'cover' } : {}}>
                      {!r.image && (r.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="companion-reelm-name">{r.name}</span>
                    {aiBotStatus[r.id] ? (
                      <span className="companion-reelm-added">Added ✓</span>
                    ) : (
                      <button
                        type="button"
                        className="companion-add-btn"
                        disabled={!!aiLoading[r.id]}
                        onClick={() => addAIBot(r.id)}
                      >
                        {aiLoading[r.id] ? '...' : 'Add'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanionsPanel
