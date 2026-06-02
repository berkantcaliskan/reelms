import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import { getDoc, putDoc, userPk } from '../../modules/store/docStore.js'

function nid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}` }

export function createSocialRouter(io: Server) {
  const router = Router()
  router.use(authenticate)

  const emit = (uid: string, sk: string) => io.to(`u:${uid}`).emit('reelms:doc', { scope: 'user', sk })

  router.post('/notify', async (req, res) => {
    try {
      const { targetUid, text } = req.body
      if (!targetUid || !text || targetUid === req.userId) return res.status(400).json({ error: 'bad_body' })
      const pk = userPk(String(targetUid))
      const notifs = (await getDoc<any[]>(pk, 'notifications')) || []
      notifs.unshift({ id: nid(), text, time: Date.now() })
      await putDoc(pk, 'notifications', notifs)
      emit(String(targetUid), 'notifications')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/friend-request', async (req, res) => {
    try {
      const { toUid, from } = req.body
      if (!toUid || !from || String(from.id) !== String(req.userId)) return res.status(400).json({ error: 'bad_body' })
      if (String(toUid) === String(env.REELMS_MODERATION_UID)) return res.status(403).json({ error: 'cannot_friend_moderation_account' })
      const tPk = userPk(String(toUid))
      let reqs = (await getDoc<any[]>(tPk, 'friend_requests')) || []
      if (!reqs.some((r) => String(r.id) === String(from.id))) {
        reqs.unshift({ id: from.id, name: from.name, username: from.username, photo: from.photo || null })
        await putDoc(tPk, 'friend_requests', reqs)
        emit(String(toUid), 'friend_requests')
      }
      const notifs = (await getDoc<any[]>(tPk, 'notifications')) || []
      notifs.unshift({ id: nid(), text: `${from.name} sent you a friend request.`, time: Date.now() })
      await putDoc(tPk, 'notifications', notifs)
      emit(String(toUid), 'notifications')
      const sPk = userPk(String(req.userId))
      let out = (await getDoc<string[]>(sPk, 'friend_requests_out')) || []
      if (!out.map(String).includes(String(toUid))) out = [...out, String(toUid)]
      await putDoc(sPk, 'friend_requests_out', out)
      emit(String(req.userId), 'friend_requests_out')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/friend-accept', async (req, res) => {
    try {
      const { requester, meProfile } = req.body
      if (!requester?.id || !meProfile?.id || String(meProfile.id) !== String(req.userId)) return res.status(400).json({ error: 'bad_body' })
      const me = String(req.userId)
      const myPk = userPk(me)
      let freq = (await getDoc<any[]>(myPk, 'friend_requests')) || []
      freq = freq.filter((r) => String(r.id) !== String(requester.id))
      await putDoc(myPk, 'friend_requests', freq); emit(me, 'friend_requests')
      let friends = (await getDoc<any[]>(myPk, 'friends')) || []
      if (!friends.some((f) => String(f.id) === String(requester.id))) friends = [...friends, { id: requester.id, name: requester.name, username: requester.username, photo: requester.photo || null }]
      await putDoc(myPk, 'friends', friends); emit(me, 'friends')
      const rPk = userPk(String(requester.id))
      let rf = (await getDoc<any[]>(rPk, 'friends')) || []
      if (!rf.some((f) => String(f.id) === String(me))) rf = [...rf, { id: meProfile.id, name: meProfile.name, username: meProfile.username, photo: meProfile.photo || null }]
      await putDoc(rPk, 'friends', rf); emit(String(requester.id), 'friends')
      let ro = (await getDoc<string[]>(rPk, 'friend_requests_out')) || []
      ro = ro.filter((id) => String(id) !== String(me))
      await putDoc(rPk, 'friend_requests_out', ro); emit(String(requester.id), 'friend_requests_out')
      const rn = (await getDoc<any[]>(rPk, 'notifications')) || []
      rn.unshift({ id: nid(), text: `${meProfile.name} accepted your friend request.`, time: Date.now() })
      await putDoc(rPk, 'notifications', rn); emit(String(requester.id), 'notifications')
      const myN = (await getDoc<any[]>(myPk, 'notifications')) || []
      myN.unshift({ id: nid(), text: `You are now friends with ${requester.name}.`, time: Date.now() })
      await putDoc(myPk, 'notifications', myN); emit(me, 'notifications')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/friend-reject', async (req, res) => {
    try {
      const requesterId = String(req.body?.requesterId || '')
      if (!requesterId) return res.status(400).json({ error: 'bad_body' })
      const me = String(req.userId)
      const myPk = userPk(me)
      let freq = (await getDoc<any[]>(myPk, 'friend_requests')) || []
      freq = freq.filter((r) => String(r.id) !== requesterId)
      await putDoc(myPk, 'friend_requests', freq); emit(me, 'friend_requests')
      const rPk = userPk(requesterId)
      let ro = (await getDoc<string[]>(rPk, 'friend_requests_out')) || []
      ro = ro.filter((id) => String(id) !== me)
      await putDoc(rPk, 'friend_requests_out', ro); emit(requesterId, 'friend_requests_out')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/remove-friend', async (req, res) => {
    try {
      const friendId = String(req.body?.friendId || '')
      if (!friendId) return res.status(400).json({ error: 'bad_body' })
      const me = String(req.userId)
      const myPk = userPk(me)
      let friends = (await getDoc<any[]>(myPk, 'friends')) || []
      friends = friends.filter((f) => String(f.id) !== friendId)
      await putDoc(myPk, 'friends', friends); emit(me, 'friends')
      const fPk = userPk(friendId)
      let tf = (await getDoc<any[]>(fPk, 'friends')) || []
      tf = tf.filter((f) => String(f.id) !== me)
      await putDoc(fPk, 'friends', tf); emit(friendId, 'friends')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/message-request', async (req, res) => {
    try {
      const { toUid, from, preview } = req.body
      if (!toUid || !from || String(from.id) !== String(req.userId)) return res.status(400).json({ error: 'bad_body' })
      const tPk = userPk(String(toUid))
      let reqs = (await getDoc<any[]>(tPk, 'message_requests')) || []
      if (!reqs.some((r) => r.fromId === from.id)) {
        reqs.unshift({ id: Date.now(), fromId: from.id, fromName: from.name, fromUsername: from.username, fromPhoto: from.photo || null, preview: preview || '', sentAt: Date.now() })
        await putDoc(tPk, 'message_requests', reqs); emit(String(toUid), 'message_requests')
      }
      const notifs = (await getDoc<any[]>(tPk, 'notifications')) || []
      notifs.unshift({ id: nid(), text: `${from.name} sent you a message request.`, time: Date.now() })
      await putDoc(tPk, 'notifications', notifs); emit(String(toUid), 'notifications')
      const sPk = userPk(String(req.userId))
      let out = (await getDoc<string[]>(sPk, 'message_requests_out')) || []
      if (!out.map(String).includes(String(toUid))) out = [...out, String(toUid)]
      await putDoc(sPk, 'message_requests_out', out); emit(String(req.userId), 'message_requests_out')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  return router
}
