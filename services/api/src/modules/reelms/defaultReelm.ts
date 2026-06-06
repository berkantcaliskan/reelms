import { getDoc, putDoc, putDocIfAbsent, reelmPk, scanByPkPrefixAndSk, userPk } from '../store/docStore.js'
import { isCommunityAdminEmail, isCommunityAdminUid, isCommunityAdminUsername, resolveCommunityAdminUids } from './communityAdmins.js'

export const DEFAULT_REELM_ID = 'reelms-community'
const DEFAULT_ADMIN_ROLE_ID = 'role-admin-rc'
const DEFAULT_CITIZEN_ROLE_ID = 'role-citizen-rc'
let defaultReelmEnsurePromise: Promise<void> | null = null
let defaultReelmEnsuredAt = 0
const DEFAULT_REELM_ENSURE_TTL_MS = 30_000

const defaultMeta = () => ({
  id: DEFAULT_REELM_ID,
  name: 'Reelms Community',
  code: 'REELMS',
  ownerId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDefault: true,
  announcementChannelId: 'ch-rc-welcome',
  image: null,
  communityArtLocked: true
})

const fullManagerPermissions = () => ({
  viewSettings: true,
  manageOverview: true,
  manageChannels: true,
  manageVoice: true,
  manageRoles: true,
  manageMembers: true,
  manageInvites: true,
  manageJoinRequests: true,
  manageModeration: true,
  manageReelm: true
})

const defaultRoles = () => [
  { id: DEFAULT_CITIZEN_ROLE_ID, name: 'Citizen', color: '#b99887', position: 1, permissions: {} },
  { id: DEFAULT_ADMIN_ROLE_ID, name: 'Admin', color: '#f87171', position: 0, permissions: fullManagerPermissions() }
]

function getManagerRole(roles: any[] = []) {
  return roles.find((role) => String(role?.id || '') === DEFAULT_ADMIN_ROLE_ID)
    || roles.find((role) => role?.permissions?.manageReelm === true)
    || roles.find((role) => role?.permissions && Object.values(role.permissions).some((value) => value === true))
    || roles[0]
}

function getDefaultMemberRole(roles: any[] = []) {
  return roles.find((role) => String(role?.id || '') === DEFAULT_CITIZEN_ROLE_ID)
    || roles.find((role) => String(role?.id || '').includes('member'))
    || roles.find((role) => role?.permissions?.manageReelm !== true)
    || roles[0]
}

function normalizeRoleIdsForCommunityAdmin(existingRoleIds: any[] = [], adminRoleId = '') {
  const kept = (Array.isArray(existingRoleIds) ? existingRoleIds : [])
    .map(String)
    .filter((id) => id && id !== DEFAULT_CITIZEN_ROLE_ID)
  return Array.from(new Set([...(adminRoleId ? [adminRoleId] : []), ...kept]))
}

