import React from 'react'

export function formatPollTimeLeft(expiresAt) {
  const diff = expiresAt - Date.now()
  if (diff <= 0) return 'Sona erdi'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)))
    return `${mins}dk`
  }
  if (hours < 24) return `${hours}sa`
  const days = Math.floor(hours / (1000 * 60 * 60 * 24))
  return `${days}g`
}

export function PollCard({ poll, onVote, myUid, disabled }) {
  if (!poll) return null
  const totalVotes = (poll.options || []).reduce((sum, opt) => sum + (opt.voters || []).length, 0)
  const isExpired = poll.expiresAt ? Date.now() >= poll.expiresAt : false
  const timeLeft = poll.expiresAt && !isExpired ? formatPollTimeLeft(poll.expiresAt) : null

  return (
    <div className={`poll-msg-card${isExpired ? ' poll-msg-card--expired' : ''}`}>
      <div className="poll-msg-header">
        <div className="poll-msg-title-wrap">
          <span className="poll-msg-badge">📊 Anket</span>
          <span className="poll-msg-question">{poll.question}</span>
        </div>
        <div className="poll-msg-status">
          {isExpired ? (
            <span className="poll-status-tag poll-status-tag--expired">🔒 Sona erdi</span>
          ) : timeLeft ? (
            <span className="poll-status-tag poll-status-tag--active">⏳ {timeLeft} kaldı</span>
          ) : (
            <span className="poll-status-tag poll-status-tag--infinite">♾️ Süresiz</span>
          )}
        </div>
      </div>
      <div className="poll-msg-options">
        {(poll.options || []).map((opt, idx) => {
          const voteCount = (opt.voters || []).length
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
          const hasMyVote = (opt.voters || []).includes(myUid)
          return (
            <button
              key={idx}
              type="button"
              className={`poll-option-btn${hasMyVote ? ' poll-option-btn--voted' : ''}${isExpired || disabled ? ' poll-option-btn--disabled' : ''}`}
              onClick={() => !isExpired && !disabled && onVote && onVote(idx)}
              disabled={isExpired || disabled}
            >
              <div className="poll-option-fill" style={{ width: `${pct}%` }} />
              <div className="poll-option-content">
                <div className="poll-option-left">
                  <span className={`poll-option-radio${hasMyVote ? ' poll-option-radio--checked' : ''}`}>
                    {hasMyVote && <span className="poll-option-dot" />}
                  </span>
                  <span className="poll-option-text">{opt.text}</span>
                </div>
                <div className="poll-option-right">
                  {totalVotes > 0 && <span className="poll-option-pct">%{pct}</span>}
                  <span className="poll-option-count">{voteCount} oy</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="poll-msg-footer">
        <span className="poll-total-votes">{totalVotes} toplam oy</span>
        <span className="poll-hint">{isExpired ? 'Bu anket tamamlandı.' : 'Oyunuzu değiştirmek veya kaldırmak için seçeneğe tıklayabilirsiniz.'}</span>
      </div>
    </div>
  )
}

export default PollCard
