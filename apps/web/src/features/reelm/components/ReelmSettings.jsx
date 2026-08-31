import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useT } from '../../../i18n'
import { ChannelPermissionsModal } from './ChannelPermissionsModal'
import { IntegrationsTab } from './IntegrationsTab'
import { AuditLogTab } from '../../legacy/components/moderation/AuditLogTab'
import { getPersonPhoto } from '../../legacy/utils/mediaUtils'
import {
  isDefaultCommunity,
  ROLE_PALETTE,
  REELM_PERMISSION_OPTIONS,
  DISCORD_ROLE_PERMISSION_SECTIONS,
  normalizeRoleForClient,
  isManagerRoleClient,
  roleHasPermissionClient,
  getMemberRoleIdsClient,
  getReelmPermissionSetClient,
} from '../utils/reelmPermissionUtils'

export function ReelmSettings({ reelm, currentUser, friends, onUpdate, onClose, onCloseReelm, onAnnouncement, onApproveJoin, onRejectJoin, onInviteFriend, onBanMember, onUnbanMember, onTimeoutMember, onUntimeoutMember }) {
  const t = useT()
  const [activeTab, setActiveTab] = useState('general')
  const [roles, setRoles] = useState(() => (reelm.roles || []).map((role, i) => normalizeRoleForClient(role, `role-${i}`)))
  const [members, setMembers] = useState(() => reelm.members || [])
  const [rolesSubTab, setRolesSubTab] = useState('roles')
  const [selectedRoleId, setSelectedRoleId] = useState(() => (reelm.roles && reelm.roles[0]?.id) || 'role-0')
  const [roleEditorTab, setRoleEditorTab] = useState('display')
  const [roleSearchQuery, setRoleSearchQuery] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('all')
  const [activeRolePopoverUid, setActiveRolePopoverUid] = useState(null)
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleColor, setEditingRoleColor] = useState('#60a5fa')
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#60a5fa')
  const [memberSearch, setMemberSearch] = useState('')
  const [reelmNameInput, setReelmNameInput] = useState(() => reelm.name || '')
  const [reelmNameSaving, setReelmNameSaving] = useState(false)
  const [reelmNameStatus, setReelmNameStatus] = useState('')
  const [reelmDescInput, setReelmDescInput] = useState(() => reelm.description || '')
  const [reelmDescSaving, setReelmDescSaving] = useState(false)
  const [reelmDescStatus, setReelmDescStatus] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  // Channels management state
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState('text')
  const [creatingChInCatId, setCreatingChInCatId] = useState(null)
  const [newChName, setNewChName] = useState('')
  const [newChType, setNewChType] = useState('text')
  const [editingChObj, setEditingChObj] = useState(null)
  const [permModalTarget, setPermModalTarget] = useState(null)

  const [showInDiscover, setShowInDiscover] = useState(() => reelm.showInDiscover ?? false)
  const [autoJoinOnInvite, setAutoJoinOnInvite] = useState(() => reelm.autoJoinOnInvite ?? false)
  const [memberInvitesEnabled, setMemberInvitesEnabled] = useState(() => reelm.memberInvitesEnabled ?? true)
  const [memberInviteMode, setMemberInviteMode] = useState(() => reelm.memberInviteMode || 'request')
  const [joinMode, setJoinMode] = useState(() => reelm.joinMode || 'request')
  const [ageRating, setAgeRating] = useState(() => reelm.ageRating || 'under18')
  const [roleMemberDirty, setRoleMemberDirty] = useState(false)
  const [roleMemberSaving, setRoleMemberSaving] = useState(false)
  const [roleMemberStatus, setRoleMemberStatus] = useState('')
  const memberRemovalIntentRef = useRef(false)

  useEffect(() => {
    const norm = (reelm.roles || []).map((role, i) => normalizeRoleForClient(role, `role-${i}`, true))
    setRoles(norm)
    setMembers(reelm.members || [])
    if (norm.length && !norm.some(r => r.id === selectedRoleId)) {
      setSelectedRoleId(norm[0]?.id || null)
    }
    setReelmNameInput(reelm.name || '')
    setReelmDescInput(reelm.description || '')
    setCreatingCat(false)
    setCreatingChInCatId(null)
    setEditingChObj(null)
    setPermModalTarget(null)
    setEditingRoleId(null)
    setAddingRole(false)
    setRoleMemberDirty(false)
    setRoleMemberSaving(false)
    setRoleMemberStatus('')
    memberRemovalIntentRef.current = false
  }, [reelm.id])

  useEffect(() => {
    if (roles.length && !roles.some(r => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0]?.id || null)
    }
  }, [roles, selectedRoleId])

  const currentUserId = currentUser?.id || currentUser?.uid || ''
  const ownerAge = useMemo(() => {
    return currentUser?.birthDate
      ? Math.floor((Date.now() - new Date(currentUser.birthDate)) / 31557600000) // eslint-disable-line react-hooks/purity
      : 99
  }, [currentUser?.birthDate])
  const canSetAgeRating = ownerAge >= 18
  const permissionSet = useMemo(() => getReelmPermissionSetClient(reelm, currentUserId), [reelm, currentUserId])
  const isOwner = String(reelm.ownerId || '') === String(currentUserId) || isDefaultCommunity(reelm)
  const isFullManager = isOwner || permissionSet.has('manageReelm')
  const canManageFullRoles = isOwner || isFullManager
  const canViewSettings = true
  const canManageOverview = isFullManager || permissionSet.has('manageOverview')
  const canManageChannels = isFullManager || permissionSet.has('manageChannels')
  const canManageRoles = isFullManager || permissionSet.has('manageRoles')
  const canManageMembers = isFullManager || permissionSet.has('manageMembers')
  const canManageInvites = isFullManager || permissionSet.has('manageInvites')
  const canManageJoinRequests = isFullManager || permissionSet.has('manageJoinRequests')
  const canManageModeration = isFullManager || permissionSet.has('manageModeration')
  const protectedRoleIds = useMemo(() => new Set((roles || []).filter(isManagerRoleClient).map(role => String(role.id))), [roles])
  const isProtectedMember = (member) => {
    if (!member) return false
    if (String(member.userId || member.id || '') === String(reelm.ownerId || '')) return true
    return Array.isArray(member.roleIds) && member.roleIds.map(String).some(id => protectedRoleIds.has(id))
  }
  const canEditRole = (role) => canManageRoles && (canManageFullRoles || !isManagerRoleClient(role))
  const canDeleteRole = (role) => canEditRole(role) && !isManagerRoleClient(role)
  const canToggleRoleForMember = (member, role) => canManageRoles && (canManageFullRoles || (!isManagerRoleClient(role) && !isProtectedMember(member)))
  const canActOnMember = (member) => canManageMembers && String(member?.userId || '') !== String(currentUserId) && (canManageFullRoles || !isProtectedMember(member))
  const availableTabs = useMemo(() => [
    { key: 'general', label: 'General' },
    canManageOverview ? { key: 'visibility', label: 'Visibility' } : null,
    (canManageRoles || canManageMembers || canManageInvites) ? { key: 'roles', label: 'Roles and members' } : null,
    canManageChannels ? { key: 'channels', label: 'Channels' } : null,
    (canManageChannels || canManageOverview || isOwner) ? { key: 'integrations', label: 'Integrations & Webhooks' } : null,
    canManageJoinRequests ? { key: 'join_requests', label: t('rs_join_requests_tab') || 'Join requests' } : null,
    canManageModeration ? { key: 'audit_log', label: 'Audit Actions' } : null,
    canManageModeration ? { key: 'timeouts', label: 'Timeouts' } : null,
  ].filter(Boolean), [canManageOverview, canManageRoles, canManageMembers, canManageInvites, canManageChannels, isOwner, canManageJoinRequests, canManageModeration, t])

  useEffect(() => {
    if (availableTabs.length && !availableTabs.some(tab => tab.key === activeTab)) setActiveTab(availableTabs[0]?.key || 'general')
  }, [availableTabs, activeTab])

  const normalizeRoleMemberDraft = (updatedRoles, updatedMembers) => {
    const normalizedRoles = (updatedRoles || []).map((role, i) => normalizeRoleForClient(role, `role-${i}`, canManageFullRoles)).slice(0, 12)
    const validRoleIds = new Set(normalizedRoles.map(role => String(role.id)))
    const managerRole = normalizedRoles.find(isManagerRoleClient) || normalizedRoles[0] || null
    const ownerId = String(reelm.ownerId || currentUserId || '')
    const normalizedMembers = (updatedMembers || []).map(member => {
      const baseRoleIds = Array.isArray(member.roleIds) ? member.roleIds.map(String).filter(id => validRoleIds.has(id)) : []
      const roleIds = String(member.userId) === ownerId && managerRole?.id
        ? Array.from(new Set([...baseRoleIds, String(managerRole.id)]))
        : Array.from(new Set(baseRoleIds))
      return { ...member, roleIds }
    })
    return { normalizedRoles, normalizedMembers }
  }

  const saveAll = (updatedRoles, updatedMembers) => {
    const { normalizedRoles, normalizedMembers } = normalizeRoleMemberDraft(updatedRoles, updatedMembers)
    setRoles(normalizedRoles)
    setMembers(normalizedMembers)
    setRoleMemberDirty(true)
    setRoleMemberStatus('Unsaved changes')
  }

  const commitRoleMemberChanges = async () => {
    if (!canManageRoles && !canManageMembers) return
    const { normalizedRoles, normalizedMembers } = normalizeRoleMemberDraft(roles, members)
    setRoleMemberSaving(true)
    setRoleMemberStatus('Saving…')
    setRoles(normalizedRoles)
    setMembers(normalizedMembers)
    try {
      const allowMemberRemoval = memberRemovalIntentRef.current === true
      await onUpdate?.({ ...reelm, roles: normalizedRoles, members: normalizedMembers }, { scope: 'roles-members', allowMemberRemoval })
      memberRemovalIntentRef.current = false
      setRoleMemberDirty(false)
      setRoleMemberStatus('Saved')
      window.setTimeout(() => setRoleMemberStatus(''), 1800)
    } catch {
      setRoleMemberStatus('Could not save')
    } finally {
      setRoleMemberSaving(false)
    }
  }

  const addRole = () => {
    if (!canManageRoles || !newRoleName.trim() || roles.length >= 12) return
    const nr = normalizeRoleForClient({ id: 'role-' + Date.now(), name: newRoleName.trim(), color: newRoleColor, permissions: { viewSettings: true } }, '', canManageFullRoles)
    saveAll([...roles, nr], members)
    setNewRoleName('')
    setNewRoleColor('#60a5fa')
    setAddingRole(false)
  }

  const startEditRole = (role) => {
    if (!canEditRole(role)) return
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
    setEditingRoleColor(role.color)
  }

  const saveEditRole = () => {
    if (!editingRoleName.trim()) return
    saveAll(roles.map(r => {
      if (r.id !== editingRoleId) return r
      const next = { ...r, name: editingRoleName.trim(), color: editingRoleColor }
      return normalizeRoleForClient(next, '', canManageFullRoles)
    }), members)
    setEditingRoleId(null)
  }

  const toggleRolePermission = (roleId, permissionKey) => {
    const role = roles.find(r => r.id === roleId)
    if (!canEditRole(role)) return
    if (permissionKey === 'manageReelm' && !canManageFullRoles) return
    saveAll(roles.map(r => {
      if (r.id !== roleId) return r
      const permissions = { ...(r.permissions || {}) }
      if (permissions[permissionKey]) delete permissions[permissionKey]
      else permissions[permissionKey] = true
      if (Object.values(permissions).some(Boolean)) permissions.viewSettings = true
      if (!permissions.manageReelm && permissionKey === 'viewSettings' && Object.keys(permissions).length === 1) delete permissions.viewSettings
      return normalizeRoleForClient({ ...r, permissions }, '', canManageFullRoles)
    }), members)
  }

  const deleteRole = (roleId) => {
    const nextRoles = roles.filter(r => r.id !== roleId)
    const role = roles.find(r => r.id === roleId)
    if (!canDeleteRole(role)) return
    if (!nextRoles.some(isManagerRoleClient)) return
    const updatedMembers = members.map(m => ({ ...m, roleIds: (m.roleIds || []).filter(r => r !== roleId) }))
    saveAll(nextRoles, updatedMembers)
  }

  const moveRole = (fromIndex, toIndex) => {
    if (!canManageRoles || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= roles.length || toIndex >= roles.length) return
    const fromRole = roles[fromIndex]
    const toRole = roles[toIndex]
    if (!canEditRole(fromRole) || (!canManageFullRoles && isManagerRoleClient(toRole))) return
    const next = [...roles]
    const [removed] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, removed)
    saveAll(next.map((role, index) => ({ ...role, position: index })), members)
  }

  const toggleMemberRole = (userId, roleId) => {
    const uid = String(userId)
    const rid = String(roleId)
    const updatedMembers = members.map(m => {
      const mid = String(m.userId || m.id || '')
      if (mid !== uid) return m
      const role = roles.find(r => String(r.id) === rid)
      if (!canToggleRoleForMember(m, role)) return m
      const currentRoleIds = getMemberRoleIdsClient(m)
      const has = currentRoleIds.includes(rid)
      const nextRoleIds = has ? currentRoleIds.filter(r => r !== rid) : [...currentRoleIds, rid]
      return { ...m, userId: mid, roleIds: nextRoleIds }
    })
    saveAll(roles, updatedMembers)
  }

  const banList = Array.isArray(reelm.banList) ? reelm.banList : []
  const bannedIds = new Set(banList.map(entry => String(entry?.userId || entry?.id || '')).filter(Boolean))
  const timeoutList = Array.isArray(reelm.timeoutList) ? reelm.timeoutList.filter(entry => Number(entry?.expiresAt || 0) > Date.now()) : []
  const timedOutIds = new Set(timeoutList.map(entry => String(entry?.userId || entry?.id || '')).filter(Boolean))
  const formatTimeoutUntil = (expiresAt) => {
    const ts = Number(expiresAt || 0)
    if (!ts) return 'timeout active'
    try { return `until ${new Date(ts).toLocaleString()}` } catch { return 'timeout active' }
  }

  const inviteFriendToReelm = (friend) => {
    if ((!canManageInvites && !canManageMembers) || !friend?.id || members.find(m => m.userId === friend.id) || bannedIds.has(String(friend.id))) return
    onInviteFriend?.(reelm.id, friend.id)
  }

  const removeMember = (userId) => {
    const member = members.find(m => m.userId === userId)
    if (!canActOnMember(member)) return
    memberRemovalIntentRef.current = true
    saveAll(roles, members.filter(m => m.userId !== userId))
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0] || null

  const handleSelectedRoleNameChange = (name) => {
    if (!selectedRole || !canEditRole(selectedRole)) return
    saveAll(roles.map(r => r.id === selectedRole.id ? normalizeRoleForClient({ ...r, name }, '', canManageFullRoles) : r), members)
  }

  const handleSelectedRoleColorChange = (color) => {
    if (!selectedRole || !canEditRole(selectedRole)) return
    saveAll(roles.map(r => r.id === selectedRole.id ? normalizeRoleForClient({ ...r, color }, '', canManageFullRoles) : r), members)
  }

  const handleCreateNewRole = () => {
    if (!canManageRoles || roles.length >= 12) return
    const newId = 'role-' + Date.now()
    const newRole = normalizeRoleForClient({
      id: newId,
      name: `New Role ${roles.length + 1}`,
      color: ROLE_PALETTE[roles.length % ROLE_PALETTE.length] || '#60a5fa',
      permissions: { viewSettings: true }
    }, '', canManageFullRoles)
    saveAll([...roles, newRole], members)
    setSelectedRoleId(newId)
    setRoleEditorTab('display')
  }

  const filteredRoles = roles.filter(r =>
    !roleSearchQuery.trim() || (r.name || '').toLowerCase().includes(roleSearchQuery.toLowerCase())
  )

  const filteredMembers = members.filter(m => {
    const matchesSearch = !memberSearch.trim() ||
      (m.userName || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.userId || '').toLowerCase().includes(memberSearch.toLowerCase())
    const matchesRole = memberRoleFilter === 'all' || (m.roleIds || []).includes(memberRoleFilter)
    return matchesSearch && matchesRole
  })

  const nonMembers = (Array.isArray(friends) ? friends : []).filter(f => !members.find(m => m.userId === f.id))
  const filteredNonMembers = memberSearch.trim()
    ? nonMembers.filter(f => f.name?.toLowerCase().includes(memberSearch.toLowerCase()))
    : nonMembers

  const allChannels = useMemo(() => (reelm.categories || []).flatMap(c => (c.channels || []).map(ch => ({ ...ch, categoryId: c.id, categoryName: c.name }))), [reelm.categories])

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return
    const newCat = {
      id: 'cat-' + Date.now(),
      name: newCatName.trim(),
      type: newCatType,
      channels: []
    }
    const updated = [...(reelm.categories || []), newCat]
    onUpdate({ ...reelm, categories: updated })
    setCreatingCat(false)
    setNewCatName('')
  }

  const handleDeleteCategory = (catId) => {
    if ((reelm.categories || []).length <= 1) return
    const cat = (reelm.categories || []).find(c => c.id === catId)
    if (!window.confirm(`Are you sure you want to delete the "${cat?.name || 'this'}" category and all its channels?`)) return
    const updated = (reelm.categories || []).filter(c => c.id !== catId)
    onUpdate({ ...reelm, categories: updated })
  }

  const handleMoveCategory = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= (reelm.categories || []).length) return
    const next = [...(reelm.categories || [])]
    const [removed] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, removed)
    onUpdate({ ...reelm, categories: next })
  }

  const handleCreateChannel = (catId) => {
    if (!newChName.trim()) return
    const formattedName = newChType === 'text'
      ? newChName.trim().toLowerCase().replace(/\s+/g, '-')
      : newChName.trim()
    const newChannel = {
      id: 'ch-' + Date.now(),
      name: formattedName,
      type: newChType,
      ...(newChType === 'voice' ? { capacity: 8, current: 0 } : {})
    }
    const updated = (reelm.categories || []).map(c => {
      if (c.id !== catId) return c
      return { ...c, channels: [...(c.channels || []), newChannel] }
    })
    onUpdate({ ...reelm, categories: updated })
    setCreatingChInCatId(null)
    setNewChName('')
  }

  const handleDeleteChannel = (catId, chId) => {
    const cat = (reelm.categories || []).find(c => c.id === catId)
    const ch = cat?.channels?.find(c => c.id === chId)
    if (!window.confirm(`Are you sure you want to delete #${ch?.name || 'this channel'}?`)) return
    const updated = (reelm.categories || []).map(c => {
      if (c.id !== catId) return c
      return { ...c, channels: (c.channels || []).filter(item => item.id !== chId) }
    })
    onUpdate({ ...reelm, categories: updated })
    if (editingChObj?.chId === chId) setEditingChObj(null)
  }

  const handleMoveChannel = (catId, fromIndex, toIndex) => {
    const cat = (reelm.categories || []).find(c => c.id === catId)
    if (!cat || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= (cat.channels || []).length) return
    const updatedChannels = [...(cat.channels || [])]
    const [removed] = updatedChannels.splice(fromIndex, 1)
    updatedChannels.splice(toIndex, 0, removed)
    const updated = (reelm.categories || []).map(c => c.id !== catId ? c : { ...c, channels: updatedChannels })
    onUpdate({ ...reelm, categories: updated })
  }

  const handleSaveChannelDetails = () => {
    if (!editingChObj) return
    const { catId, chId, name, topic, slowmode, isNsfw, capacity } = editingChObj
    const formattedName = name.trim() ? name.trim().toLowerCase().replace(/\s+/g, '-') : 'channel'
    const updated = (reelm.categories || []).map(c => {
      if (c.id !== catId) return c
      return {
        ...c,
        channels: (c.channels || []).map(ch => ch.id !== chId ? ch : {
          ...ch,
          name: formattedName,
          topic: topic || '',
          slowmode: Number(slowmode || 0),
          isNsfw: Boolean(isNsfw),
          ...(capacity !== undefined ? { capacity: Number(capacity) } : {})
        })
      }
    })
    onUpdate({ ...reelm, categories: updated })
    setEditingChObj(null)
  }

  return (
    <div className="settings-layout">
      <button
        type="button"
        className="settings-floating-close-btn"
        onClick={onClose}
        title={t('close') || 'Close'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="settings-sidebar">
        <h2 className="settings-title">{reelm.name}</h2>
        <nav className="settings-nav">
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`settings-nav-item${activeTab === tab.key ? ' settings-nav-item-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="settings-nav-item-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="settings-content">
        <div className="settings-content-panel">

          {activeTab === 'general' && canViewSettings && (
            <div className="rs-section" style={{ gap: 20 }}>
              <div className="rs-section-header">
                <span className="rs-section-title">Reelm Profile & Identity</span>
              </div>

              {canManageOverview && !reelm.isDefault && (
                <>
                  <div className="rs-field-row">
                    <label className="rs-field-label">Reelm Name</label>
                    <div className="rs-field-input-row">
                      <input
                        className="rs-field-input"
                        value={reelmNameInput}
                        maxLength={64}
                        onChange={e => { setReelmNameInput(e.target.value); setReelmNameStatus('') }}
                        placeholder="Reelm adı"
                      />
                      <button
                        className="rs-field-save-btn"
                        disabled={reelmNameSaving || !reelmNameInput.trim() || reelmNameInput.trim() === reelm.name}
                        onClick={async () => {
                          const next = reelmNameInput.trim()
                          if (!next || next === reelm.name) return
                          setReelmNameSaving(true)
                          setReelmNameStatus('')
                          try {
                            await onUpdate({ ...reelm, roles, members, name: next })
                            setReelmNameStatus('saved')
                          } catch { setReelmNameStatus('error') }
                          setReelmNameSaving(false)
                        }}
                      >
                        {reelmNameSaving ? '...' : reelmNameStatus === 'saved' ? '✓' : 'Save'}
                      </button>
                    </div>
                    {reelmNameStatus === 'error' && <p className="rs-field-error">Could not save. Please try again.</p>}
                  </div>

                  <div className="rs-field-row" style={{ marginTop: 14 }}>
                    <label className="rs-field-label">Reelm Description / Bio</label>
                    <div className="rs-field-input-row" style={{ alignItems: 'flex-start' }}>
                      <textarea
                        className="rs-field-input"
                        style={{ minHeight: 64, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
                        value={reelmDescInput}
                        maxLength={256}
                        onChange={e => { setReelmDescInput(e.target.value); setReelmDescStatus('') }}
                        placeholder="Tell members what this Reelm is all about..."
                      />
                      <button
                        className="rs-field-save-btn"
                        disabled={reelmDescSaving || reelmDescInput.trim() === (reelm.description || '')}
                        onClick={async () => {
                          const next = reelmDescInput.trim()
                          setReelmDescSaving(true)
                          setReelmDescStatus('')
                          try {
                            await onUpdate({ ...reelm, roles, members, description: next })
                            setReelmDescStatus('saved')
                          } catch { setReelmDescStatus('error') }
                          setReelmDescSaving(false)
                        }}
                      >
                        {reelmDescSaving ? '...' : reelmDescStatus === 'saved' ? '✓' : 'Save'}
                      </button>
                    </div>
                  </div>

                  <div className="rs-field-row" style={{ marginTop: 14 }}>
                    <label className="rs-field-label">Reelm Identifier & Code</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, padding: '7px 12px', background: 'rgba(var(--ta-rgb), 0.08)', borderRadius: 10, border: '1px solid rgba(var(--ta-rgb), 0.15)', color: 'var(--ta)' }}>
                        #{reelm.code || reelm.id}
                      </span>
                      <button
                        type="button"
                        className="cm-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText(reelm.code || reelm.id)
                          setCodeCopied(true)
                          setTimeout(() => setCodeCopied(false), 2000)
                        }}
                      >
                        {codeCopied ? '✓ Copied' : '📋 Copy Code'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* System Defaults Section */}
              <div className="rs-section-header" style={{ marginTop: 20 }}>
                <span className="rs-section-title">System Defaults & Preferences</span>
              </div>

              <div className="rs-channel-select-row">
                <div>
                  <span className="rs-channel-select-label">System Messages Channel</span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.45)' }}>
                    Channel where welcome greetings and member milestones appear.
                  </p>
                </div>
                <select
                  className="rs-channel-select"
                  value={reelm.announcementChannelId || ''}
                  onChange={e => onUpdate({ ...reelm, announcementChannelId: e.target.value })}
                >
                  <option value="">Default (First text channel)</option>
                  {allChannels.filter(ch => ch.type === 'text' || ch.type === 'announcement').map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name} ({ch.categoryName})</option>
                  ))}
                </select>
              </div>

              <div className="rs-channel-select-row" style={{ marginTop: 10 }}>
                <div>
                  <span className="rs-channel-select-label">Default Notification Level</span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.45)' }}>
                    Determines default alert level for new members in this Reelm.
                  </p>
                </div>
                <select
                  className="rs-channel-select"
                  value={reelm.defaultNotification || 'all'}
                  onChange={e => onUpdate({ ...reelm, defaultNotification: e.target.value })}
                >
                  <option value="all">All Messages</option>
                  <option value="mentions">Only @mentions</option>
                </select>
              </div>

              <div className="rs-channel-select-row" style={{ marginTop: 10 }}>
                <div>
                  <span className="rs-channel-select-label">Inactive / AFK Voice Timeout</span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.45)' }}>
                    Automatically mute or move idle members in voice rooms.
                  </p>
                </div>
                <select
                  className="rs-channel-select"
                  value={String(reelm.afkTimeout ?? 300)}
                  onChange={e => onUpdate({ ...reelm, afkTimeout: Number(e.target.value) })}
                >
                  <option value="0">Disabled</option>
                  <option value="300">5 minutes</option>
                  <option value="900">15 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                </select>
              </div>

              {canManageOverview && (
                <>
                  <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                    <div>
                      <span className="cust-toggle-label">{t('public_reelm') || 'Public Reelm'}</span>
                      <p className="accs-note">{t('public_reelm_desc') || 'Allow anyone to discover and join this Reelm.'}</p>
                    </div>
                    <button
                      type="button"
                      className={`cust-toggle${(reelm.isPublic ?? (reelm.showInDiscover || joinMode === 'open')) ? ' cust-toggle-on' : ''}`}
                      onClick={() => {
                        const next = !(reelm.isPublic ?? (reelm.showInDiscover || joinMode === 'open'))
                        onUpdate({ ...reelm, roles, members, isPublic: next, showInDiscover: next, joinMode: next ? 'open' : 'request' })
                      }}
                    ><span className="cust-toggle-knob" /></button>
                  </div>

                  <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                    <div>
                      <span className="cust-toggle-label">{t('show_in_discover') || 'Show in Discover'}</span>
                      <p className="accs-note">{t('show_in_discover_desc') || 'Feature this Reelm on the Discover screen so others can find and join it.'}</p>
                    </div>
                    <button
                      type="button"
                      className={`cust-toggle${showInDiscover ? ' cust-toggle-on' : ''}`}
                      onClick={() => {
                        const next = !showInDiscover
                        setShowInDiscover(next)
                        onUpdate({ ...reelm, roles, members, showInDiscover: next })
                      }}
                    ><span className="cust-toggle-knob" /></button>
                  </div>

                  {canSetAgeRating && (
                    <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                      <div>
                        <span className="cust-toggle-label">{t('adults_only') || 'Adults only'}</span>
                        <p className="accs-note">{t('adults_only_desc') || 'Requires members to be 18 or older to join and view content in this reelm.'}</p>
                      </div>
                      <button
                        type="button"
                        className={`cust-toggle${ageRating === 'adults' ? ' cust-toggle-on' : ''}`}
                        onClick={() => {
                          const next = ageRating === 'adults' ? 'under18' : 'adults'
                          setAgeRating(next)
                          onUpdate({ ...reelm, roles, members, showInDiscover, autoJoinOnInvite, memberInvitesEnabled, memberInviteMode, joinMode, ageRating: next })
                        }}
                      ><span className="cust-toggle-knob" /></button>
                    </div>
                  )}
                </>
              )}

              {/* Danger Zone: Close Reelm */}
              {canManageFullRoles && !reelm.isDefault && (
                <div className="rs-danger-box">
                  <div className="rs-danger-header">
                    <div className="rs-danger-info">
                      <span className="rs-danger-title">🛑 Danger Zone — Close Reelm</span>
                      <p className="rs-danger-desc">
                        Closing this Reelm will permanently remove it from all members, disable its invite links, and delete all channel history. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rs-danger-btn"
                      onClick={() => {
                        const typed = window.prompt(`Type "${reelm.name}" to permanently close this Reelm.`)
                        if (typed === reelm.name) onCloseReelm?.(reelm.id, typed)
                      }}
                    >
                      Close Reelm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'visibility' && canManageOverview && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Visibility</span>
              </div>
              <div className="cust-toggle-row">
                <div>
                  <span className="cust-toggle-label">Show in Discover</span>
                  <p className="accs-note">Allow this reelm to appear in the Discover section so others can find and join it.</p>
                </div>
                <button
                  className={`cust-toggle${showInDiscover ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = !showInDiscover
                    setShowInDiscover(next)
                    onUpdate({ ...reelm, roles, members, showInDiscover: next })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>
              <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                <div>
                  <span className="cust-toggle-label">Auto-join via invite link</span>
                  <p className="accs-note">People who arrive through an invite link join automatically without needing approval.</p>
                </div>
                <button
                  className={`cust-toggle${autoJoinOnInvite ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = !autoJoinOnInvite
                    setAutoJoinOnInvite(next)
                    onUpdate({ ...reelm, roles, members, autoJoinOnInvite: next, memberInvitesEnabled, memberInviteMode })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>
              <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                <div>
                  <span className="cust-toggle-label">Require approval to join</span>
                  <p className="accs-note">New Reelms use requests by default. Turn this off if anyone should be able to join instantly.</p>
                </div>
                <button
                  className={`cust-toggle${joinMode !== 'open' ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = joinMode === 'open' ? 'request' : 'open'
                    setJoinMode(next)
                    onUpdate({ ...reelm, roles, members, showInDiscover, autoJoinOnInvite, memberInvitesEnabled, memberInviteMode, joinMode: next })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>

              <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                <div>
                  <span className="cust-toggle-label">Allow members to invite friends</span>
                  <p className="accs-note">Members can send invites. If disabled, only server managers can invite people.</p>
                </div>
                <button
                  className={`cust-toggle${memberInvitesEnabled ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = !memberInvitesEnabled
                    setMemberInvitesEnabled(next)
                    onUpdate({ ...reelm, roles, members, showInDiscover, autoJoinOnInvite, memberInvitesEnabled: next, memberInviteMode, joinMode })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>
              <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                <div>
                  <span className="cust-toggle-label">Member invites auto-join</span>
                  <p className="accs-note">When off, people invited by regular members still need server approval. Manager/owner invites always bypass approval.</p>
                </div>
                <button
                  className={`cust-toggle${memberInviteMode === 'auto' ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = memberInviteMode === 'auto' ? 'request' : 'auto'
                    setMemberInviteMode(next)
                    onUpdate({ ...reelm, roles, members, showInDiscover, autoJoinOnInvite, memberInvitesEnabled, memberInviteMode: next, joinMode })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>

              {canSetAgeRating && (
                <div className="cust-toggle-row" style={{ marginTop: '18px' }}>
                  <div>
                    <span className="cust-toggle-label">{t('adults_only') || 'Adults only'}</span>
                    <p className="accs-note">{t('adults_only_desc') || 'Requires members to be 18 or older to join and view content in this reelm.'}</p>
                  </div>
                  <button
                    className={`cust-toggle${ageRating === 'adults' ? ' cust-toggle-on' : ''}`}
                    onClick={() => {
                      const next = ageRating === 'adults' ? 'under18' : 'adults'
                      setAgeRating(next)
                      onUpdate({ ...reelm, roles, members, showInDiscover, autoJoinOnInvite, memberInvitesEnabled, memberInviteMode, joinMode, ageRating: next })
                    }}
                  ><span className="cust-toggle-knob" /></button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'join_requests' && canManageJoinRequests && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">{t('rs_join_requests_tab') || 'Join requests'}</span>
              </div>

              <div className="cust-toggle-row" style={{ marginTop: '4px', marginBottom: '20px' }}>
                <div>
                  <span className="cust-toggle-label">{t('rs_require_approval_title') || 'Require approval before joining'}</span>
                  <p className="accs-note">{t('rs_require_approval_desc') || 'When enabled, new members must be approved by a manager before they can enter this reelm.'}</p>
                </div>
                <button
                  className={`cust-toggle${joinMode !== 'open' ? ' cust-toggle-on' : ''}`}
                  onClick={() => {
                    const next = joinMode === 'open' ? 'request' : 'open'
                    setJoinMode(next)
                    onUpdate({ ...reelm, roles, members, showInDiscover, autoJoinOnInvite, memberInvitesEnabled, memberInviteMode, joinMode: next })
                  }}
                ><span className="cust-toggle-knob" /></button>
              </div>

              <div className="rs-section-header" style={{ borderTop: '1px solid rgba(var(--ta-rgb), 0.12)', paddingTop: '16px' }}>
                <span className="rs-section-title" style={{ fontSize: '0.92rem' }}>
                  {t('rs_pending_requests_title') || 'Pending requests'}
                  {Array.isArray(reelm.joinRequests) && reelm.joinRequests.length > 0 && (
                    <span className="rm-subnav-badge" style={{ marginLeft: '8px' }}>{reelm.joinRequests.length}</span>
                  )}
                </span>
              </div>

              {(!Array.isArray(reelm.joinRequests) || reelm.joinRequests.length === 0) ? (
                <p className="rs-section-hint">{t('rs_no_pending_requests') || 'No pending join requests.'}</p>
              ) : (
                <div className="discover-results" style={{ padding: 0 }}>
                  {reelm.joinRequests.map(req => (
                    <div key={req.userId || req.id} className="discover-result-row">
                      <div className="discover-result-avatar" style={{ width: 34, height: 34 }}>
                        {getPersonPhoto(req) ? <img src={getPersonPhoto(req)} alt={req.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (req.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="discover-result-info">
                        <span className="discover-result-name">{req.name || req.username || 'Member'}</span>
                        <span className="discover-result-type">{req.username ? `@${req.username}` : (t('rs_wants_to_join') || 'wants to join')}</span>
                      </div>
                      <div className="friend-req-actions">
                        <button className="friend-add-btn friend-add-btn--compact" title={t('rs_approve_request') || 'Approve'} onClick={() => onApproveJoin?.(reelm.id, req.userId || req.id)}>✓</button>
                        <button className="friend-reject-btn friend-reject-btn--compact" title={t('rs_reject_request') || 'Decline'} onClick={() => onRejectJoin?.(reelm.id, req.userId || req.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && (canManageRoles || canManageMembers || canManageInvites) && (
            <div className="rm-container">
              {/* Top Navigation & Actions Bar */}
              <div className="rm-top-header">
                <div className="rm-subnav-pills">
                  <button
                    type="button"
                    className={`rm-subnav-pill${rolesSubTab === 'roles' ? ' active' : ''}`}
                    onClick={() => setRolesSubTab('roles')}
                  >
                    <span>🛡️ Roles</span>
                    <span className="rm-subnav-badge">{roles.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`rm-subnav-pill${rolesSubTab === 'members' ? ' active' : ''}`}
                    onClick={() => setRolesSubTab('members')}
                  >
                    <span>👥 Members</span>
                    <span className="rm-subnav-badge">{members.length}</span>
                  </button>
                </div>

                <div className="rm-actions-row">
                  {roleMemberStatus && (
                    <span className={`rm-save-state${roleMemberDirty ? ' dirty' : ''}`}>
                      {roleMemberStatus}
                    </span>
                  )}
                  {(canManageRoles || canManageMembers) && (
                    <button
                      type="button"
                      className="rm-save-btn"
                      disabled={!roleMemberDirty || roleMemberSaving}
                      onClick={commitRoleMemberChanges}
                    >
                      {roleMemberSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  )}
                </div>
              </div>

              {/* ROLES SUB-TAB */}
              {rolesSubTab === 'roles' && (
                <div className="rm-split-layout">
                  {/* Left Pane: Role List */}
                  <div className="rm-roles-pane">
                    <div className="rm-roles-pane-header">
                      <span className="rm-roles-pane-title">Roles ({roles.length}/12)</span>
                      {canManageRoles && roles.length < 12 && (
                        <button
                          type="button"
                          className="rm-add-role-btn"
                          onClick={handleCreateNewRole}
                        >
                          + New role
                        </button>
                      )}
                    </div>

                    {roles.length > 4 && (
                      <input
                        className="rm-text-input"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        placeholder="Search roles…"
                        value={roleSearchQuery}
                        onChange={e => setRoleSearchQuery(e.target.value)}
                      />
                    )}

                    <div className="rm-role-list">
                      {filteredRoles.map((role, roleIndex) => {
                        const isSelected = selectedRole?.id === role.id
                        const isProtected = isManagerRoleClient(role)
                        const roleMemberCount = members.filter(m => (m.roleIds || []).includes(role.id)).length
                        return (
                          <div
                            key={role.id}
                            className={`rm-role-item${isSelected ? ' active' : ''}`}
                            onClick={() => setSelectedRoleId(role.id)}
                            draggable={canEditRole(role)}
                            onDragStart={e => { e.dataTransfer.setData('application/x-reelm-role-index', String(roleIndex)); e.dataTransfer.effectAllowed = 'move' }}
                            onDragOver={e => { if (canEditRole(role)) e.preventDefault() }}
                            onDrop={e => { const from = Number(e.dataTransfer.getData('application/x-reelm-role-index')); if (Number.isFinite(from)) moveRole(from, roleIndex) }}
                          >
                            <div className="rm-role-item-left">
                              <span className="rm-role-color-dot" style={{ background: role.color || '#60a5fa' }} />
                              <span className="rm-role-item-name">{role.name}</span>
                            </div>

                            <div className="rm-role-item-right">
                              {isProtected ? (
                                <span className="rs-role-protected">Admin</span>
                              ) : (
                                <span className="rm-role-item-count">{roleMemberCount}</span>
                              )}
                              {canEditRole(role) && (
                                <div className="rm-role-order-actions" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="rm-role-order-btn"
                                    disabled={roleIndex === 0}
                                    onClick={() => moveRole(roleIndex, roleIndex - 1)}
                                    title="Move Up"
                                  >↑</button>
                                  <button
                                    type="button"
                                    className="rm-role-order-btn"
                                    disabled={roleIndex === roles.length - 1}
                                    onClick={() => moveRole(roleIndex, roleIndex + 1)}
                                    title="Move Down"
                                  >↓</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {filteredRoles.length === 0 && (
                        <p className="rs-empty">No roles found.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Pane: Selected Role Inspector */}
                  {selectedRole ? (
                    <div className="rm-role-editor-pane">
                      <div className="rm-editor-header">
                        <div className="rm-editor-title-wrap">
                          <span className="rm-editor-color-badge" style={{ background: selectedRole.color || '#60a5fa' }} />
                          <span className="rm-editor-role-name">{selectedRole.name}</span>
                          {isManagerRoleClient(selectedRole) && (
                            <span className="rs-role-protected">Protected Admin</span>
                          )}
                        </div>

                        {canDeleteRole(selectedRole) && (
                          <button
                            type="button"
                            className="rm-editor-delete-btn"
                            onClick={() => deleteRole(selectedRole.id)}
                          >
                            Delete Role
                          </button>
                        )}
                      </div>

                      {/* Role Editor Sub-Tabs */}
                      <div className="rm-editor-tabs">
                        <button
                          type="button"
                          className={`rm-editor-tab-btn${roleEditorTab === 'display' ? ' active' : ''}`}
                          onClick={() => setRoleEditorTab('display')}
                        >
                          Display
                        </button>
                        <button
                          type="button"
                          className={`rm-editor-tab-btn${roleEditorTab === 'permissions' ? ' active' : ''}`}
                          onClick={() => setRoleEditorTab('permissions')}
                        >
                          Permissions
                        </button>
                        <button
                          type="button"
                          className={`rm-editor-tab-btn${roleEditorTab === 'members' ? ' active' : ''}`}
                          onClick={() => setRoleEditorTab('members')}
                        >
                          Manage Members ({members.filter(m => (m.roleIds || []).includes(selectedRole.id)).length})
                        </button>
                      </div>

                      {/* DISPLAY TAB */}
                      {roleEditorTab === 'display' && (
                        <div className="rm-display-section">
                          <div className="rm-field-group">
                            <label className="rm-field-label">Role Name</label>
                            <input
                              className="rm-text-input"
                              value={selectedRole.name}
                              disabled={!canEditRole(selectedRole)}
                              onChange={e => handleSelectedRoleNameChange(e.target.value)}
                              placeholder="e.g. Moderator, VIP..."
                              maxLength={32}
                            />
                          </div>

                          <div className="rm-field-group">
                            <label className="rm-field-label">Role Color</label>
                            <div className="rm-palette-row">
                              {ROLE_PALETTE.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  className={`rm-palette-dot${(selectedRole.color || '').toLowerCase() === color.toLowerCase() ? ' active' : ''}`}
                                  style={{ background: color }}
                                  disabled={!canEditRole(selectedRole)}
                                  onClick={() => handleSelectedRoleColorChange(color)}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="rm-field-group">
                            <label className="rm-field-label">Badge Preview</label>
                            <div className="rm-role-preview-card">
                              <span
                                className="rm-role-badge-preview"
                                style={{
                                  background: (selectedRole.color || '#60a5fa') + '22',
                                  borderColor: selectedRole.color || '#60a5fa',
                                  color: selectedRole.color || '#60a5fa'
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: selectedRole.color || '#60a5fa' }} />
                                {selectedRole.name || 'Role'}
                              </span>
                              <span style={{ fontSize: '0.84rem', color: 'rgba(var(--ta-rgb), 0.65)' }}>
                                How this role will appear next to member names and in server member lists.
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PERMISSIONS TAB */}
                      {roleEditorTab === 'permissions' && (
                        <div className="rm-perms-container">
                          {isManagerRoleClient(selectedRole) && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#fbbf24', fontSize: '0.8rem' }}>
                              ⚡ This role has Full Administrator privileges. All permissions are permanently active and bypass channel rules.
                            </div>
                          )}

                          {DISCORD_ROLE_PERMISSION_SECTIONS.map((sec, sIdx) => (
                            <div key={sIdx} className="rm-perm-section">
                              <div className="rm-perm-section-head">
                                <span className="rm-perm-section-icon">{sec.icon}</span>
                                <span className="rm-perm-section-title">{sec.title}</span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {sec.permissions.map(perm => {
                                  const isEnabled = roleHasPermissionClient(selectedRole, perm.key)
                                  const isLocked = !canEditRole(selectedRole) || (perm.key === 'manageReelm' && !canManageFullRoles)
                                  return (
                                    <div key={perm.key} className={`rm-perm-row${perm.danger ? ' danger' : ''}`}>
                                      <div className="rm-perm-info">
                                        <span className="rm-perm-name" style={perm.danger ? { color: '#f87171' } : {}}>
                                          {perm.name}
                                        </span>
                                        <span className="rm-perm-desc">{perm.description}</span>
                                      </div>

                                      <button
                                        type="button"
                                        className={`cust-toggle${isEnabled ? ' cust-toggle-on' : ''}`}
                                        disabled={isLocked}
                                        onClick={() => toggleRolePermission(selectedRole.id, perm.key)}
                                      >
                                        <span className="cust-toggle-knob" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ROLE MEMBERS TAB */}
                      {roleEditorTab === 'members' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <span style={{ fontSize: '0.8rem', color: 'rgba(var(--ta-rgb), 0.65)' }}>
                            Members with the <strong>{selectedRole.name}</strong> role ({members.filter(m => (m.roleIds || []).includes(selectedRole.id)).length})
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {members.map(m => {
                              const hasRole = (m.roleIds || []).includes(selectedRole.id)
                              const canToggle = canToggleRoleForMember(m, selectedRole)
                              return (
                                <div key={m.userId} className="rm-member-card" style={{ padding: '8px 12px' }}>
                                  <div className="rm-member-left">
                                    <div className="rm-member-avatar-box" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                      {m.userPhoto ? <img src={m.userPhoto} alt="" /> : (m.userName || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="rm-member-displayname" style={{ fontSize: '0.82rem' }}>
                                      {m.userName}
                                      {m.userId === currentUser.id && <span className="rs-member-you"> (you)</span>}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    className={`cust-toggle${hasRole ? ' cust-toggle-on' : ''}`}
                                    disabled={!canToggle}
                                    onClick={() => toggleMemberRole(m.userId, selectedRole.id)}
                                  >
                                    <span className="cust-toggle-knob" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rm-role-editor-pane" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                      <p className="rs-empty">Select a role on the left to edit its details and permissions.</p>
                    </div>
                  )}
                </div>
              )}

              {/* MEMBERS SUB-TAB */}
              {rolesSubTab === 'members' && (
                <div className="rm-members-view">
                  <div className="rm-members-toolbar">
                    <div className="rm-search-input-wrap">
                      <svg className="rm-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.3-4.3"/>
                      </svg>
                      <input
                        className="rm-search-input"
                        placeholder="Search members by name…"
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                      />
                    </div>

                    <select
                      className="rm-role-filter-select"
                      value={memberRoleFilter}
                      onChange={e => setMemberRoleFilter(e.target.value)}
                    >
                      <option value="all">All Roles ({members.length})</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({members.filter(m => (m.roleIds || []).includes(r.id)).length})</option>
                      ))}
                    </select>
                  </div>

                  <div className="rm-members-grid">
                    {filteredMembers.map(m => {
                      const isOwnerMember = String(reelm.ownerId || '') === String(m.userId || '')
                      const isTimedOut = timedOutIds.has(String(m.userId))
                      return (
                        <div key={m.userId} className="rm-member-card">
                          <div className="rm-member-left">
                            <div className="rm-member-avatar-box">
                              {m.userPhoto
                                ? <img src={m.userPhoto} alt="" />
                                : (m.userName || '?').charAt(0).toUpperCase()}
                            </div>

                            <div className="rm-member-meta">
                              <div className="rm-member-name-line">
                                <span className="rm-member-displayname">{m.userName}</span>
                                {m.userId === currentUser.id && <span className="rm-badge-pill">You</span>}
                                {isOwnerMember && <span className="rm-badge-pill owner">Owner</span>}
                                {isTimedOut && <span className="rm-badge-pill timeout">Timed out</span>}
                              </div>

                              <div className="rm-member-roles-row">
                                {(m.roleIds || []).map(rId => {
                                  const rObj = roles.find(r => r.id === rId)
                                  if (!rObj) return null
                                  const canToggle = canToggleRoleForMember(m, rObj)
                                  return (
                                    <span
                                      key={rObj.id}
                                      className="rm-member-role-chip"
                                      style={{
                                        background: (rObj.color || '#60a5fa') + '22',
                                        borderColor: rObj.color || '#60a5fa',
                                        color: rObj.color || '#60a5fa'
                                      }}
                                      onClick={() => canToggle && toggleMemberRole(m.userId, rObj.id)}
                                      title={canToggle ? 'Click to remove role' : ''}
                                    >
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: rObj.color || '#60a5fa' }} />
                                      {rObj.name}
                                      {canToggle && <span className="rm-member-role-remove">✕</span>}
                                    </span>
                                  )
                                })}

                                {canManageRoles && (
                                  <div className="rm-role-popover-wrap">
                                    <button
                                      type="button"
                                      className="rm-add-role-chip-btn"
                                      onClick={() => setActiveRolePopoverUid(activeRolePopoverUid === m.userId ? null : m.userId)}
                                    >
                                      + Add role
                                    </button>

                                    {activeRolePopoverUid === m.userId && (
                                      <div className="rm-role-popover">
                                        {roles.map(r => {
                                          const hasThisRole = (m.roleIds || []).includes(r.id)
                                          const canToggle = canToggleRoleForMember(m, r)
                                          return (
                                            <button
                                              key={r.id}
                                              type="button"
                                              className={`rm-role-popover-item${hasThisRole ? ' checked' : ''}`}
                                              disabled={!canToggle}
                                              onClick={() => toggleMemberRole(m.userId, r.id)}
                                            >
                                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color || '#60a5fa' }} />
                                                {r.name}
                                              </span>
                                              {hasThisRole && <span>✓</span>}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {m.userId !== currentUser.id && (canManageModeration || canManageMembers) && (
                            <div className="rm-member-actions">
                              {canManageModeration && (
                                <button
                                  type="button"
                                  className="rm-action-btn"
                                  disabled={!canActOnMember(m)}
                                  onClick={() => onTimeoutMember?.(reelm.id, m.userId)}
                                >
                                  Timeout
                                </button>
                              )}
                              {canManageMembers && (
                                <button
                                  type="button"
                                  className="rm-action-btn danger"
                                  disabled={!canActOnMember(m)}
                                  onClick={() => removeMember(m.userId)}
                                >
                                  Remove
                                </button>
                              )}
                              {canManageModeration && (
                                <button
                                  type="button"
                                  className="rm-action-btn danger"
                                  disabled={!canActOnMember(m)}
                                  onClick={() => onBanMember?.(reelm.id, m.userId)}
                                >
                                  Ban
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {filteredMembers.length === 0 && (
                      <p className="rs-empty">No members match the search criteria.</p>
                    )}
                  </div>

                  {(canManageInvites || canManageMembers) && nonMembers.length > 0 && (
                    <div className="rs-add-member-section" style={{ marginTop: 20 }}>
                      <div className="rs-section-header">
                        <span className="rs-section-title">Invite friends to this server</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {filteredNonMembers.map(f => (
                          <div key={f.id} className="rm-member-card" style={{ padding: '8px 12px' }}>
                            <div className="rm-member-left">
                              <div className="rm-member-avatar-box" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                                {f.photo ? <img src={f.photo} alt="" /> : (f.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="rm-member-displayname" style={{ fontSize: '0.84rem' }}>{f.name}</span>
                            </div>
                            <button
                              type="button"
                              className="rs-add-btn"
                              onClick={() => inviteFriendToReelm(f)}
                            >
                              Invite
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit_log' && canManageModeration && (<AuditLogTab reelmId={reelm.id} banList={banList} onUnbanMember={onUnbanMember} />)}
          {activeTab === 'bans' && canManageModeration && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Ban list</span>
                <span className="rs-section-hint">{banList.length}</span>
              </div>
              {banList.length === 0 ? (
                <p className="rs-section-hint">No banned users in this Reelm.</p>
              ) : (
                <div className="rs-members-list">
                  {banList.map(entry => {
                    const entryId = String(entry.userId || entry.id || '')
                    return (
                      <div key={entryId} className="rs-member-row">
                        <div className="rs-member-avatar">
                          {getPersonPhoto(entry)
                            ? <img src={getPersonPhoto(entry)} alt={entry.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (entry.name || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="rs-member-info">
                          <span className="rs-member-name">{entry.name || entry.username || 'Member'}</span>
                          <span className="discover-result-type">{entry.username ? `@${entry.username}` : 'banned'}{entry.message || entry.reason ? ` • ${entry.message || entry.reason}` : ''}</span>
                        </div>
                        <button className="rs-add-btn" onClick={() => onUnbanMember?.(reelm.id, entryId)}>Unban</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeouts' && canManageModeration && (
            <div className="rs-section">
              <div className="rs-section-header">
                <span className="rs-section-title">Timeouts</span>
                <span className="rs-section-hint">{timeoutList.length}</span>
              </div>
              <p className="rs-section-hint">Timed out members stay in the Reelm, but cannot send channel messages, react, or join voice until the timeout expires.</p>
              {timeoutList.length === 0 ? (
                <p className="rs-section-hint">No active timeouts in this Reelm.</p>
              ) : (
                <div className="rs-members-list">
                  {timeoutList.map(entry => {
                    const entryId = String(entry.userId || entry.id || '')
                    return (
                      <div key={entryId} className="rs-member-row">
                        <div className="rs-member-avatar">
                          {getPersonPhoto(entry)
                            ? <img src={getPersonPhoto(entry)} alt={entry.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (entry.name || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="rs-member-info">
                          <span className="rs-member-name">{entry.name || entry.username || 'Member'}</span>
                          <span className="discover-result-type">{entry.username ? `@${entry.username}` : 'timed out'} • {formatTimeoutUntil(entry.expiresAt)}{entry.message || entry.reason ? ` • ${entry.message || entry.reason}` : ''}</span>
                        </div>
                        <button className="rs-add-btn" onClick={() => onUntimeoutMember?.(reelm.id, entryId)}>Remove timeout</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && canManageChannels && (
            <div className="cm-container">
              {/* Header */}
              <div className="cm-header">
                <div>
                  <span className="cm-header-title">Channels & Categories</span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.5)' }}>
                    Create, reorder, and configure text, voice, and announcement channels.
                  </p>
                </div>

                <div className="cm-header-actions">
                  <button
                    type="button"
                    className="cm-btn"
                    onClick={() => setCreatingCat(true)}
                  >
                    + Create Category
                  </button>
                </div>
              </div>

              {/* Create Category Modal / Inline Box */}
              {creatingCat && (
                <div className="cm-inline-editor">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--ta)' }}>Create New Category</span>
                    <button type="button" className="cm-icon-btn" onClick={() => setCreatingCat(false)}>✕</button>
                  </div>
                  <div className="cm-inline-editor-grid">
                    <div className="rm-field-group">
                      <label className="rm-field-label">Category Name</label>
                      <input
                        className="rm-text-input"
                        placeholder="e.g. TEXT CHANNELS, COMMUNITY..."
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory(); if (e.key === 'Escape') setCreatingCat(false) }}
                      />
                    </div>
                    <div className="rm-field-group">
                      <label className="rm-field-label">Category Type</label>
                      <select
                        className="rm-role-filter-select"
                        value={newCatType}
                        onChange={e => setNewCatType(e.target.value)}
                      >
                        <option value="text">💬 Text Channels</option>
                        <option value="voice">🔊 Voice Channels</option>
                        <option value="announcement">📢 Announcement</option>
                        <option value="live">⚡ Live Space</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button type="button" className="cm-btn" onClick={() => setCreatingCat(false)}>Cancel</button>
                    <button type="button" className="cm-btn cm-btn-primary" onClick={handleCreateCategory}>Create Category</button>
                  </div>
                </div>
              )}

              {/* Categories & Channels Tree */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(reelm.categories || []).map((cat, catIndex) => (
                  <div key={cat.id} className="cm-category-card">
                    {/* Category Header */}
                    <div className="cm-category-head">
                      <div className="cm-category-left">
                        <span className="cm-category-tag">{cat.type}</span>
                        <span className="cm-category-title">{cat.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(var(--ta-rgb), 0.45)' }}>({(cat.channels || []).length})</span>
                      </div>

                      <div className="cm-category-actions">
                        <button
                          type="button"
                          className="cm-icon-btn"
                          disabled={catIndex === 0}
                          onClick={() => handleMoveCategory(catIndex, catIndex - 1)}
                          title="Move Category Up"
                        >↑</button>
                        <button
                          type="button"
                          className="cm-icon-btn"
                          disabled={catIndex === (reelm.categories || []).length - 1}
                          onClick={() => handleMoveCategory(catIndex, catIndex + 1)}
                          title="Move Category Down"
                        >↓</button>
                        <button
                          type="button"
                          className="cm-icon-btn"
                          onClick={() => setPermModalTarget({ catId: cat.id, isCategory: true, targetName: cat.name })}
                          title="Category Permissions"
                        >🛡️</button>
                        <button
                          type="button"
                          className="cm-icon-btn"
                          onClick={() => { setCreatingChInCatId(cat.id); setNewChType(cat.type || 'text'); setNewChName('') }}
                          title="Add Channel to this Category"
                        >+ Channel</button>
                        {(reelm.categories || []).length > 1 && (
                          <button
                            type="button"
                            className="cm-icon-btn danger"
                            onClick={() => handleDeleteCategory(cat.id)}
                            title="Delete Category"
                          >🗑️</button>
                        )}
                      </div>
                    </div>

                    {/* Inline Create Channel in this Category */}
                    {creatingChInCatId === cat.id && (
                      <div className="cm-inline-editor">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ta)' }}>Add Channel to {cat.name}</span>
                          <button type="button" className="cm-icon-btn" onClick={() => setCreatingChInCatId(null)}>✕</button>
                        </div>
                        <div className="cm-inline-editor-grid">
                          <div className="rm-field-group">
                            <label className="rm-field-label">Channel Name</label>
                            <input
                              className="rm-text-input"
                              placeholder="e.g. general, announcements, voice-chat..."
                              value={newChName}
                              onChange={e => setNewChName(e.target.value)}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleCreateChannel(cat.id); if (e.key === 'Escape') setCreatingChInCatId(null) }}
                            />
                          </div>
                          <div className="rm-field-group">
                            <label className="rm-field-label">Channel Type</label>
                            <select
                              className="rm-role-filter-select"
                              value={newChType}
                              onChange={e => setNewChType(e.target.value)}
                            >
                              <option value="text">💬 Text Channel</option>
                              <option value="voice">🔊 Voice Channel</option>
                              <option value="announcement">📢 Announcement</option>
                              <option value="live">⚡ Live Space</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                          <button type="button" className="cm-btn" onClick={() => setCreatingChInCatId(null)}>Cancel</button>
                          <button type="button" className="cm-btn cm-btn-primary" onClick={() => handleCreateChannel(cat.id)}>Create Channel</button>
                        </div>
                      </div>
                    )}

                    {/* Channels List */}
                    <div className="cm-channel-list">
                      {(cat.channels || []).map((ch, chIndex) => {
                        const isSystemChannel = reelm.announcementChannelId === ch.id
                        const isEditingThis = editingChObj?.chId === ch.id
                        return (
                          <React.Fragment key={ch.id}>
                            <div className="cm-channel-row">
                              <div className="cm-channel-left">
                                <span className="cm-channel-icon">
                                  {ch.type === 'voice' ? '🔊' : ch.type === 'announcement' ? '📢' : ch.type === 'live' ? '⚡' : '#'}
                                </span>
                                <span className="cm-channel-name">{ch.name}</span>
                                <div className="cm-channel-badges">
                                  {isSystemChannel && <span className="cm-badge announcement">System</span>}
                                  {ch.isNsfw && <span className="cm-badge nsfw">18+</span>}
                                  {ch.slowmode > 0 && <span className="cm-badge slowmode">{ch.slowmode}s slowmode</span>}
                                  {ch.type === 'voice' && <span className="cm-badge">Limit: {ch.capacity || '∞'}</span>}
                                </div>
                              </div>

                              <div className="cm-channel-actions">
                                <button
                                  type="button"
                                  className="cm-icon-btn"
                                  disabled={chIndex === 0}
                                  onClick={() => handleMoveChannel(cat.id, chIndex, chIndex - 1)}
                                  title="Move Channel Up"
                                >↑</button>
                                <button
                                  type="button"
                                  className="cm-icon-btn"
                                  disabled={chIndex === (cat.channels || []).length - 1}
                                  onClick={() => handleMoveChannel(cat.id, chIndex, chIndex + 1)}
                                  title="Move Channel Down"
                                >↓</button>
                                <button
                                  type="button"
                                  className="cm-icon-btn"
                                  onClick={() => setEditingChObj(isEditingThis ? null : {
                                    catId: cat.id,
                                    chId: ch.id,
                                    name: ch.name,
                                    topic: ch.topic || '',
                                    slowmode: ch.slowmode || 0,
                                    isNsfw: Boolean(ch.isNsfw),
                                    capacity: ch.capacity || 8
                                  })}
                                  title="Channel Settings"
                                >⚙️</button>
                                <button
                                  type="button"
                                  className="cm-icon-btn"
                                  onClick={() => setPermModalTarget({ catId: cat.id, chId: ch.id, isCategory: false, targetName: ch.name })}
                                  title="Channel Permissions"
                                >🛡️</button>
                                {(cat.channels || []).length > 1 && (
                                  <button
                                    type="button"
                                    className="cm-icon-btn danger"
                                    onClick={() => handleDeleteChannel(cat.id, ch.id)}
                                    title="Delete Channel"
                                  >🗑️</button>
                                )}
                              </div>
                            </div>

                            {/* Channel Settings Inspector */}
                            {isEditingThis && (
                              <div className="cm-inline-editor">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ta)' }}>
                                    Settings: #{ch.name}
                                  </span>
                                  <button type="button" className="cm-icon-btn" onClick={() => setEditingChObj(null)}>✕</button>
                                </div>

                                <div className="cm-inline-editor-grid">
                                  <div className="rm-field-group">
                                    <label className="rm-field-label">Channel Name</label>
                                    <input
                                      className="rm-text-input"
                                      value={editingChObj.name}
                                      onChange={e => setEditingChObj({ ...editingChObj, name: e.target.value })}
                                      placeholder="channel-name"
                                    />
                                  </div>

                                  <div className="rm-field-group">
                                    <label className="rm-field-label">Channel Topic</label>
                                    <input
                                      className="rm-text-input"
                                      value={editingChObj.topic}
                                      onChange={e => setEditingChObj({ ...editingChObj, topic: e.target.value })}
                                      placeholder="Let members know what this channel is for"
                                    />
                                  </div>

                                  {ch.type === 'text' && (
                                    <div className="rm-field-group">
                                      <label className="rm-field-label">Slowmode (Cooldown)</label>
                                      <select
                                        className="rm-role-filter-select"
                                        value={String(editingChObj.slowmode || 0)}
                                        onChange={e => setEditingChObj({ ...editingChObj, slowmode: Number(e.target.value) })}
                                      >
                                        <option value="0">Off (No cooldown)</option>
                                        <option value="5">5 seconds</option>
                                        <option value="10">10 seconds</option>
                                        <option value="30">30 seconds</option>
                                        <option value="60">1 minute</option>
                                        <option value="300">5 minutes</option>
                                        <option value="900">15 minutes</option>
                                        <option value="3600">1 hour</option>
                                      </select>
                                    </div>
                                  )}

                                  {ch.type === 'voice' && (
                                    <div className="rm-field-group">
                                      <label className="rm-field-label">User Limit (Capacity)</label>
                                      <select
                                        className="rm-role-filter-select"
                                        value={String(editingChObj.capacity || 8)}
                                        onChange={e => setEditingChObj({ ...editingChObj, capacity: Number(e.target.value) })}
                                      >
                                        <option value="0">No Limit (∞)</option>
                                        <option value="4">4 Users</option>
                                        <option value="8">8 Users</option>
                                        <option value="12">12 Users</option>
                                        <option value="16">16 Users</option>
                                        <option value="25">25 Users</option>
                                        <option value="50">50 Users</option>
                                      </select>
                                    </div>
                                  )}

                                  <div className="rm-field-group" style={{ justifyContent: 'center' }}>
                                    <label className="rm-field-label">Age Restriction</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                      <button
                                        type="button"
                                        className={`cust-toggle${editingChObj.isNsfw ? ' cust-toggle-on' : ''}`}
                                        onClick={() => setEditingChObj({ ...editingChObj, isNsfw: !editingChObj.isNsfw })}
                                      >
                                        <span className="cust-toggle-knob" />
                                      </button>
                                      <span style={{ fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.7)' }}>
                                        18+ Age Restricted Channel
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                                  <button type="button" className="cm-btn" onClick={() => setEditingChObj(null)}>Cancel</button>
                                  <button type="button" className="cm-btn cm-btn-primary" onClick={handleSaveChannelDetails}>Save Channel</button>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        )
                      })}

                      {(cat.channels || []).length === 0 && (
                        <p className="rs-empty" style={{ margin: '6px 8px' }}>No channels in this category yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Global Voice Settings */}
              <div className="rs-section" style={{ marginTop: 10 }}>
                <div className="rs-section-header">
                  <span className="rs-section-title">Voice Channels Behavior</span>
                </div>
                <div className="rs-channel-select-row">
                  <div>
                    <span className="rs-channel-select-label">Auto-join on click</span>
                    <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'rgba(var(--ta-rgb), 0.45)' }}>
                      Members join a voice channel instantly when clicked in the channel list.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`cust-toggle${reelm.autoJoinVoice !== false ? ' cust-toggle-on' : ''}`}
                    onClick={() => onUpdate({ ...reelm, autoJoinVoice: reelm.autoJoinVoice === false ? true : false })}
                  >
                    <span className="cust-toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Permission Modal if open */}
              {permModalTarget && (
                <ChannelPermissionsModal
                  reelm={reelm}
                  target={permModalTarget}
                  onClose={() => setPermModalTarget(null)}
                  onSave={next => onUpdate(next)}
                />
              )}
            </div>
          )}

          {activeTab === 'integrations' && (
            <IntegrationsTab
              reelm={reelm}
              channels={(reelm.categories || []).flatMap(c => c.channels || [])}
            />
          )}

        </div>
      </div>
    </div>
  )
}

export default ReelmSettings
