import React from 'react'
import { isDefaultCommunity } from '../utils/reelmPermissionUtils'

export function formatReelmDate(timestamp) {
  if (!timestamp) return 'Yeni'
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return 'Yeni'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ReelmInfoMenu({ reelm, pos, onClose, onOpenInsights, isOwnerOrAdmin, t, uid, onCopyCode }) {
  if (!reelm || !pos) return null
  const totalMembers = Array.isArray(reelm.members) ? reelm.members.length : 1
  const onlineMembers = Array.isArray(reelm.members)
    ? reelm.members.filter(m => m.status === 'online' || m.online).length
    : 1
  const totalChannels = (reelm.categories || []).reduce((acc, cat) => acc + (cat.channels || []).length, 0)
    + (reelm.channels || []).length
  const reelmCategory = isDefaultCommunity(reelm)
    ? 'Resmi Topluluk'
    : (reelm.category || (reelm.isWorkspace ? 'Çalışma Alanı' : 'Topluluk'))
  const createdDate = formatReelmDate(reelm.createdAt)
  const ownerDisplayName = reelm.ownerName || reelm.owner?.name || (reelm.ownerId === uid ? 'Sen' : 'Reelms')

  const copyCode = (code, e) => {
    e.stopPropagation()
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      if (onCopyCode) onCopyCode(code)
    }
  }

  return (
    <div className="reelm-info-menu" style={{ top: pos.y, left: pos.x, width: pos.w || 280 }} onClick={e => e.stopPropagation()}>
      {/* 1. Insights Intelligence Button */}
      <button
        type="button"
        className="reelm-info-menu-item reelm-info-menu-insights"
        onClick={() => {
          onOpenInsights?.(reelm)
          onClose?.()
        }}
      >
        <div className="reelm-menu-left-row">
          <svg className="reelm-insights-icon" width="14" height="13" viewBox="0 0 12 11" fill="currentColor"><rect x="0" y="6" width="2.5" height="5" rx="1"/><rect x="4.75" y="0" width="2.5" height="11" rx="1"/><rect x="9.5" y="3.5" width="2.5" height="7.5" rx="1"/></svg>
          <span style={{ fontWeight: 700 }}>Insights</span>
        </div>
        <span className="reelm-intel-pill">
          <svg className="reelm-intel-star" width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
          </svg>
          intelligence
        </span>
      </button>

      <div className="reelm-name-menu-divider" />

      {/* 2. Reelm Info Details */}
      <div className="reelm-info-details">
        <div className="reelm-info-row">
          <span className="reelm-info-label">🏷️ Kategori</span>
          <span className="reelm-info-value">{reelmCategory}</span>
        </div>
        <div className="reelm-info-row">
          <span className="reelm-info-label">👥 Üyeler</span>
          <span className="reelm-info-value">{totalMembers} üye <span style={{ opacity: 0.65, fontSize: '0.72rem' }}>({onlineMembers} aktif)</span></span>
        </div>
        <div className="reelm-info-row">
          <span className="reelm-info-label">💬 Kanallar</span>
          <span className="reelm-info-value">{totalChannels} kanal</span>
        </div>
        <div className="reelm-info-row">
          <span className="reelm-info-label">👑 Kurucu</span>
          <span className="reelm-info-value">{ownerDisplayName}</span>
        </div>
        <div className="reelm-info-row">
          <span className="reelm-info-label">📅 Kuruluş</span>
          <span className="reelm-info-value">{createdDate}</span>
        </div>
        {(reelm.joinCode || reelm.code) && (
          <div className="reelm-info-row">
            <span className="reelm-info-label">🔑 Katılım Kodu</span>
            <span className="reelm-info-code-badge" onClick={(e) => copyCode(reelm.joinCode || reelm.code, e)} title="Kodu Kopyala">
              {reelm.joinCode || reelm.code} 📋
            </span>
          </div>
        )}
        {reelm.description && (
          <div className="reelm-info-desc">
            "{reelm.description}"
          </div>
        )}
      </div>
    </div>
  )
}

export default ReelmInfoMenu
