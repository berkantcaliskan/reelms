import { Router } from 'express'
import { env } from '../../config/env.js'
import { syncAllDefaultCommunityMembersFromProfiles } from '../../modules/reelms/defaultReelm.js'
import { chanPk, getDoc, queryDocs, scanByPkPrefix } from '../../modules/store/docStore.js'

export const debugRouter = Router()

debugRouter.use((_req, res, next) => {
  if (env.NODE_ENV === 'production') return res.status(404).json({ error: 'not_found' })
  return next()
})

debugRouter.get('/state', async (_req, res) => {
  const usersRaw = await scanByPkPrefix<any>('USER#')
  const reelmsRaw = await scanByPkPrefix<any>('REELM#')
  const channelsRaw = await scanByPkPrefix<any>('CHAN#')

  const users = usersRaw
    .filter((item) => item.sk === 'profile')
    .map((item) => ({ pk: item.pk, id: item.data?.id, username: item.data?.username, name: item.data?.name || item.data?.displayName, contact: item.data?.contact }))

  const reelms = reelmsRaw
    .filter((item) => item.sk === 'meta')
    .map((item) => ({ id: item.data?.id, name: item.data?.name, code: item.data?.code, ownerId: item.data?.ownerId, isDefault: Boolean(item.data?.isDefault) }))

  const members = reelmsRaw
    .filter((item) => item.sk === 'members')
    .map((item) => ({ reelmId: item.pk.replace(/^REELM#/, ''), members: Array.isArray(item.data) ? item.data : [] }))

  const userReelms = usersRaw
    .filter((item) => item.sk === 'reelms')
    .map((item) => ({ uid: item.pk.replace(/^USER#/, ''), reelms: Array.isArray(item.data) ? item.data.map((r: any) => ({ id: r.id, name: r.name, code: r.code })) : [] }))

  const messageCounts = channelsRaw
    .filter((item) => item.sk.startsWith('MSG#'))
    .reduce<Record<string, number>>((acc, item) => {
      const key = item.pk.replace(/^CHAN#/, '')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

  res.json({ ok: true, users, reelms, members, userReelms, messageCounts })
})

debugRouter.post('/sync-default-community', async (_req, res) => {
  await syncAllDefaultCommunityMembersFromProfiles()
  res.json({ ok: true })
})

debugRouter.get('/channel/:msgKey/messages', async (req, res) => {
  const msgKey = decodeURIComponent(req.params.msgKey)
  const items = await queryDocs(chanPk(msgKey), 'MSG#')
  res.json({ ok: true, msgKey, count: items.length, data: items.map((item) => item.data) })
})
