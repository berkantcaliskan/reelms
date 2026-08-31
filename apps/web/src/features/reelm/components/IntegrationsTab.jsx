import React, { useState, useEffect, useCallback } from 'react'
import { useT } from '../../../i18n'
import { aiAddBotToReelm } from '../../../reelmsAwsClient'

function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || localStorage.getItem('reelms_token') || ''
}

export function IntegrationsTab({ reelm, channels = [] }) {
  const t = useT()
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.id || '')
  const [newAvatar, setNewAvatar] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [testStatus, setTestStatus] = useState({})

  const loadWebhooks = useCallback(async () => {
    try {
      setLoading(true)
      const token = getToken()
      const res = await fetch(`/api/reelms/${reelm.id}/webhooks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.webhooks) setWebhooks(data.webhooks)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [reelm.id])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  const handleCreate = async () => {
    if (!newName.trim() || !selectedChannelId) return
    try {
      const token = getToken()
      const res = await fetch(`/api/reelms/${reelm.id}/channels/${selectedChannelId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newName.trim(),
          avatar: newAvatar.trim() || null
        })
      })
      const data = await res.json()
      if (data.webhook) {
        setWebhooks(prev => [data.webhook, ...prev])
        setCreating(false)
        setNewName('')
        setNewAvatar('')
      }
    } catch {
      alert('Failed to create webhook')
    }
  }

  const handleDelete = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return
    try {
      const token = getToken()
      await fetch(`/api/reelms/${reelm.id}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setWebhooks(prev => prev.filter(w => w.id !== webhookId))
    } catch {}
  }

  const handleCopyUrl = (webhook) => {
    const url = `${window.location.origin}/api/webhooks/${webhook.id}/${webhook.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(webhook.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleTest = async (webhook) => {
    setTestStatus(prev => ({ ...prev, [webhook.id]: 'Sending...' }))
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}/${webhook.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '🚀 Hello from Reelms Webhook! Integration test successful.',
          username: webhook.name,
          avatar_url: webhook.avatar || undefined
        })
      })
      if (res.ok) {
        setTestStatus(prev => ({ ...prev, [webhook.id]: 'Success! ✓' }))
      } else {
        setTestStatus(prev => ({ ...prev, [webhook.id]: 'Error ✕' }))
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [webhook.id]: 'Error ✕' }))
    }
    setTimeout(() => setTestStatus(prev => ({ ...prev, [webhook.id]: null })), 3000)
  }

  return (
    <div className="rs-section">
      <div className="rs-section-header">
        <span className="rs-section-title">Webhooks & Bot Integrations</span>
        <button className="rs-add-btn" onClick={() => setCreating(true)}>+ New Webhook</button>
      </div>
      <p className="rs-section-hint">
        Create webhook endpoints compatible with Discord bots and GitHub events. Any tool (Zapier, IFTTT, GitHub, custom Discord bots) can post directly to your Reelms channels without modifying their code.
      </p>

      {/* Reelms Intelligence Integration Card */}
      <div className="rs-ai-bot-card" style={{ marginBottom: 20, padding: 16, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Reelms Intelligence Bot</div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>OpenRouter • @reelmsai / @reelmsintelligence • /ai • /summarize</div>
            </div>
          </div>
          <button
            type="button"
            className="rs-add-btn"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            onClick={async () => {
              try {
                const res = await aiAddBotToReelm(reelm.id)
                if (res?.ok) {
                  alert('Reelms Intelligence başarıyla bu Reelm topluluğuna eklendi!')
                } else {
                  alert(res?.error || 'Reelms Intelligence eklenemedi.')
                }
              } catch (err) {
                alert('Hata: ' + (err?.message || 'Bot eklenemedi'))
              }
            }}
          >
            + Add Reelms Intelligence Bot
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>
          Bu Reelm'e Reelms Intelligence botunu dahil edin. Kanallarda <code>/ai &lt;soru&gt;</code>, <code>/summarize</code> komutları veya <code>@reelmsai</code> etiketiyle anında akıllı yanıtlar ve özetler alın.
        </div>
      </div>

      {creating && (
        <div className="rs-webhook-create-card">
          <span className="rs-webhook-card-title">New Webhook</span>
          <div className="rs-webhook-form">
            <div className="rs-webhook-field">
              <label>Bot Name</label>
              <input
                className="rs-name-input"
                placeholder="e.g. GitHub Commits, Music Bot"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="rs-webhook-field">
              <label>Target Channel</label>
              <select
                className="rs-webhook-select"
                value={selectedChannelId}
                onChange={e => setSelectedChannelId(e.target.value)}
              >
                {channels.map(ch => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
            </div>
            <div className="rs-webhook-field">
              <label>Avatar URL (Optional)</label>
              <input
                className="rs-name-input"
                placeholder="https://..."
                value={newAvatar}
                onChange={e => setNewAvatar(e.target.value)}
              />
            </div>
            <div className="rs-webhook-buttons">
              <button className="rs-save-btn" onClick={handleCreate} disabled={!newName.trim()}>Create Webhook</button>
              <button className="rs-cancel-btn" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="rs-empty">Loading integrations…</p>}
      {!loading && webhooks.length === 0 && !creating && (
        <div className="rs-empty">
          <p>No webhooks configured yet.</p>
          <p style={{ fontSize: '0.74rem', opacity: 0.65 }}>Create a webhook to connect GitHub, Discord bots, or notification scripts.</p>
        </div>
      )}

      <div className="rs-webhooks-list">
        {webhooks.map(wh => {
          const ch = channels.find(c => String(c.id) === String(wh.channelId))
          return (
            <div key={wh.id} className="rs-webhook-card">
              <div className="rs-webhook-avatar">
                {wh.avatar ? <img src={wh.avatar} alt="" /> : (wh.name || 'W')[0].toUpperCase()}
              </div>
              <div className="rs-webhook-info">
                <div className="rs-webhook-name-row">
                  <span className="rs-webhook-name">{wh.name}</span>
                  <span className="rs-webhook-channel-badge">#{ch?.name || 'channel'}</span>
                </div>
                <div className="rs-webhook-url-row">
                  <code className="rs-webhook-url">{`${window.location.origin}/api/webhooks/${wh.id}/${wh.token.slice(0, 8)}••••••••`}</code>
                </div>
              </div>
              <div className="rs-webhook-actions">
                <button
                  type="button"
                  className="rs-webhook-copy-btn"
                  onClick={() => handleCopyUrl(wh)}
                >
                  {copiedId === wh.id ? 'Copied! ✓' : 'Copy URL'}
                </button>
                <button
                  type="button"
                  className="rs-webhook-test-btn"
                  onClick={() => handleTest(wh)}
                >
                  {testStatus[wh.id] || 'Test'}
                </button>
                <button
                  type="button"
                  className="rs-role-delete-btn"
                  onClick={() => handleDelete(wh.id)}
                  title="Delete Webhook"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default IntegrationsTab
