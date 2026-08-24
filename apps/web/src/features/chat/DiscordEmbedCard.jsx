import React from 'react'

export function DiscordEmbedCard({ embed }) {
  if (!embed || typeof embed !== 'object') return null

  const borderHex = typeof embed.color === 'number'
    ? `#${embed.color.toString(16).padStart(6, '0')}`
    : (typeof embed.color === 'string' && embed.color ? embed.color : 'var(--ta)')

  return (
    <div className="discord-embed-card" style={{ borderLeftColor: borderHex }}>
      <div className="discord-embed-inner">
        {embed.author && embed.author.name && (
          <div className="discord-embed-author">
            {embed.author.icon_url && <img src={embed.author.icon_url} alt="" className="discord-embed-author-icon" />}
            {embed.author.url ? (
              <a href={embed.author.url} target="_blank" rel="noopener noreferrer" className="discord-embed-author-name">{embed.author.name}</a>
            ) : (
              <span className="discord-embed-author-name">{embed.author.name}</span>
            )}
          </div>
        )}

        {embed.title && (
          <div className="discord-embed-title">
            {embed.url ? (
              <a href={embed.url} target="_blank" rel="noopener noreferrer">{embed.title}</a>
            ) : (
              <span>{embed.title}</span>
            )}
          </div>
        )}

        {embed.description && (
          <div className="discord-embed-desc">
            {embed.description}
          </div>
        )}

        {Array.isArray(embed.fields) && embed.fields.length > 0 && (
          <div className="discord-embed-fields">
            {embed.fields.map((f, i) => (
              <div key={i} className={`discord-embed-field${f.inline ? ' discord-embed-field--inline' : ''}`}>
                <div className="discord-embed-field-name">{f.name}</div>
                <div className="discord-embed-field-value">{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {embed.image?.url && (
          <div className="discord-embed-image">
            <img src={embed.image.url} alt="" />
          </div>
        )}

        {embed.thumbnail?.url && !embed.image?.url && (
          <div className="discord-embed-thumbnail">
            <img src={embed.thumbnail.url} alt="" />
          </div>
        )}

        {(embed.footer?.text || embed.timestamp) && (
          <div className="discord-embed-footer">
            {embed.footer?.icon_url && <img src={embed.footer.icon_url} alt="" className="discord-embed-footer-icon" />}
            <span>
              {embed.footer?.text}
              {embed.footer?.text && embed.timestamp ? ' • ' : ''}
              {embed.timestamp ? new Date(embed.timestamp).toLocaleString() : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
