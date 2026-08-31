import React from 'react'
import { getT } from '../../../../i18n'

export function HelpCenterPanel({ currentUser, language, helpForm = {}, setHelpForm, helpStatus, setHelpStatus, feedbackSend }) {
  const isTr = language === 'tr'

  return (
    <div className="accs-panel help-center-panel">
      <div className="accs-section">
        <div className="accs-section-title">{getT(language)('help_center') || 'Help Center'}</div>
        <p className="accs-note" style={{ margin: '0 0 16px' }}>
          {isTr ? 'Geri bildirim gönderin, soru sorun veya sorun bildirin. En kısa sürede size geri dönüş yapacağız.' : 'Send us your feedback, questions, or bug reports. We will get back to you as soon as possible.'}
        </p>

        {helpStatus === 'sent' ? (
          <div className="hc-sent" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent, #a78bfa)' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M7.5 12l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ marginTop: 12, fontSize: '0.92rem', fontWeight: 600, color: 'var(--ta)' }}>{getT(language)('feedback_sent') || 'Your message has been sent successfully!'}</p>
            <button
              type="button"
              className="hc-submit"
              style={{ marginTop: 16, width: 'auto', padding: '6px 20px' }}
              onClick={() => {
                setHelpForm?.({ name: currentUser?.displayName || '', email: currentUser?.email || '', message: '' })
                setHelpStatus?.('idle')
              }}
            >
              {isTr ? 'Yeni mesaj gönder' : 'Send another message'}
            </button>
          </div>
        ) : (
          <form className="hc-form" onSubmit={async e => {
            e.preventDefault()
            if (!helpForm?.message?.trim()) return
            setHelpStatus?.('sending')
            try {
              await feedbackSend?.(helpForm.name, helpForm.email, helpForm.message)
              setHelpStatus?.('sent')
            } catch {
              setHelpStatus?.('error')
            }
          }}>
            <div className="hc-row">
              <label className="hc-label">{getT(language)('display_name')}</label>
              <input
                className="hc-input"
                type="text"
                value={helpForm?.name || ''}
                onChange={e => setHelpForm?.(f => ({ ...f, name: e.target.value }))}
                placeholder={getT(language)('your_name_ph')}
              />
            </div>
            <div className="hc-row">
              <label className="hc-label">{getT(language)('email')}</label>
              <input
                className="hc-input"
                type="email"
                value={helpForm?.email || ''}
                onChange={e => setHelpForm?.(f => ({ ...f, email: e.target.value }))}
                placeholder={getT(language)('email_placeholder')}
              />
            </div>
            <div className="hc-row">
              <label className="hc-label">{getT(language)('feedback_message')}</label>
              <textarea
                className="hc-textarea"
                value={helpForm?.message || ''}
                onChange={e => setHelpForm?.(f => ({ ...f, message: e.target.value }))}
                placeholder={getT(language)('feedback_placeholder')}
                rows={5}
              />
            </div>
            {helpStatus === 'error' && (
              <p className="hc-error">{getT(language)('feedback_error')}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="submit"
                className="hc-submit"
                disabled={helpStatus === 'sending' || !helpForm?.message?.trim()}
              >
                {helpStatus === 'sending' ? getT(language)('loading') : getT(language)('send')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Alternative Contact Notice Card */}
      <div className="accs-section help-center-channels-card">
        <div className="hc-notice-box">
          <div className="hc-notice-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hc-notice-text">
            <span className="hc-notice-title">
              {isTr ? 'Diğer iletişim yolları' : 'Direct contact channels'}
            </span>
            <p className="hc-notice-desc">
              {isTr
                ? <>Uygulama içindeki <strong>Reelms Community</strong> üzerinden veya <a href="mailto:team@reelms.io" className="hc-notice-link">team@reelms.io</a> e-posta adresinden ekibimize doğrudan ulaşabilirsiniz.</>
                : <>You can also reach our team directly in the <strong>Reelms Community</strong> within the app or via email at <a href="mailto:team@reelms.io" className="hc-notice-link">team@reelms.io</a>.</>
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpCenterPanel
