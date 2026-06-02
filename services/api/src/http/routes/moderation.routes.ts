import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { moderateText, pushModEvent } from '../../modules/moderation/moderationService.js'

export const moderationRouter = Router()

moderationRouter.post('/moderate', authenticate, async (req, res) => {
  const { text, ageRating } = req.body || {}
  res.json(await moderateText(String(text || ''), ageRating))
})

moderationRouter.post('/admin/mod-report', authenticate, async (req, res) => {
  const { report } = req.body || {}
  if (!report) return res.status(400).json({ error: 'missing_report' })
  await pushModEvent({
    type: 'user_report',
    reporterId: report.reporterId || req.userId || '',
    reporterName: report.reporterName || '',
    targetType: report.type || '',
    targetId: report.targetId || '',
    targetContent: (report.targetContent || '').slice(0, 400),
    targetUserId: report.targetUserId || '',
    targetUserName: report.targetUserName || '',
    reason: report.reason || '',
    reelmId: report.reelmId || '',
    actionTaken: false,
    needsReview: true
  })
  res.json({ ok: true })
})

moderationRouter.post('/admin/mod-login', (req, res) => {
  console.log(`[MOD LOGIN] Reelms Moderation signed in at ${new Date(req.body?.time || Date.now()).toISOString()} from ${req.body?.device || 'unknown'}`)
  res.json({ ok: true })
})
