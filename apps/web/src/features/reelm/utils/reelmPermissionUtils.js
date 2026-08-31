import { getPersonPhoto } from '../../legacy/utils/mediaUtils'
import { isActiveStatus } from '../../legacy/constants/themeConstants'

export const ROLE_PALETTE = [
  '#b99887','#f87171','#fb923c','#fbbf24','#a3e635',
  '#34d399','#22d3ee','#60a5fa','#818cf8',
  '#c084fc','#f472b6','#e0c9bc','#94a3b8',
]

export const REELM_PERMISSION_OPTIONS = [
  { key: 'viewSettings', label: 'View panel', note: 'Can open the management panel.' },
  { key: 'manageOverview', label: 'Server settings', note: 'Can edit visibility, invite and basic settings.' },
  { key: 'manageChannels', label: 'Channels', note: 'Can edit channel layout.' },
  { key: 'manageVoice', label: 'Voice rooms', note: 'Can move/kick members from voice rooms and invite members to a room.' },
  { key: 'manageRoles', label: 'Helper roles', note: 'Can manage non-admin roles and assign safe roles.' },
  { key: 'manageMembers', label: 'Members', note: 'Can invite/remove regular members.' },
  { key: 'manageInvites', label: 'Invites', note: 'Can invite even if member invites are off.' },
  { key: 'manageJoinRequests', label: 'Join requests', note: 'Can approve or reject join requests.' },
  { key: 'manageModeration', label: 'Moderation', note: 'Can timeout/ban regular members.' },
  { key: 'pinMessages', label: 'Pin messages', note: 'Can pin and unpin messages in channels.' },
  { key: 'createVaporRoom', label: 'Create vapor rooms', note: 'Can create temporary vapor rooms in any category.' },
  { key: 'manageReelm', label: 'Full admin', note: 'Can manage all server permissions.' },
]

export const DISCORD_ROLE_PERMISSION_SECTIONS = [
  {
    title: 'Administrator',
    icon: '🛡️',
    description: 'Members with this permission have every permission and bypass channel-specific restrictions.',
    permissions: [
      {
        key: 'manageReelm',
        name: 'Administrator',
        description: 'Grants full admin access. Can manage all server permissions and settings.',
        danger: true,
      }
    ]
  },
  {
    title: 'General Server Permissions',
    icon: '⚙️',
    description: 'Basic management access for server configuration and channel layout.',
    permissions: [
      {
        key: 'viewSettings',
        name: 'View Settings Panel',
        description: 'Allows members to open and view the server management panel.',
      },
      {
        key: 'manageOverview',
        name: 'Manage Server Overview',
        description: 'Allows editing server name, icon, description, discoverability, and invite rules.',
      },
      {
        key: 'manageChannels',
        name: 'Manage Channels',
        description: 'Allows creating, renaming, reordering, and deleting channels or categories.',
      },
      {
        key: 'manageRoles',
        name: 'Manage Roles',
        description: 'Allows creating, editing, and assigning roles positioned below this role in the hierarchy.',
      },
      {
        key: 'manageModeration',
        name: 'View Audit Log & Moderation',
        description: 'Allows viewing audit actions and applying timeouts or bans to regular members.',
      }
    ]
  },
  {
    title: 'Membership & Invites',
    icon: '👥',
    description: 'Permissions relating to adding, managing, and reviewing members.',
    permissions: [
      {
        key: 'manageMembers',
        name: 'Manage Members (Kick)',
        description: 'Allows removing non-protected members from the server.',
      },
      {
        key: 'manageInvites',
        name: 'Create & Manage Invites',
        description: 'Allows generating invite links and inviting friends even when regular member invites are disabled.',
      },
      {
        key: 'manageJoinRequests',
        name: 'Manage Join Requests',
        description: 'Allows reviewing, approving, or declining incoming join requests.',
      }
    ]
  },
  {
    title: 'Channels & Voice',
    icon: '🔊',
    description: 'Permissions for channel interactions, pinned messages, and voice moderation.',
    permissions: [
      {
        key: 'manageVoice',
        name: 'Manage Voice Channels',
        description: 'Allows moving members between voice channels and disconnecting users.',
      },
      {
        key: 'pinMessages',
        name: 'Pin Messages',
        description: 'Allows pinning and unpinning important messages in text channels.',
      },
      {
        key: 'createVaporRoom',
        name: 'Create Vapor Rooms',
        description: 'Allows creating temporary, auto-expiring vapor channels.',
      }
    ]
  }
]

export const REELM_ELEVATED_ROLE_RE = /admin|owner|founder|moderator/i

