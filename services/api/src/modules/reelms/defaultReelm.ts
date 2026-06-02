import { getDoc, putDoc, reelmPk, scanByPkPrefix, userPk } from '../store/docStore.js'

export const DEFAULT_REELM_ID = 'reelms-community'

const defaultMeta = () => ({
  id: DEFAULT_REELM_ID,
  name: 'Reelms Community',
  code: 'REELMS',
  ownerId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDefault: true,
  announcementChannelId: 'ch-rc-welcome'
})

const defaultRoles = () => [
  { id: 'role-citizen-rc', name: 'Citizen', color: '#b99887' },
  { id: 'role-admin-rc', name: 'Admin', color: '#f87171' }
]

const defaultStructure = () => ({
  categories: [
    { id: 'cat-rc-start', name: 'Start', type: 'announcement', icon: 'general', collapsed: false, channels: [{ id: 'ch-rc-welcome', name: 'welcome', type: 'announcement' }] },
    { id: 'cat-rc-general', name: 'General', type: 'text', icon: 'text', collapsed: false, channels: [{ id: 'ch-rc-chat', name: 'chat', type: 'text' }] },
    { id: 'cat-rc-voice', name: 'Voice & Video', type: 'voice', icon: 'multimedia', collapsed: false, channels: [{ id: 'ch-rc-lounge', name: 'Lounge', type: 'voice', capacity: 20, current: 0 }] }
  ]
})

function toClientReelm(meta: any, structure: any, roles: any[], members: any[]) {
  return {
    id: meta.id,
    code: meta.code,
    name: meta.name,
    ownerId: meta.ownerId,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt || Date.now(),
    announcementChannelId: meta.announcementChannelId,
    image: meta.image || null,
    joined: true,
    isDefault: true,
    roles: Array.isArray(roles) ? roles : [],
    members: Array.isArray(members) ? members : [],
    categories: Array.isArray(structure?.categories) ? structure.categories : []
  }
}

async function syncDefaultCommunityCopies() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const meta = await getDoc<any>(pk, 'meta')
  if (!meta) return
  const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
  const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || defaultStructure()
  const members = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
  const full = toClientReelm(meta, structure, roles, members)

  await Promise.all(members.map(async (member) => {
    if (!member?.userId) return
    const upk = userPk(String(member.userId))
    const current = (await getDoc<any[]>(upk, 'reelms').catch(() => [])) || []
    const next = [full, ...current.filter((r) => String(r?.id) !== DEFAULT_REELM_ID)]
    await putDoc(upk, 'reelms', next)
  }))
}

export async function ensureDefaultReelm() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const existingMeta = await getDoc<any>(pk, 'meta')
  if (!existingMeta) await putDoc(pk, 'meta', defaultMeta())

  const existingRoles = await getDoc<any[]>(pk, 'roles').catch(() => null)
  if (!Array.isArray(existingRoles) || existingRoles.length === 0) await putDoc(pk, 'roles', defaultRoles())

  const existingStructure = await getDoc<any>(pk, 'structure').catch(() => null)
  if (!existingStructure?.categories?.length) await putDoc(pk, 'structure', defaultStructure())

  const existingMembers = await getDoc<any[]>(pk, 'members').catch(() => null)
  if (!Array.isArray(existingMembers)) await putDoc(pk, 'members', [])
}

export async function autoJoinDefaultReelm(uid: string, name?: string, photo?: string | null) {
  await ensureDefaultReelm()
  const pk = reelmPk(DEFAULT_REELM_ID)
  const meta = await getDoc<any>(pk, 'meta')
  const structure = await getDoc<any>(pk, 'structure')
  const roles = (await getDoc<any[]>(pk, 'roles')) || []
  if (!meta) return

  const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || {}
  const displayName = name || profile.name || profile.displayName || profile.username || 'Member'
  const displayPhoto = photo ?? profile.photo ?? profile.photoURL ?? null

  const members = (await getDoc<any[]>(pk, 'members')) || []
  const citizenRole = roles.find((r) => r.name === 'Citizen')
  const existing = members.find((m) => String(m.userId) === String(uid))
  const member = {
    ...(existing || {}),
    userId: uid,
    userName: existing?.userName || displayName,
    userPhoto: existing?.userPhoto || displayPhoto,
    roleIds: existing?.roleIds || (citizenRole ? [citizenRole.id] : [])
  }
  const nextMembers = [member, ...members.filter((m) => String(m.userId) !== String(uid))]
  await putDoc(pk, 'members', nextMembers)

  const reelmEntry = toClientReelm(meta, structure, roles, nextMembers)
  const userReelms = (await getDoc<any[]>(userPk(uid), 'reelms')) || []
  await putDoc(userPk(uid), 'reelms', [reelmEntry, ...userReelms.filter((r) => String(r?.id) !== DEFAULT_REELM_ID)])
  await putDoc(userPk(uid), 'joined_default_reelm', true)
  await syncDefaultCommunityCopies().catch(() => {})
}

export async function syncAllDefaultCommunityMembersFromProfiles() {
  await ensureDefaultReelm()
  const profiles = await scanByPkPrefix('USER#')
  for (const item of profiles) {
    if (item.sk !== 'profile' || !(item.data as any)?.id) continue
    const profile = item.data as any
    await autoJoinDefaultReelm(String(profile.id), profile.name || profile.displayName || profile.username || '', profile.photo || profile.photoURL || null)
  }
  await syncDefaultCommunityCopies()
}
