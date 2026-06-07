import { getDoc, putDoc, putDocIfAbsent, reelmPk, scanByPkPrefix, userPk } from '../store/docStore.js'
import { isCommunityAdminEmail, isCommunityAdminUid, isCommunityAdminUsername, resolveCommunityAdminUids } from './communityAdmins.js'

export const DEFAULT_REELM_ID = 'reelms-community'
const DEFAULT_ADMIN_ROLE_ID = 'role-admin-rc'
const DEFAULT_CITIZEN_ROLE_ID = 'role-citizen-rc'
let defaultReelmEnsurePromise: Promise<void> | null = null
let defaultReelmEnsuredAt = 0
const DEFAULT_REELM_ENSURE_TTL_MS = 30_000

const SYSTEM_MEMBER_IDS = new Set(['reelms-moderation'])

function memberUserId(member: any = {}) {
  return String(member?.userId || member?.id || '').trim()
}

function isSystemMemberId(uid: unknown) {
  const id = String(uid || '').trim()
  return !id || SYSTEM_MEMBER_IDS.has(id) || id === String(process.env.REELMS_MODERATION_UID || '')
}

function isClosedProfile(profile: any = {}) {
  return profile?.accountClosed === true || profile?.deleted === true || profile?.deletedAt != null
}

function isRawMediaValue(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return false
  if (/^data:image\//i.test(text)) return true
  if (text.length > 4096 && /^[A-Za-z0-9+/=\r\n]+$/.test(text)) return true
  return false
}

function safeMediaValue(value: unknown) {
  const text = String(value || '').trim()
  if (!text || isRawMediaValue(text)) return null
  return text
}

function sanitizeMemberList(members: any[] = []) {
  const seen = new Set<string>()
  const out: any[] = []
  for (const raw of Array.isArray(members) ? members : []) {
    const uid = memberUserId(raw)
    if (isSystemMemberId(uid) || seen.has(uid)) continue
    seen.add(uid)
    out.push({
      ...raw,
      userId: uid,
      id: raw?.id && String(raw.id) !== uid ? raw.id : undefined,
      userName: raw?.userName || raw?.name || raw?.username || 'User',
      userPhoto: safeMediaValue(raw?.userPhoto || raw?.photo) || null,
      photo: safeMediaValue(raw?.photo || raw?.userPhoto) || null,
      cover: safeMediaValue(raw?.cover || raw?.coverImage || raw?.coverUrl) || null,
      coverImage: safeMediaValue(raw?.coverImage || raw?.cover || raw?.coverUrl) || null,
      coverUrl: safeMediaValue(raw?.coverUrl || raw?.cover || raw?.coverImage) || null,
      roleIds: Array.from(new Set((Array.isArray(raw?.roleIds) ? raw.roleIds : []).map(String).filter(Boolean)))
    })
  }
  return out
}

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
  { id: DEFAULT_ADMIN_ROLE_ID, name: 'Community Admin', color: '#a3e635', position: 0, permissions: fullManagerPermissions() },
  { id: DEFAULT_CITIZEN_ROLE_ID, name: 'Citizen', color: '#b99887', position: 1, permissions: {} }
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
    .filter((id) => {
      if (!id || id === DEFAULT_CITIZEN_ROLE_ID) return false
      // Older builds created per-reelm default ids like role-admin-<id> and
      // role-member-<id>. Keep only the stable default admin plus true custom
      // roles so Community Admin does not accumulate duplicate Admin/Member chips.
      if (/^role-(admin|member|citizen)/i.test(id) && id !== DEFAULT_ADMIN_ROLE_ID) return false
      return true
    })
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

function toUserReelmSummary(reelm: any = {}) {
  const members = Array.isArray(reelm?.members) ? reelm.members : []
  return {
    id: reelm.id,
    code: reelm.code,
    name: reelm.name,
    ownerId: reelm.ownerId || null,
    createdAt: reelm.createdAt || null,
    updatedAt: reelm.updatedAt || null,
    announcementChannelId: reelm.announcementChannelId || null,
    image: reelm.image || null,
    communityArtLocked: reelm.communityArtLocked === true,
    joined: true,
    isDefault: reelm.isDefault === true,
    memberCount: Number.isFinite(Number(reelm.memberCount)) ? Number(reelm.memberCount) : members.length,
    roles: Array.isArray(reelm.roles) ? reelm.roles.slice(0, 20) : [],
    members: [],
    categories: Array.isArray(reelm.categories) ? reelm.categories : []
  }
}

function mergeSummaryPreserveOrder(current: any[] = [], entry: any) {
  const list = Array.isArray(current) ? current.map(toUserReelmSummary) : []
  const id = String(entry?.id || '')
  if (!id) return list
  const idx = list.findIndex((r) => String(r?.id || '') === id)
  if (idx < 0) return [...list, entry]
  const next = [...list]
  next[idx] = { ...next[idx], ...entry }
  return next
}

async function syncDefaultCommunityCopies() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const meta = await getDoc<any>(pk, 'meta')
  if (!meta) return
  const roles = (await getDoc<any[]>(pk, 'roles').catch(() => [])) || []
  const structure = (await getDoc<any>(pk, 'structure').catch(() => null)) || defaultStructure()
  const members = sanitizeMemberList((await getDoc<any[]>(pk, 'members').catch(() => [])) || [])
  const full = toUserReelmSummary(toClientReelm(meta, structure, roles, members))

  await Promise.all(members.map(async (member) => {
    if (!member?.userId || isSystemMemberId(member.userId)) return
    const upk = userPk(String(member.userId))
    const current = (await getDoc<any[]>(upk, 'reelms').catch(() => [])) || []
    const next = mergeSummaryPreserveOrder(current, full)
    if (JSON.stringify(current || []) !== JSON.stringify(next)) await putDoc(upk, 'reelms', next)
  }))
}