export const CHANNEL_OVERRIDE_PERMISSIONS = [
  { key: 'viewChannel', label: 'View Channel', note: 'Allows members to view this channel.' },
  { key: 'sendMessages', label: 'Send Messages', note: 'Allows members to post messages in this channel.' },
  { key: 'attachFiles', label: 'Attach Files', note: 'Allows uploading photos, audio and attachments.' },
  { key: 'embedLinks', label: 'Embed Links', note: 'Allows links to display rich previews.' },
  { key: 'addReactions', label: 'Add Reactions', note: 'Allows adding emoji reactions.' },
  { key: 'mentionEveryone', label: 'Mention @everyone', note: 'Allows mentioning @everyone and all roles in this channel.' },
  { key: 'manageMessages', label: 'Manage Messages', note: 'Allows deleting and pinning other members\' messages.' },
]

export function isManagerRoleClient(role) {
  return role?.permissions?.manageReelm === true
}

export function roleHasPermissionClient(role, permission) {
  if (!role) return false
  if (isManagerRoleClient(role)) return true
  const permissions = role.permissions && typeof role.permissions === 'object' ? role.permissions : {}
  if (permission === 'viewSettings') return permissions.viewSettings === true || Object.values(permissions).some(Boolean)
  return permissions[permission] === true
}

export function normalizeRolePermissionsClient(role, allowManageReelm = true) {
  const permissions = role?.permissions && typeof role.permissions === 'object' ? role.permissions : {}
  if (role?.permissions?.manageReelm === true && allowManageReelm) {
    return REELM_PERMISSION_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.key]: true }), {})
  }
  const next = {}
  for (const opt of REELM_PERMISSION_OPTIONS) {
    if (opt.key === 'manageReelm' && !allowManageReelm) continue
    if (permissions[opt.key] === true) next[opt.key] = true
  }
  if (Object.values(next).some(Boolean)) next.viewSettings = true
  return next
}

export function normalizeRoleForClient(role, fallbackId = '', allowManageReelm = true) {
  const id = String(role?.id || fallbackId || `role-${Date.now()}`).replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 80)
  const name = String(role?.name || 'Role').trim().replace(/\s+/g, ' ').slice(0, 32) || 'Role'
  const color = /^#[0-9a-fA-F]{6}$/.test(String(role?.color || '')) ? String(role.color) : '#60a5fa'
  const position = Number.isFinite(Number(role?.position ?? role?.order)) ? Number(role.position ?? role.order) : 0
  const hoist = role?.hoist === true
  const mentionable = role?.mentionable === true
  return {
    ...role,
    id,
    name,
    color,
    position,
    hoist,
    mentionable,
    permissions: normalizeRolePermissionsClient(role, allowManageReelm)
  }
}

export function getRoleOrderIndex(role, index = 0) {
  const raw = Number(role?.position ?? role?.order ?? index)
  return Number.isFinite(raw) ? raw : index
}

export function getOrderedReelmRolesClient(reelm) {
  return (Array.isArray(reelm?.roles) ? reelm.roles : [])
    .map((role, index) => ({ ...role, _roleOrder: getRoleOrderIndex(role, index) }))
    .sort((a, b) => (a._roleOrder - b._roleOrder) || String(a.name || '').localeCompare(String(b.name || '')))
}

export function getMemberRoleIdsClient(member) {
  if (!member) return []
  const ids = Array.isArray(member.roleIds)
    ? member.roleIds
    : Array.isArray(member.roles)
      ? member.roles.map(r => typeof r === 'object' ? r?.id : r)
      : (member.roleId ? [member.roleId] : (member.role ? [typeof member.role === 'object' ? member.role?.id : member.role] : []))
  return Array.from(new Set(ids.map(String).filter(Boolean)))
}

export function getPrimaryRoleForMemberClient(member, roles = []) {
  if (!member || !Array.isArray(roles) || roles.length === 0) return null
  const roleIds = new Set(getMemberRoleIdsClient(member))
  return roles.find(role => roleIds.has(String(role.id))) || null
}

export function isMainAdminMemberClient(reelm, member) {
  if (!reelm || !member) return false
  return String(member.userId || member.id || '') === String(reelm.ownerId || '')
}