const defaultStructure = () => ({
  categories: [
    { id: 'cat-rc-start', name: 'Start', type: 'announcement', icon: 'general', collapsed: false, channels: [{ id: 'ch-rc-welcome', name: 'welcome', type: 'announcement' }] },
    { id: 'cat-rc-general', name: 'General', type: 'text', icon: 'text', collapsed: false, channels: [{ id: 'ch-rc-chat', name: 'chat', type: 'text' }] },
    { id: 'cat-rc-voice', name: 'Voice & Video', type: 'voice', icon: 'multimedia', collapsed: false, channels: [{ id: 'ch-rc-lounge', name: 'Lounge', type: 'voice', capacity: 20, current: 0 }, { id: 'ch-rc-stage', name: 'Stage', type: 'stage', capacity: 120, current: 0, speakerIds: [] }] }
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
    communityArtLocked: meta.communityArtLocked === true,
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

async function ensureDefaultRoles() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const existingRoles = await getDoc<any[]>(pk, 'roles').catch(() => null)
  if (!Array.isArray(existingRoles) || existingRoles.length === 0) {
    const roles = defaultRoles()
    await putDoc(pk, 'roles', roles)
    return roles
  }

  const roles = [...existingRoles]
  let changed = false
  if (!roles.some((role) => String(role?.id || '') === DEFAULT_CITIZEN_ROLE_ID)) {
    roles.unshift({ id: DEFAULT_CITIZEN_ROLE_ID, name: 'Citizen', color: '#b99887', position: 1, permissions: {} })
    changed = true
  }
  if (!roles.some((role) => String(role?.id || '') === DEFAULT_ADMIN_ROLE_ID)) {
    roles.push({ id: DEFAULT_ADMIN_ROLE_ID, name: 'Admin', color: '#f87171', position: 0, permissions: fullManagerPermissions() })
    changed = true
  }
  const seenIds = new Set<string>()
  const normalizedRoles = roles.filter((role) => {
    const id = String(role?.id || '')
    if (!id || seenIds.has(id)) {
      changed = true
      return false
    }
    seenIds.add(id)
    return true
  }).map((role, index) => {
    const id = String(role?.id || '')
    const position = Number.isFinite(Number(role?.position)) ? Number(role.position) : index
    if (id === DEFAULT_ADMIN_ROLE_ID) {
      const next = { ...role, position, permissions: fullManagerPermissions() }
      if (JSON.stringify(next) !== JSON.stringify(role)) changed = true
      return next
    }
    if (id === DEFAULT_CITIZEN_ROLE_ID) {
      const next = { ...role, position, permissions: role?.permissions && typeof role.permissions === 'object' ? role.permissions : {} }
      if (JSON.stringify(next) !== JSON.stringify(role)) changed = true
      return next
    }
    if (!role.permissions) {
      changed = true
      return { ...role, position, permissions: {} }
    }
    return { ...role, position }
  })
  if (changed) await putDoc(pk, 'roles', normalizedRoles)
  return normalizedRoles
}

async function ensureConfiguredCommunityAdmins() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const [meta, structure, roles] = await Promise.all([
    getDoc<any>(pk, 'meta').catch(() => null),
    getDoc<any>(pk, 'structure').catch(() => null),
    ensureDefaultRoles()
  ])
  if (!meta) return

  const adminRole = getManagerRole(roles)
  const adminRoleId = adminRole?.id ? String(adminRole.id) : ''
  const adminUids = await resolveCommunityAdminUids()
  if (!adminUids.length) return

  const currentMembers = (await getDoc<any[]>(pk, 'members').catch(() => [])) || []
  let nextMembers = [...currentMembers]
  let changed = false

  for (const uid of adminUids) {
    const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || {}
    const existing = nextMembers.find((member) => String(member?.userId) === String(uid))
    const existingRoleIds = Array.isArray(existing?.roleIds) ? existing.roleIds.map(String) : []
    const roleIds = normalizeRoleIdsForCommunityAdmin(existingRoleIds, adminRoleId)
    const member = {
      ...(existing || {}),
      userId: uid,
      userName: existing?.userName || profile.name || profile.displayName || profile.username || 'Admin',
      userPhoto: getProfilePhoto(profile) || existing?.userPhoto || null,
      roleIds
    }
    nextMembers = [member, ...nextMembers.filter((item) => String(item?.userId) !== String(uid))]
    if (!existing || JSON.stringify(existing) !== JSON.stringify(member)) changed = true

    await putDoc(userPk(uid), 'joined_default_reelm', true).catch(() => {})
    await putDoc(userPk(uid), 'left_default_reelm', false).catch(() => {})
  }

  if (changed) await putDoc(pk, 'members', nextMembers)

  const full = toClientReelm(meta, structure || defaultStructure(), roles, nextMembers)
  await Promise.all(adminUids.map(async (uid) => {
    const current = (await getDoc<any[]>(userPk(uid), 'reelms').catch(() => [])) || []
    await putDoc(userPk(uid), 'reelms', [full, ...current.filter((r) => String(r?.id) !== DEFAULT_REELM_ID)])
  }))
}

async function ensureDefaultReelmInternal() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const existingMeta = await getDoc<any>(pk, 'meta')
  const meta = existingMeta
    ? {
        ...existingMeta,
        id: DEFAULT_REELM_ID,
        code: 'REELMS',
        name: 'Reelms Community',
        isDefault: true,
        announcementChannelId: existingMeta.announcementChannelId || 'ch-rc-welcome',
        image: existingMeta.image || null,
        communityArtLocked: existingMeta.communityArtLocked === true,
        updatedAt: existingMeta.updatedAt || Date.now()
      }
    : defaultMeta()
  if (!existingMeta || JSON.stringify(existingMeta) !== JSON.stringify(meta)) await putDoc(pk, 'meta', meta)
  await putDocIfAbsent('REELM_CODE#REELMS', 'id', DEFAULT_REELM_ID).catch(() => {})

  await ensureDefaultRoles()

  const existingStructure = await getDoc<any>(pk, 'structure').catch(() => null)
  if (!existingStructure?.categories?.length) {
    await putDoc(pk, 'structure', defaultStructure())
  } else {
    const hasStage = existingStructure.categories?.some((cat: any) => (cat.channels || []).some((ch: any) => String(ch?.id) === 'ch-rc-stage' || String(ch?.type) === 'stage'))
    if (!hasStage) {
      const nextStructure = {
        ...existingStructure,
        categories: existingStructure.categories.map((cat: any) => String(cat?.id) === 'cat-rc-voice'
          ? { ...cat, channels: [...(cat.channels || []), { id: 'ch-rc-stage', name: 'Stage', type: 'stage', capacity: 120, current: 0, speakerIds: [] }] }
          : cat)
      }
      await putDoc(pk, 'structure', nextStructure)
    }
  }

  const existingMembers = await getDoc<any[]>(pk, 'members').catch(() => null)
  if (!Array.isArray(existingMembers)) await putDoc(pk, 'members', [])

  await ensureConfiguredCommunityAdmins().catch(() => {})
}

