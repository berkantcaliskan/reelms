import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'

export type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch] || ch))
}

export function buttonEmailHtml(title: string, body: string, buttonLabel: string, url: string) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#111;color:#f4eee9;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#181514;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:28px;">
      <h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(title)}</h1>
      <p style="line-height:1.55;color:#d6cbc4;">${escapeHtml(body)}</p>
      <p style="margin:28px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#b99887;color:#16110f;text-decoration:none;font-weight:700;">${escapeHtml(buttonLabel)}</a></p>
      <p style="font-size:12px;line-height:1.5;color:#a99890;">If the button does not work, copy this link:<br>${escapeHtml(url)}</p>
    </div>
  </body></html>`
}

export async function sendEmail(input: SendEmailInput) {
  const to = String(input.to || '').trim()
  if (!to) throw new Error('missing_email_recipient')

  if (env.EMAIL_PROVIDER === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.MAIL_FROM_EMAIL,
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html || input.text
      })
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`email_send_failed:${response.status}:${detail.slice(0, 240)}`)
    }
    return { ok: true, provider: 'resend' as const }
  }

  logger.info('email.console', { to, subject: input.subject, text: input.text })
  return { ok: true, provider: 'console' as const }
}
