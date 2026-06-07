import { Router } from 'express'
import type { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import { getDoc, putDoc, userPk } from '../../modules/store/docStore.js'
import { getUserPublicProfile } from '../../modules/reelms/access.js'

function nid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}` }
const getProfilePhoto = (profile: any = {}) => profile.photo || profile.profilePhoto || profile.photoURL || profile.avatar || profile.image || profile.imageUrl || profile.userPhoto || null

const compactFriend = (profile: any) => ({
  id: String(profile.id || profile.uid || ''),
  name: profile.name || profile.displayName || profile.username || 'User',
  username: profile.username || '',
  photo: getProfilePhoto(profile)
})

async function userExists(uid: string) {
  if (!uid) return false
  const profile = await getDoc<any>(userPk(uid), 'profile').catch(() => null)
  return Boolean(profile)
}

function hasFriend(list: any[], uid: string) {
  return list.some((friend) => String(friend?.id) === uid)
}

export function createSocialRouter(io: Server) {
  const router = Router()
  router.use(authenticate)

  const emit = (uid: string, sk: string) => io.to(`u:${uid}`).emit('reelms:doc', { scope: 'user', sk })
  const isSystemInboxUid = (uid: string) => String(uid || '') === String(env.REELMS_MODERATION_UID || '')

  router.post('/notify', async (req, res) => {
    try {
      const { targetUid, text, link } = req.body
      if (!targetUid || !text || targetUid === req.userId) return res.status(400).json({ error: 'bad_body' })
      if (!await userExists(String(targetUid))) return res.status(404).json({ error: 'user_not_found' })
      const pk = userPk(String(targetUid))
      const notifs = (await getDoc<any[]>(pk, 'notifications').catch(() => [])) || []
      notifs.unshift({ id: nid(), text: String(text).slice(0, 500), time: Date.now(), link: link && typeof link === 'object' ? link : null })
      await putDoc(pk, 'notifications', notifs.slice(0, 100))
      emit(String(targetUid), 'notifications')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/friend-request', async (req, res) => {
    try {
      const me = String(req.userId)
      const toUid = String(req.body?.toUid || '')
      if (!toUid || toUid === me) return res.status(400).json({ error: 'bad_body' })
      if (toUid === String(env.REELMS_MODERATION_UID)) return res.status(403).json({ error: 'cannot_friend_moderation_account' })
      if (!await userExists(toUid)) return res.status(404).json({ error: 'user_not_found' })

      const myPk = userPk(me)
      const targetPk = userPk(toUid)
      const [meProfile, myFriends, targetFriends, myPending, targetPending, myBlocked, targetBlocked] = await Promise.all([
        getUserPublicProfile(me),
        getDoc<any[]>(myPk, 'friends').catch(() => []),
        getDoc<any[]>(targetPk, 'friends').catch(() => []),
        getDoc<any[]>(myPk, 'friend_requests').catch(() => []),
        getDoc<any[]>(targetPk, 'friend_requests').catch(() => []),
        getDoc<any[]>(myPk, 'blocked').catch(() => []),
        getDoc<any[]>(targetPk, 'blocked').catch(() => [])
      ])

      if ((myBlocked || []).some((b) => String(b?.id) === toUid) || (targetBlocked || []).some((b) => String(b?.id) === me)) return res.status(403).json({ error: 'blocked' })
      if (hasFriend(myFriends || [], toUid) || hasFriend(targetFriends || [], me)) return res.json({ ok: true, alreadyFriends: true })

      // If the target already requested the current user, accepting is the cleanest symmetric outcome.
      const reversePending = (myPending || []).some((r) => String(r?.id) === toUid)
      if (reversePending) {
        const requesterProfile = await getUserPublicProfile(toUid)
        const nextMyPending = (myPending || []).filter((r) => String(r?.id) !== toUid)
        const nextMyFriends = hasFriend(myFriends || [], toUid) ? (myFriends || []) : [...(myFriends || []), compactFriend(requesterProfile)]
        const nextTargetFriends = hasFriend(targetFriends || [], me) ? (targetFriends || []) : [...(targetFriends || []), compactFriend(meProfile)]
        await Promise.all([
          putDoc(myPk, 'friend_requests', nextMyPending),
          putDoc(myPk, 'friends', nextMyFriends),
          putDoc(targetPk, 'friends', nextTargetFriends),
          putDoc(targetPk, 'friend_requests_out', ((await getDoc<string[]>(targetPk, 'friend_requests_out').catch(() => [])) || []).filter((id) => String(id) !== me))
        ])
        ;['friend_requests', 'friends'].forEach((sk) => emit(me, sk))
        ;['friend_requests_out', 'friends'].forEach((sk) => emit(toUid, sk))
        return res.json({ ok: true, acceptedReverse: true })
      }

      const from = compactFriend(meProfile)
      const nextTargetPending = (targetPending || []).some((r) => String(r?.id) === me)
        ? (targetPending || [])
        : [from, ...(targetPending || [])]
      await putDoc(targetPk, 'friend_requests', nextTargetPending)
      emit(toUid, 'friend_requests')

      const notifs = (await getDoc<any[]>(targetPk, 'notifications').catch(() => [])) || []
      const alreadyNotified = notifs.slice(0, 20).some((n) => String(n?.text || '').includes(from.name) && String(n?.text || '').includes('friend request'))
      if (!alreadyNotified) {
        notifs.unshift({ id: nid(), text: `${from.name} sent you a friend request.`, time: Date.now(), link: { type: 'friends' } })
        await putDoc(targetPk, 'notifications', notifs.slice(0, 100))
        emit(toUid, 'notifications')
      }

      const out = ((await getDoc<string[]>(myPk, 'friend_requests_out').catch(() => [])) || []).map(String)
      if (!out.includes(toUid)) out.push(toUid)
      await putDoc(myPk, 'friend_requests_out', out)
      emit(me, 'friend_requests_out')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/friend-accept', async (req, res) => {
    try {
      const me = String(req.userId)
      const requesterId = String(req.body?.requester?.id || req.body?.requesterId || '')
      if (!requesterId || requesterId === me) return res.status(400).json({ error: 'bad_body' })
      if (!await userExists(requesterId)) return res.status(404).json({ error: 'user_not_found' })

      const myPk = userPk(me)
      const requesterPk = userPk(requesterId)
      const [meProfile, requesterProfile, pending, myFriends, requesterFriends] = await Promise.all([
        getUserPublicProfile(me),
        getUserPublicProfile(requesterId),
        getDoc<any[]>(myPk, 'friend_requests').catch(() => []),
        getDoc<any[]>(myPk, 'friends').catch(() => []),
        getDoc<any[]>(requesterPk, 'friends').catch(() => [])
      ])

      const hadPending = (pending || []).some((r) => String(r?.id) === requesterId)
      const alreadyFriends = hasFriend(myFriends || [], requesterId) || hasFriend(requesterFriends || [], me)
      if (!hadPending && alreadyFriends) return res.json({ ok: true, alreadyFriends: true })
      if (!hadPending) return res.json({ ok: true, requestMissing: true })

      const nextPending = (pending || []).filter((r) => String(r?.id) !== requesterId)
      const nextMyFriends = hasFriend(myFriends || [], requesterId) ? (myFriends || []) : [...(myFriends || []), compactFriend(requesterProfile)]
      const nextRequesterFriends = hasFriend(requesterFriends || [], me) ? (requesterFriends || []) : [...(requesterFriends || []), compactFriend(meProfile)]
      const requesterOut = ((await getDoc<string[]>(requesterPk, 'friend_requests_out').catch(() => [])) || []).filter((id) => String(id) !== me)

      await Promise.all([
        putDoc(myPk, 'friend_requests', nextPending),
        putDoc(myPk, 'friends', nextMyFriends),
        putDoc(requesterPk, 'friends', nextRequesterFriends),
        putDoc(requesterPk, 'friend_requests_out', requesterOut)
      ])
      ;['friend_requests', 'friends'].forEach((sk) => emit(me, sk))
      ;['friend_requests_out', 'friends'].forEach((sk) => emit(requesterId, sk))

      const requesterNotifs = (await getDoc<any[]>(requesterPk, 'notifications').catch(() => [])) || []
      requesterNotifs.unshift({ id: nid(), text: `${compactFriend(meProfile).name} accepted your friend request.`, time: Date.now(), link: { type: 'friends' } })
      await putDoc(requesterPk, 'notifications', requesterNotifs.slice(0, 100)); emit(requesterId, 'notifications')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/friend-reject', async (req, res) => {
    try {
      const requesterId = String(req.body?.requesterId || '')
      if (!requesterId || requesterId === String(req.userId)) return res.status(400).json({ error: 'bad_body' })
      const me = String(req.userId)
      const myPk = userPk(me)
      let freq = (await getDoc<any[]>(myPk, 'friend_requests').catch(() => [])) || []
      freq = freq.filter((r) => String(r.id) !== requesterId)
      await putDoc(myPk, 'friend_requests', freq); emit(me, 'friend_requests')
      const rPk = userPk(requesterId)
      let ro = (await getDoc<string[]>(rPk, 'friend_requests_out').catch(() => [])) || []
      ro = ro.filter((id) => String(id) !== me)
      await putDoc(rPk, 'friend_requests_out', ro); emit(requesterId, 'friend_requests_out')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/remove-friend', async (req, res) => {
    try {
      const friendId = String(req.body?.friendId || '')
      if (!friendId || friendId === String(req.userId)) return res.status(400).json({ error: 'bad_body' })
      if (isSystemInboxUid(friendId)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })
      const me = String(req.userId)
      const myPk = userPk(me)
      let friends = (await getDoc<any[]>(myPk, 'friends').catch(() => [])) || []
      friends = friends.filter((f) => String(f.id) !== friendId)
      await putDoc(myPk, 'friends', friends); emit(me, 'friends')
      const fPk = userPk(friendId)
      let tf = (await getDoc<any[]>(fPk, 'friends').catch(() => [])) || []
      tf = tf.filter((f) => String(f.id) !== me)
      await putDoc(fPk, 'friends', tf); emit(friendId, 'friends')
      for (const [pk, uid, other] of [[myPk, me, friendId], [fPk, friendId, me]] as const) {
        const reqs = ((await getDoc<any[]>(pk, 'friend_requests').catch(() => [])) || []).filter((r) => String(r?.id) !== other)
        const out = ((await getDoc<string[]>(pk, 'friend_requests_out').catch(() => [])) || []).filter((id) => String(id) !== other)
        await putDoc(pk, 'friend_requests', reqs); emit(uid, 'friend_requests')
        await putDoc(pk, 'friend_requests_out', out); emit(uid, 'friend_requests_out')
      }
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/block', async (req, res) => {
    try {
      const me = String(req.userId)
      const targetUid = String(req.body?.targetUid || '')
      if (!targetUid || targetUid === me) return res.status(400).json({ error: 'bad_body' })
      if (isSystemInboxUid(targetUid)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })
      if (!await userExists(targetUid)) return res.status(404).json({ error: 'user_not_found' })

      const myPk = userPk(me)
      const targetPk = userPk(targetUid)
      const targetProfile = compactFriend(await getUserPublicProfile(targetUid))

      const blocked = ((await getDoc<any[]>(myPk, 'blocked').catch(() => [])) || [])
        .filter((b) => String(b?.id) !== targetUid)
      blocked.unshift({ ...targetProfile, blockedAt: Date.now() })

      const cleanMyFriends = ((await getDoc<any[]>(myPk, 'friends').catch(() => [])) || []).filter((f) => String(f?.id) !== targetUid)
      const cleanTargetFriends = ((await getDoc<any[]>(targetPk, 'friends').catch(() => [])) || []).filter((f) => String(f?.id) !== me)
      const cleanMyReqs = ((await getDoc<any[]>(myPk, 'friend_requests').catch(() => [])) || []).filter((r) => String(r?.id) !== targetUid)
      const cleanTargetReqs = ((await getDoc<any[]>(targetPk, 'friend_requests').catch(() => [])) || []).filter((r) => String(r?.id) !== me)
      const cleanMyOut = ((await getDoc<string[]>(myPk, 'friend_requests_out').catch(() => [])) || []).filter((id) => String(id) !== targetUid)
      const cleanTargetOut = ((await getDoc<string[]>(targetPk, 'friend_requests_out').catch(() => [])) || []).filter((id) => String(id) !== me)
      const cleanMyMsgOut = ((await getDoc<string[]>(myPk, 'message_requests_out').catch(() => [])) || []).filter((id) => String(id) !== targetUid)
      const cleanTargetMsgOut = ((await getDoc<string[]>(targetPk, 'message_requests_out').catch(() => [])) || []).filter((id) => String(id) !== me)
      const cleanMyMsgReqs = ((await getDoc<any[]>(myPk, 'message_requests').catch(() => [])) || []).filter((r) => String(r?.fromId || r?.id) !== targetUid)
      const cleanTargetMsgReqs = ((await getDoc<any[]>(targetPk, 'message_requests').catch(() => [])) || []).filter((r) => String(r?.fromId || r?.id) !== me)

      await Promise.all([
        putDoc(myPk, 'blocked', blocked),
        putDoc(myPk, 'friends', cleanMyFriends),
        putDoc(targetPk, 'friends', cleanTargetFriends),
        putDoc(myPk, 'friend_requests', cleanMyReqs),
        putDoc(targetPk, 'friend_requests', cleanTargetReqs),
        putDoc(myPk, 'friend_requests_out', cleanMyOut),
        putDoc(targetPk, 'friend_requests_out', cleanTargetOut),
        putDoc(myPk, 'message_requests_out', cleanMyMsgOut),
        putDoc(targetPk, 'message_requests_out', cleanTargetMsgOut),
        putDoc(myPk, 'message_requests', cleanMyMsgReqs),
        putDoc(targetPk, 'message_requests', cleanTargetMsgReqs)
      ])
      ;['blocked', 'friends', 'friend_requests', 'friend_requests_out', 'message_requests', 'message_requests_out'].forEach((sk) => emit(me, sk))
      ;['friends', 'friend_requests', 'friend_requests_out', 'message_requests', 'message_requests_out'].forEach((sk) => emit(targetUid, sk))
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/unblock', async (req, res) => {
    try {
      const me = String(req.userId)
      const targetUid = String(req.body?.targetUid || '')
      if (!targetUid || targetUid === me) return res.status(400).json({ error: 'bad_body' })
      const myPk = userPk(me)
      const blocked = ((await getDoc<any[]>(myPk, 'blocked').catch(() => [])) || []).filter((b) => String(b?.id) !== targetUid)
      await putDoc(myPk, 'blocked', blocked)
      emit(me, 'blocked')
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  router.post('/message-request', async (req, res) => {
    try {
      const me = String(req.userId)
      const toUid = String(req.body?.toUid || '')
      if (!toUid || toUid === me) return res.status(400).json({ error: 'bad_body' })
      if (isSystemInboxUid(toUid)) return res.status(403).json({ error: 'system_inbox_locked', code: 'system/inbox-locked' })
      if (!await userExists(toUid)) return res.status(404).json({ error: 'user_not_found' })

      const from = compactFriend(await getUserPublicProfile(me))
      const myPk = userPk(me)
      const targetPk = userPk(toUid)
      const [myBlocked, targetBlocked] = await Promise.all([
        getDoc<any[]>(myPk, 'blocked').catch(() => []),
        getDoc<any[]>(targetPk, 'blocked').catch(() => [])
      ])
      if ((myBlocked || []).some((b) => String(b?.id) === toUid) || (targetBlocked || []).some((b) => String(b?.id) === me)) return res.status(403).json({ error: 'blocked' })
      let reqs = (await getDoc<any[]>(targetPk, 'message_requests').catch(() => [])) || []
      const alreadyPending = reqs.some((r) => String(r.fromId) === me)
      if (!alreadyPending) {
        reqs.unshift({ id: nid(), fromId: me, fromName: from.name, fromUsername: from.username, fromPhoto: from.photo || null, preview: String(req.body?.preview || '').slice(0, 300), sentAt: Date.now() })
        await putDoc(targetPk, 'message_requests', reqs.slice(0, 100)); emit(toUid, 'message_requests')
      }
      const notifs = (await getDoc<any[]>(targetPk, 'notifications').catch(() => [])) || []
      const recentlyNotified = notifs.slice(0, 20).some((n) => String(n?.text || '').includes(from.name) && String(n?.text || '').includes('message request'))
      if (!alreadyPending && !recentlyNotified) {
        notifs.unshift({ id: nid(), text: `${from.name} sent you a message request.`, time: Date.now(), link: { type: 'message_requests' } })
        await putDoc(targetPk, 'notifications', notifs.slice(0, 100)); emit(toUid, 'notifications')
      }
      let out = (await getDoc<string[]>(myPk, 'message_requests_out').catch(() => [])) || []
      if (!out.map(String).includes(toUid)) out = [...out, toUid]
      await putDoc(myPk, 'message_requests_out', out); emit(me, 'message_requests_out')
      res.json({ ok: true, alreadyPending })
    } catch { res.status(500).json({ error: 'failed' }) }
  })

  return router
}
