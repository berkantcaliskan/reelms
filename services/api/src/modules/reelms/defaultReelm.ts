import { getDoc, putDoc, reelmPk, userPk } from '../store/docStore.js'

export const DEFAULT_REELM_ID = 'reelms-community'

export async function ensureDefaultReelm() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const existing = await getDoc(pk, 'meta')
  if (existing) return

  const meta = {
    id: DEFAULT_REELM_ID,
    name: 'Reelms Community',
    code: 'REELMS',
    ownerId: null,
    createdAt: Date.now(),
    isDefault: true,
    announcementChannelId: 'ch-rc-welcome'
  }
  const roles = [
    { id: 'role-citizen-rc', name: 'Citizen', color: '#b99887' },
    { id: 'role-admin-rc', name: 'Admin', color: '#f87171' }
  ]
  const structure = {
    categories: [
      { id: 'cat-rc-start', name: 'Start', type: 'announcement', icon: 'general', collapsed: false, channels: [{ id: 'ch-rc-welcome', name: 'welcome', type: 'announcement' }] },
      { id: 'cat-rc-general', name: 'General', type: 'text', icon: 'text', collapsed: false, channels: [{ id: 'ch-rc-chat', name: 'chat', type: 'text' }] },
      { id: 'cat-rc-voice', name: 'Voice & Video', type: 'voice', icon: 'multimedia', collapsed: false, channels: [{ id: 'ch-rc-lounge', name: 'Lounge', type: 'voice', capacity: 20, current: 0 }] }
    ]
  }

  await putDoc(pk, 'meta', meta)
  await putDoc(pk, 'roles', roles)
  await putDoc(pk, 'structure', structure)
  await putDoc(pk, 'members', [])
}

export async function autoJoinDefaultReelm(uid: string, name?: string, photo?: string | null): Promise<boolean> {
  const alreadyProcessed = await getDoc(userPk(uid), 'joined_default_reelm')
  if (alreadyProcessed) return false

  await ensureDefaultReelm()
  const pk = reelmPk(DEFAULT_REELM_ID)
  const meta = await getDoc<any>(pk, 'meta')
  const structure = await getDoc<any>(pk, 'structure')
  const roles = (await getDoc<any[]>(pk, 'roles')) || []
  if (!meta) return

  const reelmEntry = {
    id: meta.id,
    code: meta.code,
    name: meta.name,
    ownerId: meta.ownerId,
    createdAt: meta.createdAt,
    announcementChannelId: meta.announcementChannelId,
    joined: true,
    isDefault: true,
    roles,
    categories: structure?.categories || []
  }

  const userReelms = (await getDoc<any[]>(userPk(uid), 'reelms')) || []
  if (!userReelms.some((r) => r.id === DEFAULT_REELM_ID)) {
    await putDoc(userPk(uid), 'reelms', [reelmEntry, ...userReelms])
  }

  const members = (await getDoc<any[]>(pk, 'members')) || []
  if (!members.some((m) => m.userId === uid)) {
    const citizenRole = roles.find((r) => r.name === 'Citizen')
    await putDoc(pk, 'members', [
      ...members,
      { userId: uid, userName: name || '', userPhoto: photo || null, roleIds: citizenRole ? [citizenRole.id] : [] }
    ])
  }

  await putDoc(userPk(uid), 'joined_default_reelm', true)
  return true
}