export function canActOnReelmMemberClient(reelm, actorUid, targetMember, permission = 'manageMembers') {
  if (!reelm || !actorUid || !targetMember) return false
  if (String(actorUid) === String(targetMember.userId || targetMember.id || '')) return false
  const actorIsOwner = String(reelm.ownerId || '') === String(actorUid)
  if (actorIsOwner) return true
  if (!hasReelmPermissionClient(reelm, actorUid, permission) && !hasReelmPermissionClient(reelm, actorUid, 'manageReelm')) return false
  if (isMainAdminMemberClient(reelm, targetMember)) return false
  const roles = Array.isArray(reelm.roles) ? reelm.roles : []
  const protectedRoleIds = new Set(roles.filter(isManagerRoleClient).map(role => String(role.id)))
  const targetRoleIds = getMemberRoleIdsClient(targetMember)
  if (targetRoleIds.some(id => protectedRoleIds.has(id)) && !hasReelmPermissionClient(reelm, actorUid, 'manageReelm')) return false
  return true
}

export function buildReelmMemberGroupsClient({ reelm, members, presence, currentUser, uid, profileStatus, getPresenceForUser }) {
  const orderedRoles = getOrderedReelmRolesClient(reelm)
  const managerRole = orderedRoles.find(isManagerRoleClient) || orderedRoles[0] || null
  const defaultMemberRole = orderedRoles.find(r => !isManagerRoleClient(r) && (String(r.id).includes('citizen') || String(r.id).includes('member') || String(r.name).toLowerCase().includes('member') || String(r.name).toLowerCase().includes('üye') || String(r.name).toLowerCase().includes('citizen'))) || (orderedRoles.length > 1 ? orderedRoles[orderedRoles.length - 1] : orderedRoles[0]) || null
  const ownerId = String(reelm?.ownerId || '')
  const assigned = new Set()

  const getUid = (m) => String(m?.userId || m?.id || '').trim()

  const getMemberPresence = (m) => {
    const mid = getUid(m)
    return mid && mid === String(uid)
      ? { status: profileStatus, userName: currentUser?.name || m.userName, userPhoto: getPersonPhoto(currentUser) || m.userPhoto }
      : (presence?.[mid] || getPresenceForUser?.(mid) || {})
  }
  const getMemberStatus = (m) => getMemberPresence(m).status || 'offline'
  const sortMembers = (list) => [...list].sort((a, b) => {
    const aMain = isMainAdminMemberClient(reelm, a) ? -1 : 0
    const bMain = isMainAdminMemberClient(reelm, b) ? -1 : 0
    if (aMain !== bMain) return aMain - bMain
    const aOnline = isActiveStatus(getMemberStatus(a)) ? 0 : 1
    const bOnline = isActiveStatus(getMemberStatus(b)) ? 0 : 1
    if (aOnline !== bOnline) return aOnline - bOnline
    const an = String(getMemberPresence(a).userName || a.userName || a.name || '').toLowerCase()
    const bn = String(getMemberPresence(b).userName || b.userName || b.name || '').toLowerCase()
    return an.localeCompare(bn)
  })

  const normalizedMemberList = (members || []).map(m => {
    const mid = getUid(m)
    let roleIds = getMemberRoleIdsClient(m)
    if (mid && mid === ownerId && managerRole?.id && !roleIds.length) {
      roleIds = [String(managerRole.id)]
    }
    if (!roleIds.length && defaultMemberRole?.id && !m.isBot) {
      roleIds = [String(defaultMemberRole.id)]
    }
    return { ...m, userId: mid, roleIds }
  })

  const groups = []
  for (const role of orderedRoles) {
    const roleMembers = sortMembers(normalizedMemberList.filter(m => {
      const mid = getUid(m)
      if (!mid || assigned.has(mid)) return false
      const primary = getPrimaryRoleForMemberClient(m, orderedRoles)
      return primary && String(primary.id) === String(role.id)
    }))
    roleMembers.forEach(m => {
      const mid = getUid(m)
      if (mid) assigned.add(mid)
    })
    if (roleMembers.length) groups.push({ role, members: roleMembers })
  }
  const unassigned = normalizedMemberList.filter(m => {
    const mid = getUid(m)
    return mid && !assigned.has(mid)
  })
  const botMembers = sortMembers(unassigned.filter(m => m.isBot))
  const noRoleMembers = sortMembers(unassigned.filter(m => !m.isBot))
  
  if (noRoleMembers.length) {
    if (orderedRoles.length > 0) {
      const targetRole = defaultMemberRole || orderedRoles[orderedRoles.length - 1]
      const existingGroup = groups.find(g => String(g.role?.id) === String(targetRole.id))
      if (existingGroup) {
        existingGroup.members = sortMembers([...existingGroup.members, ...noRoleMembers])
      } else {
        groups.push({ role: targetRole, members: noRoleMembers })
      }
    } else {
      groups.push({ role: { id: '__members__', name: 'Üyeler', color: '#94a3b8' }, members: noRoleMembers })
    }
  }
  if (botMembers.length) groups.push({ role: { id: '__bots__', name: 'bots_group_label', color: '#7c8fa6' }, members: botMembers, isBotsGroup: true })
  return { groups, orderedRoles, getMemberPresence, getMemberStatus }
}