async function ensureDefaultRoles() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const existingRoles = await getDoc<any[]>(pk, 'roles').catch(() => null)
  const roles = Array.isArray(existingRoles) && existingRoles.length ? existingRoles : defaultRoles()
  const isElevated = (role: any) => role?.permissions?.manageReelm === true || String(role?.id || '') === DEFAULT_ADMIN_ROLE_ID || /^role-admin-/i.test(String(role?.id || ''))
  const isLegacyManagerName = (role: any) => /admin|owner|founder|moderator/i.test(String(role?.name || ''))
  const isManager = (role: any) => isElevated(role)
  const isMemberLike = (role: any) => /^(member|citizen|user|regular)$/i.test(String(role?.name || '').trim()) || /role-(member|citizen)/i.test(String(role?.id || ''))
  const adminSource = roles.find((role) => String(role?.id || '') === DEFAULT_ADMIN_ROLE_ID) || roles.find(isManager) || roles.find(isLegacyManagerName) || defaultRoles()[0]
  const citizenSource = roles.find((role) => String(role?.id || '') === DEFAULT_CITIZEN_ROLE_ID) || roles.find((role) => !isManager(role) && isMemberLike(role)) || defaultRoles()[1]
  const customRoles = roles
    .filter((role) => {
      const id = String(role?.id || '')
      if (!id || id === DEFAULT_ADMIN_ROLE_ID || id === DEFAULT_CITIZEN_ROLE_ID) return false
      if (isManager(role) || isMemberLike(role)) return false
      return true
    })
    .map((role, index) => ({
      ...role,
      position: Number.isFinite(Number(role?.position ?? role?.order)) ? Number(role.position ?? role.order) : index + 2,
      permissions: role?.permissions && typeof role.permissions === 'object' ? role.permissions : {}
    }))

  const normalizedRoles = [
    { ...adminSource, id: DEFAULT_ADMIN_ROLE_ID, name: String(adminSource?.name || '').trim() || 'Community Admin', color: /^#[0-9a-fA-F]{6}$/.test(String(adminSource?.color || '')) ? adminSource.color : '#a3e635', position: 0, permissions: fullManagerPermissions() },
    { ...citizenSource, id: DEFAULT_CITIZEN_ROLE_ID, name: String(citizenSource?.name || '').trim() || 'Citizen', color: /^#[0-9a-fA-F]{6}$/.test(String(citizenSource?.color || '')) ? citizenSource.color : '#b99887', position: 1, permissions: {} },
    ...customRoles
  ]

  if (JSON.stringify(existingRoles || []) !== JSON.stringify(normalizedRoles)) await putDoc(pk, 'roles', normalizedRoles)

  const members = await getDoc<any[]>(pk, 'members').catch(() => null)
  if (Array.isArray(members)) {
    const adminLikeIds = new Set(roles.filter(isElevated).map((role) => String(role?.id || '')).filter(Boolean))
    adminLikeIds.add(DEFAULT_ADMIN_ROLE_ID)
    const citizenLikeIds = new Set(roles.filter((role) => !isManager(role) && isMemberLike(role)).map((role) => String(role?.id || '')).filter(Boolean))
    citizenLikeIds.add(DEFAULT_CITIZEN_ROLE_ID)
    let membersChanged = false
    const nextMembers = sanitizeMemberList(members).map((member) => {
      const rawIds: string[] = Array.isArray(member?.roleIds) ? member.roleIds.map(String) : []
      const hasAdmin = rawIds.some((id: string) => adminLikeIds.has(id))
      const keptCustom = rawIds.filter((id: string) => !adminLikeIds.has(id) && !citizenLikeIds.has(id) && normalizedRoles.some((role) => String(role.id) === id))
      const roleIds = Array.from(new Set([hasAdmin ? DEFAULT_ADMIN_ROLE_ID : DEFAULT_CITIZEN_ROLE_ID, ...keptCustom]))
      const next = { ...member, roleIds }
      if (JSON.stringify(next) !== JSON.stringify(member)) membersChanged = true
      return next
    })
    if (nextMembers.length !== members.length) membersChanged = true
    if (membersChanged) await putDoc(pk, 'members', nextMembers)
  }
  return normalizedRoles
}

async function ensureConfiguredCommunityAdmins() {
  const pk = reelmPk(DEFAULT_REELM_ID)
  const [meta, structure, roles, banList] = await Promise.all([
    getDoc<any>(pk, 'meta').catch(() => null),
    getDoc<any>(pk, 'structure').catch(() => null),
    ensureDefaultRoles(),
    getDoc<any[]>(pk, 'ban_list').catch(() => [])
  ])
  if (!meta) return

  const adminRole = getManagerRole(roles)
  const adminRoleId = adminRole?.id ? String(adminRole.id) : ''
  const configuredAdminUids = await resolveCommunityAdminUids()
  if (!configuredAdminUids.length) return

  const bannedIds = new Set((Array.isArray(banList) ? banList : []).map((entry: any) => String(entry?.userId || entry?.id || '')).filter(Boolean))
  const activeAdminUids: string[] = []
  for (const uid of configuredAdminUids) {
    const id = String(uid || '')
    if (!id || bannedIds.has(id)) continue
    if (await hasLeftDefaultReelm(id).catch(() => false)) continue
    activeAdminUids.push(id)
  }
  if (!activeAdminUids.length) return

  const currentMembers = sanitizeMemberList((await getDoc<any[]>(pk, 'members').catch(() => [])) || [])
  let nextMembers = [...currentMembers]
  let changed = false

  for (const uid of activeAdminUids) {
    const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || null
    if (!profile || isClosedProfile(profile)) continue
    const existing = nextMembers.find((member) => String(member?.userId) === String(uid))
    const existingRoleIds = Array.isArray(existing?.roleIds) ? existing.roleIds.map(String) : []
    const roleIds = normalizeRoleIdsForCommunityAdmin(existingRoleIds, adminRoleId)
    const member = {
      ...(existing || {}),
      userId: uid,
      userName: existing?.userName || profile.name || profile.displayName || profile.username || 'Admin',
      username: existing?.username || profile.username || '',
      userPhoto: getProfilePhoto(profile) || existing?.userPhoto || null,
      photo: getProfilePhoto(profile) || existing?.photo || null,
      profileTheme: profile.profileTheme || existing?.profileTheme || null,
      roleIds
    }
    nextMembers = [member, ...nextMembers.filter((item) => String(item?.userId) !== String(uid))]
    if (!existing || JSON.stringify(existing) !== JSON.stringify(member)) changed = true

    await putDoc(userPk(uid), 'joined_default_reelm', true).catch(() => {})
    await putDoc(userPk(uid), 'left_default_reelm', false).catch(() => {})
  }

  if (changed) await putDoc(pk, 'members', nextMembers)

  const full = toUserReelmSummary(toClientReelm(meta, structure || defaultStructure(), roles, nextMembers))
  await Promise.all(activeAdminUids.map(async (uid) => {
    const current = (await getDoc<any[]>(userPk(uid), 'reelms').catch(() => [])) || []
    const next = mergeSummaryPreserveOrder(current, full)
    if (JSON.stringify(current || []) !== JSON.stringify(next)) await putDoc(userPk(uid), 'reelms', next)
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
  else {
    const normalizedMembers = sanitizeMemberList(existingMembers)
    if (JSON.stringify(existingMembers) !== JSON.stringify(normalizedMembers)) await putDoc(pk, 'members', normalizedMembers)
  }

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

const getProfilePhoto = (profile: any = {}) => safeMediaValue(profile.photo || profile.profilePhoto || profile.photoURL || profile.avatar || profile.image || profile.imageUrl || profile.userPhoto || null)


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
  if (isSystemMemberId(uid)) return
  await ensureDefaultReelm()
  const isConfiguredAdmin = await isCommunityAdminUid(uid).catch(() => false)
  const pk = reelmPk(DEFAULT_REELM_ID)
  const banList = (await getDoc<any[]>(pk, 'ban_list').catch(() => [])) || []
  const isBanned = banList.some((entry: any) => String(entry?.userId || entry?.id || '') === String(uid))
  if (isBanned) return
  if (!opts.force && await hasLeftDefaultReelm(uid)) return
  const meta = await getDoc<any>(pk, 'meta')
  const structure = await getDoc<any>(pk, 'structure')
  const roles = (await getDoc<any[]>(pk, 'roles')) || []
  if (!meta) return

  const profile = (await getDoc<any>(userPk(uid), 'profile').catch(() => null)) || null
  if (!profile || isClosedProfile(profile)) return
  const displayName = name || profile.name || profile.displayName || profile.username || 'User'
  const displayPhoto = safeMediaValue(photo) ?? getProfilePhoto(profile)

  const members = sanitizeMemberList((await getDoc<any[]>(pk, 'members')) || [])
  const citizenRole = getDefaultMemberRole(roles)
  const adminRole = getManagerRole(roles)
  const profileEmail = profile.contact || profile.email || ''
  const profileUsername = profile.username || ''
  const shouldBeCommunityAdmin = isConfiguredAdmin || isCommunityAdminEmail(profileEmail) || isCommunityAdminUsername(profileUsername)
  const existing = members.find((m) => String(m.userId) === String(uid))
  const existingRoleIds = Array.isArray(existing?.roleIds) ? existing.roleIds.map(String).filter(Boolean) : []
  const citizenRoleIds = citizenRole?.id ? [String(citizenRole.id)] : []
  const member = {
    ...(existing || {}),
    userId: uid,
    userName: displayName || existing?.userName || 'User',
    username: existing?.username || profile.username || '',
    userPhoto: displayPhoto || existing?.userPhoto || null,
    photo: displayPhoto || existing?.photo || null,
    profileTheme: profile.profileTheme || existing?.profileTheme || null,
    roleIds: shouldBeCommunityAdmin
      ? normalizeRoleIdsForCommunityAdmin(existingRoleIds, adminRole?.id ? String(adminRole.id) : '')
      : (existingRoleIds.length ? existingRoleIds : citizenRoleIds)
  }
  const nextMembers = sanitizeMemberList(existing
    ? members.map((m) => String(m.userId) === String(uid) ? member : m)
    : [...members, member])
  if (!existing || JSON.stringify(existing) !== JSON.stringify(member)) await putDoc(pk, 'members', nextMembers)

  const reelmEntry = toUserReelmSummary(toClientReelm(meta, structure, roles, nextMembers))
  const userReelms = (await getDoc<any[]>(userPk(uid), 'reelms')) || []
  const nextUserReelms = mergeSummaryPreserveOrder(userReelms, reelmEntry)
  if (JSON.stringify(userReelms || []) !== JSON.stringify(nextUserReelms)) await putDoc(userPk(uid), 'reelms', nextUserReelms)
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
  const profiles = await scanByPkPrefix('USER#')
  for (const item of profiles) {
    if (item.sk !== 'profile' || !(item.data as any)?.id) continue
    const profile = item.data as any
    if (isSystemMemberId(profile.id) || isClosedProfile(profile)) continue
    await autoJoinDefaultReelm(String(profile.id), profile.name || profile.displayName || profile.username || '', getProfilePhoto(profile))
  }
  await syncDefaultCommunityCopies()
}