export async function ensureDefaultReelm(options: { force?: boolean } = {}) {
  const now = Date.now()
  if (!options.force && defaultReelmEnsurePromise) return defaultReelmEnsurePromise
  if (!options.force && defaultReelmEnsuredAt && now - defaultReelmEnsuredAt < DEFAULT_REELM_ENSURE_TTL_MS) return
  defaultReelmEnsurePromise = ensureDefaultReelmInternal()
    .then(() => { defaultReelmEnsuredAt = Date.now() })
    .finally(() => { defaultReelmEnsurePromise = null })
  return defaultReelmEnsurePromise
}

const getProfilePhoto = (profile: any = {}) => profile.photo || profile.profilePhoto || profile.photoURL || profile.avatar || profile.image || profile.imageUrl || profile.userPhoto || null


export async function hasLeftDefaultReelm(uid: string) {
  if (!uid) return false
  const left = await getDoc<boolean>(userPk(uid), 'left_default_reelm').catch(() => false)
  return left === true
}

export async function setDefaultReelmLeft(uid: string, left: boolean) {
  if (!uid) return
  await putDoc(userPk(uid), 'left_default_reelm', left)
}

export async function autoJoinDefaultReelm(uid: string, name?: string, photo?: string | null, opts: { force?: boolean } = {}) {
  await ensureDefaultReelm()
  const isConfiguredAdmin = await isCommunityAdminUid(uid).catch(() => false)
  const pk = reelmPk(DEFAULT_REELM_ID)
  const banList = (await getDoc<any[]>(pk, 'ban_list').catch(() => [])) || []
  const isBanned = banList.some((entry: any) => String(entry?.userId || entry?.id || '') === String(uid))
  if (isBanned && !isConfiguredAdmin) return
  if (!opts.force && !isConfiguredAdmin && await hasLeftDefaultReelm(uid)) return
  const meta = await getDoc<any>(pk, 'meta')
  const structure = await getDoc<any>(pk, 'structure')
  const roles = (await getDoc<any[]>(pk, 'roles')) || []
  if (!meta) return

  const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || {}
  const displayName = name || profile.name || profile.displayName || profile.username || 'Member'
  const displayPhoto = photo ?? getProfilePhoto(profile)

  const members = (await getDoc<any[]>(pk, 'members')) || []
  const citizenRole = getDefaultMemberRole(roles)
  const adminRole = getManagerRole(roles)
  const profileEmail = profile.contact || profile.email || ''
  const profileUsername = profile.username || ''
  const shouldBeCommunityAdmin = isConfiguredAdmin || isCommunityAdminEmail(profileEmail) || isCommunityAdminUsername(profileUsername)
  const existing = members.find((m) => String(m.userId) === String(uid))
  const member = {
    ...(existing || {}),
    userId: uid,
    userName: displayName || existing?.userName || 'Member',
    userPhoto: displayPhoto || existing?.userPhoto || null,
    roleIds: shouldBeCommunityAdmin
      ? normalizeRoleIdsForCommunityAdmin(existing?.roleIds || [], adminRole?.id ? String(adminRole.id) : '')
      : existing?.roleIds || (citizenRole ? [citizenRole.id] : [])
  }
  const nextMembers = [member, ...members.filter((m) => String(m.userId) !== String(uid))]
  await putDoc(pk, 'members', nextMembers)

  const reelmEntry = toClientReelm(meta, structure, roles, nextMembers)
  const userReelms = (await getDoc<any[]>(userPk(uid), 'reelms')) || []
  await putDoc(userPk(uid), 'reelms', [reelmEntry, ...userReelms.filter((r) => String(r?.id) !== DEFAULT_REELM_ID)])
  await putDoc(userPk(uid), 'joined_default_reelm', true)
  await putDoc(userPk(uid), 'left_default_reelm', false)
  // Do not sync every member copy on every login/profile refresh. That made login
  // and normal profile changes wait on many Supabase writes and could look like
  // a session drop. The current user's reelm copy is already updated above;
  // full community-wide sync is reserved for explicit maintenance.
}



export async function ensureUserHasDefaultReelm(uid: string) {
  if (!uid) return null
  await autoJoinDefaultReelm(uid)
  const userReelms = (await getDoc<any[]>(userPk(uid), 'reelms').catch(() => [])) || []
  return userReelms.find((r) => String(r?.id) === DEFAULT_REELM_ID) || null
}

export async function syncAllDefaultCommunityMembersFromProfiles() {
  await ensureDefaultReelm()
  const profiles = await scanByPkPrefixAndSk('USER#', 'profile', 5000)
  for (const item of profiles) {
    if (!(item.data as any)?.id) continue
    const profile = item.data as any
    await autoJoinDefaultReelm(String(profile.id), profile.name || profile.displayName || profile.username || '', getProfilePhoto(profile))
  }
  await syncDefaultCommunityCopies()
}
