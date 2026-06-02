const api = process.env.REELMS_E2E_API || 'http://127.0.0.1:5000'
const stamp = Date.now()

async function request(path, options = {}, token, expectedStatus = 200) {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (res.status !== expectedStatus) throw new Error(`${options.method || 'GET'} ${path} expected ${expectedStatus}, got ${res.status}: ${text}`)
  return body
}

async function register(label) {
  const email = `e2e-${label}-${stamp}@reelms.local`
  const password = 'testpass123'
  const username = `e2e_${label}_${stamp}`.slice(0, 30)
  const auth = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, username, displayName: `E2E ${label}` })
  })
  const profile = auth.profile || {
    id: auth.uid,
    uid: auth.uid,
    name: `E2E ${label}`,
    displayName: `E2E ${label}`,
    username,
    contactType: 'email',
    contact: email,
    createdAt: new Date().toISOString()
  }
  return { ...auth, email, password, profile, username }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  await request('/health')

  await request('/auth/register', { method: 'POST', body: JSON.stringify({ email: 'bad-email', password: 'testpass123' }) }, null, 400)
  await request('/auth/register', { method: 'POST', body: JSON.stringify({ email: `weak-${stamp}@reelms.local`, password: 'short' }) }, null, 400)

  const a = await register('alpha')
  const b = await register('beta')
  const outsider = await register('outsider')

  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: `copy-${stamp}@reelms.local`, password: 'testpass123', username: a.username, displayName: 'copy' })
  }, null, 409)
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: a.email, password: 'testpass123', username: `copy_${stamp}`.slice(0, 30), displayName: 'copy' })
  }, null, 409)

  const loginByUsername = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: a.username, password: a.password })
  })
  assert(loginByUsername.uid === a.uid, 'username login did not resolve to the registered user')
  await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: a.username, password: 'wrong-password' })
  }, null, 401)

  const ownUsernameCheck = await request(`/api/v1/user/check-username/${encodeURIComponent(a.username)}`, {}, a.token)
  assert(ownUsernameCheck.available === true, 'own username should be available to the current owner')
  const takenUsernameCheck = await request(`/api/v1/user/check-username/${encodeURIComponent(a.username)}`, {}, b.token)
  assert(takenUsernameCheck.exists === true, 'taken username should not be available to another user')

  await request('/api/v1/social/friend-request', {
    method: 'POST',
    body: JSON.stringify({ toUid: b.uid, from: { id: outsider.uid, name: 'spoofed', username: 'spoofed' } })
  }, a.token)

  const bRequests = await request('/api/v1/user/doc/friend_requests', {}, b.token)
  assert(Array.isArray(bRequests.data) && bRequests.data.some((r) => r.id === a.uid), 'friend request was not stored for the target')
  assert(!bRequests.data.some((r) => r.id === outsider.uid), 'friend request trusted spoofed client identity')

  await request('/api/v1/social/friend-accept', {
    method: 'POST',
    body: JSON.stringify({ requester: { id: a.uid, name: 'spoofed' } })
  }, b.token)

  const reelmInput = {
    id: `e2e-${stamp}`,
    name: `E2E Reelm ${stamp}`,
    code: `E2E${String(stamp).slice(-4)}`,
    categories: [
      { id: 'cat-text', name: 'Text', type: 'text', channels: [{ id: 'ch-general', name: 'general', type: 'text' }] },
      { id: 'cat-voice', name: 'Voice', type: 'voice', channels: [{ id: 'ch-voice', name: 'Voice', type: 'voice', capacity: 1 }] }
    ]
  }
  const created = await request('/api/v1/reelms/create', { method: 'POST', body: JSON.stringify({ reelm: reelmInput }) }, a.token)
  await request('/api/v1/reelms/create', {
    method: 'POST',
    body: JSON.stringify({ reelm: { ...reelmInput, id: `e2e-code-copy-${stamp}` } })
  }, a.token, 409)
  const joined = await request('/api/v1/reelms/join', { method: 'POST', body: JSON.stringify({ code: created.data.code }) }, b.token)

  const msgKey = `${created.data.id}_ch-general`
  const message = {
    id: Date.now(),
    text: `hello-from-e2e-${stamp}`,
    sender: { id: outsider.uid, name: 'spoofed', photo: null },
    userId: outsider.uid,
    authorId: outsider.uid,
    time: Date.now()
  }
  const sent = await request(`/api/v1/messages/${encodeURIComponent(msgKey)}`, { method: 'POST', body: JSON.stringify({ message }) }, a.token)
  assert(sent.data.userId === a.uid && sent.data.sender.id === a.uid, 'message sender spoofing was not sanitized')

  const messages = await request(`/api/v1/messages/${encodeURIComponent(msgKey)}`, {}, b.token)
  assert(Array.isArray(messages.data) && messages.data.some((m) => String(m.text) === String(message.text)), 'E2E message was not readable by second reelm member')
  await request(`/api/v1/messages/${encodeURIComponent(msgKey)}`, {}, outsider.token, 403)
  await request(`/api/v1/reelm/${encodeURIComponent(created.data.id)}/doc/structure`, {}, outsider.token, 403)

  await request(`/api/v1/reactions/${encodeURIComponent(msgKey)}/${encodeURIComponent(String(sent.data.id))}`, {
    method: 'POST',
    body: JSON.stringify({ emoji: '🔥', userId: outsider.uid })
  }, b.token)
  const reactions = await request(`/api/v1/reactions/${encodeURIComponent(msgKey)}`, {}, b.token)
  assert(reactions.data?.[sent.data.id]?.['🔥']?.includes(b.uid), 'reaction was not attached to authenticated user')
  assert(!reactions.data?.[sent.data.id]?.['🔥']?.includes(outsider.uid), 'reaction trusted spoofed userId')

  await request('/moderate', { method: 'POST', body: JSON.stringify({ text: 'hello' }) }, null, 401)
  await request('/moderate', { method: 'POST', body: JSON.stringify({ text: 'hello' }) }, a.token)

  const state = await request('/api/v1/debug/state')
  const memberGroup = state.members.find((entry) => entry.reelmId === created.data.id)
  const memberIds = new Set((memberGroup?.members || []).map((m) => String(m.userId)))
  assert(memberIds.has(String(a.uid)) && memberIds.has(String(b.uid)), 'E2E members were not synchronized')

  console.log(JSON.stringify({
    ok: true,
    api,
    users: [a.uid, b.uid, outsider.uid],
    auth: 'email+username login validated',
    reelm: { id: created.data.id, code: created.data.code },
    joined: joined.data.id,
    messageCount: messages.data.length,
    securityChecks: ['duplicate credentials', 'friend spoof', 'message spoof', 'reaction spoof', 'non-member access', 'moderation auth']
  }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