export function getReelmPermissionSetClient(reelm, uid) {
  const set = new Set()
  if (!reelm || !uid) return set
  if (String(reelm.ownerId || '') === String(uid)) {
    REELM_PERMISSION_OPTIONS.forEach(opt => set.add(opt.key))
    return set
  }
  const member = (Array.isArray(reelm.members) ? reelm.members : []).find(m => String(m.userId || m.id || '') === String(uid))
  if (!member) return set
  const roleIds = new Set((member.roleIds || []).map(String))
  const roles = (Array.isArray(reelm.roles) ? reelm.roles : []).filter(role => roleIds.has(String(role.id)))
  if (roles.some(isManagerRoleClient)) {
    REELM_PERMISSION_OPTIONS.forEach(opt => set.add(opt.key))
    return set
  }
  roles.forEach(role => {
    const permissions = role.permissions && typeof role.permissions === 'object' ? role.permissions : {}
    Object.entries(permissions).forEach(([key, value]) => { if (value === true) set.add(key) })
    if (Object.values(permissions).some(Boolean)) set.add('viewSettings')
  })
  return set
}

export function hasReelmPermissionClient(reelm, uid, permission) {
  const set = getReelmPermissionSetClient(reelm, uid)
  return set.has(permission) || set.has('manageReelm')
}

export function canOpenReelmSettingsClient(reelm, uid) {
  return hasReelmPermissionClient(reelm, uid, 'viewSettings')
}

export function getReelmTemplates(t) {
  const sp = s => s.split(', ')
  return [
    { id: 'gaming',    emoji: '🎮', name: t('tpl_gaming_name'),    desc: t('tpl_gaming_desc'),    beginning: sp(t('tpl_gaming_begin')),    text: sp(t('tpl_gaming_text')),    mm: sp(t('tpl_gaming_mm')),    live: sp(t('tpl_gaming_live')) },
    { id: 'music',     emoji: '🎵', name: t('tpl_music_name'),     desc: t('tpl_music_desc'),     beginning: sp(t('tpl_music_begin')),     text: sp(t('tpl_music_text')),     mm: sp(t('tpl_music_mm')),     live: sp(t('tpl_music_live')) },
    { id: 'cinema',    emoji: '🎬', name: t('tpl_cinema_name'),    desc: t('tpl_cinema_desc'),    beginning: sp(t('tpl_cinema_begin')),    text: sp(t('tpl_cinema_text')),    mm: sp(t('tpl_cinema_mm')),    live: sp(t('tpl_cinema_live')) },
    { id: 'education', emoji: '📚', name: t('tpl_education_name'), desc: t('tpl_education_desc'), beginning: sp(t('tpl_education_begin')), text: sp(t('tpl_education_text')), mm: sp(t('tpl_education_mm')), live: sp(t('tpl_education_live')) },
    { id: 'corporate', emoji: '💼', name: t('tpl_corporate_name'), desc: t('tpl_corporate_desc'), beginning: sp(t('tpl_corporate_begin')), text: sp(t('tpl_corporate_text')), mm: sp(t('tpl_corporate_mm')), live: sp(t('tpl_corporate_live')) },
    { id: 'startup',   emoji: '🚀', name: t('tpl_startup_name'),   desc: t('tpl_startup_desc'),   beginning: sp(t('tpl_startup_begin')),   text: sp(t('tpl_startup_text')),   mm: sp(t('tpl_startup_mm')),   live: sp(t('tpl_startup_live')) },
    { id: 'lifestyle', emoji: '🌿', name: t('tpl_lifestyle_name'), desc: t('tpl_lifestyle_desc'), beginning: sp(t('tpl_lifestyle_begin')), text: sp(t('tpl_lifestyle_text')), mm: sp(t('tpl_lifestyle_mm')), live: sp(t('tpl_lifestyle_live')) },
  ]
}

export function isDefaultCommunity(item) {
  return String(item?.id || '') === 'reelms-community' || String(item?.name || '').toLowerCase() === 'reelms community'
}

export function getCommunityMemberLevel(reelm, member) {
  const roleIds = new Set((member?.roleIds || []).map(String))
  const roles = (reelm?.roles || []).filter(r => roleIds.has(String(r.id)))
  if (roles.some(r => isManagerRoleClient(r))) return 'admin'
  if (roles.some(r => /beta/i.test(r.name || ''))) return 'beta'
  return 'citizen'
}
