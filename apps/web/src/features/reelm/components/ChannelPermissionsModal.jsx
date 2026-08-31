import React, { useState } from 'react'
import { CHANNEL_OVERRIDE_PERMISSIONS } from '../utils/reelmPermissionUtils'

export function ChannelPermissionsModal({ reelm, target, onClose, onSave }) {
  const { catId, chId, isCategory, targetName } = target
  const cat = reelm?.categories?.find(c => c.id === catId)
  const ch = !isCategory ? cat?.channels?.find(c => c.id === chId) : null
  const currentObj = isCategory ? cat : ch

  const [syncWithCat, setSyncWithCat] = useState(ch?.syncWithCategory ?? true)
  const [overwrites, setOverwrites] = useState(() => Array.isArray(currentObj?.permissionOverrides) ? currentObj.permissionOverrides : [])
  const [selectedTargetId, setSelectedTargetId] = useState('@everyone')
  const [addingTarget, setAddingTarget] = useState(false)

  const roles = Array.isArray(reelm?.roles) ? reelm.roles : []
  const members = Array.isArray(reelm?.members) ? reelm.members : []

  const activeOverwrite = overwrites.find(o => o.id === selectedTargetId) || { id: selectedTargetId, type: 'role', allow: [], deny: [] }

  const setPermState = (permKey, state) => {
    setOverwrites(prev => {
      const existingIdx = prev.findIndex(o => o.id === selectedTargetId)
      const targetObj = existingIdx >= 0 ? { ...prev[existingIdx] } : { id: selectedTargetId, type: roles.some(r => r.id === selectedTargetId) || selectedTargetId === '@everyone' ? 'role' : 'member', allow: [], deny: [] }
      const allowSet = new Set(targetObj.allow || [])
      const denySet = new Set(targetObj.deny || [])

      allowSet.delete(permKey)
      denySet.delete(permKey)

      if (state === 'allow') allowSet.add(permKey)
      if (state === 'deny') denySet.add(permKey)

      targetObj.allow = Array.from(allowSet)
      targetObj.deny = Array.from(denySet)

      const next = [...prev]
      if (existingIdx >= 0) {
        next[existingIdx] = targetObj
      } else {
        next.push(targetObj)
      }
      return next
    })
  }

  const handleSave = () => {
    const updatedCategories = (reelm?.categories || []).map(c => {
      if (c.id !== catId) return c
      if (isCategory) {
        return { ...c, permissionOverrides: overwrites }
      }
      const updatedChannels = (c.channels || []).map(channel => {
        if (channel.id !== chId) return channel
        return { ...channel, syncWithCategory: syncWithCat, permissionOverrides: overwrites }
      })
      return { ...c, channels: updatedChannels }
    })
    onSave?.({ ...reelm, categories: updatedCategories })
    onClose?.()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="reelm-channel-perm-modal" onClick={e => e.stopPropagation()}>
        <div className="rcp-header">
          <div>
            <span className="rcp-title">{isCategory ? `Category Permissions: ${cat?.name}` : `Channel Permissions: #${targetName}`}</span>
            <span className="rcp-subtitle">Configure who can view, send messages, and connect to this channel.</span>
          </div>
          <button type="button" className="rcp-close-btn" onClick={onClose}>×</button>
        </div>

        {!isCategory && (
          <div className="rcp-sync-row">
            <div>
              <span className="rcp-sync-label">Sync permissions with category</span>
              <p className="rcp-sync-desc">When enabled, channel automatically matches category permissions.</p>
            </div>
            <button
              className={`cust-toggle${syncWithCat ? ' cust-toggle-on' : ''}`}
              onClick={() => setSyncWithCat(!syncWithCat)}
            >
              <span className="cust-toggle-knob" />
            </button>
          </div>
        )}

        <div className="rcp-body">
          <div className="rcp-targets-sidebar">
            <div className="rcp-sidebar-header">
              <span>ROLES / MEMBERS</span>
              <button type="button" className="rcp-add-target-btn" onClick={() => setAddingTarget(!addingTarget)}>+</button>
            </div>

            {addingTarget && (
              <div className="rcp-add-target-dropdown">
                <span className="rcp-dropdown-header">Add Role</span>
                {roles.filter(r => !overwrites.some(o => o.id === r.id)).map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className="rcp-target-option"
                    onClick={() => {
                      setOverwrites(prev => [...prev, { id: r.id, type: 'role', allow: [], deny: [] }])
                      setSelectedTargetId(r.id)
                      setAddingTarget(false)
                    }}
                  >
                    <span className="rcp-target-dot" style={{ background: r.color }} />
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rcp-targets-list">
              <button
                type="button"
                className={`rcp-target-item${selectedTargetId === '@everyone' ? ' rcp-target-item--active' : ''}`}
                onClick={() => setSelectedTargetId('@everyone')}
              >
                <span>@everyone</span>
              </button>
              {overwrites.filter(o => o.id !== '@everyone').map(o => {
                const role = roles.find(r => r.id === o.id)
                const member = members.find(m => String(m.userId) === String(o.id))
                const name = role?.name || member?.userName || o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`rcp-target-item${selectedTargetId === o.id ? ' rcp-target-item--active' : ''}`}
                    onClick={() => setSelectedTargetId(o.id)}
                  >
                    {role && <span className="rcp-target-dot" style={{ background: role.color }} />}
                    <span>{name}</span>
                    <span
                      className="rcp-target-remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOverwrites(prev => prev.filter(item => item.id !== o.id))
                        if (selectedTargetId === o.id) setSelectedTargetId('@everyone')
                      }}
                    >
                      ✕
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rcp-perms-content">
            <div className="rcp-perms-list">
              {CHANNEL_OVERRIDE_PERMISSIONS.map(p => {
                const isAllow = (activeOverwrite.allow || []).includes(p.key)
                const isDeny = (activeOverwrite.deny || []).includes(p.key)
                const isNeutral = !isAllow && !isDeny

                return (
                  <div key={p.key} className="rcp-perm-row">
                    <div className="rcp-perm-info">
                      <span className="rcp-perm-name">{p.label}</span>
                      <span className="rcp-perm-note">{p.note}</span>
                    </div>
                    <div className="rcp-tri-state">
                      <button
                        type="button"
                        className={`rcp-tri-btn rcp-tri-deny${isDeny ? ' rcp-tri-btn--active' : ''}`}
                        onClick={() => setPermState(p.key, 'deny')}
                        title="Deny"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        className={`rcp-tri-btn rcp-tri-neutral${isNeutral ? ' rcp-tri-btn--active' : ''}`}
                        onClick={() => setPermState(p.key, 'neutral')}
                        title="Inherit / Neutral"
                      >
                        /
                      </button>
                      <button
                        type="button"
                        className={`rcp-tri-btn rcp-tri-allow${isAllow ? ' rcp-tri-btn--active' : ''}`}
                        onClick={() => setPermState(p.key, 'allow')}
                        title="Allow"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rcp-footer">
          <button type="button" className="rs-cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="rs-save-btn" onClick={handleSave}>Save Permissions</button>
        </div>
      </div>
    </div>
  )
}

export default ChannelPermissionsModal
