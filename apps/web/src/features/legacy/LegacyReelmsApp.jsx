import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getT, LANGUAGES, LanguageContext, useT } from '../../i18n'
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation'
import EmojiPickerReact, { EmojiStyle } from 'emoji-picker-react'
import ReactDOM from 'react-dom'
import {
  isElectron,
  electronSignIn,
  electronRegister,
  electronSignOut,
  electronOnAuthStateChanged,
  getElectronCurrentUser,
  electronSignInWithGoogle,
  electronCompleteGoogleAuth,
} from '../../electronAuth'
import {
  webSignIn,
  webRegister,
  webSignOut,
  webOnAuthStateChanged,
  getWebCurrentUser,
  webSignInWithGoogle,
} from '../../webAuth'
import reelmsLogo from '../../assets/icons/reelms-logo.svg'
import newIcon from '../../assets/icons/new-icon.svg'
import settingsIcon from '../../assets/icons/settings-icon.svg'
import feedIcon from '../../assets/icons/feed-icon.svg'
import articlesIcon from '../../assets/icons/articles-icon.svg'
import forumsIcon from '../../assets/icons/forums-icon_reelms.svg'
import readyreelmIcon from '../../assets/icons/readyreelm-icon.svg'
import newdmIcon from '../../assets/icons/newdm-icon.svg'
import newgroupIcon from '../../assets/icons/newgroup-icon.svg'
import notificationIcon from '../../assets/icons/notification-icon_reelms.svg'
import friendsIcon from '../../assets/icons/friends-icon_reelms.svg'
import avatarUIcon from '../../assets/icons/avataru-icon.svg'
import channelGeneralIcon from '../../assets/icons/channel-general.svg'
import channelTextIcon from '../../assets/icons/channel-text.svg'
import channelMultimediaIcon from '../../assets/icons/channel-multimedia.svg'
import channelLiveactionIcon from '../../assets/icons/channel-liveaction.svg'
import discoverIcon from '../../assets/icons/discover-icon.svg'
import sendIcon from '../../assets/icons/send.svg'
import intelligenceIcon from '../../assets/icons/intelligence-icon.svg'
import messagesIcon from '../../assets/icons/messages-icon.svg'
import likePostIcon from '../../assets/icons/likepost-icon_reelms.svg'
import commentPostIcon from '../../assets/icons/commentpost-icon.svg'
import resharePostIcon from '../../assets/icons/resharepost-icon_reelms.svg'
import forwardPostIcon from '../../assets/icons/forwardpost-icon_reelms.svg'
import { getApiBaseUrl, getPublicWebUrl } from '../../config/api'
import './LegacyReelmsApp.css'
import { RichMessageRenderer, parseRichText } from '../rich-message/RichMessageRenderer'
import { SpoilerMedia } from '../rich-message/SpoilerMedia'
import { RichMessageComposerToolbar } from '../rich-message/RichMessageComposer'
import { SEMANTIC_COLORS, SEMANTIC_COLOR_MAP, SUPPORTED_LANGUAGES } from '../rich-message/richMessageTokens'
import '../rich-message/richMessage.css'
import { fetchVoiceToken, createLivekitSession } from '../voice/livekitManager.js'
import { DiscordEmbedCard } from '../chat/DiscordEmbedCard.jsx'
import { QuickSwitcherModal } from '../quick-switcher/QuickSwitcherModal.jsx'
import { ReelmsInsights } from '../insights/ReelmsInsights.jsx'
import { getCachedMessages, saveCachedMessages, enqueueOutboxMessage, flushOutbox, isAppOnline } from '../offline/offlineQueue.js'
import {
  IntelligenceIcon,
  SendIcon,
  EyeIcon,
  AppleIcon,
  GoogleIcon,
  PencilIcon,
  InstagramIcon,
  XIcon,
  TikTokIcon,
  LinkedInIcon,
  WhatsAppIcon,
  DiscordSocialIcon,
  SnapchatIcon,
  CustomLinkIcon,
  SpotifyIcon,
  MaskIcon,
  ReelmsLogoOutlineIcon,
} from './components/icons/AppIcons.jsx'
import { AuditLogTab, AuditLogView, BanListView } from './components/moderation/AuditLogTab.jsx'
import { SignInScreen, DatePicker, AuthLanguagePicker, LegacyAuthDownloadCta } from './components/auth/SignInScreen.jsx'
import { MediaGalleryPanel } from '../chat/components/MediaGalleryPanel.jsx'
import {
  extractYouTubeId,
  renderMentions,
  rgbToHex,
  serializeRichNode,
  serializeRichEditor,
  editorHasFormatting,
  linkifyLegacyText,
  mentionNodes,
  parseRich,
  renderRichMessage,
} from '../chat/utils/richTextRenderer.jsx'
import { VoiceMessage, getVoiceAudioCtx, VOICE_SPEEDS, VOICE_WAVE_BARS } from '../chat/components/VoiceMessage.jsx'
import { PollCard, formatPollTimeLeft } from '../chat/components/PollCard.jsx'
import { VirtualMessageList } from '../chat/components/VirtualMessageList.jsx'
import { SpatialRoom } from '../chat/components/SpatialRoom.jsx'
import { ModInboxPanel } from '../chat/components/ModInboxPanel.jsx'
import {
  ROLE_PALETTE,
  REELM_PERMISSION_OPTIONS,
  DISCORD_ROLE_PERMISSION_SECTIONS,
  REELM_ELEVATED_ROLE_RE,
  CHANNEL_OVERRIDE_PERMISSIONS,
  isManagerRoleClient,
  roleHasPermissionClient,
  normalizeRolePermissionsClient,
  normalizeRoleForClient,
  getRoleOrderIndex,
  getOrderedReelmRolesClient,
  getMemberRoleIdsClient,
  getPrimaryRoleForMemberClient,
  isMainAdminMemberClient,
  canActOnReelmMemberClient,
  buildReelmMemberGroupsClient,
  getReelmPermissionSetClient,
  hasReelmPermissionClient,
  canOpenReelmSettingsClient,
  getReelmTemplates,
  isDefaultCommunity,
  getCommunityMemberLevel,
} from '../reelm/utils/reelmPermissionUtils.js'
import { ReelmInfoMenu, formatReelmDate } from '../reelm/components/ReelmInfoMenu.jsx'
import { IntegrationsTab } from '../reelm/components/IntegrationsTab.jsx'
import { ChannelPermissionsModal } from '../reelm/components/ChannelPermissionsModal.jsx'
import { ReelmSettings } from '../reelm/components/ReelmSettings.jsx'
import { ARTICLE_CATEGORIES } from '../articles/constants/articleConstants.js'
import { ArticleFloatingToolbar } from '../articles/components/ArticleFloatingToolbar.jsx'
import { ArticleEditor } from '../articles/components/ArticleEditor.jsx'
import { ArticleView } from '../articles/components/ArticleView.jsx'
import { articleReadTime } from '../articles/utils/articleUtils.js'
import { FeedPage } from '../feed/components/FeedPage.jsx'
import {
  getArticles, saveArticle, updateArticle, deleteArticle,
  getArticleDrafts, saveArticleDraft, deleteArticleDraft,
  getThreads, saveThread, updateThread, deleteThread,
  getNews, saveNews, updateNews, deleteNews,
  timeAgo, formatPostDate
} from '../feed/utils/feedStorageUtils.js'
import { getPersonPhoto, getPersonCover, getUploadedMediaUrl, firstMediaUrl, normalizeMediaUrl, uploadProfileImageFile, prepareProfileImageUpload } from './utils/mediaUtils.js'
import { parseDeviceInfo } from './utils/deviceUtils.js'
import { _hexToHsl, makeIconFilter, rgbArrayFrom, rgbCssValue, hexToRgb, hslToHex } from './utils/colorUtils.js'
import { THEMES, MIDNIGHT_ACCENTS, SUNLIGHT_ACCENTS, DEFAULT_CUSTOMIZATION, CLASSIC_GREETINGS, STATUS_COLORS, isActiveStatus, capBadge } from './constants/themeConstants.js'
import { buildProfileThemeStyle, normalizeFriendProfileTarget, STATUS_OPTIONS_LIST, BOT_BIO_KEY } from './utils/profileUtils.js'
import { ReelmsCustomSelect, PillSelect } from './components/ui/ReelmsSelects.jsx'
import { EnvToggle, EnvSelect, EnvSlider, EnvInlineSlider } from './components/settings/SettingsControls.jsx'
import { EnvironmentPanel } from './components/settings/EnvironmentPanel.jsx'
import { CustomizationPanel } from './components/settings/CustomizationPanel.jsx'
import { AccessibilityPanel } from './components/settings/AccessibilityPanel.jsx'
import { AuthorizedAppsPanel } from './components/settings/AuthorizedAppsPanel.jsx'
import { PrivacySafetyPanel, BlockedAccountsSection, ActiveSessionsSection, getCurrentSessionId } from './components/settings/PrivacySafetyPanel.jsx'
import { CompanionsPanel, REELM_RADIO_BOT, REELMS_INTELLIGENCE_BOT } from './components/settings/CompanionsPanel.jsx'
import { HelpCenterPanel } from './components/settings/HelpCenterPanel.jsx'
import { AccountSettingsPanel } from './components/settings/AccountSettingsPanel.jsx'
import { CachedProfileImage, CachedProfileCover, canCacheProfileMedia, resolveCachedProfileMedia } from './components/profile/CachedProfileMedia.jsx'
import { ActivityBadge, ActivitySetterModal, ACTIVITY_TYPES } from './components/profile/ActivityModal.jsx'
import { ProfileMediaCropModal } from './components/profile/ProfileMediaCropModal.jsx'
import { ProfilePopup } from './components/profile/ProfilePopup.jsx'
import { FriendProfilePopup } from './components/profile/FriendProfilePopup.jsx'
import { FullProfilePage } from './components/profile/FullProfilePage.jsx'

const BACKEND_URL = getApiBaseUrl()
const PROFILE_LOOKUP_CACHE_TTL_MS = 60_000

import {
  REELM_CACHE,
  patchReelmCache,
  scheduleReelmPersist,
  scheduleUserPersist,
  scheduleAppPersist,
  userBootstrap,
  userGetDoc,
  userPutDoc,
  loadReelmDocuments,
  connectReelmsSocket,
  socketJoinReelm,
  socketLeaveReelm,
  socketJoinChannel,
  socketLeaveChannel,
  socketEmitVoicePosition,
  socketVcJoin,
  socketVcLeave,
  socketVcHeartbeat,
  socketVcSignal,
  socketVcBroadcast,
  socketVcKick,
  socketVcMove,
  socketVcInvite,
  socketVcModeratorMute,
  socketRequestVcCounts,
  socketSetPresenceStatus,
  socketEmitTyping,
  socketEmitTypingStop,
  socketEmitReadReceipt,
  messagesGet,
  messageSend,
  messageDelete,
  messageEdit,
  messageDeleteConversation,
  pinsGet,
  pinSet,
  reactionsGet,
  reactionsToggle,
  socialNotify,
  socialFriendRequest,
  socialFriendAccept,
  socialFriendReject,
  socialRemoveFriend,
  socialBlockUser,
  socialUnblockUser,
  socialMessageRequest,
  recordUserSession,
  touchUserSession,
  appGetDoc,
  appPutDoc,
  reelmGetDoc,
  reelmPutDoc,
  modInboxGet,
  modReportSend,
  reelmByCode,
  createReelmRemote,
  joinReelmByCode,
  adminAllReelms,
  discoverReelms,
  requestJoinReelm,
  approveJoinReelm,
  rejectJoinReelm,
  inviteReelmFriend,
  acceptReelmInvite,
  rejectReelmInvite,
  banReelmMember,
  timeoutReelmMember,
  untimeoutReelmMember,
  unbanReelmMember,
  leaveReelmRemote,
  closeReelmRemote,
  userProfilePut,
  userProfilePatch,
  authChangePassword,
  userProfileGetById,
  userProfileDelete,
  userByUsername,
  // userByEmail, // unused
  userCheckUsername,
  userCheckEmail,
  usersList,
  getIdToken,
  feedbackSend,
  aiChat,
  aiSummarize,
  aiModerate,
  aiGenerate,
  aiAddBotToReelm,
  aiGetBotStatus,
  aiGetStatus,
  getVoiceIceServers,
  mediaUploadToS3,
  e2eeRegisterKey,
  e2eeGetPublicKey,
} from '../../reelmsAwsClient'
import { getOrCreateKeyPair, getKeyPair, decryptFromSender, getSentPlaintext } from '../../lib/e2ee'
import { seedModerationAccount, MODERATION_ACCOUNT_ID, isModerationSystemUser } from '../../reelmsModerationAccount'
import { moderateText } from '../../moderationClient'
import { playSound, applySoundSettings, previewSound, preloadSounds, SOUND_CATEGORIES, SOUND_DEFAULTS } from '../../soundManager'
import { DesktopDownloadButton, DesktopDownloadSettingsPanel } from '../desktop-download/index.js'
import { useAuthSession as useCentralAuthSession } from '../../app/providers/AuthSessionProvider.jsx'
import SpotifyPlayer from '../spotify/SpotifyPlayer.jsx'

const isReelmsSystemUid = (value) => isModerationSystemUser(value) || String(value || '') === String(MODERATION_ACCOUNT_ID)
const isReelmsSystemChat = (chat) => {
  if (!chat || chat.type !== 'dm') return false
  const peerId = String(chat.friendId || chat.userId || '')
  const chatId = String(chat.id || chat.convId || '')
  const dmParticipants = chatId.startsWith('dm_') ? chatId.slice(3).split('_').filter(Boolean) : []
  return isReelmsSystemUid(peerId)
    || dmParticipants.some(isReelmsSystemUid)
    || chat.isSystem === true
    || chat.system === true
    || chat.systemLocked === true
    || chat.readOnly === true
    || String(chat.username || '').toLowerCase() === 'reelms-system'
    || String(chat.name || chat.displayName || '').toLowerCase() === 'reelms system'
}

import { SEED_REELMS } from './seedReelms.js'

// Module-level drag tracker — outside React so it's never stale in any closure
let _barDragId = null

function formatEventTime(isoOrTimestamp) {
  if (!isoOrTimestamp) return ''
  const d = new Date(isoOrTimestamp)
  if (isNaN(d.getTime())) return String(isoOrTimestamp)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1)
  const isTomorrow = d.toDateString() === tmr.toDateString()
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Today · ${timePart}`
  if (isTomorrow) return `Tomorrow · ${timePart}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${timePart}`
}

function SettingsIcon({ isNight = false }) {
  const [hovered, setHovered] = useState(false)
  const transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  const pillFill = isNight ? 'var(--ta)' : '#0c0c20'
  const dotFill  = isNight ? 'var(--tb)' : 'var(--ta)'
  return (
    <svg
      viewBox="0 0 360 360" width="28" height="28"
      style={{ display: 'block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <g>
        <path fill={pillFill} d="M 284.652344 0 C 326.394531 0 360 33.605469 360 75.347656 C 360 117.09375 326.394531 150.699219 284.652344 150.699219 L 75.347656 150.699219 C 33.605469 150.699219 0 117.09375 0 75.347656 C 0 33.605469 33.605469 0 75.347656 0 Z"/>
        <circle
          cx="284.652344" cy="75.347656" r="41.861328"
          style={{ fill: dotFill, transition, transform: hovered ? 'translateX(-16.3px)' : 'translateX(0)' }}
        />
      </g>
      <g>
        <path fill={pillFill} d="M 284.652344 209.304688 C 326.394531 209.304688 360 242.910156 360 284.652344 C 360 326.394531 326.394531 360 284.652344 360 L 75.347656 360 C 33.605469 360 0 326.394531 0 284.652344 C 0 242.910156 33.605469 209.304688 75.347656 209.304688 Z"/>
        <circle
          cx="75.347656" cy="284.652344" r="41.861328"
          style={{ fill: dotFill, transition, transform: hovered ? 'translateX(16.3px)' : 'translateX(0)' }}
        />
      </g>
    </svg>
  )
}

const iconThemeFilter       = makeIconFilter('#b99887')
const categoryIconFilter    = iconThemeFilter
const headerIconThemeFilter = iconThemeFilter
const newIconThemeFilter    = iconThemeFilter

const FLYING_ROOM_DURATIONS = [
  { label: '15 min', localeKey: 'duration_15m', ms: 15 * 60 * 1000 },
  { label: '30 min', localeKey: 'duration_30m', ms: 30 * 60 * 1000 },
  { label: '1h',     localeKey: 'duration_1h',  ms: 60 * 60 * 1000 },
  { label: '3h',     localeKey: 'duration_3h',  ms: 3 * 60 * 60 * 1000 },
  { label: '6h',     localeKey: 'duration_6h',  ms: 6 * 60 * 60 * 1000 },
  { label: '12h',    localeKey: 'duration_12h', ms: 12 * 60 * 60 * 1000 },
  { label: '24h',    localeKey: 'duration_24h', ms: 24 * 60 * 60 * 1000 },
  { label: '48h',    localeKey: 'duration_48h', ms: 48 * 60 * 60 * 1000 },
]

function formatTimeLeft(expiresAt) {
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'expired'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
}

function sameLegacyAuthUser(a, b) {
  if (!a && !b) return true
  if (!a || !b) return false
  return String(a.uid || '') === String(b.uid || '') && String(a.email || '') === String(b.email || '')
}

function stableLegacyProfileKey(profile) {
  if (!profile) return ''
  const id = profile.id || profile.uid || ''
  return JSON.stringify({
    id: String(id),
    uid: String(profile.uid || id),
    email: String(profile.email || profile.contact || ''),
    username: String(profile.username || ''),
    name: String(profile.name || profile.displayName || ''),
    photo: String(getPersonPhoto(profile) || ''),
    cover: String(getPersonCover(profile) || ''),
    bio: String(profile.bio || ''),
    profileTheme: JSON.stringify(profile.profileTheme || profile.customization || null)
  })
}

function sameLegacyProfile(a, b) {
  return stableLegacyProfileKey(a) === stableLegacyProfileKey(b)
}



function getReelmChannels(reelm) {
  return (Array.isArray(reelm?.categories) ? reelm.categories : [])
    .flatMap(category => Array.isArray(category?.channels) ? category.channels : [])
    .filter(Boolean)
}

function findReelmChannel(reelm, channelId) {
  const id = String(channelId || '')
  if (!reelm || !id) return null
  return getReelmChannels(reelm).find(channel => String(channel?.id || '') === id) || null
}

function composeReelmMsgKey(reelm, channel) {
  const validChannel = findReelmChannel(reelm, channel?.id)
  if (!reelm?.id || !validChannel?.id) return null
  return `${reelm.id}_${validChannel.id}`
}

function createClientMessageId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function canManageReelmClient(reelm, uid) {
  if (!reelm || !uid) return false
  if (String(reelm.ownerId || '') === String(uid)) return true
  const member = (Array.isArray(reelm.members) ? reelm.members : []).find(m => String(m.userId || m.id || '') === String(uid))
  if (!member) return false
  const roleIds = new Set((member.roleIds || []).map(String))
  return (Array.isArray(reelm.roles) ? reelm.roles : []).some(role => roleIds.has(String(role.id)) && isManagerRoleClient(role))
}

function CommunityDoodlePattern() {
  return (
    <svg
      className="reelm-community-doodles"
      viewBox="0 0 240 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g stroke="#383835" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Upper doodles (opacity ~0.50) */}
        <g opacity="0.50">
          {/* Game controller (top-left) */}
          <g transform="translate(14, 12)">
            <rect x="0" y="2" width="20" height="12" rx="4" />
            <line x1="4" y1="8" x2="8" y2="8" />
            <line x1="6" y1="6" x2="6" y2="10" />
            <circle cx="14.5" cy="6.5" r="0.8" fill="#383835" />
            <circle cx="16.5" cy="9.5" r="0.8" fill="#383835" />
          </g>

          {/* Sparkle (top left-mid) */}
          <g transform="translate(46, 10)">
            <path d="M4 0 Q4 5 0 5 Q4 5 4 10 Q4 5 8 5 Q4 5 4 0Z" />
            <circle cx="10" cy="1" r="0.8" fill="#383835" />
          </g>

          {/* Headphones (top left-balanced from cat) */}
          <g transform="translate(68, 12)">
            <path d="M2 11 A7.5 7.5 0 0 1 17 11" />
            <rect x="0" y="9.5" width="3.2" height="5.5" rx="1.5" />
            <rect x="15.8" y="9.5" width="3.2" height="5.5" rx="1.5" />
          </g>

          {/* Planet with ring (top right-balanced from cat) */}
          <g transform="translate(154, 10)">
            <circle cx="8" cy="8" r="5.5" />
            <ellipse cx="8" cy="8" rx="10" ry="3" transform="rotate(-20 8 8)" />
          </g>

          {/* Star sparkle (top right-mid) */}
          <g transform="translate(186, 10)">
            <path d="M4 0 Q4 5 0 5 Q4 5 4 10 Q4 5 8 5 Q4 5 4 0Z" />
            <circle cx="-2" cy="1" r="0.8" fill="#383835" />
          </g>

          {/* Rocket (top-right) */}
          <g transform="translate(208, 10) rotate(15)">
            <path d="M7 0 C11 3.5 13 9 13 13 L1 13 C1 9 3 3.5 7 0 Z" />
            <circle cx="7" cy="7" r="1.6" />
            <path d="M1 10 L-1.5 13 L1 13 Z" />
            <path d="M13 10 L15.5 13 L13 13 Z" />
          </g>
        </g>

        {/* Middle doodles (opacity ~0.46) */}
        <g opacity="0.46">
          {/* Chat bubble (mid-left) */}
          <g transform="translate(12, 44)">
            <path d="M0 3.5 C0 1.6 1.6 0 3.5 0 L14.5 0 C16.4 0 18 1.6 18 3.5 L18 10.5 C18 12.4 16.4 14 14.5 14 L5.5 14 L1 17 L1.8 14 C0.7 14 0 12.9 0 11.8 Z" />
            <circle cx="5" cy="7" r="0.8" fill="#383835" />
            <circle cx="9" cy="7" r="0.8" fill="#383835" />
            <circle cx="13" cy="7" r="0.8" fill="#383835" />
          </g>

          {/* Lightning bolt (mid-left) */}
          <g transform="translate(42, 44)">
            <path d="M6 0 L0 10 L6 10 L2 18 L12 7 L6 7 Z" />
          </g>

          {/* Music single note (mid left) */}
          <g transform="translate(68, 46)">
            <circle cx="3.5" cy="10" r="2.8" />
            <line x1="6.3" y1="10" x2="6.3" y2="1.5" />
            <path d="M6.3 1.5 Q10 1.5 11 4.5" />
          </g>

          {/* Coffee cup with steam (mid right) */}
          <g transform="translate(154, 44)">
            <path d="M2 4.5 L13 4.5 L12 12.5 C12 14 10.5 15 9 15 L5 15 C3.5 15 2 14 2 12.5 Z" />
            <path d="M13 6.5 C15 6.5 16 7.5 16 9 C16 10.5 15 11.5 13 11.5" />
            <path d="M4.5 1.5 Q5.5 0 6.5 1.5" strokeWidth="1" />
            <path d="M8.5 1.5 Q9.5 0 10.5 1.5" strokeWidth="1" />
          </g>

          {/* Diamond gem (mid-right) */}
          <g transform="translate(186, 46)">
            <polygon points="4,0 12,0 16,4.5 8,14 0,4.5" />
            <line x1="0" y1="4.5" x2="16" y2="4.5" />
            <line x1="4" y1="0" x2="8" y2="14" />
            <line x1="12" y1="0" x2="8" y2="14" />
          </g>

          {/* Star & dot (mid-right) */}
          <g transform="translate(216, 44)">
            <polygon points="6,0 7.8,4.2 12,4.8 8.8,7.6 9.6,12 6,9.8 2.4,12 3.2,7.6 0,4.8 4.2,4.2" />
          </g>
        </g>

        {/* Lower doodles - behind / around name area (soft opacity ~0.22) */}
        <g opacity="0.22">
          {/* Camera (bottom-left) */}
          <g transform="translate(18, 76)">
            <rect x="0" y="3.5" width="16" height="11.5" rx="2.5" />
            <circle cx="8" cy="9.2" r="3" />
            <path d="M4.5 3.5 L6.2 1 L9.8 1 L11.5 3.5" />
          </g>

          {/* Heart (bottom-left) */}
          <path d="M50 78 C50 74.5 53.5 74.5 55.5 76.5 C57.5 74.5 61 74.5 61 78 C61 82.5 55.5 86.5 55.5 86.5 C55.5 86.5 50 82.5 50 78 Z" />

          {/* Cloud (bottom left-mid) */}
          <path d="M84 88 A3.5 3.5 0 0 1 87.5 84.5 A5.5 5.5 0 0 1 97.5 84.5 A3.5 3.5 0 0 1 100 88 L84 88 Z" />

          {/* Lightbulb (bottom right-mid) */}
          <g transform="translate(138, 75)">
            <path d="M3.5 7 C3.5 3 10.5 3 10.5 7 C10.5 9.2 8.8 10 8.8 11.5 L5.2 11.5 C5.2 10 3.5 9.2 3.5 7 Z" />
            <line x1="5.2" y1="13.5" x2="8.8" y2="13.5" />
          </g>

          {/* Double music notes (bottom-right) */}
          <g transform="translate(172, 76)">
            <circle cx="2.5" cy="9.5" r="2.2" />
            <circle cx="11.5" cy="7.5" r="2.2" />
            <line x1="4.7" y1="9.5" x2="4.7" y2="1.5" />
            <line x1="13.7" y1="7.5" x2="13.7" y2="0" />
            <line x1="4.7" y1="1.5" x2="13.7" y2="0" strokeWidth="1.8" />
          </g>

          {/* Target star (bottom-right) */}
          <g transform="translate(208, 76)">
            <circle cx="7" cy="7" r="6" />
            <polygon points="7,2.5 8.8,6 12,7 8.8,8 7,11.5 5.2,8 2,7 5.2,6" fill="#383835" />
          </g>

          {/* Scattered dots in voids */}
          <circle cx="36" cy="74" r="0.8" fill="#383835" />
          <circle cx="74" cy="80" r="0.8" fill="#383835" />
          <circle cx="120" cy="86" r="0.8" fill="#383835" />
          <circle cx="160" cy="80" r="0.8" fill="#383835" />
          <circle cx="198" cy="75" r="0.8" fill="#383835" />
        </g>
      </g>
    </svg>
  )
}

function ReelmsCommunityGlyph({ size = 26, className = 'reelm-community-glyph', style }) {
  return (
    <ReelmsLogoOutlineIcon
      size={size}
      className={className}
      style={{
        color: 'var(--ta, #b99887)',
        ...style,
      }}
    />
  )
}

function normalizeMessageTime(t) {
  if (t instanceof Date) return t
  if (typeof t === 'number') return new Date(t)
  if (typeof t === 'string') {
    const parsed = Number(t)
    if (Number.isFinite(parsed)) return new Date(parsed)
    const d = new Date(t)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date(0)
}

function normalizeMessageForClient(msg) {
  const id = msg?.id != null ? String(msg.id) : createClientMessageId()
  return { ...msg, id, time: normalizeMessageTime(msg?.time) }
}

function appendUniqueMessage(prev, msgKey, msg) {
  const existing = prev[msgKey] || []
  const nextMsg = normalizeMessageForClient(msg)
  if (existing.some(m => String(m?.id) === String(nextMsg.id))) return prev
  return { ...prev, [msgKey]: [...existing, nextMsg] }
}

function dedupeMessagesForRender(list) {
  const seen = new Set()
  const out = []
  ;(Array.isArray(list) ? list : []).forEach((msg) => {
    const key = String(msg?.id ?? '')
    if (key && seen.has(key)) return
    if (key) seen.add(key)
    out.push(normalizeMessageForClient(msg))
  })
  return out
}

function stableDocKey(value) {
  try { return JSON.stringify(value ?? null) }
  catch { return String(value ?? '') }
}

function sameDocValue(a, b) {
  return stableDocKey(a) === stableDocKey(b)
}

function sameMessageList(a, b) {
  const left = dedupeMessagesForRender(a)
  const right = dedupeMessagesForRender(b)
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    const lm = left[i] || {}
    const rm = right[i] || {}
    const lt = lm.time instanceof Date ? lm.time.getTime() : Number(lm.time || 0)
    const rt = rm.time instanceof Date ? rm.time.getTime() : Number(rm.time || 0)
    if (
      String(lm.id || '') !== String(rm.id || '') ||
      String(lm.text || '') !== String(rm.text || '') ||
      String(lm.mediaUrl || '') !== String(rm.mediaUrl || '') ||
      String(lm.sender?.id || lm.userId || '') !== String(rm.sender?.id || rm.userId || '') ||
      Number(lt || 0) !== Number(rt || 0)
    ) return false
  }
  return true
}

function DashboardScreen({ onLogOut, onShake, language, onLanguageChange, updateAvailable, setUpdateAvailable: _setUA, pushToast }) {
  const navigate = useNavigate()
  const t = useT()
  const authSession = useCentralAuthSession()
  const [authUser, setAuthUser] = useState(() =>
    authSession.authUser || (isElectron ? getElectronCurrentUser() : getWebCurrentUser())
  )

  useEffect(() => {
    if (authSession.authUser) {
      setAuthUser(prev => sameLegacyAuthUser(prev, authSession.authUser) ? prev : authSession.authUser)
    } else if (authSession.status === 'guest') {
      setAuthUser(prev => prev == null ? prev : null)
    }
  }, [authSession.authUser, authSession.status])

  const [currentUser, setCurrentUser] = useState(() => authSession.profile || null)
  const uid = currentUser?.id || currentUser?.uid || authUser?.uid || 'guest'

  useEffect(() => {
    if (!authUser?.uid) {
      if (authSession.status === 'hydrating' || authSession.status === 'loading-profile' || authSession.status === 'checking') return undefined
      setCurrentUser(prev => prev == null ? prev : null)
      return undefined
    }

    let cancelled = false

    if (authSession.profile && (authSession.profile.id || authSession.profile.uid) === authUser.uid) {
      setCurrentUser(prev => sameLegacyProfile(prev, authSession.profile) ? prev : authSession.profile)
    }

    userProfileGetById(authUser.uid).then(data => {
      if (cancelled) return
      if (data) {
        setCurrentUser(prev => sameLegacyProfile(prev, data) ? prev : data)
        return
      }

      const fallback = authSession.profile || currentUser || {
        uid: authUser.uid,
        id: authUser.uid,
        email: authUser.email || '',
        contact: authUser.email || '',
        username: authUser.email ? authUser.email.split('@')[0] : 'user',
        displayName: authUser.email ? authUser.email.split('@')[0] : 'User',
        name: authUser.email ? authUser.email.split('@')[0] : 'User',
        photo: null,
        avatar: ''
      }

      setCurrentUser(prev => sameLegacyProfile(prev, fallback) ? prev : fallback)
      pushToast?.({
        id: 'profile-fallback',
        text: 'Profil bilgisi geçici olarak doğrulanamadı; oturum korunuyor.'
      })
    }).catch(() => {
      if (cancelled) return
      const fallback = authSession.profile || currentUser
      if (fallback) {
        setCurrentUser(prev => sameLegacyProfile(prev, fallback) ? prev : fallback)
        return
      }
      pushToast?.({
        id: 'profile-load-failed',
        text: 'Profil bilgisi yüklenemedi; tekrar denenecek.'
      })
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid, authSession.profile?.id, authSession.profile?.uid, authSession.status])

  const [isBgLight, setIsBgLight] = useState(false)
  const [voiceIceServers, setVoiceIceServers] = useState(null)

  useEffect(() => {
    let alive = true
    getVoiceIceServers().then((servers) => {
      if (alive && Array.isArray(servers) && servers.length) setVoiceIceServers(servers)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!uid || uid === 'guest') return
    getOrCreateKeyPair().then(kp => e2eeRegisterKey(kp.publicKey)).catch(() => {})
  }, [uid])

  const normalizeProfileUpdates = (updates = {}) => {
    const next = { ...(updates || {}) }
    const photo = getPersonPhoto(next)
    if (Object.prototype.hasOwnProperty.call(next, 'photo') || photo) {
      next.photo = photo || null
      next.profilePhoto = photo || null
      next.photoURL = photo || null
      next.avatar = photo || null
      next.image = photo || null
      next.imageUrl = photo || null
      next.userPhoto = photo || null
    }
    const cover = getPersonCover(next)
    if (Object.prototype.hasOwnProperty.call(next, 'cover') || cover) {
      next.cover = cover || null
      next.coverImage = cover || null
      next.coverUrl = cover || null
      next.headerImage = cover || null
      next.banner = cover || null
    }
    return next
  }

  const updateUserData = (updates) => {
    const normalized = normalizeProfileUpdates(updates)
    const prevValues = {}
    const base = currentUser || {}
    Object.keys(normalized).forEach((k) => { prevValues[k] = base[k] })
    setCurrentUser(prev => ({ ...(prev || {}), ...normalized }))
    const pending = userProfilePatch(normalized)
    pending.catch((err) => {
      console.warn('profile patch failed:', err)
      // Roll back the optimistic update so the UI matches the server.
      setCurrentUser(prev => ({ ...(prev || {}), ...prevValues }))
    })
    return pending
  }

  const [customization, setCustomization] = useState(() => ({ ...DEFAULT_CUSTOMIZATION }))
  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    let cancel = false
    try {
      const cached = localStorage.getItem(`reelms:customization:${uid}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && typeof parsed === 'object') setCustomization(prev => sameDocValue(prev, { ...DEFAULT_CUSTOMIZATION, ...parsed }) ? prev : { ...DEFAULT_CUSTOMIZATION, ...parsed })
      }
    } catch {}
    Promise.all([userGetDoc('customization'), userGetDoc('bg_image'), userGetDoc('body_font')])
      .then(([cust, bg, bf]) => {
        if (cancel) return
        const base = cust && typeof cust === 'object' ? cust : {}
        const resolvedBg = (typeof bg === 'string' && bg) ? bg : null
        const nextCustomization = {
          ...DEFAULT_CUSTOMIZATION,
          ...base,
          bgImage: resolvedBg,
        }
        setCustomization(prev => sameDocValue(prev, nextCustomization) ? prev : nextCustomization)
        try { localStorage.setItem(`reelms:customization:${uid}`, JSON.stringify(nextCustomization)) } catch {}
        if (typeof bf === 'string' && bf) setBodyFont(prev => prev === bf ? prev : bf)
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [uid])

  useEffect(() => {
    if (!uid || uid === 'guest') return
    userGetDoc('accessibility').then(d => {
      if (!d || typeof d !== 'object') return
      const el = document.documentElement
      if (d.reducedMotion) el.classList.add('a11y-reduced-motion')
      if (d.messageSpacing) el.classList.add('a11y-msg-spacing')
      if (d.highContrast) el.classList.add('a11y-high-contrast')
      if (d.reduceTransparency) el.classList.add('a11y-reduce-transparency')
      if (d.underlineLinks) el.classList.add('a11y-underline-links')
      if (d.fontScale && d.fontScale !== 1) el.style.fontSize = (16 * d.fontScale) + 'px'
    }).catch(() => {})
  }, [uid])

  const [env, setEnv] = useState({})
  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    let cancel = false
    const timer = setTimeout(() => {
      if (cancel) return
      userGetDoc('environment').then((d) => {
        if (cancel) return
        setEnv(d && typeof d === 'object' ? d : {})
      }).catch(() => {})
    }, 1200)
    return () => { cancel = true; clearTimeout(timer) }
  }, [uid])
  const v = (key, def) => env[key] ?? def

  const updateCustomization = (updates) => {
    setCustomization(prev => {
      const updated = { ...prev, ...updates }
      const { bgImage: _b, ...toSave } = updated
      toSave.bgImage = null
      try { if (uid && uid !== 'guest') localStorage.setItem(`reelms:customization:${uid}`, JSON.stringify(updated)) } catch {}
      scheduleUserPersist('customization', toSave)
      // Keep account customization durable even if the app is closed shortly after a change.
      userPutDoc('customization', toSave).catch(() => {})
      userProfilePatch({ profileTheme: toSave }).catch(() => {})
      if ('bgImage' in updates) {
        const bgVal = (typeof updates.bgImage === 'string' && updates.bgImage) ? updates.bgImage : null
        scheduleUserPersist('bg_image', bgVal)
        userPutDoc('bg_image', bgVal).catch(() => {})
      }
      return updated
    })
  }
  const activeTheme = THEMES.find(t => t.id === customization.themeId) || THEMES[0]
  const effectiveAccent    = customization.customAccent || activeTheme.accent
  const effectiveAccentRgb = customization.customAccent ? hexToRgb(customization.customAccent) : activeTheme.accentRgb
  const effectiveBase      = customization.customBase   || activeTheme.base
  const effectiveBaseRgb   = customization.customBase   ? hexToRgb(customization.customBase)   : activeTheme.baseRgb
  const effectiveTextColor = (() => {
    const tc = customization.customTextColor || 'match_theme'
    if (tc === 'white') return '#ffffff'
    if (tc === 'black') return '#000000'
    if (tc === 'match_theme' || tc === 'theme') {
      return activeTheme.isLight ? activeTheme.accent : effectiveAccent
    }
    return activeTheme.isLight ? '#1c1917' : 'rgba(232, 216, 204, 0.92)'
  })()

  useEffect(() => {
    let cancelled = false
    const src = customization.bgImage
    if (!src) {
      setIsBgLight(false)
      return
    }
    ;(async () => {
      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Background image decode failed'))
          el.src = src
        })
        const canvas = document.createElement('canvas')
        const size = 32
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let sum = 0
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255
          if (a < 0.05) continue
          const r = data[i] / 255
          const g = data[i + 1] / 255
          const b = data[i + 2] / 255
          // Relative luminance (sRGB)
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
          sum += lum
          count++
        }
        const avg = count ? (sum / count) : 0
        if (!cancelled) setIsBgLight(avg > 0.62)
      } catch {
        // Fail open: keep default (dark) text
        if (!cancelled) setIsBgLight(false)
      }
    })()
    return () => { cancelled = true }
  }, [customization.bgImage])

  const [isOnline, setIsOnline] = useState(() => isAppOnline())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      triggerTopTicker({ sender: 'Bağlantı', text: 'Yeniden çevrimiçi oldunuz. Bekleyen mesajlar gönderiliyor...' })
      flushOutbox(messageSend, (msgKey, sentMsgId) => {
        setMessages(prev => {
          const updated = (prev[msgKey] || []).map(m => (String(m.id) === String(sentMsgId) ? { ...m, isQueued: false } : m))
          saveCachedMessages(msgKey, updated)
          return { ...prev, [msgKey]: updated }
        })
      }).catch(() => {})
    }
    const handleOffline = () => {
      setIsOnline(false)
      triggerTopTicker({ sender: 'Çevrimdışı', text: 'İnternet bağlantısı kesildi. Çevrimdışı moddasınız.' })
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    touchUserSession().catch(() => {})
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      touchUserSession().catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [uid])

  useEffect(() => {
    const root = document.documentElement
    if (activeTheme.isLight) {
      root.classList.add('theme-light')
    } else {
      root.classList.remove('theme-light')
    }

    // 1. Birincil Renk (Primary / Base Background)
    root.style.setProperty('--theme-primary', effectiveBase)
    root.style.setProperty('--theme-primary-rgb', effectiveBaseRgb)
    root.style.setProperty('--tb', effectiveBase)
    root.style.setProperty('--tb-rgb', effectiveBaseRgb)

    // 2. İkincil Renk (Secondary / Accent / Vurgu)
    root.style.setProperty('--theme-secondary', effectiveAccent)
    root.style.setProperty('--theme-secondary-rgb', effectiveAccentRgb)
    root.style.setProperty('--ta', effectiveAccent)
    root.style.setProperty('--ta-rgb', effectiveAccentRgb)

    // 3. Üçüncül Renk (Tertiary / Menus, Inputs & Bars)
    const effectiveTertiary = activeTheme.tertiary || '#181416'
    const effectiveTertiaryRgb = activeTheme.tertiaryRgb || '14,12,18'
    const effectiveTertiaryGlass = activeTheme.tertiaryGlass || `rgba(${effectiveTertiaryRgb}, 0.62)`
    root.style.setProperty('--theme-tertiary', effectiveTertiary)
    root.style.setProperty('--theme-tertiary-rgb', effectiveTertiaryRgb)
    root.style.setProperty('--theme-tertiary-glass', effectiveTertiaryGlass)
    root.style.setProperty('--tt', effectiveTertiary)
    root.style.setProperty('--tt-rgb', effectiveTertiaryRgb)
    root.style.setProperty('--tt-glass', effectiveTertiaryGlass)
    root.style.setProperty('--surface-primary', activeTheme.surfacePrimary || effectiveTertiary)

    // 4. Dördüncül Renk (Quaternary)
    const effectiveQuaternary = activeTheme.quaternary || activeTheme.surfaceElevated || '#413732'
    const effectiveQuaternaryRgb = activeTheme.quaternaryRgb || '65,55,50'
    root.style.setProperty('--theme-quaternary', effectiveQuaternary)
    root.style.setProperty('--theme-quaternary-rgb', effectiveQuaternaryRgb)
    root.style.setProperty('--surface-elevated', effectiveQuaternary)

    // 5. Beşincil Renk (Quinary)
    const effectiveQuinary = activeTheme.quinary || activeTheme.surfaceHover || '#4c413b'
    const effectiveQuinaryRgb = activeTheme.quinaryRgb || '76,65,59'
    root.style.setProperty('--theme-quinary', effectiveQuinary)
    root.style.setProperty('--theme-quinary-rgb', effectiveQuinaryRgb)
    root.style.setProperty('--surface-hover', effectiveQuinary)

    root.style.setProperty('--text-fg', effectiveTextColor)
    root.style.setProperty('--border-subtle', activeTheme.borderSubtle || 'rgba(255, 255, 255, 0.06)')
    root.style.setProperty('--border-strong', activeTheme.borderStrong || 'rgba(255, 255, 255, 0.10)')
    if (activeTheme.grainOpacity != null) {
      root.style.setProperty('--grain-opacity', String(activeTheme.grainOpacity))
    } else {
      root.style.removeProperty('--grain-opacity')
    }
    return () => {
      root.classList.remove('theme-light')
      root.style.removeProperty('--theme-primary')
      root.style.removeProperty('--theme-primary-rgb')
      root.style.removeProperty('--tb')
      root.style.removeProperty('--tb-rgb')
      root.style.removeProperty('--theme-secondary')
      root.style.removeProperty('--theme-secondary-rgb')
      root.style.removeProperty('--ta')
      root.style.removeProperty('--ta-rgb')
      root.style.removeProperty('--theme-tertiary')
      root.style.removeProperty('--theme-tertiary-rgb')
      root.style.removeProperty('--theme-tertiary-glass')
      root.style.removeProperty('--tt')
      root.style.removeProperty('--tt-rgb')
      root.style.removeProperty('--tt-glass')
      root.style.removeProperty('--surface-primary')
      root.style.removeProperty('--theme-quaternary')
      root.style.removeProperty('--theme-quaternary-rgb')
      root.style.removeProperty('--surface-elevated')
      root.style.removeProperty('--theme-quinary')
      root.style.removeProperty('--theme-quinary-rgb')
      root.style.removeProperty('--surface-hover')
      root.style.removeProperty('--text-fg')
      root.style.removeProperty('--border-subtle')
      root.style.removeProperty('--border-strong')
      root.style.removeProperty('--grain-opacity')
    }
  }, [effectiveAccent, effectiveAccentRgb, effectiveBase, effectiveBaseRgb, effectiveTextColor, activeTheme])

  const [chats, setChats] = useState([])
  const chatsRef = useRef([])
  useEffect(() => { chatsRef.current = chats }, [chats])
  const [reelms, setReelms] = useState([])
  const reelmsLocalCacheKey = uid && uid !== 'guest' ? `reelms:member-reelms:${uid}` : null
  const [selectedReelm, setSelectedReelm] = useState(null)
  const selectedReelmRef = useRef(null)
  const selectedChannelRef = useRef(null)
  const selectedChatRef = useRef(null)
  const [reelmLoading, setReelmLoading] = useState(false)

  // Instant local cache: prevents the Reelm bar/home list from looking empty while the API/bootstrap round-trip completes.
  useEffect(() => {
    if (!reelmsLocalCacheKey) return
    try {
      const cached = JSON.parse(localStorage.getItem(reelmsLocalCacheKey) || '[]')
      if (Array.isArray(cached) && cached.length && reelmsRef.current.length === 0) setReelms(cached)
    } catch { /* noop */ }
  }, [reelmsLocalCacheKey])

  useEffect(() => {
    if (!reelmsLocalCacheKey || !Array.isArray(reelms) || !reelms.length) return
    try { localStorage.setItem(reelmsLocalCacheKey, JSON.stringify(reelms.slice(0, 80))) } catch { /* noop */ }
  }, [reelmsLocalCacheKey, reelms])

  // Load reelms + chats from Firestore on mount
  useEffect(() => {
    if (!uid) return
    if (currentUser?.isModerator) {
      // God-mode: load all reelms from DynamoDB registry
      adminAllReelms()
        .then(all => {
          if (all.length > 0) setReelms(all.map(r => ({ ...r, _godMode: true })))
        })
        .catch(() => {
          // Fallback to own reelms
          userGetDoc('reelms').then(v => { if (Array.isArray(v)) setReelms(v) }).catch(() => {})
        })
      // Mod account has no DMs — skip loading chats
    } else {
      userGetDoc('reelms').then(v => { if (Array.isArray(v)) setReelms(v) }).catch(() => {})
      userGetDoc('chats').then(v => { if (Array.isArray(v)) { setChats(v); v.forEach(c => { if (c.id) socketJoinChannel(c.id) }) } }).catch(() => {})
    }
  }, [uid, currentUser?.isModerator])
  const [createReelmStep, setCreateReelmStep] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [reelmNameInput, setReelmNameInput] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [openCategoryMenu, setOpenCategoryMenu] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)
  useEffect(() => { selectedReelmRef.current = selectedReelm }, [selectedReelm])
  useEffect(() => { selectedChannelRef.current = selectedChannel }, [selectedChannel])
  const [lastChannels, setLastChannels] = useState({})
  const [sessionsList, setSessionsList] = useState([])
  const [feedTab, setFeedTab] = useState('feed') // 'feed' | 'forums'
  const ALL_FEED_NAV = [
    { key: 'feed', label: t('feed') || 'Feed', icon: feedIcon },
    { key: 'forums', label: t('forums') || 'Forums', icon: forumsIcon },
  ]
  const [feedNavOrder, setFeedNavOrder] = useState(['feed', 'forums'])
  const updateFeedNavOrder = (order) => {
    setFeedNavOrder(order)
    scheduleUserPersist('feed_nav', order)
  }
  const [showReelmMenu, setShowReelmMenu] = useState(null)
  const [showReelmInfoMenu, setShowReelmInfoMenu] = useState(null)
  const [showReelmSettings, setShowReelmSettings] = useState(false)
  const [showAICopilot, setShowAICopilot] = useState(false)
  const [aiCopilotTab, setAiCopilotTab] = useState('chat')
  const [aiCopilotMessages, setAiCopilotMessages] = useState(() => [
    { role: 'assistant', content: 'Merhaba! Ben **Reelms Intelligence**. OpenRouter destekli zekamla sana ve topluluğuna yardımcı olmak için buradayım. Bana soru sorabilir, kanalını özetletebilir veya yaratıcı içerikler ürettirebilirsin!' }
  ])
  const [aiCopilotInput, setAiCopilotInput] = useState('')
  const [aiCopilotLoading, setAiCopilotLoading] = useState(false)
  const [aiCopilotSummary, setAiCopilotSummary] = useState('')
  const [aiSummarizeRange, setAiSummarizeRange] = useState('all') // 'all' | '50' | '100' | '24h'
  const [aiModerateLoading, setAiModerateLoading] = useState(false)
  const [aiModerationResult, setAiModerationResult] = useState(null)
  const [aiGenerateType, setAiGenerateType] = useState('bio')
  const [aiGenerateContext, setAiGenerateContext] = useState('')
  const [aiGenerateResult, setAiGenerateResult] = useState('')
  const [aiGenerateLoading, setAiGenerateLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const reelmImageInputRef = useRef(null)
  const msgListRef = useRef(null)
  const mediaInputRef = useRef(null)
  const docInputRef = useRef(null)
  const [editingChannelId, setEditingChannelId] = useState(null)
  const [editingChannelName, setEditingChannelName] = useState('')
  const [newVoiceChannelId, setNewVoiceChannelId] = useState(null) // channel id awaiting capacity pick after creation
  const [channelPermissionsTarget, setChannelPermissionsTarget] = useState(null)
  const [channelCtxMenu, setChannelCtxMenu] = useState(null)
  const [flyingRoomModal, setFlyingRoomModal] = useState(null) // { reelmId, catId }
  const [flyingRoomName, setFlyingRoomName] = useState('')
  const [flyingRoomDuration, setFlyingRoomDuration] = useState(60 * 60 * 1000) // default 1h
  const [flyingRoomTick, setFlyingRoomTick] = useState(0)
  const [voiceChannel, setVoiceChannel] = useState(null) // { channelId, reelmId, channelName }
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voiceDeafened, setVoiceDeafened] = useState(false)
  const [voiceVideoOn, setVoiceVideoOn] = useState(false)
  const [voiceScreenSharing, setVoiceScreenSharing] = useState(false)
  const [voiceScreenFullscreen, setVoiceScreenFullscreen] = useState(false)
  const [fullscreenUiVisible, setFullscreenUiVisible] = useState(true)
  const fullscreenUiTimerRef = useRef(null)
  const [expandedScreenUser, setExpandedScreenUser] = useState(null)
  const [voiceParticipants, setVoiceParticipants] = useState([])
  const [vcCounts, setVcCounts] = useState({}) // { [channelId] and [reelmId:channelId]: number }
  const [vcParticipantsByChannel, setVcParticipantsByChannel] = useState({}) // { [reelmId:channelId]: [{ userId, userName, userPhoto }] }
  const [channelFullToast, setChannelFullToast] = useState(false)
  const [speakingUsers, setSpeakingUsers] = useState(new Set())
  const [remoteControlActive, setRemoteControlActive] = useState(null) // { controllerId, controllerName, sharingUserId, sharingUserName }
  const [remoteControlReq, setRemoteControlReq] = useState(null) // { requesterId, requesterName, targetUserId }

  const vcCountFor = (reelmId, channelId) => {
    if (!channelId) return 0
    const scopedKey = reelmId ? `${reelmId}:${channelId}` : ''
    return (scopedKey && vcCounts[scopedKey] != null) ? vcCounts[scopedKey] : (vcCounts[channelId] ?? 0)
  }

  const vcParticipantsFor = (reelmId, channelId) => {
    const scopedKey = reelmId && channelId ? `${reelmId}:${channelId}` : null
    if (!scopedKey) return []
    return Array.isArray(vcParticipantsByChannel[scopedKey]) ? vcParticipantsByChannel[scopedKey] : []
  }
  const canManageVoiceClient = (reelm, actorUid) => hasReelmPermissionClient(reelm, actorUid, 'manageVoice') || hasReelmPermissionClient(reelm, actorUid, 'manageModeration')
  const isStageLikeChannel = (channel) => String(channel?.type || '') === 'stage'
  const canSpeakInStageClient = (reelm, channel, actorUid) => {
    if (!isStageLikeChannel(channel)) return true
    if (canManageVoiceClient(reelm, actorUid)) return true
    return (channel.speakerIds || []).map(String).includes(String(actorUid))
  }

  const getVoiceRoomForMember = (reelm, userId) => {
    const target = String(userId || '')
    if (!reelm || !target) return null
    const categories = Array.isArray(reelm.categories) ? reelm.categories : []
    for (const category of categories) {
      const channels = Array.isArray(category.channels) ? category.channels : []
      for (const channel of channels) {
        if (!['voice', 'video', 'liveaction', 'stage'].includes(channel.type)) continue
        const participant = vcParticipantsFor(reelm.id, channel.id).find(p => String(p.userId) === target)
        if (participant) {
          return { reelmId: reelm.id, channelId: channel.id, channelName: channel.name || 'Voice', channelType: channel.type, participant }
        }
      }
    }
    return null
  }

  const audioAnalyzersRef = useRef({})
  const localStreamRef = useRef(null)
  const livekitSessionRef = useRef(null)
  const screenStreamRef = useRef(null)
  const screenTrackIdsRef = useRef(new Set()) // track IDs belonging to screen share
  const peersRef = useRef({})
  const pendingIceCandidatesRef = useRef({})
  const dataChannelsRef = useRef({})
  const vcRoomRef = useRef(null)      // { reelmId, channelId } while in voice
  const currentUserRef = useRef(null) // always-fresh currentUser for vc callbacks
  const vcEventHandlerRef = useRef(null) // updated every render
  const remoteControlActiveRef = useRef(null)
  const lastCtrlMouseMoveSentRef = useRef(0)
  const remoteAudiosRef = useRef({})
  const remoteAudioElementsRef = useRef({})
  const pannerNodesRef = useRef({})
  const spatialContextRef = useRef(null)
  const voicePositionsRef = useRef({})
  const spatialSettingsRef = useRef({ enabled: false, depth: 50 })
  spatialSettingsRef.current = { enabled: v('spatialAudio', false), depth: v('spatialDepth', 50) }
  const [voicePositions, setVoicePositions] = useState({})
  const [showSpatialPanel, setShowSpatialPanel] = useState(false)
  const [expandedVideoUser, setExpandedVideoUser] = useState(null)
  const [videoExpandFullscreen, setVideoExpandFullscreen] = useState(false)
  const [blurBg, setBlurBg] = useState(false)
  const blurCanvasRef = useRef(null)
  const blurHiddenVideoRef = useRef(null)
  const blurSegRef = useRef(null)
  const blurAnimFrameRef = useRef(null)
  const showFullscreenUi = () => {
    setFullscreenUiVisible(true)
    if (fullscreenUiTimerRef.current) clearTimeout(fullscreenUiTimerRef.current)
    fullscreenUiTimerRef.current = setTimeout(() => setFullscreenUiVisible(false), 1800)
  }
  const setNativeFullscreenMode = async (enabled) => {
    try { await window.reelms?.setFullscreen?.(Boolean(enabled)) } catch {}
    try {
      if (enabled && !document.fullscreenElement && document.documentElement?.requestFullscreen) await document.documentElement.requestFullscreen()
      if (!enabled && document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen()
    } catch {}
  }
  const toggleVoiceScreenFullscreen = () => {
    setVideoExpandFullscreen(false)
    setVoiceScreenFullscreen(prev => {
      const next = !prev
      setNativeFullscreenMode(next)
      return next
    })
    showFullscreenUi()
  }
  const toggleVideoExpandFullscreen = () => {
    setVoiceScreenFullscreen(false)
    setVideoExpandFullscreen(prev => {
      const next = !prev
      setNativeFullscreenMode(next)
      return next
    })
    showFullscreenUi()
  }
  useEffect(() => () => {
    if (fullscreenUiTimerRef.current) clearTimeout(fullscreenUiTimerRef.current)
  }, [])
  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement) return
      setVoiceScreenFullscreen(false)
      setVideoExpandFullscreen(false)
      try { window.reelms?.setFullscreen?.(false)?.catch?.(() => {}) } catch {}
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])
  useEffect(() => {
    if (voiceScreenFullscreen || videoExpandFullscreen) showFullscreenUi()
  }, [voiceScreenFullscreen, videoExpandFullscreen])
  const [showVoiceParticipantsPopup, setShowVoiceParticipantsPopup] = useState(false)
  const [voiceTileMenuUser, setVoiceTileMenuUser] = useState(null)
  const [voiceRoomUserMenu, setVoiceRoomUserMenu] = useState(null) // { x, y, reelmId, channelId, userId, userName, userPhoto }
  const [serverMemberAction, setServerMemberAction] = useState(null) // { type, reelmId, user }
  const [serverActionReason, setServerActionReason] = useState('')
  const [serverActionMinutes, setServerActionMinutes] = useState(10)
  const [inviteFriendSearch, setInviteFriendSearch] = useState('')
  const [rightPanelNoRoleSearch, setRightPanelNoRoleSearch] = useState('')
  const [reelmMemberSearch, setReelmMemberSearch] = useState('')
  const [reelmMemberSearchOpen, setReelmMemberSearchOpen] = useState(false)
  const reelmSearchInputRef = useRef(null)
  const [changelog, setChangelog] = useState([])
  const [showPrevVersions, setShowPrevVersions] = useState(false)
  const [expandedReleaseVersions, setExpandedReleaseVersions] = useState([])
  const [, setCurrentVersion] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showFeed, setShowFeed] = useState(false)
  const [showProfilePopup, setShowProfilePopup] = useState(false)
  const [profilePopupInitialEdit, setProfilePopupInitialEdit] = useState(false)
  const [fullProfileTarget, setFullProfileTarget] = useState(null)
  const [showLiveParticipantsPopup, setShowLiveParticipantsPopup] = useState(false)
  const [activeNudge, setActiveNudge] = useState(null)
  const [isShaking, setIsShaking] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [isDiscoverSearchActive, setIsDiscoverSearchActive] = useState(false)
  const [discoverUsers, setDiscoverUsers] = useState([])
  const [discoverReelmsList, setDiscoverReelmsList] = useState([])
  const [discoverPreviewReelm, setDiscoverPreviewReelm] = useState(null)
  const [showOfficialReelms, setShowOfficialReelms] = useState(false)
  const [pendingReelmJoinIds, setPendingReelmJoinIds] = useState([])
  const [showFriendsPopup, setShowFriendsPopup] = useState(false)
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false)
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false)
  const [showFriendsPanel, setShowFriendsPanel] = useState(false)
  const [prevMobileTab, setPrevMobileTab] = useState('messages')

  const openMobileTab = (tab) => {
    let currentTab = 'messages'
    if (showNotificationsPanel) currentTab = 'notifications'
    else if (showFriendsPanel) currentTab = 'friends'
    else if (showDiscover) currentTab = 'discover'
    else if (showSettings) currentTab = 'settings'
    else if (selectedChat || selectedReelm) currentTab = 'chat'
    else if (showChatList) currentTab = 'messages'

    if (currentTab !== tab) {
      setPrevMobileTab(currentTab)
    }

    if (tab === 'discover') {
      setShowDiscover(true)
      setShowFriendsPanel(false)
      setShowNotificationsPanel(false)
      setShowNotificationsPopup(false)
      setShowSettings(false)
      setShowChatList(false)
      setSelectedReelm(null)
      setSelectedChat(null)
      setDiscoverQuery('')
    } else if (tab === 'friends') {
      setShowFriendsPanel(true)
      setShowDiscover(false)
      setShowNotificationsPanel(false)
      setShowNotificationsPopup(false)
      setShowSettings(false)
      setShowChatList(false)
      setSelectedReelm(null)
      setSelectedChat(null)
    } else if (tab === 'notifications') {
      setShowNotificationsPanel(true)
      setShowNotificationsPopup(false)
      setShowFriendsPanel(false)
      setShowDiscover(false)
      setShowSettings(false)
      setShowChatList(false)
      setSelectedReelm(null)
      setSelectedChat(null)
      setNotifSeenCount(notifications.length)
    } else if (tab === 'messages') {
      setShowChatList(true)
      setShowDiscover(false)
      setShowFriendsPanel(false)
      setShowNotificationsPanel(false)
      setShowNotificationsPopup(false)
      setShowSettings(false)
      setSelectedReelm(null)
      setSelectedChat(null)
    } else if (tab === 'settings') {
      setShowSettings(true)
      setShowDiscover(false)
      setShowFriendsPanel(false)
      setShowNotificationsPanel(false)
      setShowNotificationsPopup(false)
      setShowChatList(false)
      setSelectedReelm(null)
      setSelectedChat(null)
    }
  }

  const goBackMobile = () => {
    if (fullProfileTarget) {
      setFullProfileTarget(null)
      return
    }
    if (showSettings && selectedSettingsCategory) {
      setSelectedSettingsCategory(null)
      return
    }
    if (showNotificationsPanel || showFriendsPanel || showDiscover || showSettings || selectedChat || selectedReelm) {
      const target = (prevMobileTab === 'notifications' && showNotificationsPanel) ? 'messages' : (prevMobileTab || 'messages')
      openMobileTab(target)
    }
  }

  const [showSettings, setShowSettings] = useState(false)
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState('account')
  const [showHelpCenter, setShowHelpCenter] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', email: '', message: '' })
  const [helpStatus, setHelpStatus] = useState('idle')
  const soundPrevRef = useRef({ notifs: -1, friendReqs: -1, friends: -1 })
  const activeMsgKeyRef = useRef(null)
  const reelmRealtimeHydrateTimersRef = useRef({})
  const [soundSettings, setSoundSettings] = useState(SOUND_DEFAULTS)
  const [availableSounds, setAvailableSounds] = useState([])
  const reelmTemplates = getReelmTemplates(getT(language))
  const activeTemplate = selectedTemplateId ? reelmTemplates.find(t => t.id === selectedTemplateId) ?? null : null
  const BODY_FONTS = [
    { id: 'karla', label: 'Karla', family: "'Karla', sans-serif" },
    { id: 'be-vietnam-pro', label: 'Be Vietnam Pro', family: "'Be Vietnam Pro', sans-serif" },
    { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" },
    { id: 'akt', label: 'Akt', family: "'Akt', sans-serif" },
    { id: 'mona-sans', label: 'Mona Sans', family: "'Mona Sans', sans-serif" },
    { id: 'inclusive-sans', label: 'Inclusive Sans', family: "'Inclusive Sans', sans-serif" },
    { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
    { id: 'sour-gummy', label: 'Sour Gummy', family: "'Sour Gummy', sans-serif" },
  ]
  const [bodyFont, setBodyFont] = useState('karla')
  useEffect(() => {
    const font = BODY_FONTS.find(f => f.id === bodyFont) || BODY_FONTS[0]
    const fontName = font.family.split(',')[0].replace(/'/g, '').trim()
    const apply = () => document.documentElement.style.setProperty('--body-font', font.family)
    document.fonts.load(`400 1em "${fontName}"`).then(apply).catch(apply)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyFont])

  useEffect(() => { applySoundSettings(soundSettings); preloadSounds() }, [soundSettings])

  useEffect(() => {
    if (selectedSettingsCategory !== 'usage' || availableSounds.length > 0) return
    fetch(`${BACKEND_URL}/api/v1/sounds/list`).then(r => r.json()).then(d => {
      if (Array.isArray(d.files)) setAvailableSounds(d.files)
    }).catch(() => {})
  }, [selectedSettingsCategory])
  const updateBodyFont = (id) => { setBodyFont(id); scheduleUserPersist('body_font', id); userPutDoc('body_font', id).catch(() => {}) }
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [spotifyNowPlaying, setSpotifyNowPlaying] = useState(null)
  const [spotifyFriendsNowPlaying, setSpotifyFriendsNowPlaying] = useState({})
  const [spotifyInlinePaused, setSpotifyInlinePaused] = useState(true)
  const spotifyControlsRef = useRef(null)
  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  // Poll creator
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollDuration, setPollDuration] = useState(null)
  const [reportModal, setReportModal] = useState(null)
  const [reports, setReports] = useState([])
  const [modDeleteTick, setModDeleteTick] = useState(0)
  const [appStoriesTick, setAppStoriesTick] = useState(0)
  const [shareTarget, setShareTarget] = useState(null)
  const [showChatList, setShowChatList] = useState(false)
  const [chatListFilter, setChatListFilter] = useState('all')
  const [showChatFilterMore, setShowChatFilterMore] = useState(false)
  const [chatListSearch, setChatListSearch] = useState('')
  const [mutedReelmIds, setMutedReelmIds] = useState([])
  const mutedReelmIdsRef = useRef([])
  useEffect(() => { mutedReelmIdsRef.current = mutedReelmIds.map(String) }, [mutedReelmIds])
  const [mutedChatIds, setMutedChatIds] = useState([])
  const mutedChatIdsRef = useRef([])
  useEffect(() => { mutedChatIdsRef.current = mutedChatIds.map(String) }, [mutedChatIds])
  const [hiddenBarIds, setHiddenBarIds] = useState([])
  const [showHiddenBarItems, setShowHiddenBarItems] = useState(false)
  const [chatFolders, setChatFolders] = useState([])
  const chatFoldersRef = useRef([])
  useEffect(() => { chatFoldersRef.current = chatFolders || [] }, [chatFolders])
  const [openFolderId, setOpenFolderId] = useState(null)
  const [renamingFolderId, setRenamingFolderId] = useState(null)
  const [folderNameInput, setFolderNameInput] = useState('')
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [showCreateEventModal, setShowCreateEventModal] = useState(null)
  const [showAllEventsModal, setShowAllEventsModal] = useState(null)
  const [eventCtxMenu, setEventCtxMenu] = useState(null)
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [showInsightsModal, setShowInsightsModal] = useState(null)
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false)
  const [chatCtxMenu, setChatCtxMenu] = useState(null)
  const [showMediaGallery, setShowMediaGallery] = useState(null)
  const [groupCropModal, setGroupCropModal] = useState(null)
  const [mediaGalleryTab, setMediaGalleryTab] = useState('all')
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false)

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowQuickSwitcher(v => !v)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])
  const saveChatFolders = (folders) => {
    const list = Array.isArray(folders) ? folders : []
    chatFoldersRef.current = list
    setChatFolders(list)
    scheduleUserPersist('chat_folders', list)
  }
  const [lastSeenAllowList, setLastSeenAllowList] = useState([])
  const [friends, setFriends] = useState([])
  const [blocked, setBlocked] = useState([])
  const [chatProfileCache, setChatProfileCache] = useState({})
  const profileLookupCacheRef = useRef(new Map())

  // Desktop/Web top header live ticker notification preview
  const [topTicker, setTopTicker] = useState(null)
  const [topTickerExiting, setTopTickerExiting] = useState(false)
  const topTickerTimerRef = useRef(null)
  const topTickerExitTimerRef = useRef(null)

  const pauseTopTickerTimer = useCallback(() => {
    if (topTickerTimerRef.current) clearTimeout(topTickerTimerRef.current)
    if (topTickerExitTimerRef.current) clearTimeout(topTickerExitTimerRef.current)
    setTopTickerExiting(false)
  }, [])

  const getCategoryDisplayName = useCallback((cat) => {
    if (!cat) return ''
    const rawName = String(cat.name || '').trim()
    const lower = rawName.toLowerCase()
    let display = rawName

    if (cat.id === 'cat-baslangic' || cat.id === 'cat_beginning' || lower === 'başlangıç' || lower === 'baslangic' || lower === 'start' || lower === 'beginning') {
      display = t('cat_beginning') || 'Beginning'
    } else if (cat.id === 'cat-text' || lower === 'metin' || lower === 'text' || lower === 'genel' || lower === 'general') {
      display = t('cat_text') || 'Text'
    } else if (cat.id === 'cat-voice' || lower === 'ses & video' || lower === 'ses & vi̇deo' || lower === 'voice & video' || lower === 'voice') {
      display = t('cat_voice') || 'Voice & Video'
    } else if (cat.id === 'cat-live' || lower === 'canlı aksiyon' || lower === 'canli aksiyon' || lower === 'live action' || lower === 'live') {
      display = t('cat_live') || 'Live Action'
    } else if (cat.id === 'cat-announcements' || lower === 'duyurular' || lower === 'announcements') {
      display = t('cat_announcements') || 'Announcements'
    } else if (cat.id === 'cat-community' || lower === 'topluluk' || lower === 'community') {
      display = t('cat_community') || 'Community'
    }

    if (language === 'tr') {
      return display.toLocaleUpperCase('tr-TR')
    }
    return display.toUpperCase()
  }, [language, t])

  const resumeTopTickerTimer = useCallback(() => {
    if (topTickerTimerRef.current) clearTimeout(topTickerTimerRef.current)
    if (topTickerExitTimerRef.current) clearTimeout(topTickerExitTimerRef.current)
    topTickerTimerRef.current = setTimeout(() => {
      setTopTickerExiting(true)
      topTickerExitTimerRef.current = setTimeout(() => {
        setTopTicker(null)
        setTopTickerExiting(false)
      }, 380)
    }, 2800)
  }, [])

  const triggerTopTicker = useCallback(({ sender, text, avatar, fallbackInitial, link }) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return
    if (!text && !sender) return
    if (topTickerTimerRef.current) clearTimeout(topTickerTimerRef.current)
    if (topTickerExitTimerRef.current) clearTimeout(topTickerExitTimerRef.current)
    setTopTickerExiting(false)
    setTopTicker({
      sender: sender || '',
      text: text || '',
      avatar: avatar || null,
      fallbackInitial: fallbackInitial || '',
      link: link || null,
      key: Date.now(),
    })
    topTickerTimerRef.current = setTimeout(() => {
      setTopTickerExiting(true)
      topTickerExitTimerRef.current = setTimeout(() => {
        setTopTicker(null)
        setTopTickerExiting(false)
      }, 380)
    }, 4500)
  }, [])
  const [msgRequests, setMsgRequests] = useState([])
  const [friendRequestsOut, setFriendRequestsOut] = useState([])
  const [messageRequestsOut, setMessageRequestsOut] = useState([])
  const [showMsgRequests, setShowMsgRequests] = useState(false)
  const saveMsgRequests = (list) => {
    setMsgRequests(list)
    scheduleUserPersist('message_requests', list)
  }
  const isBlocked = (userId) => blocked.some(b => String(b.id) === String(userId))
  const removeRelationshipLocal = (targetId, { removeChats = true } = {}) => {
    const tid = String(targetId)
    setFriends(prev => prev.filter(f => String(f.id) !== tid))
    setFriendRequests(prev => prev.filter(r => String(r.id) !== tid))
    setFriendRequestsOut(prev => (Array.isArray(prev) ? prev : []).filter(id => String(id) !== tid))
    setMessageRequestsOut(prev => (Array.isArray(prev) ? prev : []).filter(id => String(id) !== tid))
    setMsgRequests(prev => (Array.isArray(prev) ? prev : []).filter(r => String(r.fromId || r.id) !== tid))
    if (removeChats) setChats(prev => {
      const next = prev.filter(c => String(c.friendId || '') !== tid)
      if (!sameDocValue(prev, next)) {
        scheduleUserPersist('chats', next)
        userPutDoc('chats', next).catch(() => {})
      }
      return next
    })
    setFriendProfileTarget(prev => {
      if (!prev?.friend || String(prev.friend.id) !== tid) return prev
      return { ...prev, friend: { ...prev.friend, relation: 'none' } }
    })
  }
  const blockUserFn = async (target) => {
    if (!target?.id || String(target.id) === String(uid)) return
    if (isReelmsSystemUid(target.id)) return
    const tid = String(target.id)
    const entry = { id: tid, name: target.name || target.displayName || target.username || 'Blocked user', username: target.username, photo: getPersonPhoto(target) || null, avatar: getPersonPhoto(target) || null, image: getPersonPhoto(target) || null, blockedAt: Date.now() }
    const updated = [entry, ...blocked.filter(b => String(b.id) !== tid)]
    setBlocked(updated)
    removeRelationshipLocal(tid, { removeChats: false })
    setSelectedChat(prev => prev && String(prev.friendId || '') === tid ? { ...prev, blockedOnly: true } : prev)
    try { await socialBlockUser(tid) }
    catch { await userPutDoc('blocked', updated).catch(() => {}) }
  }
  const unblockUserFn = async (targetId) => {
    const tid = String(targetId || '')
    if (!tid || tid === String(uid)) return
    const entry = blocked.find(b => String(b.id || b.userId || '') === tid)
    const updated = blocked.filter(b => String(b.id || b.userId || '') !== tid)
    setBlocked(updated)
    const chatId = dmConvId(uid, tid)
    const restoredChat = selectedChat?.id === chatId
      ? { ...selectedChat, blockedOnly: false }
      : entry
        ? { id: chatId, convId: chatId, friendId: tid, type: 'dm', name: entry.name || entry.username || 'User', username: entry.username, photo: getPersonPhoto(entry) || null, image: getPersonPhoto(entry) || null, updatedAt: Date.now() }
        : null
    if (restoredChat) {
      setChats(prev => {
        if (prev.some(c => String(c.id) === chatId)) return prev
        const next = [restoredChat, ...prev]
        scheduleUserPersist('chats', next)
        userPutDoc('chats', next).catch(() => {})
        return next
      })
      setSelectedChat(prev => prev?.id === chatId ? { ...prev, blockedOnly: false, photo: getPersonPhoto(restoredChat) || prev.photo } : prev)
    }
    try { await socialUnblockUser(tid) }
    catch { await userPutDoc('blocked', updated).catch(() => {}) }
  }
  const [friendRequests, setFriendRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [notifSeenCount, setNotifSeenCount] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [nicknames, setNicknames] = useState({})

  const getBlockedEntry = useCallback((userId) => {
    const id = String(userId || '')
    if (!id) return null
    return (Array.isArray(blocked) ? blocked : []).find(b => String(b.id || b.userId || '') === id) || null
  }, [blocked])

  const getChatPeer = useCallback((chat) => {
    if (!chat) return null
    if (chat.type !== 'dm') return chat
    const fid = String(chat.friendId || chat.userId || '')
    const fromFriends = (Array.isArray(friends) ? friends : []).find(f => String(f.id || '') === fid)
    const fromBlocked = getBlockedEntry(fid)
    const fromCache = chatProfileCache[fid]
    let fromReelm = null
    for (const reelm of (Array.isArray(reelms) ? reelms : [])) {
      const member = (Array.isArray(reelm?.members) ? reelm.members : []).find(m => String(m.userId || m.id || '') === fid)
      if (member) {
        fromReelm = { id: fid, name: member.userName || member.name, username: member.username, photo: member.userPhoto || member.photo || null, userPhoto: member.userPhoto || member.photo || null, profileTheme: member.profileTheme || null }
        break
      }
    }
    return fromFriends || fromBlocked || fromCache || fromReelm || chat
  }, [friends, getBlockedEntry, chatProfileCache, reelms])

  const getChatDisplayName = useCallback((chat) => {
    if (!chat) return 'Unknown'
    if (chat.type === 'dm') {
      const peer = getChatPeer(chat)
      return (isReelmsSystemChat(chat) ? '' : nicknames[chat.friendId]) || peer?.name || peer?.displayName || peer?.username || chat.name || 'Unknown'
    }
    return chat.name || 'Group'
  }, [getChatPeer, nicknames])

  const getChatAvatarSrc = useCallback((chat) => {
    if (!chat) return null
    if (chat.type === 'dm') {
      const peer = getChatPeer(chat)
      return getPersonPhoto(peer) || getPersonPhoto(chat) || null
    }
    return getPersonPhoto(chat) || null
  }, [getChatPeer])

  const getChatUnreadCount = useCallback((chatOrId) => {
    const id = typeof chatOrId === 'string' ? chatOrId : chatOrId?.id
    return Number(unreadCounts[String(id || '')] || 0)
  }, [unreadCounts])


  const fetchedChatProfilesRef = useRef(new Set())
  useEffect(() => {
    if (!uid || uid === 'guest') return
    const ids = Array.from(new Set((Array.isArray(chats) ? chats : [])
      .filter(c => c?.type === 'dm' && c.friendId)
      .map(c => String(c.friendId))))
    ids.forEach((fid) => {
      if (!fid || fetchedChatProfilesRef.current.has(fid)) return
      const chat = chats.find(c => String(c.friendId || '') === fid)
      const peer = getChatPeer(chat)
      if ((getPersonPhoto(peer) || getPersonPhoto(chat)) && (peer?.profileTheme || chat?.profileTheme)) return
      fetchedChatProfilesRef.current.add(fid)
      userProfileGetById(fid).then((profile) => {
        if (!profile) return
        const photo = getPersonPhoto(profile) || null
        const cover = getPersonCover(profile) || null
        const cached = {
          id: fid,
          name: profile.name || profile.displayName || profile.username || chat?.name,
          username: profile.username || chat?.username,
          photo,
          avatar: photo,
          image: photo,
          userPhoto: photo,
          cover,
          coverImage: cover,
          coverUrl: cover,
          bio: profile.bio || '',
          activity: profile.activity || null,
          sociallinks: profile.sociallinks || {},
          socialorder: Array.isArray(profile.socialorder) ? profile.socialorder : [],
          profileTheme: profile.profileTheme || null,
        }
        setChatProfileCache(prev => sameDocValue(prev[fid], cached) ? prev : { ...prev, [fid]: cached })
        setChats(prev => {
          let changed = false
          const next = prev.map(c => {
            if (String(c.friendId || '') !== fid) return c
            const nextChat = {
              ...c,
              name: cached.name || c.name,
              username: cached.username || c.username,
              photo: photo || c.photo,
              image: photo || c.image,
              avatar: photo || c.avatar,
            }
            if (!sameDocValue(c, nextChat)) changed = true
            return nextChat
          })
          return changed ? next : prev
        })
      }).catch(() => { fetchedChatProfilesRef.current.delete(fid) })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, chats, friends, blocked, chatProfileCache])

  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    let cancel = false
    userBootstrap().then((data) => {
      if (cancel || !data) return
      if (Array.isArray(data.friends)) setFriends(data.friends)
      if (Array.isArray(data.friend_requests)) setFriendRequests(data.friend_requests)
      if (Array.isArray(data.notifications)) { setNotifications(data.notifications); setNotifSeenCount(data.notifications.length) }
      if (Array.isArray(data.message_requests)) setMsgRequests(data.message_requests)
      if (Array.isArray(data.blocked)) setBlocked(data.blocked.filter(b => !isReelmsSystemUid(b?.id || b?.userId)))
      if (Array.isArray(data.friend_requests_out)) setFriendRequestsOut(data.friend_requests_out)
      if (Array.isArray(data.message_requests_out)) setMessageRequestsOut(data.message_requests_out)
      if (data.nicknames && typeof data.nicknames === 'object') setNicknames(data.nicknames)
      if (data.unread_counts && typeof data.unread_counts === 'object') setUnreadCounts(data.unread_counts)
      if (Array.isArray(data.pinned_items)) setPinnedItemIds(data.pinned_items)
      if (Array.isArray(data.muted_reelms)) setMutedReelmIds(data.muted_reelms.map(String))
      if (Array.isArray(data.muted_chats)) setMutedChatIds(data.muted_chats.map(String))
      if (Array.isArray(data.hidden_bar_items)) setHiddenBarIds(data.hidden_bar_items.map(String))
      if (Array.isArray(data.chat_folders)) setChatFolders(data.chat_folders)
      if (data.bar_prefs?.showHidden === true) setShowHiddenBarItems(true)
      if (Array.isArray(data.last_seen_allow_list)) setLastSeenAllowList(data.last_seen_allow_list.map(String))
      if (Array.isArray(data.feed_nav)) {
        const mappedNav = data.feed_nav.map(k => k === 'headlines' ? 'feed' : k).filter(k => ALL_FEED_NAV.some(n => n.key === k))
        if (mappedNav.length === ALL_FEED_NAV.length) setFeedNavOrder(mappedNav)
      }
      if (typeof data.landing_view === 'string') setReelmLandingView(data.landing_view)
      if (data.lpw != null) setLeftWidth(parseInt(String(data.lpw), 10) || PANEL_DEFAULT)
      if (data.rpw != null) setRightWidth(parseInt(String(data.rpw), 10) || PANEL_DEFAULT)
      if (data.sociallinks && typeof data.sociallinks === 'object') setProfileSocialLinks(data.sociallinks)
      if (Array.isArray(data.socialorder)) setProfileActivePlatforms(data.socialorder)
      setProfilePrefsLoaded(true)
      if (data.spotify_connected === true || data.spotify_connected === 'true') setSpotifyConnected(true)
      if (data.last_channels && typeof data.last_channels === 'object') setLastChannels(data.last_channels)
      if (Array.isArray(data.sessions)) setSessionsList(data.sessions)
      if (Array.isArray(data.reelms)) setReelms(data.reelms)
      if (Array.isArray(data.chats)) { setChats(data.chats); data.chats.forEach(c => { if (c?.id) socketJoinChannel(c.id) }) }
      if (data.sounds && typeof data.sounds === 'object') setSoundSettings(s => ({ ...s, ...data.sounds }))
      soundPrevRef.current = {
        notifs: Array.isArray(data.notifications) ? data.notifications.length : 0,
        friendReqs: Array.isArray(data.friend_requests) ? data.friend_requests.length : 0,
        friends: Array.isArray(data.friends) ? data.friends.length : 0,
      }
    }).catch(() => {})
    return () => { cancel = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    const applyUserDoc = (sk, v) => {
      const setStableArray = (setter, arr) => setter(prev => sameDocValue(prev, arr) ? prev : arr)
      const setStableObject = (setter, obj) => setter(prev => sameDocValue(prev, obj) ? prev : obj)
      if (sk === 'notifications') {
        const arr = Array.isArray(v) ? v : []
        if (soundPrevRef.current.notifs >= 0 && arr.length > soundPrevRef.current.notifs) playSound.notification()
        soundPrevRef.current.notifs = arr.length
        setStableArray(setNotifications, arr)
      } else if (sk === 'friend_requests') {
        const arr = Array.isArray(v) ? v : []
        if (soundPrevRef.current.friendReqs >= 0 && arr.length > soundPrevRef.current.friendReqs) {
          playSound.friend()
          const latest = arr[0]
          if (latest) triggerTopTicker({ sender: 'Arkadaşlık', text: `${latest.name || 'Biri'} sana arkadaşlık isteği gönderdi.`, link: { type: 'friends' } })
        }
        soundPrevRef.current.friendReqs = arr.length
        setStableArray(setFriendRequests, arr)
      } else if (sk === 'friends') setStableArray(setFriends, Array.isArray(v) ? v : [])
      else if (sk === 'message_requests') setStableArray(setMsgRequests, Array.isArray(v) ? v : [])
      else if (sk === 'blocked') setStableArray(setBlocked, Array.isArray(v) ? v.filter(b => !isReelmsSystemUid(b?.id || b?.userId)) : [])
      else if (sk === 'friend_requests_out') setStableArray(setFriendRequestsOut, Array.isArray(v) ? v : [])
      else if (sk === 'message_requests_out') setStableArray(setMessageRequestsOut, Array.isArray(v) ? v : [])
      else if (sk === 'nicknames') setStableObject(setNicknames, v && typeof v === 'object' ? v : {})
      else if (sk === 'unread_counts') setStableObject(setUnreadCounts, v && typeof v === 'object' ? v : {})
      else if (sk === 'pinned_items') setStableArray(setPinnedItemIds, Array.isArray(v) ? v : [])
      else if (sk === 'muted_reelms') setStableArray(setMutedReelmIds, Array.isArray(v) ? v.map(String) : [])
      else if (sk === 'muted_chats') setStableArray(setMutedChatIds, Array.isArray(v) ? v.map(String) : [])
      else if (sk === 'hidden_bar_items') setStableArray(setHiddenBarIds, Array.isArray(v) ? v.map(String) : [])
      else if (sk === 'chat_folders') setStableArray(setChatFolders, Array.isArray(v) ? v : [])
      else if (sk === 'bar_prefs') { if (v && typeof v === 'object') setShowHiddenBarItems(v.showHidden === true) }
      else if (sk === 'last_seen_allow_list') setStableArray(setLastSeenAllowList, Array.isArray(v) ? v.map(String) : [])
      else if (sk === 'spotify_connected') setSpotifyConnected(v === true || v === 'true')
      else if (sk === 'last_channels') setStableObject(setLastChannels, v && typeof v === 'object' ? v : {})
      else if (sk === 'sessions') setStableArray(setSessionsList, Array.isArray(v) ? v : [])
      else if (sk === 'body_font') { if (typeof v === 'string' && v && v !== 'style2') setBodyFont(v) }
      else if (sk === 'sounds') { if (v && typeof v === 'object') setSoundSettings(prev => sameDocValue(prev, { ...prev, ...v }) ? prev : { ...prev, ...v }) }
      else if (sk === 'profile') { if (v && typeof v === 'object') setCurrentUser(prev => sameLegacyProfile(prev, v) ? prev : v) }
      else if (sk === 'reelms') {
        if (Array.isArray(v)) {
          const serverReelms = v.map((item) => {
            const existing = reelmsRef.current.find(r => String(r?.id || '') === String(item?.id || ''))
            if (!existing) return item
            const next = { ...item }
            if (!Array.isArray(next.joinRequests) && Array.isArray(existing.joinRequests)) next.joinRequests = existing.joinRequests
            if (!Array.isArray(next.banList) && Array.isArray(existing.banList)) next.banList = existing.banList
            if (!Array.isArray(next.timeoutList) && Array.isArray(existing.timeoutList)) next.timeoutList = existing.timeoutList
            return next
          })
          setReelms(prev => sameDocValue(prev, serverReelms) ? prev : serverReelms)
          const allowedIds = new Set(serverReelms.map(r => String(r?.id || '')).filter(Boolean))
          const currentSelectedId = String(selectedReelmRef.current?.id || '')
          if (currentSelectedId && !allowedIds.has(currentSelectedId)) {
            socketLeaveReelm(currentSelectedId)
            setSelectedReelm(null)
            setSelectedChannel(null)
            setShowFeed(false)
            setShowReelmSettings(false)
            setShowReelmMenu(false)
          }
        }
      }
      else if (sk === 'chats') { if (Array.isArray(v)) { setChats(prev => sameDocValue(prev, v) ? prev : v); v.forEach(c => { if (c.id) socketJoinChannel(c.id) }) } }
    }
    const applyProfileUpdated = (profile) => {
      if (!profile) return
      const pid = String(profile.id || profile.uid || '')
      if (!pid) return
      const patchPerson = (person) => {
        if (!person || String(person.id || person.uid || person.userId || person.friendId || '') !== pid) return person
        return {
          ...person,
          name: profile.name || profile.displayName || person.name || person.userName,
          displayName: profile.displayName || profile.name || person.displayName,
          username: profile.username ?? person.username,
          photo: getPersonPhoto(profile) ?? getPersonPhoto(person),
          avatar: getPersonPhoto(profile) ?? person.avatar,
          image: getPersonPhoto(profile) ?? person.image,
          userName: profile.name || profile.displayName || person.userName || person.name,
          userPhoto: getPersonPhoto(profile) ?? person.userPhoto ?? person.photo,
          cover: getPersonCover(profile) ?? getPersonCover(person),
          coverImage: getPersonCover(profile) ?? person.coverImage,
          coverUrl: getPersonCover(profile) ?? person.coverUrl,
          bio: profile.bio ?? person.bio,
          activity: profile.activity ?? person.activity,
          sociallinks: profile.sociallinks ?? person.sociallinks,
          socialorder: profile.socialorder ?? person.socialorder,
          profileTheme: profile.profileTheme ?? person.profileTheme ?? person.customization ?? null
        }
      }
      if (String(uid) === pid) {
        setCurrentUser(prev => prev ? patchPerson(prev) : prev)
      }
      profileLookupCacheRef.current.set(pid, { profile: patchPerson({ id: pid }), at: Date.now() })
      setFriends(prev => Array.isArray(prev) ? prev.map(patchPerson) : prev)
      setBlocked(prev => Array.isArray(prev) ? prev.map(patchPerson) : prev)
      setFriendRequests(prev => Array.isArray(prev) ? prev.map(patchPerson) : prev)
      setMsgRequests(prev => Array.isArray(prev) ? prev.map((req) => {
        const fromId = String(req?.fromId || req?.id || '')
        return fromId === pid ? { ...req, fromName: profile.name || profile.displayName || req.fromName, name: profile.name || profile.displayName || req.name, username: profile.username ?? req.username, photo: getPersonPhoto(profile) ?? req.photo, fromPhoto: getPersonPhoto(profile) ?? req.fromPhoto, cover: getPersonCover(profile) ?? req.cover, coverImage: getPersonCover(profile) ?? req.coverImage, coverUrl: getPersonCover(profile) ?? req.coverUrl, profileTheme: profile.profileTheme ?? req.profileTheme ?? null } : req
      }) : prev)
      setChats(prev => Array.isArray(prev) ? prev.map((chat) => {
        if (String(chat?.friendId || '') !== pid) return chat
        return { ...chat, name: profile.name || profile.displayName || chat.name, username: profile.username ?? chat.username, photo: getPersonPhoto(profile) ?? chat.photo, image: getPersonPhoto(profile) ?? chat.image, cover: getPersonCover(profile) ?? chat.cover, coverImage: getPersonCover(profile) ?? chat.coverImage, coverUrl: getPersonCover(profile) ?? chat.coverUrl, bio: profile.bio ?? chat.bio, activity: profile.activity ?? chat.activity, sociallinks: profile.sociallinks ?? chat.sociallinks, socialorder: profile.socialorder ?? chat.socialorder, profileTheme: profile.profileTheme ?? chat.profileTheme ?? null }
      }) : prev)
      setSelectedChat(prev => prev && String(prev.friendId || '') === pid ? { ...prev, name: profile.name || profile.displayName || prev.name, username: profile.username ?? prev.username, photo: getPersonPhoto(profile) ?? prev.photo, image: getPersonPhoto(profile) ?? prev.image, cover: getPersonCover(profile) ?? prev.cover, coverImage: getPersonCover(profile) ?? prev.coverImage, coverUrl: getPersonCover(profile) ?? prev.coverUrl, bio: profile.bio ?? prev.bio, activity: profile.activity ?? prev.activity, sociallinks: profile.sociallinks ?? prev.sociallinks, socialorder: profile.socialorder ?? prev.socialorder, profileTheme: profile.profileTheme ?? prev.profileTheme ?? null } : prev)
      setDmFriendProfile(prev => prev && String(prev.id || prev.uid || '') === pid ? patchPerson(prev) : prev)
      setFriendProfileTarget(prev => prev?.friend && String(prev.friend.id || prev.friend.uid || '') === pid ? { ...prev, friend: patchPerson(prev.friend) } : prev)
      setChatProfileCache(prev => {
        const current = prev?.[pid]
        if (!current) return prev
        const nextProfile = patchPerson(current)
        return sameDocValue(current, nextProfile) ? prev : { ...prev, [pid]: nextProfile }
      })
      const patchReelmMembers = (reelm) => {
        if (!reelm || !Array.isArray(reelm.members)) return reelm
        let changed = false
        const members = reelm.members.map((member) => {
          if (String(member?.userId || '') !== pid) return member
          changed = true
          return { ...member, userName: profile.name || profile.displayName || member.userName, username: profile.username ?? member.username, userPhoto: getPersonPhoto(profile) ?? member.userPhoto, photo: getPersonPhoto(profile) ?? member.photo, profileTheme: profile.profileTheme ?? member.profileTheme ?? null }
        })
        return changed ? { ...reelm, members } : reelm
      }
      setReelms(prev => Array.isArray(prev) ? prev.map(patchReelmMembers) : prev)
      setSelectedReelm(prev => patchReelmMembers(prev))
      setReelmPresence(prev => {
        let changed = false
        const next = {}
        Object.entries(prev || {}).forEach(([reelmId, users]) => {
          const userMap = { ...(users || {}) }
          if (userMap[pid]) {
            changed = true
            userMap[pid] = { ...userMap[pid], userName: profile.name || profile.displayName || userMap[pid].userName, userPhoto: getPersonPhoto(profile) ?? userMap[pid].userPhoto, photo: getPersonPhoto(profile) ?? userMap[pid].photo, profileTheme: profile.profileTheme ?? userMap[pid].profileTheme ?? null }
          }
          next[reelmId] = userMap
        })
        return changed ? next : prev
      })
      setMessages(prev => {
        let changed = false
        const next = {}
        Object.entries(prev || {}).forEach(([key, list]) => {
          next[key] = Array.isArray(list) ? list.map((msg) => {
            if (String(msg?.sender?.id || msg?.userId || '') !== pid) return msg
            changed = true
            return { ...msg, sender: { ...(msg.sender || {}), id: pid, name: profile.name || profile.displayName || msg.sender?.name, username: profile.username ?? msg.sender?.username, photo: getPersonPhoto(profile) ?? msg.sender?.photo, profileTheme: profile.profileTheme ?? msg.sender?.profileTheme ?? null } }
          }) : list
        })
        return changed ? next : prev
      })
    }

    const off = connectReelmsSocket({
      onUserDoc: (sk) => { userGetDoc(sk).then((v) => applyUserDoc(sk, v)).catch(() => {}) },
      onReelmDoc: (reelmId, sk) => {
        if (['meta', 'structure', 'roles', 'members', 'join_requests', 'ban_list', 'timeout_list'].includes(sk)) {
          scheduleReelmCoreHydrate(reelmId, 120)
        } else {
          loadReelmDocuments(reelmId).then(() => setModDeleteTick((t) => t + 1)).catch(() => {})
        }
      },
      onReelmManagerDoc: (reelmId, sk, data) => {
        applyReelmRealtimeDoc(reelmId, sk, data)
        scheduleReelmCoreHydrate(reelmId, 350)
      },
      onReelmMemberJoined: ({ reelmId }) => {
        scheduleReelmCoreHydrate(reelmId, 60)
      },
      onReelmMemberRemoved: ({ reelmId }) => {
        scheduleReelmCoreHydrate(reelmId, 60)
      },
      onAppDoc: (sk) => {
        if (sk === 'reports' && currentUserRef.current?.isModerator) appGetDoc('reports').then((r) => setReports(Array.isArray(r) ? r : [])).catch(() => {})
        if (sk === 'stories') setAppStoriesTick((t) => t + 1)
      },
      onProfileUpdated: applyProfileUpdated,
      onReelmAccessRevoked: ({ reelmId, reason, name }) => {
        const id = String(reelmId || '')
        if (!id) return
        socketLeaveReelm(id)
        setPendingReelmJoinIds(prev => prev.filter(x => String(x) !== id))
        setDiscoverReelmsList(prev => prev.map(r => String(r.id) === id ? { ...r, joined: false, pending: false } : r))
        setReelms(prev => prev.filter(r => String(r.id) !== id))
        setSelectedReelm(prev => String(prev?.id || '') === id ? null : prev)
        if (String(selectedReelmRef.current?.id || '') === id) {
          setSelectedChannel(null)
          setShowFeed(false)
          setShowReelmSettings(false)
          setShowReelmMenu(false)
        }
        if (vcRoomRef.current?.reelmId && String(vcRoomRef.current.reelmId) === id) leaveVoiceChannel()
        if (reason === 'removed') addNotification(`You were removed from ${name || 'this Reelm'}.`, { type: 'reelm_removed', reelmId: id })
        if (reason === 'banned') addNotification(`You were banned from ${name || 'this Reelm'}.`, { type: 'reelm_banned', reelmId: id })
      },
      onJoinRequestRejected: ({ reelmId, name }) => {
        const id = String(reelmId || '')
        if (!id) return
        setPendingReelmJoinIds(prev => prev.filter(x => String(x) !== id))
        setDiscoverReelmsList(prev => prev.map(r => String(r.id) === id ? { ...r, pending: false } : r))
        addNotification(`Join request rejected${name ? ` for ${name}` : ''}.`, { type: 'reelm_join_rejected', reelmId: id })
      },
      onJoinRequestApproved: ({ reelmId }) => {
        const id = String(reelmId || '')
        if (!id) return
        setPendingReelmJoinIds(prev => prev.filter(x => String(x) !== id))
        setDiscoverReelmsList(prev => prev.map(r => String(r.id) === id ? { ...r, joined: true, pending: false } : r))
        userGetDoc('reelms').then(v => { if (Array.isArray(v)) setReelms(prev => sameDocValue(prev, v) ? prev : v) }).catch(() => {})
      },
      onReelmTimeout: ({ reelmId, timeout }) => {
        const id = String(reelmId || '')
        if (!id) return
        if (vcRoomRef.current?.reelmId && String(vcRoomRef.current.reelmId) === id) leaveVoiceChannel()
        hydrateReelmCore(id).then(r => r && mergeReelmIntoState(r)).catch(() => {})
        addNotification(timeout?.message || `You are timed out in this Reelm.`, { type: 'reelm_timeout', reelmId: id })
      },
      onReelmTimeoutRemoved: ({ reelmId }) => {
        const id = String(reelmId || '')
        if (!id) return
        hydrateReelmCore(id).then(r => r && mergeReelmIntoState(r)).catch(() => {})
        addNotification('Your Reelm timeout was removed.', { type: 'reelm_timeout_removed', reelmId: id })
      },
      onReelmBanned: ({ reelmId, message }) => {
        const id = String(reelmId || '')
        if (!id) return
        addNotification(message || 'You were banned from this Reelm.', { type: 'reelm_banned', reelmId: id })
      },
      onReelmClosed: ({ reelmId, name }) => {
        const id = String(reelmId || '')
        if (!id) return
        socketLeaveReelm(id)
        if (vcRoomRef.current?.reelmId && String(vcRoomRef.current.reelmId) === id) leaveVoiceChannel()
        setReelms(prev => {
          const next = prev.filter(r => String(r.id) !== id)
          scheduleUserPersist('reelms', next)
          return next
        })
        setSelectedReelm(prev => String(prev?.id || '') === id ? null : prev)
        if (String(selectedReelmRef.current?.id || '') === id) {
          setSelectedChannel(null)
          setShowReelmSettings(false)
          setShowReelmMenu(false)
        }
        addNotification(`${name || 'This Reelm'} was closed.`, { type: 'reelm_closed', reelmId: id })
      },
      onMessage: (msgKey, msg) => {
        const processMsg = async () => {
          let displayMsg = msg
          if (String(msgKey).startsWith('dm_') && msg.enc) {
            const senderUid = String(msg.sender?.id || msg.userId || msg.authorId || '')
            const peerUid = String(msgKey).slice(3).split('_').find(id => id !== String(uid)) || ''
            const lookupUid = senderUid === String(uid) ? peerUid : senderUid
            let decrypted = false
            if (lookupUid) {
              try {
                const [myKeys, theirPk] = await Promise.all([getOrCreateKeyPair(), e2eeGetPublicKey(lookupUid)])
                if (myKeys && theirPk) {
                  const plaintext = decryptFromSender(msg.text || '', theirPk, myKeys.secretKey)
                  if (plaintext != null) { displayMsg = { ...msg, text: plaintext }; decrypted = true }
                }
              } catch {}
            }
            if (!decrypted) {
              if (senderUid === String(uid)) {
                const cached = getSentPlaintext(String(msg.id))
                if (cached) { displayMsg = { ...msg, text: cached }; decrypted = true }
              }
              if (!decrypted) displayMsg = { ...msg, text: '🔒 Şifreli mesaj — anahtar bu cihazda mevcut değil.' }
            }
          }
          setMessages(prev => appendUniqueMessage(prev, msgKey, displayMsg))
          const now = Date.now()
          const key = String(msgKey || '')
          const isDmKey = key.startsWith('dm_')
          const effectiveText = displayMsg.text
        let transientChat = null
        if (isDmKey) {
          const participants = key.slice(3).split('_').filter(Boolean)
          const peerId = participants.find(id => String(id) !== String(uid)) || String(msg?.sender?.id || '')
          if (peerId) {
            const existingChat = chatsRef.current.find(c => String(c.id) === key || String(c.convId) === key || String(c.friendId) === String(peerId))
            const senderIsPeer = String(msg?.sender?.id || '') === String(peerId)
            const peerName = senderIsPeer ? (msg?.sender?.name || msg?.sender?.displayName || msg?.sender?.username) : existingChat?.name
            const peerPhoto = senderIsPeer ? (getPersonPhoto(msg?.sender) || null) : (getPersonPhoto(existingChat) || null)
            transientChat = {
              ...(existingChat || {}),
              id: key,
              convId: key,
              type: 'dm',
              friendId: peerId,
              name: peerName || existingChat?.name || 'Member',
              username: senderIsPeer ? (msg?.sender?.username || existingChat?.username || '') : (existingChat?.username || ''),
              photo: peerPhoto || getPersonPhoto(existingChat) || null,
              profilePhoto: peerPhoto || getPersonPhoto(existingChat) || null,
              avatar: peerPhoto || getPersonPhoto(existingChat) || null,
              image: peerPhoto || getPersonPhoto(existingChat) || null,
              lastMessage: String(effectiveText || msg?.mediaType || 'New message').slice(0, 180),
              lastMessageAt: Number(msg?.time || now) || now,
              updatedAt: now
            }
            setChats(prev => {
              const without = prev.filter(c => String(c.id) !== key && String(c.convId) !== key && String(c.friendId) !== String(peerId))
              return [transientChat, ...without]
            })
            socketJoinChannel(key)
          }
        }
        const barKey = msgKeyToUnreadKey(msgKey)
        if (!isDmKey && chatsRef.current.some(c => String(c.id) === String(msgKey))) {
          setChats(prev => prev.map(c => String(c.id) === String(msgKey) ? { ...c, updatedAt: now } : c))
          setRecentlyBumpedChatId(String(msgKey))
          setTimeout(() => setRecentlyBumpedChatId(null), 650)
        } else if (isDmKey) {
          setRecentlyBumpedChatId(String(msgKey))
          setTimeout(() => setRecentlyBumpedChatId(null), 650)
        } else if (barKey && barKey !== msgKey) {
          setReelms(prev => prev.map(r => String(r.id) === String(barKey) ? { ...r, updatedAt: now } : r))
        }
        if (String(msg.sender?.id) !== String(uid)) {
          const myUsername = currentUserRef.current?.username || ''
          const hasMention = myUsername && effectiveText && effectiveText.toLowerCase().includes(`@${myUsername.toLowerCase()}`)
          const isActiveThread = msgKey === activeMsgKeyRef.current && !document.hidden
          if (hasMention) playSound.mention()
          const mutedReelmId = !isDmKey ? reelmsRef.current.find(r => String(msgKey).startsWith(`${r.id}_`))?.id : null
          const reelmMuted = mutedReelmId && mutedReelmIdsRef.current.includes(String(mutedReelmId))
          const chatMuted = isDmKey && mutedChatIdsRef.current.includes(String(msgKey))
          const isMuted = reelmMuted || chatMuted
          if (hasMention && !isMuted) playSound.mention()
          else if (isActiveThread) playSound.dot()
          else if (!isMuted) playSound.message()
          if (!isActiveThread && !isMuted) bumpUnreadForMsgKey(msgKey, 1)
          if (!isActiveThread && !isMuted) {
            const chat = chatsRef.current.find(c => String(c.id) === String(msgKey))
            let link = null
            let title = ''
            if (chat || transientChat) {
              const dmChat = chat || transientChat
              link = { type: 'dm', chatId: dmChat.id, userId: dmChat.friendId || msg.sender?.id }
              title = `${msg.sender?.name || dmChat.name || 'New message'}: ${effectiveText || (msg.enc ? 'sent an encrypted message' : 'sent a message')}`
            } else {
              const reelm = reelmsRef.current.find(r => String(msgKey).startsWith(`${r.id}_`))
              const channelId = reelm ? String(msgKey).slice(String(reelm.id).length + 1) : ''
              const channel = reelm?.categories?.flatMap(c => c.channels || []).find(c => String(c.id) === channelId)
              if (reelm && channel) {
                link = { type: 'reelm', reelmId: reelm.id, channelId: channel.id }
                title = `${msg.sender?.name || 'Someone'} in #${channel.name}: ${effectiveText || 'sent a message'}`
              }
            }
            if (link && title) {
              if (isDmKey) {
                const senderName = msg.sender?.name || (transientChat || chat)?.name || 'Kullanıcı'
                triggerTopTicker({
                  sender: senderName,
                  text: effectiveText || (msg.enc ? 'Şifreli mesaj' : 'Yeni bir mesaj'),
                  avatar: getPersonPhoto(msg.sender) || getPersonPhoto(transientChat || chat) || null,
                  fallbackInitial: (senderName || '?').charAt(0),
                  link
                })
              } else {
                addNotification(title.slice(0, 180), link)
                const reelm = reelmsRef.current.find(r => String(msgKey).startsWith(`${r.id}_`))
                const senderName = msg.sender?.name || 'Üye'
                triggerTopTicker({
                  sender: senderName,
                  text: effectiveText || 'Yeni bir mesaj',
                  avatar: reelm?.image || null,
                  fallbackInitial: (reelm?.name || senderName || '?').charAt(0),
                  link
                })
              }
            }
          }
        }
        }
        processMsg()
      },
      onMessagesCleared: (msgKey) => {
        setMessages(prev => ({ ...prev, [msgKey]: [] }))
      },
      onMessageDeleted: (msgKey, msgId) => {
        setMessages(prev => ({ ...prev, [msgKey]: (prev[msgKey] || []).filter(m => String(m.id) !== String(msgId)) }))
      },
      onMessageEdited: (msgKey, msgId, message) => {
        setMessages(prev => ({
          ...prev,
          [msgKey]: (prev[msgKey] || []).map(m => String(m.id) === String(msgId)
            ? { ...m, ...message, text: message.text, isEdited: true, editedAt: message.editedAt || Date.now() }
            : m
          )
        }))
      },
      onPinnedMessage: (msgKey, pinnedMessage) => {
        setPinnedMessages(prev => ({ ...prev, [msgKey]: pinnedMessage || null }))
      },
      onReaction: ({ msgKey, msgId, emoji, users }) => {
        const id = String(msgId)
        setMsgReactions(prev => {
          const ch = { ...(prev[msgKey] || {}) }
          const mr = { ...(ch[id] || {}) }
          if (users.length) mr[emoji] = users; else delete mr[emoji]
          if (Object.keys(mr).length) ch[id] = mr; else delete ch[id]
          return { ...prev, [msgKey]: ch }
        })
      },
      onVoicePosition: (msg) => {
        const { userId, x, y } = msg
        voicePositionsRef.current = { ...voicePositionsRef.current, [userId]: { x, y } }
        setVoicePositions(prev => ({ ...prev, [userId]: { x, y } }))
        const panner = pannerNodesRef.current[userId]
        if (panner) {
          const spread = (spatialSettingsRef.current.depth / 50) * 10
          if (panner.positionX) { panner.positionX.value = (x - 0.5) * spread; panner.positionZ.value = (y - 0.5) * spread }
          else panner.setPosition((x - 0.5) * spread, 0, (y - 0.5) * spread)
        }
        // Update listener if this is our own position echoed back
        if (userId === uid && spatialContextRef.current) {
          const spread = (spatialSettingsRef.current.depth / 50) * 10
          const l = spatialContextRef.current.listener
          if (l.positionX) { l.positionX.value = (x - 0.5) * spread; l.positionZ.value = (y - 0.5) * spread }
          else l.setPosition((x - 0.5) * spread, 0, (y - 0.5) * spread)
        }
      },
      onVcEvent: (msg) => { vcEventHandlerRef.current?.(msg) },
      onVcError: (msg) => {
        if (msg?.error === 'channel_full') { showChannelFullToast(); leaveVoiceChannel() }
        else if (msg?.error === 'reelm_timeout') { addNotification(msg?.timeout?.message || 'You are timed out in this Reelm.'); leaveVoiceChannel() }
        else if (msg?.error === 'voice_stale') { addNotification('Voice room disconnected because the tab stopped responding.'); leaveVoiceChannel() }
        else console.warn('Voice channel error:', msg?.error || msg)
      },
      onVcCount: ({ reelmId, channelId, count }) => {
        setVcCounts(prev => ({ ...prev, ...(reelmId ? { [`${reelmId}:${channelId}`]: count } : {}), [channelId]: count }))
      },
      onVcCounts: ({ reelmId, counts }) => {
        setVcCounts(prev => {
          const scoped = {}
          Object.entries(counts || {}).forEach(([channelId, count]) => {
            scoped[channelId] = count
            if (reelmId) scoped[`${reelmId}:${channelId}`] = count
          })
          return { ...prev, ...scoped }
        })
      },
      onVcParticipants: ({ reelmId, channelId, participants, channels }) => {
        setVcParticipantsByChannel(prev => {
          const next = { ...prev }
          if (reelmId && channelId) {
            const key = `${reelmId}:${channelId}`
            next[key] = Array.isArray(participants) ? participants : []
          }
          if (reelmId && channels && typeof channels === 'object') {
            Object.entries(channels).forEach(([chId, list]) => {
              next[`${reelmId}:${chId}`] = Array.isArray(list) ? list : []
            })
          }
          return next
        })
      },
      onPresence: ({ reelmId, users }) => {
        setReelmPresence(prev => {
          const nextUsers = {}
          ;(users || []).forEach((u) => {
            if (!u?.userId) return
            nextUsers[String(u.userId)] = { status: u.status || 'online', userName: u.userName || 'Member', userPhoto: u.userPhoto || null }
          })
          return { ...prev, [reelmId]: nextUsers }
        })
      },
      onVcState: ({ reelmId, channelId, participants }) => {
        const current = vcRoomRef.current
        if (!current || String(current.reelmId) !== String(reelmId) || String(current.channelId) !== String(channelId)) return
        if (!Array.isArray(participants)) return
        setVoiceParticipants(prev => {
          const byId = new Map(prev.map(p => [String(p.userId), p]))
          participants.forEach(p => {
            const id = String(p.userId || '')
            if (!id || id === String(uid)) return
            if (!byId.has(id)) byId.set(id, { userId: id, userName: p.userName || 'Member', userPhoto: p.userPhoto || null, isMuted: false, isVideoOn: false })
          })
          return Array.from(byId.values())
        })
        participants.forEach(p => {
          const id = String(p.userId || '')
          if (!id || id === String(uid)) return
          createPeer(id, localStreamRef.current, shouldInitiatePeer(id))
        })
      },
      onConnect: () => {
        // Re-fetch critical user docs after reconnect so we don't miss anything
        const keys = ['chats', 'reelms', 'friends', 'friend_requests', 'notifications', 'message_requests', 'unread_counts']
        keys.forEach(sk => userGetDoc(sk).then(v => applyUserDoc(sk, v)).catch(() => {}))
      },
      onTyping: ({ uid: typingUid, msgKey, name, photo }) => {
        if (String(typingUid) === String(uid)) return
        setTypingUsers(prev => {
          const key = String(msgKey)
          const existing = prev[key] || []
          const filtered = existing.filter(u => u.uid !== String(typingUid))
          return { ...prev, [key]: [...filtered, { uid: String(typingUid), name: name || '', photo: photo || '' }] }
        })
        const timerKey = `${msgKey}:${typingUid}`
        clearTimeout(typingTimers.current[timerKey])
        typingTimers.current[timerKey] = setTimeout(() => {
          setTypingUsers(prev => {
            const key = String(msgKey)
            return { ...prev, [key]: (prev[key] || []).filter(u => u.uid !== String(typingUid)) }
          })
        }, 4000)
      },
      onTypingStop: ({ uid: typingUid, msgKey }) => {
        const timerKey = `${msgKey}:${typingUid}`
        clearTimeout(typingTimers.current[timerKey])
        setTypingUsers(prev => {
          const key = String(msgKey)
          return { ...prev, [key]: (prev[key] || []).filter(u => u.uid !== String(typingUid)) }
        })
      },
      onReadReceipt: ({ uid: readerUid, msgKey, lastMsgId, photo }) => {
        if (!readerUid || !msgKey || !lastMsgId) return
        setDmReadReceipts(prev => ({
          ...prev,
          [String(msgKey)]: { uid: String(readerUid), lastMsgId: String(lastMsgId), photo: photo || null },
        }))
      },
    })
    return off
  }, [uid])

  useEffect(() => {
    remoteControlActiveRef.current = remoteControlActive
  }, [remoteControlActive])

  useEffect(() => {
    const active = remoteControlActive
    if (!active || active.pending || String(active.controllerId) !== String(uid)) return
    const peer = String(active.sharingUserId)
    const onKey = (e) => {
      sendControlEvent(peer, { type: 'ctrl_key', event: e.type, key: e.key, code: e.code, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey })
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [remoteControlActive, uid])

  useEffect(() => {
    if (!uid || uid === 'guest' || !currentUser?.isModerator) return
    appGetDoc('reports').then((r) => setReports(Array.isArray(r) ? r : [])).catch(() => {})
  }, [uid, currentUser?.isModerator])

  const [reelmLandingView, setReelmLandingView] = useState('chat')
  const updateReelmLandingView = (val) => {
    setReelmLandingView(val)
    scheduleUserPersist('landing_view', val)
  }
  const joinedReelmIdsRef = useRef(new Set())

  useEffect(() => {
    if (!selectedReelm?.id) return undefined
    socketJoinReelm(selectedReelm.id)
    socketRequestVcCounts(selectedReelm.id)
    return undefined
  }, [selectedReelm?.id])

  const joinedReelmIdsKey = (reelms || []).map(r => String(r.id || '')).filter(Boolean).sort().join('|')
  useEffect(() => {
    if (!uid || uid === 'guest') return undefined
    const ids = new Set(joinedReelmIdsKey ? joinedReelmIdsKey.split('|').filter(Boolean) : [])
    joinedReelmIdsRef.current.forEach((id) => {
      if (!ids.has(id)) {
        socketLeaveReelm(id)
        joinedReelmIdsRef.current.delete(id)
      }
    })
    ids.forEach((id) => {
      if (!joinedReelmIdsRef.current.has(id)) {
        socketJoinReelm(id)
        socketRequestVcCounts(id)
        joinedReelmIdsRef.current.add(id)
      }
    })
    return undefined
  }, [uid, joinedReelmIdsKey])

  // Close reelm settings whenever the active reelm changes or is cleared
  useEffect(() => { setShowReelmSettings(false) }, [selectedReelm?.id])

  useEffect(() => {
    if (!showReelmSettings || !selectedReelm?.id) return undefined
    let cancelled = false
    hydrateReelmCore(selectedReelm.id).then((r) => {
      if (!cancelled && r) mergeReelmIntoState(r)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [showReelmSettings, selectedReelm?.id])


  // Discover: fetch public reelms on open and search on query change.
  useEffect(() => {
    if (!showDiscover) return undefined

    const q = discoverQuery.trim()
    let cancelled = false

    if (!q) {
      setDiscoverUsers([])
      discoverReelms('').then(publicReelms => {
        if (cancelled) return
        const safeReelms = Array.isArray(publicReelms) ? publicReelms : []
        setDiscoverReelmsList(safeReelms)
        const pendingIds = safeReelms.filter(r => r?.pending).map(r => String(r.id)).filter(Boolean)
        if (pendingIds.length) {
          setPendingReelmJoinIds(prev => Array.from(new Set([...prev.map(String), ...pendingIds])))
        }
      }).catch(() => {
        if (!cancelled) setDiscoverReelmsList([])
      })
      return () => { cancelled = true }
    }

    if (q.length < 2) {
      setDiscoverUsers([])
      return undefined
    }

    const timer = window.setTimeout(() => {
      Promise.all([
        usersList(q).catch(() => []),
        discoverReelms(q).catch(() => []),
      ]).then(([users, publicReelms]) => {
        if (cancelled) return
        const safeUsers = Array.isArray(users) ? users.filter(u => !u.isSystem) : []
        const safeReelms = Array.isArray(publicReelms) ? publicReelms : []
        setDiscoverUsers(safeUsers)
        setDiscoverReelmsList(safeReelms)
        const pendingIds = safeReelms.filter(r => r?.pending).map(r => String(r.id)).filter(Boolean)
        if (pendingIds.length) {
          setPendingReelmJoinIds(prev => Array.from(new Set([...prev.map(String), ...pendingIds])))
        }
      }).catch(() => {
        if (!cancelled) {
          setDiscoverUsers([])
          setDiscoverReelmsList([])
        }
      })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [showDiscover, discoverQuery])

  const toggleFriendsPopup = () => { setShowFriendsPopup(v => !v); setShowNotificationsPopup(false) }
  const toggleNotifPopup = () => {
    setShowNotificationsPopup(v => {
      if (!v) setNotifSeenCount(notifications.length)
      setShowFriendsPopup(false)
      return !v
    })
  }
  const goHome = () => {
    setReelmLoading(false)
    setSelectedChat(null)
    setSelectedReelm(null)
    setShowDiscover(false)
    setShowFriendsPanel(false)
    setShowNotificationsPanel(false)
    setShowSettings(false)
    setShowChatList(isMobile)
    setShowFeed(false)
    setShowInsightsModal(null)
    setShowNotificationsPopup(false)
    setFullProfileTarget(null)
  }

  const toggleMuteReelmById = (reelmId) => {
    const id = String(reelmId || '')
    if (!id) return
    setMutedReelmIds(prev => {
      const exists = prev.map(String).includes(id)
      const next = exists ? prev.filter(x => String(x) !== id) : [...prev.map(String), id]
      scheduleUserPersist('muted_reelms', next)
      userPutDoc('muted_reelms', next).catch(() => {})
      return next
    })
  }

  const toggleMuteChatById = (chatId) => {
    const id = String(chatId || '')
    if (!id) return
    setMutedChatIds(prev => {
      const exists = prev.map(String).includes(id)
      const next = exists ? prev.filter(x => String(x) !== id) : [...prev.map(String), id]
      scheduleUserPersist('muted_chats', next)
      userPutDoc('muted_chats', next).catch(() => {})
      return next
    })
  }

  const toggleHideBarItem = (itemId) => {
    const id = String(itemId || '')
    if (!id) return
    setHiddenBarIds(prev => {
      const exists = prev.map(String).includes(id)
      const next = exists ? prev.filter(x => String(x) !== id) : [...prev.map(String), id]
      scheduleUserPersist('hidden_bar_items', next)
      userPutDoc('hidden_bar_items', next).catch(() => {})
      return next
    })
  }

  const clearChatMessages = (chatId) => {
    const id = String(chatId || '')
    if (!id) return
    setMessages(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  const toggleMuteSelectedReelm = () => {
    if (!selectedReelm?.id) return
    toggleMuteReelmById(selectedReelm.id)
  }

  const handleSelectReelm = (reelm) => {
    if (!reelm?.id) return
    const id = String(reelm.id)
    const fromState = (reelmsRef.current || []).find(r => String(r.id) === id)
    const fromCache = REELM_CACHE[id]
    let fromLocal = null
    try {
      const stored = localStorage.getItem(`reelms:reelm_cache:${id}`)
      if (stored) fromLocal = JSON.parse(stored)
    } catch {}

    const full = {
      ...(reelm || {}),
      ...(fromLocal || {}),
      ...(fromCache || {}),
      ...(fromState || {}),
      members: (fromState?.members?.length ? fromState.members : (fromCache?.members?.length ? fromCache.members : (fromLocal?.members?.length ? fromLocal.members : (reelm?.members || [])))),
      roles: (fromState?.roles?.length ? fromState.roles : (fromCache?.roles?.length ? fromCache.roles : (fromLocal?.roles?.length ? fromLocal.roles : (reelm?.roles || [])))),
      categories: (fromState?.categories?.length ? fromState.categories : (fromCache?.categories?.length ? fromCache.categories : (fromLocal?.categories?.length ? fromLocal.categories : (reelm?.categories || [])))),
    }

    setSelectedReelm(full)
    setSelectedChat(null)
    setShowDiscover(false)
    setShowFriendsPanel(false)
    setShowSettings(false)
    setShowChatList(false)
    setReelmLoading(false)
    if (full?.id) {
      hydrateReelmCore(full.id).then(r => r && mergeReelmIntoState(r)).catch(() => {})
    }
    if (reelmLandingView === 'feed') {
      setShowFeed(true)
      setFeedTab('feed')
    } else {
      setShowFeed(false)
    }
  }

  // Clear any stale pending deeplinks so app never auto-selects or redirects to a reelm on startup
  useEffect(() => {
    try { sessionStorage.removeItem('reelms_pending_deeplink') } catch { /* noop */ }
  }, [])

  // Spotify — detect OAuth callback and start/stop polling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('spotify') === 'connected') {
      userPutDoc('spotify_connected', true).catch(() => {})
      setSpotifyConnected(true)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('spotify') === 'error') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [uid])

  useEffect(() => {
    if (!spotifyConnected) { setSpotifyNowPlaying(null); return }
    const poll = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      try {
        const token = await getIdToken().catch(() => null)
        if (!token) return
        const res = await fetch(`${BACKEND_URL}/spotify/now-playing/${uid}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!data.connected) {
          userPutDoc('spotify_connected', false).catch(() => {})
          setSpotifyConnected(false)
          setSpotifyNowPlaying(null)
          setSpotifyInlinePaused(true)
          return
        }
        if (typeof data.playing === 'boolean') {
          setSpotifyInlinePaused(!data.playing)
        }
        setSpotifyNowPlaying(data.playing && data.track ? data.track : null)
      } catch { /* noop */ }
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => clearInterval(id)
  }, [spotifyConnected, uid])

  // Spotify — poll "now playing" for friends shown in the right panel.
  useEffect(() => {
    if (!spotifyConnected) { setSpotifyFriendsNowPlaying({}); return }
    const members = selectedReelm?.members || []
    if (!members.length) { setSpotifyFriendsNowPlaying({}); return }

    const friendSet = new Set((friends || []).map(f => f.id))
    const friendIds = Array.from(new Set(members.map(m => m.userId).filter(id => id && id !== uid && friendSet.has(id)))).slice(0, 8)
    if (!friendIds.length) { setSpotifyFriendsNowPlaying({}); return }

    let cancelled = false
    const poll = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      try {
        const results = await Promise.allSettled(friendIds.map(async (targetUid) => {
          const token = await getIdToken().catch(() => null)
          if (!token) return { uid: targetUid, track: null }
          const res = await fetch(`${BACKEND_URL}/spotify/now-playing/${targetUid}`, { headers: { Authorization: `Bearer ${token}` } })
          const data = await res.json()
          if (data?.connected && data?.playing && data?.track) return { uid: targetUid, track: data.track }
          return { uid: targetUid, track: null }
        }))

        if (cancelled) return
        const next = {}
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.track) {
            next[r.value.uid] = r.value.track
          }
        }
        setSpotifyFriendsNowPlaying(next)
      } catch {
        if (!cancelled) setSpotifyFriendsNowPlaying({})
      }
    }

    poll()
    const id = setInterval(poll, 10000)
    return () => { cancelled = true; clearInterval(id) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnected, uid, selectedReelm?.id, friends])

  const connectSpotify = async () => {
    // Pencereyi hemen aç — async sonrası açılırsa tarayıcı popup blocker devreye girer
    const popup = window.electronAPI?.openExternal ? null : window.open('', '_blank', 'width=500,height=700,noopener')
    try {
      const token = await getIdToken().catch(() => null)
      if (!token) { popup?.close(); return }
      const res = await fetch(`${BACKEND_URL}/spotify/start`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) { popup?.close(); return }
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(data.url)
      } else if (popup) {
        popup.location.href = data.url
      } else {
        window.location.href = data.url
      }
    } catch {
      popup?.close()
    }
  }

  const disconnectSpotify = async () => {
    try {
      const token = await getIdToken().catch(() => null)
      await fetch(`${BACKEND_URL}/spotify/disconnect/${encodeURIComponent(uid)}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
    } catch { /* noop */ }
    userPutDoc('spotify_connected', false).catch(() => {})
    setSpotifyConnected(false)
    setSpotifyNowPlaying(null)
  }

  const handleSpotifyTogglePlay = useCallback(async () => {
    if (spotifyControlsRef.current?.togglePlay) {
      try { spotifyControlsRef.current.togglePlay() } catch {}
    }
    const token = await getIdToken().catch(() => null)
    if (token) {
      try {
        const res = await fetch(`${BACKEND_URL}/spotify/player/toggle`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json().catch(() => ({}))
        if (typeof data.is_playing === 'boolean') {
          setSpotifyInlinePaused(!data.is_playing)
        } else {
          setSpotifyInlinePaused(p => !p)
        }
      } catch (err) {
        console.warn('Spotify toggle failed:', err)
      }
    }
  }, [getIdToken])

  const handleSpotifyNext = useCallback(async () => {
    if (spotifyControlsRef.current?.nextTrack) {
      try { spotifyControlsRef.current.nextTrack() } catch {}
    }
    const token = await getIdToken().catch(() => null)
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/spotify/player/next`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {
        console.warn('Spotify next failed:', err)
      }
    }
  }, [getIdToken])

  const handleSpotifyPrev = useCallback(async () => {
    if (spotifyControlsRef.current?.prevTrack) {
      try { spotifyControlsRef.current.prevTrack() } catch {}
    }
    const token = await getIdToken().catch(() => null)
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/spotify/player/previous`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {
        console.warn('Spotify prev failed:', err)
      }
    }
  }, [getIdToken])


  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      clearInterval(recordingTimerRef.current)
      setIsRecording(false)
      setRecordingSeconds(0)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = ev => setPendingAttachment({ dataUrl: ev.target.result, file, mediaType: 'audio' })
        reader.readAsDataURL(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch (err) {
      console.error('[Voice] Mikrofon erişimi reddedildi:', err)
    }
  }

  function sendPoll() {
    const opts = pollOptions.filter(o => o.trim())
    if (!pollQuestion.trim() || opts.length < 2) return
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return
    const now = Date.now()
    const pollId = createClientMessageId()
    const expiresAt = pollDuration ? now + pollDuration : null
    const pollMsg = {
      id: pollId,
      type: 'poll',
      text: `📊 ${pollQuestion.trim()}`,
      poll: {
        question: pollQuestion.trim(),
        options: opts.map((opt, idx) => ({ id: idx, text: opt.trim(), voters: [] })),
        expiresAt,
        durationLabel: pollDuration === 86400000 ? '1 gün' : pollDuration === 604800000 ? '1 hafta' : 'Süresiz',
        createdAt: now
      },
      sender: { id: currentUser.id, name: currentUser.name, photo: getPersonPhoto(currentUser) || null },
      time: now,
      timestamp: now
    }
    setMessages(prev => appendUniqueMessage(prev, msgKey, pollMsg))
    messageSend(msgKey, pollMsg).catch(err => handleRemoteMessageError(err, msgKey, pollMsg.id))
    setNewMsgId(pollMsg.id)
    setShowPollCreator(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setPollDuration(null)
    setShowPlusMenu(false)
  }

  const handleVotePoll = (chatKey, msgId, optionIdx) => {
    if (!uid) return
    setMessages(prev => {
      const chatMsgs = prev[chatKey] || []
      const nextMsgs = chatMsgs.map(m => {
        if (String(m.id) !== String(msgId) || !m.poll) return m
        if (m.poll.expiresAt && m.poll.expiresAt < Date.now()) return m
        const nextOptions = (m.poll.options || []).map((opt, idx) => {
          const hasVoted = (opt.voters || []).includes(uid)
          if (idx === optionIdx) {
            const newVoters = hasVoted ? opt.voters.filter(v => v !== uid) : [...(opt.voters || []), uid]
            return { ...opt, voters: newVoters }
          } else {
            return { ...opt, voters: (opt.voters || []).filter(v => v !== uid) }
          }
        })
        const updatedMsg = {
          ...m,
          poll: {
            ...m.poll,
            options: nextOptions
          }
        }
        messageEdit(chatKey, msgId, updatedMsg.text, { poll: updatedMsg.poll }).catch(() => {})
        return updatedMsg
      })
      return { ...prev, [chatKey]: nextMsgs }
    })
  }

  // Fetch changelog once on mount
  useEffect(() => {
    if (window.electronAPI) return
    fetch('/changelog.json?_=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setChangelog(data.releases || [])
          setCurrentVersion(data.current || null)
        }
      })
      .catch(() => {})
  }, [])

  const [dashToasts, setDashToasts] = useState([])
  const pushDashToast = useCallback(({ id, text, link = null, action = null, persistent = false }) => {
    setDashToasts(prev => [{ id, text, link, action, persistent }, ...prev].slice(0, 8))
  }, [])
  const dismissDashToast = useCallback((id) => {
    setDashToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const _makeNotif = (text, link = null) => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, text, time: Date.now(), link })
  const addNotification = (text, link = null) => {
    const n = _makeNotif(text, link)
    setNotifications(prev => {
      const next = [n, ...prev]
      scheduleUserPersist('notifications', next)
      return next
    })
    triggerTopTicker({ sender: 'Bildirim', text, link })
  }
  const deleteNotification = (id) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id)
      scheduleUserPersist('notifications', next)
      return next
    })
  }
  const clearAllNotifications = () => {
    setNotifications([])
    setNotifSeenCount(0)
    scheduleUserPersist('notifications', [])
    userPutDoc('notifications', []).catch(() => {})
  }

  const navigateToNotificationLink = (link) => {
    if (!link) return
    if (link.type === 'dm') {
      const chat = chatsRef.current.find(c => (link.chatId && String(c.id) === String(link.chatId)) || (c.type === 'dm' && String(c.friendId) === String(link.userId)))
      if (chat) {
        setSelectedChat(chat)
        setSelectedReelm(null)
        setSelectedChannel(null)
        setShowChatList(false)
        setShowFeed(false)
        setShowDiscover(false)
        clearUnread(chat.id)
      }
    } else if (link.type === 'reelm') {
      const r = reelmsRef.current.find(x => String(x.id) === String(link.reelmId))
      if (r) {
        setSelectedReelm(r)
        setSelectedChat(null)
        setShowChatList(false)
        setShowFeed(false)
        setShowDiscover(false)
        if (link.channelId) {
          const ch = r.categories?.flatMap(c => c.channels || []).find(c => String(c.id) === String(link.channelId))
          if (ch) {
            setSelectedChannel(ch)
            clearReelmChannelUnread(r.id, ch.id)
            if (link.inviteKind === 'voice' && ['voice', 'video', 'liveaction', 'stage'].includes(ch.type)) joinVoiceChannel(r.id, ch.id, ch.name)
          }
        }
      }
    } else if (link.type === 'reelm_join_requests') {
      const r = reelmsRef.current.find(x => String(x.id) === String(link.reelmId))
      if (r) {
        setSelectedReelm(r)
        setSelectedChat(null)
        setShowChatList(false)
        setShowFeed(false)
        setShowDiscover(false)
        setShowReelmSettings(true)
      }
    } else if (link.type === 'reelm_invite') {
      const r = reelmsRef.current.find(x => String(x.id) === String(link.reelmId))
      if (r) {
        setSelectedReelm(r)
        setSelectedChat(null)
        setShowChatList(false)
        setShowFeed(false)
        setShowDiscover(false)
      } else {
        addNotification('Use Accept or Decline on the invite notification.')
      }
      setShowNotificationsPopup(false)
    } else if (link.type === 'friends') {
      setShowFriendsPopup(true)
      setShowNotificationsPopup(false)
      setShowDiscover(false)
      setShowChatList(false)
    } else if (link.type === 'message_requests') {
      setShowMsgRequests(true)
      setSelectedChat(null)
      setSelectedReelm(null)
      setShowNotificationsPopup(false)
    }
  }
  const _pushNotifTo = (targetUid, text, link = null) => {
    void socialNotify(String(targetUid), text, link).catch(() => {})
  }

  const acceptReelmInviteNotification = async (notification) => {
    const reelmId = notification?.link?.reelmId
    if (!reelmId) return
    try {
      const result = await acceptReelmInvite(reelmId)
      if (result?.reelm) {
        mergeReelmIntoState(result.reelm, { persist: true })
        setSelectedReelm(result.reelm)
        setSelectedChat(null)
        setShowChatList(false)
        addNotification(`Joined ${result.reelm.name || 'Reelm'}.`)
      } else if (result?.pending) {
        addNotification('Invite accepted. The server owner/admin will approve your join request.')
      }
      deleteNotification(notification.id)
      setShowNotificationsPopup(false)
    } catch {
      addNotification('Could not accept this invite. It may have expired.')
    }
  }

  const rejectReelmInviteNotification = async (notification) => {
    const reelmId = notification?.link?.reelmId
    try { if (reelmId) await rejectReelmInvite(reelmId) } catch { /* noop */ }
    deleteNotification(notification.id)
  }

  const isFriend = (userId) => friends.some(f => String(f.id) === String(userId))
  const hasSentRequest = (userId) => friendRequestsOut.map(String).includes(String(userId))
  const sendMsgRequest = async (targetUser, preview = '') => {
    try {
      const targetUser_ = (await userProfileGetById(targetUser.id)) || targetUser
      if (targetUser_.allowMessageRequests === false) return
      if (messageRequestsOut.map(String).includes(String(targetUser.id))) return
      await socialMessageRequest(targetUser.id, {
        id: uid,
        name: currentUser.name,
        username: currentUser.username,
        photo: getPersonPhoto(currentUser) || null,
      }, preview)
      setMessageRequestsOut((o) => [...(Array.isArray(o) ? o : []), String(targetUser.id)])
    } catch { /* noop */ }
  }
  const hasSentMsgRequest = (targetId) => messageRequestsOut.map(String).includes(String(targetId))

  const sendFriendRequest = async (targetUser) => {
    try {
      const tid = String(targetUser.id)
      if (!tid || tid === String(uid) || isBlocked(tid)) return
      if (friendRequestsOut.map(String).includes(tid)) return
      const result = await socialFriendRequest(tid, {
        id: uid,
        name: currentUser.name,
        username: currentUser.username,
        photo: getPersonPhoto(currentUser) || null,
      })
      if (result?.alreadyFriends || result?.acceptedReverse) return
      setFriendRequestsOut((o) => [...(Array.isArray(o) ? o : []), tid])
    } catch { /* noop */ }
  }
  const acceptFriendRequest = async (requester) => {
    try {
      await socialFriendAccept(requester, {
        id: uid,
        name: currentUser.name,
        username: currentUser.username,
        photo: getPersonPhoto(currentUser) || null,
      })
      const rid = String(requester.id)
      setFriendRequests((r) => r.filter((x) => String(x.id) !== rid))
      setFriends((f) =>
        f.some((x) => String(x.id) === rid)
          ? f
          : [...f, { id: requester.id, name: requester.name, username: requester.username, photo: requester.photo || null }]
      )
      playSound.friend()
    } catch { /* noop */ }
  }
  const rejectFriendRequest = async (requesterId) => {
    try {
      await socialFriendReject(requesterId)
      const rid = String(requesterId)
      setFriendRequests((r) => r.filter((x) => String(x.id) !== rid))
    } catch { /* noop */ }
  }
  const removeFriend = async (friendId) => {
    if (!friendId || String(friendId) === String(uid) || isReelmsSystemUid(friendId)) return
    const fid = String(friendId)
    try { await socialRemoveFriend(fid) } catch { /* noop */ }
    removeRelationshipLocal(fid)
  }

  const deleteConversation = async (chatId) => {
    const id = String(chatId || selectedChat?.id || '')
    if (!id) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this conversation and clear its messages?')) return
    try { await messageDeleteConversation(id) } catch { /* keep local deletion even if remote clear fails */ }
    setMessages(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setUnreadCounts(prev => {
      const next = { ...prev }
      delete next[id]
      scheduleUserPersist('unread_counts', next)
      userPutDoc('unread_counts', next).catch(() => {})
      return next
    })
    setPinnedItemIds(prev => {
      const next = prev.filter(p => p !== id)
      if (next.length !== prev.length) {
        scheduleUserPersist('pinned_items', next)
        userPutDoc('pinned_items', next).catch(() => {})
      }
      return next
    })
    setChats(prev => {
      const next = prev.filter(c => String(c.id) !== id)
      scheduleUserPersist('chats', next)
      userPutDoc('chats', next).catch(() => {})
      return next
    })
    if (selectedChat?.id === id) setSelectedChat(null)
  }
  const clearUnread = (barKey) => {
    setUnreadCounts(prev => {
      if (!prev[barKey]) return prev
      const next = { ...prev }
      delete next[barKey]
      scheduleUserPersist('unread_counts', next)
      return next
    })
  }
  const clearReelmChannelUnread = (reelmId, channelId) => {
    const rid = String(reelmId || '')
    const cid = String(channelId || '')
    if (!rid || !cid) return
    const channelKey = `${rid}_${cid}`
    setUnreadCounts(prev => {
      if (!prev[channelKey] && !prev[rid]) return prev
      const next = { ...prev }
      delete next[channelKey]
      const remaining = Object.entries(next).reduce((sum, [key, val]) => {
        return key.startsWith(`${rid}_`) ? sum + (Number(val) || 0) : sum
      }, 0)
      if (remaining > 0) next[rid] = remaining
      else delete next[rid]
      scheduleUserPersist('unread_counts', next)
      return next
    })
  }
  const [friendProfileTarget, setFriendProfileTarget] = useState(null) // { friend, anchorRect }
  const [expandedProfileRolesUserId, setExpandedProfileRolesUserId] = useState(null)
  const [showFriendSelector, setShowFriendSelector] = useState(false)
  const [friendSelectorQuery, setFriendSelectorQuery] = useState('')
  const [dmProfileExpanded, setDmProfileExpanded] = useState(false)
  const [showDmFriendMenu, setShowDmFriendMenu] = useState(false)
  const [dmFriendProfile, setDmFriendProfile] = useState(null)
  const [dmSideTab, setDmSideTab] = useState('profile') // 'profile' | 'vapor'
  const setGroupSideTab = () => {} // reserved for future use
  const [vaporDurations, setVaporDurations] = useState({}) // { [chatId]: duration_ms | 'read' | null }
  const [showGroupCreator, setShowGroupCreator] = useState(null) // null | 'friends' | 'setup'
  const [groupSelectedFriends, setGroupSelectedFriends] = useState([])
  const [groupNameInput, setGroupNameInput] = useState('')
  const [groupPhotoInput, setGroupPhotoInput] = useState(null)
  const groupPhotoInputRef = useRef(null)
  const groupEditPhotoInputRef = useRef(null)
  const [groupNameEditing, setGroupNameEditing] = useState(false)
  const [groupNameEditValue, setGroupNameEditValue] = useState('')
  const [groupSideExpanded, setGroupSideExpanded] = useState(null) // null | 'permissions' | 'vapor'
  const [recentlyBumpedChatId, setRecentlyBumpedChatId] = useState(null)
  const [pinnedItemIds, setPinnedItemIds] = useState([])

  const activeDataUidRef = useRef(uid)
  useEffect(() => {
    if (activeDataUidRef.current === uid) return
    activeDataUidRef.current = uid
    setChats([])
    let cachedReelmsForUid = []
    try {
      if (uid && uid !== 'guest') {
        const rawCachedReelms = localStorage.getItem(`reelms:member-reelms:${uid}`)
        const parsedCachedReelms = rawCachedReelms ? JSON.parse(rawCachedReelms) : []
        if (Array.isArray(parsedCachedReelms)) cachedReelmsForUid = parsedCachedReelms
      }
    } catch { cachedReelmsForUid = [] }
    setReelms(cachedReelmsForUid)
    setSelectedChat(null)
    setSelectedReelm(null)
    setSelectedChannel(null)
    setFriends([])
    setBlocked([])
    setMsgRequests([])
    setFriendRequests([])
    setFriendRequestsOut([])
    setMessageRequestsOut([])
    setNotifications([])
    setUnreadCounts({})
    setPinnedItemIds([])
    setLastChannels({})
    setSessionsList([])
    setChatProfileCache({})
    profileLookupCacheRef.current.clear()
    setChatListFilter('all')
    try { Object.keys(REELM_CACHE || {}).forEach(k => { delete REELM_CACHE[k] }) } catch {}
  }, [uid])

  const saveNickname = (friendId, nick) => {
    if (isReelmsSystemUid(friendId)) return
    const next = { ...nicknames, [friendId]: nick }
    if (!nick) delete next[friendId]
    setNicknames(next)
    scheduleUserPersist('nicknames', next)
  }

  const openFriendProfile = (friend, e, opts = {}) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (!friend?.id) return
    const fid = String(friend.id)
    const isSelfUser = String(fid) === String(uid)

    // If clicking own avatar or name in chat messages, member list, etc:
    if (isSelfUser) {
      setFriendProfileTarget(null)
      if (isMobile) {
        setFullProfileTarget({ isSelf: true, user: currentUser })
      } else {
        setShowProfilePopup(prev => !prev)
      }
      return
    }

    if (isMobile) {
      setFullProfileTarget({ isSelf: false, user: friend })
      userProfileGetById(fid).then(data => {
        if (!data) return
        const merged = { ...friend, ...data, id: fid }
        setFullProfileTarget(prev => prev?.user && String(prev.user.id || prev.user.uid || '') === fid ? { ...prev, user: merged } : prev)
      }).catch(() => {})
      return
    }
    const domRect = e?.currentTarget?.getBoundingClientRect?.() || e?.target?.getBoundingClientRect?.()
    const rect = domRect ? {
      top: domRect.top,
      bottom: domRect.bottom,
      left: domRect.left,
      right: domRect.right,
      width: domRect.width,
      height: domRect.height,
    } : { top: 96, bottom: 112, left: Math.max(8, window.innerWidth - 338), right: window.innerWidth - 18, width: 32, height: 32 }
    const inServerSurface = !!(opts.serverContext || e?.currentTarget?.closest?.('.rp-members-panel, .reelm-channel-voice-users, .voice-participants, .voice-bar-participants'))
    const cached = profileLookupCacheRef.current.get(fid)
    const cachedProfile = cached && (Date.now() - Number(cached.at || 0) < PROFILE_LOOKUP_CACHE_TTL_MS) ? cached.profile : null
    const target = { friend: cachedProfile ? { ...friend, ...cachedProfile } : friend, anchorRect: rect, serverContext: inServerSurface ? 'reelm' : null }
    setShowProfilePopup(false)
    setFriendProfileTarget(target)
    userProfileGetById(fid).then(data => {
      if (!data) return
      const merged = { ...friend, ...data, id: fid }
      profileLookupCacheRef.current.set(fid, { profile: merged, at: Date.now() })
      setChatProfileCache(prev => sameDocValue(prev?.[fid], merged) ? prev : { ...prev, [fid]: merged })
      setFriendProfileTarget(prev => prev?.friend && String(prev.friend.id || prev.friend.uid || '') === fid ? { ...prev, friend: { ...prev.friend, ...merged } } : prev)
    }).catch(() => {})
  }

  const dmConvId = (uid1, uid2) => `dm_${[uid1, uid2].sort().join('_')}`
  const msgKeyToUnreadKey = (key) => {
    const k = String(key || '')
    if (!k) return ''
    if (chatsRef.current.some(c => String(c.id) === k)) return k
    const reelm = reelmsRef.current.find(r => k === String(r.id) || k.startsWith(`${r.id}_`))
    return reelm?.id || k
  }

  const bumpUnreadForMsgKey = (msgKey, delta = 1) => {
    const key = String(msgKey || '')
    if (!key || delta <= 0) return
    const barKey = msgKeyToUnreadKey(key)
    setUnreadCounts(prev => {
      const next = { ...prev }
      next[barKey] = Number(next[barKey] || 0) + delta
      if (barKey !== key) next[key] = Number(next[key] || 0) + delta
      scheduleUserPersist('unread_counts', next)
      return sameDocValue(prev, next) ? prev : next
    })
  }

  const startDM = (friend) => {
    if (!friend?.id || String(friend.id) === String(uid)) return
    const convId = dmConvId(uid, friend.id)
    const existing = chats.find(c => c.convId === convId)
    if (existing) {
      setSelectedChat(existing)
      setSelectedReelm(null)
      setShowFriendSelector(false)
      setShowMenu(false)
      setCreateReelmStep(null)
      clearUnread(convId)
      return
    }
    const newChat = {
      id: convId,
      convId,
      name: nicknames[friend.id] || friend.name,
      friendId: friend.id,
      type: 'dm',
      photo: friend.photo || null,
      updatedAt: Date.now()
    }
    setChats(prev => [newChat, ...prev])
    setSelectedChat(newChat)
    setSelectedReelm(null)
    setShowFriendSelector(false)
    setShowMenu(false)
    setCreateReelmStep(null)
  }

  const createGroup = () => {
    const members = [
      { id: uid, name: currentUser.name, photo: getPersonPhoto(currentUser) || null },
      ...groupSelectedFriends.map(f => ({ id: f.id, name: nicknames[f.id] || f.name, photo: f.photo || null }))
    ]
    const autoName = groupNameInput.trim() || (() => {
      const names = [...groupSelectedFriends.map(f => nicknames[f.id] || f.name), 'you']
      return names.join(', ')
    })()
    const groupId = `group_${Date.now()}`
    const newGroup = {
      id: groupId,
      type: 'group',
      name: autoName,
      photo: groupPhotoInput || null,
      members,
      ownerId: uid,
      createdAt: Date.now(),
      createdByName: currentUser.name,
      updatedAt: Date.now()
    }
    setChats(prev => [newGroup, ...prev])
    setSelectedChat(newGroup)
    setSelectedReelm(null)
    setShowGroupCreator(null)
    setGroupSelectedFriends([])
    setGroupNameInput('')
    setGroupPhotoInput(null)
    setShowMenu(false)
    setCreateReelmStep(null)
  }

  const [selectedChat, setSelectedChat] = useState(null)
  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
  const [profileStatus, setProfileStatusRaw] = useState('online')
  const [reelmPresence, setReelmPresence] = useState({}) // { [reelmId]: { [userId]: { status, userName, userPhoto } } }
  const [lastSeenMap, setLastSeenMap] = useState({}) // { [userId]: timestamp } — last time user was seen online
  useEffect(() => {
    const now = Date.now()
    setLastSeenMap(prev => {
      const next = { ...prev }
      let changed = false
      Object.values(reelmPresence || {}).forEach(users => {
        Object.entries(users || {}).forEach(([userId, data]) => {
          if (isActiveStatus(data?.status) && (!prev[userId] || now - prev[userId] > 30000)) {
            next[userId] = now; changed = true
          }
        })
      })
      return changed ? next : prev
    })
  }, [reelmPresence])
  const getPresenceForUser = useCallback((userId) => {
    const id = String(userId || '')
    if (!id) return null
    if (String(uid) === id) {
      return { userId: id, status: profileStatus || 'online', userName: currentUser?.name || 'You', userPhoto: getPersonPhoto(currentUser) || null }
    }
    for (const users of Object.values(reelmPresence || {})) {
      const hit = users?.[id]
      if (hit) return { userId: id, ...hit }
    }
    return null
  }, [reelmPresence, uid, profileStatus, currentUser?.name, currentUser?.photo])
  const getUserStatus = useCallback((userId) => getPresenceForUser(userId)?.status || 'offline', [getPresenceForUser])
  const isUserActive = useCallback((userId) => isActiveStatus(getUserStatus(userId)), [getUserStatus])
  const getLastSeenLabel = useCallback((userId) => {
    const id = String(userId || '')
    if (!id) return null
    if (isUserActive(id)) return 'Çevrimiçi'
    const ts = lastSeenMap[id]
    if (!ts) return null
    const d = new Date(ts)
    const now = new Date()
    const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === now.toDateString()) return `Son görülme: ${timeStr}`
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `Son görülme: dün ${timeStr}`
    return `Son görülme: ${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${timeStr}`
  }, [lastSeenMap, isUserActive])
  const updateProfileStatus = useCallback((status) => {
    setProfileStatusRaw(status)
    socketSetPresenceStatus(status)
  }, [])
  useEffect(() => { socketSetPresenceStatus(profileStatus) }, [profileStatus])
  const [profileBio, setProfileBio] = useState(() => currentUser?.bio || '')
  const [profileSocialLinks, setProfileSocialLinks] = useState({})
  const [profileActivePlatforms, setProfileActivePlatforms] = useState(['instagram', 'tiktok'])
  const [profilePrefsLoaded, setProfilePrefsLoaded] = useState(false)
  useEffect(() => {
    if (!currentUser?.id) return
    setProfileBio(currentUser.bio || '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])
  const PANEL_LEFT_DEFAULT = 254
  const PANEL_RIGHT_DEFAULT = 276
  const [leftWidth, setLeftWidth] = useState(PANEL_LEFT_DEFAULT)
  const [rightWidth, setRightWidth] = useState(PANEL_RIGHT_DEFAULT)
  const dragState = useRef(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [mobileLeftPanelOpen, setMobileLeftPanelOpen] = useState(false)
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false)
  const mobileTouchRef = useRef(null)

  const [voiceDockPos, setVoiceDockPos] = useState(null)
  const [isDraggingVoiceDock, setIsDraggingVoiceDock] = useState(false)
  const voiceDockDragRef = useRef(null)

  const handleVoiceDockDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return
    e.preventDefault()
    setIsDraggingVoiceDock(true)
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    voiceDockDragRef.current = { offsetX, offsetY, w: rect.width, h: rect.height }

    const onMove = (moveEvent) => {
      const { offsetX: ox, offsetY: oy, w, h } = voiceDockDragRef.current || {}
      const x = Math.max(8, Math.min(window.innerWidth - (w || 260) - 8, moveEvent.clientX - ox))
      const y = Math.max(8, Math.min(window.innerHeight - (h || 60) - 8, moveEvent.clientY - oy))
      setVoiceDockPos({ x, y })
    }
    const onUp = () => {
      setIsDraggingVoiceDock(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleVoiceDockTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return
    const touch = e.touches[0]
    if (!touch) return
    setIsDraggingVoiceDock(true)
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const offsetX = touch.clientX - rect.left
    const offsetY = touch.clientY - rect.top
    voiceDockDragRef.current = { offsetX, offsetY, w: rect.width, h: rect.height }

    const onMove = (moveEvent) => {
      const t = moveEvent.touches[0]
      if (!t) return
      const { offsetX: ox, offsetY: oy, w, h } = voiceDockDragRef.current || {}
      const x = Math.max(8, Math.min(window.innerWidth - (w || 260) - 8, t.clientX - ox))
      const y = Math.max(8, Math.min(window.innerHeight - (h || 60) - 8, t.clientY - oy))
      setVoiceDockPos({ x, y })
    }
    const onUp = () => {
      setIsDraggingVoiceDock(false)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onUp)
  }
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const barScrollRef = useRef(null)
  const barPositionsRef = useRef({})
  useEffect(() => { scheduleUserPersist('lpw', String(leftWidth)) }, [leftWidth])
  useEffect(() => { scheduleUserPersist('rpw', String(rightWidth)) }, [rightWidth])
  const barInitializedRef = useRef(false)
  const barPrevIdSetRef = useRef(null)
  useLayoutEffect(() => {
    const container = barScrollRef.current
    if (!container) return
    const items = container.querySelectorAll('[data-bar-id]')
    // Reset any in-progress transforms before measuring so getBoundingClientRect returns the true DOM position
    items.forEach(el => { el.style.transition = 'none'; el.style.transform = '' })
    const currentIds = Array.from(items).map(el => el.dataset.barId)
    const prevIdSet = barPrevIdSetRef.current
    const setChanged = !prevIdSet || currentIds.length !== prevIdSet.size || currentIds.some(id => !prevIdSet.has(id))
    barPrevIdSetRef.current = new Set(currentIds)
    const prev = barPositionsRef.current
    const next = {}
    items.forEach(el => { next[el.dataset.barId] = el.getBoundingClientRect().top })
    const hadPrev = barInitializedRef.current
    barInitializedRef.current = true
    barPositionsRef.current = next
    if (!hadPrev || setChanged) return
    items.forEach(el => {
      const id = el.dataset.barId
      const prevTop = prev[id]
      const currTop = next[id]
      if (prevTop === undefined || currTop === undefined) return
      const dy = prevTop - currTop
      if (Math.abs(dy) < 2) return
      el.style.transform = `translateY(${dy}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.2, 0.64, 1)'
        el.style.transform = ''
        el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transform = '' }, { once: true })
      })
    })
  })
  // Remote control requests now arrive via socketVcSignal (vc:event), handled in handleVcEvent
  useEffect(() => {
    if (!profilePrefsLoaded) return
    scheduleUserPersist('sociallinks', profileSocialLinks)
    userProfilePatch({ sociallinks: profileSocialLinks }).catch(() => {})
  }, [profileSocialLinks, profilePrefsLoaded])
  useEffect(() => {
    if (!profilePrefsLoaded) return
    scheduleUserPersist('socialorder', profileActivePlatforms)
    userProfilePatch({ socialorder: profileActivePlatforms }).catch(() => {})
  }, [profileActivePlatforms, profilePrefsLoaded])
  useEffect(() => {
    if (!uid || chats.length === 0) return
    const toSave = chats.map(c => {
      const clean = { ...c }
      if (clean.photo?.startsWith('data:')) clean.photo = null
      if (clean.members) clean.members = clean.members.map(m => ({
        ...m, photo: m.photo?.startsWith('data:') ? null : m.photo
      }))
      return clean
    })
    scheduleUserPersist('chats', toSave)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats])
  const [messages, setMessages] = useState({})
  const [messageInput, setMessageInput] = useState('')
  const messageInputRef = useRef('')
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const [slashMenu, setSlashMenu] = useState(null)
  const [slashSelIdx, setSlashSelIdx] = useState(0)
  const [typingUsers, setTypingUsers] = useState({})
  const typingTimers = useRef({})
  const typingEmitTimer = useRef(null)
  const isTypingRef = useRef(false)
  const [dmReadReceipts, setDmReadReceipts] = useState({})
  const [msgReactions, setMsgReactions] = useState({})
  const [showMsgEmojiFor, setShowMsgEmojiFor] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [pinnedMessages, setPinnedMessages] = useState({})
  const [msgCtxMenu, setMsgCtxMenu] = useState(null)

  const canPinInChannel = selectedChat
    ? !isReelmsSystemChat(selectedChat)
    : Boolean(selectedReelm?.ownerId === uid || hasReelmPermissionClient(selectedReelm, uid, 'pinMessages') || hasReelmPermissionClient(selectedReelm, uid, 'manageModeration') || hasReelmPermissionClient(selectedReelm, uid, 'manageReelm'))

  useEffect(() => {
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return
    pinsGet(msgKey).then(p => {
      setPinnedMessages(prev => ({ ...prev, [msgKey]: p || null }))
    }).catch(() => {})
  }, [selectedChat?.id, selectedReelm?.id, selectedChannel?.id])

  const handlePinMessage = (chatKey, msg) => {
    const pinPayload = {
      id: msg.id,
      text: msg.text || '',
      sender: msg.sender || { name: 'Member', photo: null },
      time: msg.time,
      mediaUrl: msg.mediaUrl || null,
      mediaType: msg.mediaType || null,
    }
    setPinnedMessages(prev => ({ ...prev, [chatKey]: pinPayload }))
    pinSet(chatKey, pinPayload).catch(() => {
      setModerationWarning('Could not pin message.')
      setTimeout(() => setModerationWarning(''), 3000)
    })
  }

  const handleUnpinMessage = (chatKey) => {
    setPinnedMessages(prev => {
      const next = { ...prev }
      delete next[chatKey]
      return next
    })
    pinSet(chatKey, null).catch(() => {
      setModerationWarning('Could not unpin message.')
      setTimeout(() => setModerationWarning(''), 3000)
    })
  }
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const [fmtMenu, setFmtMenu] = useState(null)
  const [fmtColorOpen, setFmtColorOpen] = useState(false)
  useEffect(() => {
    if (!showMsgEmojiFor) return undefined
    const handler = (e) => {
      if (!e.target.closest('.msg-react-emoji-wrap') && !e.target.closest('.msg-emoji-picker-wrap')) setShowMsgEmojiFor(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMsgEmojiFor])
  useEffect(() => {
    if (!fmtMenu) return undefined
    const close = (e) => { if (!e.target.closest?.('.fmt-menu')) { setFmtMenu(null); setFmtColorOpen(false) } }
    const onKey = (e) => { if (e.key === 'Escape') { setFmtMenu(null); setFmtColorOpen(false) } }
    const onScroll = () => { setFmtMenu(null); setFmtColorOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true) }
  }, [fmtMenu])
  useEffect(() => {
    if (!msgCtxMenu) return undefined
    const handler = (e) => {
      if (!e.target.closest('.msg-ctx-menu-fixed')) setMsgCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [msgCtxMenu])

  const msgLongPressTimerRef = useRef(null)
  const msgTouchStartPosRef = useRef({ x: 0, y: 0 })

  const handleMsgTouchStart = (e, msg, chatKey, canDelete, isOwn, canPin, isPinned) => {
    const touch = e.touches?.[0]
    if (!touch) return
    msgTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    if (msgLongPressTimerRef.current) clearTimeout(msgLongPressTimerRef.current)
    msgLongPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) try { navigator.vibrate(40) } catch {}
      setMsgCtxMenu({
        x: Math.min(touch.clientX, window.innerWidth - 160),
        y: Math.min(touch.clientY, window.innerHeight - 120),
        msgId: msg.id,
        chatKey,
        canDelete,
        canPin: Boolean(canPin),
        isPinned: Boolean(isPinned),
        msgData: { id: msg.id, text: msg.text || '', sender: msg.sender, time: msg.time, mediaUrl: msg.mediaUrl, mediaType: msg.mediaType },
        isOwn: Boolean(isOwn ?? (String(msg?.sender?.id || msg?.userId || '') === String(uid))),
        msgText: msg.text || '',
        replyInfo: { id: msg.id, text: msg.text || '', senderName: msg.sender?.name || '', senderId: msg.sender?.id }
      })
    }, 450)
  }

  const handleMsgTouchMove = (e) => {
    const touch = e.touches?.[0]
    if (!touch) return
    const dx = Math.abs(touch.clientX - msgTouchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - msgTouchStartPosRef.current.y)
    if (dx > 10 || dy > 10) {
      if (msgLongPressTimerRef.current) clearTimeout(msgLongPressTimerRef.current)
    }
  }

  const handleMsgTouchEnd = () => {
    if (msgLongPressTimerRef.current) clearTimeout(msgLongPressTimerRef.current)
  }
  const [lightboxImg, setLightboxImg] = useState(null)
  const [discoverCategory, setDiscoverCategory] = useState('all')
  const [showInputEmoji, setShowInputEmoji] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifTab, setGifTab] = useState('gif')
  const [gifSearch, setGifSearch] = useState('')
  const [gifResults, setGifResults] = useState([])
  const [gifLoading, setGifLoading] = useState(false)
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionSelIdx, setMentionSelIdx] = useState(0)
  const [newMsgId, setNewMsgId] = useState(null)
  const [moderationWarning, setModerationWarning] = useState('')
  useEffect(() => {
    const el = msgListRef.current
    if (!el) return undefined
    // Jump to the newest message. Scroll once now, then again after the next
    // paint so a channel switch lands at the bottom even before row heights
    // (avatars/images) have fully settled.
    const toBottom = () => { el.scrollTop = el.scrollHeight }
    toBottom()
    const raf = requestAnimationFrame(toBottom)
    return () => cancelAnimationFrame(raf)
  }, [messages, selectedChat, selectedReelm, selectedChannel?.id])
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [barCtxMenu, setBarCtxMenu] = useState(null) // { x, y, item }

  useEffect(() => {
    if (!barCtxMenu) return
    const handler = (e) => { if (!e.target.closest('.bar-ctx-menu')) setBarCtxMenu(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [barCtxMenu])

  useEffect(() => {
    if (!showChatFilterMore) return
    const handler = (e) => { if (!e.target.closest('.chat-list-filter-more-wrap')) setShowChatFilterMore(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showChatFilterMore])

  useEffect(() => {
    if (!openFolderId) return
    const handler = (e) => {
      if (!e.target.closest('.bar-folder-drawer') && !e.target.closest('.bar-item--folder')) {
        setOpenFolderId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openFolderId])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragState.current) return
      const dx = e.clientX - dragState.current.startX
      if (dragState.current.side === 'left') {
        setLeftWidth(Math.max(140, Math.min(320, dragState.current.startWidth + dx)))
      } else {
        setRightWidth(Math.max(140, Math.min(320, dragState.current.startWidth - dx)))
      }
    }
    const onMouseUp = () => { dragState.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const prevMessagesRef = useRef(null)
  useEffect(() => {
    // Unread counters are bumped by the socket message handler. Keeping this
    // effect passive prevents feedback loops when history hydration normalizes
    // Date/id shapes and writes the same messages back into state.
    prevMessagesRef.current = messages
  }, [messages])

  useEffect(() => {
    const msgKey = selectedChat
      ? selectedChat.id
      : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return

    // Immediately load from offline cache so messages are visible instantly
    const localCached = getCachedMessages(msgKey)
    if (localCached.length > 0) {
      setMessages(prev => (prev[msgKey]?.length ? prev : { ...prev, [msgKey]: localCached }))
    }

    const vanishExpired = (m, now) => {
      const v = m.vanishAt
      if (v == null) return false
      const ms = typeof v === 'number' ? v : null
      if (ms == null) return false
      return ms <= now
    }
    const msgTimeToDate = (t) => {
      if (t instanceof Date) return t
      if (typeof t === 'number') return new Date(t)
      return new Date()
    }
    const now = Date.now()
    messagesGet(msgKey).then(async msgs => {
      let processed = msgs
      if (msgKey.startsWith('dm_')) {
        // Attempt to decrypt legacy E2EE messages; new messages are sent as plaintext.
        // getOrCreateKeyPair (not getKeyPair) avoids a race condition where the app-load
        // key-registration hasn't resolved yet but the DM is already opening.
        const peerUid = msgKey.slice(3).split('_').find(id => id !== String(uid)) || ''
        const [myKeys, peerPk] = await Promise.all([
          getOrCreateKeyPair().catch(() => null),
          peerUid ? e2eeGetPublicKey(peerUid).catch(() => null) : Promise.resolve(null),
        ])
        processed = await Promise.all(msgs.map(async m => {
          if (!m.enc || !m.text) return m
          const senderUid = String(m.sender?.id || m.userId || m.authorId || '')
          if (myKeys && peerPk) {
            try {
              const plaintext = decryptFromSender(m.text, peerPk, myKeys.secretKey)
              if (plaintext != null) return { ...m, text: plaintext }
            } catch {}
          }
          if (senderUid === String(uid)) {
            const cached = getSentPlaintext(String(m.id))
            if (cached) return { ...m, text: cached }
          }
          return { ...m, text: '🔒 Şifreli mesaj — anahtar bu cihazda mevcut değil.' }
        }))
      }
      const filtered = dedupeMessagesForRender(processed.filter(m => !vanishExpired(m, now)))
      saveCachedMessages(msgKey, filtered)
      setMessages(prev => {
        const current = prev[msgKey] || []
        return sameMessageList(current, filtered) ? prev : { ...prev, [msgKey]: filtered }
      })
    }).catch(() => {})
    socketJoinChannel(msgKey)
    // Only leave reelm channels on switch (to free server resources when navigating channels).
    // DM/group channels must stay joined so background messages update the bar in real-time.
    return () => { if (!selectedChat) socketLeaveChannel(msgKey) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.id, selectedReelm?.id, selectedChannel?.id])

  useEffect(() => { setDmProfileExpanded(false); setDmFriendProfile(null); setShowDmFriendMenu(false); setDmSideTab('profile'); setGroupSideTab('members') }, [selectedChat?.id])
  useEffect(() => {
    if (isReelmsSystemChat(selectedChat) && dmSideTab !== 'profile') setDmSideTab('profile')
  }, [selectedChat?.id, dmSideTab])

  useEffect(() => {
    if (selectedChat?.type !== 'dm' || !selectedChat.friendId || isReelmsSystemChat(selectedChat)) return
    userProfileGetById(selectedChat.friendId).then(data => { if (data) setDmFriendProfile(data) }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.friendId])

  useEffect(() => {
    if (!channelCtxMenu) return
    const handler = (e) => {
      if (!e.target.closest('.reelm-channel-ctx-menu')) setChannelCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [channelCtxMenu])

  useEffect(() => {
    if (!eventCtxMenu) return
    const handler = (e) => {
      if (!e.target.closest('.reelm-channel-ctx-menu')) setEventCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [eventCtxMenu])

  useEffect(() => {
    if (!openCategoryMenu) return
    const handler = (e) => {
      if (!e.target.closest('.reelm-category-ctx-menu')) setOpenCategoryMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openCategoryMenu])

  useEffect(() => {
    if (!chatCtxMenu) return
    const handler = (e) => {
      if (!e.target.closest('.chat-ctx-menu')) setChatCtxMenu(null)
    }
    const keyHandler = (e) => {
      if (e.key === 'Escape') setChatCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [chatCtxMenu])

  useEffect(() => {
    if (!showReelmMenu && !showReelmInfoMenu) return
    const handler = (e) => {
      if (!e.target.closest('.reelm-name-menu') && !e.target.closest('.reelm-info-menu') && !e.target.closest('.reelm-sidebar-name') && !e.target.closest('.reelm-sidebar-name-row')) {
        setShowReelmMenu(null)
        setShowReelmInfoMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showReelmMenu, showReelmInfoMenu])

  useEffect(() => {
    if (!showDmFriendMenu) return
    const handler = (e) => {
      if (!e.target.closest('.dm-friend-ctx-menu') && !e.target.closest('.dm-friend-name')) setShowDmFriendMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDmFriendMenu])

  const lastChannelPersistRef = useRef('')
  useEffect(() => {
    if (!selectedReelm?.id || !selectedChannel?.id || uid === 'guest') return
    if (!findReelmChannel(selectedReelm, selectedChannel.id)) return
    const pairKey = `${selectedReelm.id}:${selectedChannel.id}`
    if (lastChannelPersistRef.current === pairKey) return
    lastChannelPersistRef.current = pairKey
    setLastChannels((prev) => {
      if (prev[selectedReelm.id] === selectedChannel.id) return prev
      const next = { ...prev, [selectedReelm.id]: selectedChannel.id }
      scheduleUserPersist('last_channels', next)
      return next
    })
  }, [selectedChannel?.id, selectedReelm?.id, uid])

  useEffect(() => {
    if (!selectedReelm) { setSelectedChannel(prev => prev == null ? prev : null); return }
    const allChannels = getReelmChannels(selectedReelm)
    const currentStillValid = selectedChannel?.id && allChannels.some(ch => String(ch.id) === String(selectedChannel.id))
    if (currentStillValid) return
    const lastChId = lastChannels?.[selectedReelm.id]
    const lastCh = lastChId ? allChannels.find(ch => String(ch.id) === String(lastChId)) : null
    const defaultCh = (selectedReelm.categories || []).find(c => c.type === 'announcement')?.channels?.[0] || allChannels[0] || null
    const pick = lastCh || defaultCh || null
    setSelectedChannel((prev) => (String(prev?.id || '') === String(pick?.id || '') ? prev : pick))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReelm?.id, selectedChannel?.id, lastChannels?.[selectedReelm?.id]])

  // Flying rooms: tick for live countdown display
  useEffect(() => {
    const id = setInterval(() => setFlyingRoomTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Flying rooms: auto-expire
  const reelmsRef = useRef([])
  useEffect(() => { reelmsRef.current = reelms }, [reelms])
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      const toAnnounce = []
      reelmsRef.current.forEach(r => {
        r.categories.forEach(c => {
          c.channels.forEach(ch => {
            if (ch.isFlyingRoom && ch.expiresAt <= now) {
              const annChId = r.announcementChannelId || r.categories.find(cat => cat.type === 'announcement')?.channels?.[0]?.id
              if (annChId) toAnnounce.push({ reelmId: r.id, channelName: ch.name, annChId })
            }
          })
        })
      })
      setReelms(prev => {
        let changed = false
        const next = prev.map(r => ({
          ...r,
          categories: r.categories.map(c => {
            const filtered = c.channels.filter(ch => !ch.isFlyingRoom || ch.expiresAt > now)
            if (filtered.length !== c.channels.length) changed = true
            return { ...c, channels: filtered }
          })
        }))
        if (!changed) return prev
        return next
      })
      setSelectedReelm(prev => {
        if (!prev) return prev
        return {
          ...prev,
          categories: prev.categories.map(c => ({
            ...c,
            channels: c.channels.filter(ch => !ch.isFlyingRoom || ch.expiresAt > now)
          }))
        }
      })
      setSelectedChannel(prev => (prev?.isFlyingRoom && prev.expiresAt <= now) ? null : prev)
      toAnnounce.forEach(({ reelmId, channelName, annChId }) => {
        postSystemMessage(reelmId, annChId, `✦ ${channelName} has flown away.`)
      })
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const createFlyingRoom = (reelmId, catId, name, durationMs) => {
    const reelm = reelmsRef.current.find(r => r.id === reelmId) || selectedReelm
    const cat = reelm?.categories.find(c => c.id === catId)
    if (!cat) return
    const channelName = name.trim() || 'flying-room'
    const newChannel = {
      id: 'fr-' + Date.now(),
      name: channelName,
      type: cat.type === 'announcement' ? 'text' : cat.type,
      isFlyingRoom: true,
      expiresAt: Date.now() + durationMs,
      ...(cat.type === 'voice' ? { capacity: 8, current: 0 } : {})
    }
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : { ...c, channels: [...c.channels, newChannel] })
    })
    setReelms(prev => prev.map(r => r.id !== reelmId ? r : updater(r)))
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setSelectedChannel(newChannel)
    const durLabel = FLYING_ROOM_DURATIONS.find(d => d.ms === durationMs)?.label || formatTimeLeft(Date.now() + durationMs)
    const annChId = reelm.announcementChannelId || reelm.categories.find(c => c.type === 'announcement')?.channels?.[0]?.id
    if (annChId) {
      postSystemMessage(reelmId, annChId, `✦ ${currentUser.name} created a vapor room called "${channelName}" — Join before the room goes vapor in ${durLabel}.`)
    }
  }

  const STUN = {
    iceServers: voiceIceServers || [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  }

  const playRemoteStream = (userId, stream) => {
    // Hidden audio element is the most reliable autoplay/playback path after
    // both users clicked Join. The WebAudio path below adds spatial audio when enabled.
    let audioEl = remoteAudioElementsRef.current[userId]
    if (!audioEl) {
      audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioEl.playsInline = true
      audioEl.style.display = 'none'
      document.body.appendChild(audioEl)
      remoteAudioElementsRef.current[userId] = audioEl
    }
    if (audioEl.srcObject !== stream) audioEl.srcObject = stream
    audioEl.muted = voiceDeafened
    audioEl.volume = voiceDeafened ? 0 : 1
    audioEl.play?.().catch(() => {})

    // Clean up previous nodes for this user
    const old = remoteAudiosRef.current[userId]
    if (old?.source) { try { old.source.disconnect() } catch { /* noop */ } }
    if (old?.panner) { try { old.panner.disconnect() } catch { /* noop */ } }

    // Create or resume AudioContext
    if (!spatialContextRef.current || spatialContextRef.current.state === 'closed') {
      spatialContextRef.current = new AudioContext()
      const l = spatialContextRef.current.listener
      if (l.positionX) { l.positionX.value = 0; l.positionY.value = 0; l.positionZ.value = 0 }
      else l.setPosition(0, 0, 0)
    }
    const ctx = spatialContextRef.current
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    const source = ctx.createMediaStreamSource(stream)
    const { enabled, depth } = spatialSettingsRef.current
    audioEl.muted = Boolean(enabled)
    const spread = (depth / 50) * 10

    if (!enabled) {
      pannerNodesRef.current[userId] = null
      remoteAudiosRef.current[userId] = { source, panner: null }
      return
    }

    const panner = ctx.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 15
    panner.rolloffFactor = 1.5

    const pos = voicePositionsRef.current[userId] || { x: 0.5, y: 0.5 }
    if (panner.positionX) {
      panner.positionX.value = (pos.x - 0.5) * spread
      panner.positionY.value = 0
      panner.positionZ.value = (pos.y - 0.5) * spread
    } else {
      panner.setPosition((pos.x - 0.5) * spread, 0, (pos.y - 0.5) * spread)
    }

    source.connect(panner)
    panner.connect(ctx.destination)
    pannerNodesRef.current[userId] = panner
    remoteAudiosRef.current[userId] = { source, panner }
  }

  const sendScreenStreamIdsToPeer = (peerKeyRaw) => {
    const peerKey = String(peerKeyRaw)
    const ids = screenStreamRef.current?.getVideoTracks().map(t => t.id) || []
    if (!ids.length) return
    ids.forEach(id => screenTrackIdsRef.current.add(id))
    const payload = JSON.stringify({ type: 'screen_stream_id', ids })
    let tries = 0
    const send = () => {
      const dc = dataChannelsRef.current[peerKey]
      if (dc?.readyState === 'open') {
        try { dc.send(payload) } catch { /* noop */ }
        return true
      }
      return false
    }
    if (send()) return
    const t = setInterval(() => {
      if (send() || ++tries > 60) clearInterval(t)
    }, 50)
  }

  const handleControlEvent = (fromUserId, event) => {
    if (!event || typeof event !== 'object') return
    if (event.type === 'screen_stream_id' && Array.isArray(event.ids)) {
      event.ids.forEach(id => screenTrackIdsRef.current.add(id))
      return
    }
    const ctrlTypes = new Set(['ctrl_mouse', 'ctrl_wheel', 'ctrl_key'])
    if (ctrlTypes.has(event.type)) {
      const active = remoteControlActiveRef.current
      if (!active || active.pending) return
      if (String(active.sharingUserId) !== String(uid)) return
      if (String(active.controllerId) !== String(fromUserId)) return
    }
    if (window.electronAPI?.execControlEvent) {
      window.electronAPI.execControlEvent(event)
    }
  }

  const sendControlEvent = (targetUserId, payload) => {
    const active = remoteControlActiveRef.current
    if (!active || active.pending) return
    if (String(active.controllerId) !== String(uid)) return
    if (String(active.sharingUserId) !== String(targetUserId)) return
    if (payload?.type === 'ctrl_mouse' && payload.event === 'mousemove') {
      const now = Date.now()
      if (now - lastCtrlMouseMoveSentRef.current < 25) return
      lastCtrlMouseMoveSentRef.current = now
    }
    const peerKey = String(targetUserId)
    const dc = dataChannelsRef.current[peerKey]
    if (dc?.readyState === 'open') {
      try { dc.send(JSON.stringify(payload)) } catch { /* noop */ }
    }
  }

  const closeExpandedVideoForUser = (userId) => {
    const userKey = String(userId)
    setExpandedVideoUser(prev => {
      if (!prev || String(prev.userId) !== userKey) return prev
      return null
    })
    setBlurBg(false)
  }

  const closeScreenViewForUser = (userId) => {
    const userKey = String(userId)
    setVoiceParticipants(prev => prev.map(p => String(p.userId) === userKey ? { ...p, isScreenSharing: false, screenStream: null } : p))
    setVoiceScreenFullscreen(false)
    setRemoteControlActive(prev => {
      if (!prev) return null
      if (String(prev.sharingUserId) === userKey || String(prev.controllerId) === userKey) return null
      return prev
    })
  }

  const isActivelyControllingPeer = (peerUserId) => {
    const a = remoteControlActive
    if (!a || a.pending) return false
    return String(a.controllerId) === String(uid) && String(a.sharingUserId) === String(peerUserId)
  }

  const getScreenControlHandlers = (peerUserId) => {
    if (!isActivelyControllingPeer(peerUserId)) return {}
    const peer = String(peerUserId)
    const onMouse = (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const w = Math.max(rect.width, 1)
      const h = Math.max(rect.height, 1)
      sendControlEvent(peer, { type: 'ctrl_mouse', event: e.type, x: (e.clientX - rect.left) / w, y: (e.clientY - rect.top) / h, button: e.button })
    }
    return {
      style: { cursor: 'crosshair', outline: 'none' },
      tabIndex: 0,
      onMouseMove: onMouse,
      onMouseDown: (e) => { e.currentTarget.focus(); onMouse(e) },
      onMouseUp: onMouse,
      onClick: onMouse,
      onWheel: (e) => {
        e.preventDefault()
        sendControlEvent(peer, { type: 'ctrl_wheel', deltaX: e.deltaX, deltaY: e.deltaY })
      },
      onContextMenu: (e) => { e.preventDefault(); onMouse(e) },
      onKeyDown: (e) => {
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
        sendControlEvent(peer, { type: 'ctrl_key', key: e.key })
      }
    }
  }

  const shouldInitiatePeer = (peerId) => String(uid) < String(peerId)

  const tuneSender = async (sender, { screen = false } = {}) => {
    if (!sender || !sender.track || typeof sender.getParameters !== 'function') return
    try {
      const params = sender.getParameters() || {}
      params.encodings = Array.isArray(params.encodings) && params.encodings.length ? params.encodings : [{}]
      params.encodings[0].maxBitrate = screen ? 4_500_000 : sender.track.kind === 'video' ? 1_800_000 : 96_000
      if (screen) params.degradationPreference = 'maintain-resolution'
      else if (sender.track.kind === 'video') params.degradationPreference = 'balanced'
      await sender.setParameters(params)
    } catch { /* some browsers reject parameter tuning */ }
  }

  const addTrackToPeer = (pc, track, stream, { screen = false } = {}) => {
    if (!pc || !track || !stream) return null
    const alreadySending = pc.getSenders().some(sender => sender.track === track || sender.track?.id === track.id)
    if (alreadySending) return null
    try {
      const sender = pc.addTrack(track, stream)
      tuneSender(sender, { screen })
      return sender
    } catch { return null }
  }

  const addLocalTracksToPeer = (pc) => {
    const local = localStreamRef.current
    if (local) local.getTracks().forEach(track => addTrackToPeer(pc, track, local, { screen: false }))
    const screen = screenStreamRef.current
    if (screen) screen.getTracks().forEach(track => addTrackToPeer(pc, track, screen, { screen: true }))
  }

  const flushPendingIce = async (peerKey, pc) => {
    const queued = pendingIceCandidatesRef.current[peerKey] || []
    if (!queued.length || !pc?.remoteDescription) return
    pendingIceCandidatesRef.current[peerKey] = []
    for (const candidate of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch { /* noop */ }
    }
  }

  const createPeer = (targetId, stream, isInitiator) => {
    const peerKey = String(targetId)
    let pc = peersRef.current[peerKey]
    if (pc) {
      addLocalTracksToPeer(pc)
      return pc
    }
    pc = new RTCPeerConnection(STUN)
    peersRef.current[peerKey] = pc
    addLocalTracksToPeer(pc)
    // Trickle ICE — send candidates immediately as discovered
    pc.onicecandidate = e => {
      if (e.candidate) socketVcSignal(peerKey, { type: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.ontrack = e => {
      const track = e.track
      const stream = e.streams[0] || new MediaStream([track])
      if (track.kind === 'video') {
        // Distinguish screen vs camera by checking if the stream ID matches a known screen stream.
        // We use a data-channel message ('screen_stream_id') sent right after addTrack on the sender side.
        // Until that message arrives, fall back to checking whether the stream contains any audio track
        // from the *same stream* (camera streams always share the local audio stream).
        const knownScreenIds = screenTrackIdsRef.current
        const isScreen = knownScreenIds.has(track.id) || (stream && stream.getAudioTracks().length === 0 && stream.getVideoTracks().length > 0)
        if (isScreen) {
          knownScreenIds.add(track.id)
          const stopRemoteScreen = () => {
            knownScreenIds.delete(track.id)
            closeScreenViewForUser(peerKey)
          }
          track.onended = stopRemoteScreen
          track.onmute = () => { window.setTimeout(() => { if (track.readyState === 'ended' || track.muted) stopRemoteScreen() }, 250) }
          setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, isScreenSharing: true, screenStream: stream } : p))
        } else {
          const stopRemoteVideo = () => {
            setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, isVideoOn: false } : p))
            closeExpandedVideoForUser(peerKey)
          }
          track.onended = stopRemoteVideo
          setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, isVideoOn: true, stream } : p))
        }
      } else {
        setVoiceParticipants(prev => prev.map(p => String(p.userId) === peerKey ? { ...p, stream } : p))
        playRemoteStream(peerKey, stream)
      }
    }
    let makingOffer = false
    const sendOffer = async ({ iceRestart = false } = {}) => {
      if (makingOffer || pc.signalingState !== 'stable') return
      makingOffer = true
      try {
        if (iceRestart && typeof pc.restartIce === 'function') pc.restartIce()
        const offer = await pc.createOffer({ voiceActivityDetection: false, iceRestart })
        if (pc.signalingState !== 'stable') return
        await pc.setLocalDescription(offer)
        socketVcSignal(peerKey, { type: 'offer', sdp: pc.localDescription })
      } catch { /* noop */ } finally { makingOffer = false }
    }
    pc.onnegotiationneeded = () => sendOffer()
    pc.oniceconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(pc.iceConnectionState) && shouldInitiatePeer(peerKey)) {
        window.setTimeout(() => sendOffer({ iceRestart: true }), pc.iceConnectionState === 'failed' ? 0 : 1200)
      }
    }
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(pc.connectionState) && shouldInitiatePeer(peerKey)) {
        window.setTimeout(() => sendOffer({ iceRestart: true }), pc.connectionState === 'failed' ? 0 : 1500)
      }
      if (pc.connectionState === 'closed') {
        delete peersRef.current[peerKey]
        delete pendingIceCandidatesRef.current[peerKey]
      }
    }
    if (isInitiator) {
      const dc = pc.createDataChannel('reelms_control', { ordered: true })
      dataChannelsRef.current[peerKey] = dc
      dc.onopen = () => { sendScreenStreamIdsToPeer(peerKey) }
      dc.onmessage = e => { try { handleControlEvent(peerKey, JSON.parse(e.data)) } catch { /* noop */ } }
      // Initial offer — onnegotiationneeded fires async after createDataChannel+addTrack,
      // but we also call sendOffer explicitly as a safety net for browsers that coalesce events.
      sendOffer()
    } else {
      pc.ondatachannel = e => {
        dataChannelsRef.current[peerKey] = e.channel
        e.channel.onmessage = ev => { try { handleControlEvent(peerKey, JSON.parse(ev.data)) } catch { /* noop */ } }
        e.channel.onopen = () => { sendScreenStreamIdsToPeer(peerKey) }
      }
    }
    return pc
  }

  // Handles all incoming vc:event messages from Socket.IO.
  // Stored in a ref so socket callbacks always call the latest closure.
  const handleVcEvent = (msg) => {
    const { type, from } = msg
    if (!type) return
    if (type === 'force_leave') {
      const current = vcRoomRef.current
      if (current && String(current.reelmId) === String(msg.reelmId || current.reelmId) && String(current.channelId) === String(msg.channelId || current.channelId)) {
        addNotification('You were removed from the voice room by a moderator.')
        leaveVoiceChannel()
      }
      return
    }
    if (type === 'force_move') {
      if (!msg.reelmId || !msg.channelId) return
      addNotification(`${msg.byName || 'A moderator'} moved you to ${msg.channelName || 'another voice room'}.`)
      const current = vcRoomRef.current
      if (current) leaveVoiceChannel()
      window.setTimeout(() => joinVoiceChannel(String(msg.reelmId), String(msg.channelId), msg.channelName || 'Voice'), 250)
      return
    }
    if (type === 'moderator_mute') {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false })
      setVoiceMuted(true)
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isMuted: true } : p))
      vcBroadcast({ type: 'mute', userId: uid, isMuted: true })
      addNotification('A moderator muted your microphone. You can unmute yourself when ready.')
      return
    }
    if (type === 'voice_invite') {
      const channelName = msg.channelName || 'voice room'
      addNotification(`${msg.senderName || 'Someone'} invited you to join ${channelName}.`, { type: 'reelm', reelmId: msg.reelmId, channelId: msg.channelId })
      return
    }
    if (type === 'voice_kick_denied') {
      addNotification(msg.message || 'Could not remove that member from voice.')
      return
    }
    if (type === 'voice_move_denied') {
      addNotification(msg.message || 'Could not move that member.')
      return
    }
    if (type === 'voice_invite_denied') {
      addNotification(msg.message || 'Could not send that voice invite.')
      return
    }
    if (type === 'voice_mute_denied') {
      addNotification(msg.message || 'Could not mute that member.')
      return
    }
    if (type === 'join') {
      setVoiceParticipants(prev => prev.find(p => String(p.userId) === String(from)) ? prev : [...prev, { userId: from, userName: msg.userName, userPhoto: msg.userPhoto, isMuted: false, isVideoOn: false }])
      createPeer(from, localStreamRef.current, shouldInitiatePeer(from))
      // Tell the newcomer we're here
      socketVcSignal(from, { type: 'here', userId: uid, userName: currentUserRef.current?.name, userPhoto: getPersonPhoto(currentUserRef.current) || null })
    } else if (type === 'here') {
      setVoiceParticipants(prev => prev.find(p => String(p.userId) === String(from)) ? prev : [...prev, { userId: from, userName: msg.userName, userPhoto: msg.userPhoto, isMuted: false, isVideoOn: false }])
      createPeer(from, localStreamRef.current, shouldInitiatePeer(from))
    } else if (type === 'leave') {
      const fk = String(from)
      setVoiceParticipants(prev => prev.filter(p => String(p.userId) !== fk))
      const pc = peersRef.current[fk]; if (pc) { pc.close(); delete peersRef.current[fk] }
      const audioNode = remoteAudiosRef.current[fk]
      if (audioNode) { try { audioNode.source?.disconnect(); audioNode.panner?.disconnect() } catch { /* noop */ } ; delete remoteAudiosRef.current[fk] }
      const audioEl = remoteAudioElementsRef.current[fk]
      if (audioEl) { try { audioEl.pause(); audioEl.srcObject = null; audioEl.remove() } catch { /* noop */ }; delete remoteAudioElementsRef.current[fk] }
      delete pannerNodesRef.current[fk]
      delete dataChannelsRef.current[fk]
      setRemoteControlActive(prev => {
        if (!prev) return null
        if (String(from) === String(prev.sharingUserId) || String(from) === String(prev.controllerId)) return null
        return prev
      })
      setRemoteControlReq(prev => (prev && String(prev.requesterId) === fk ? null : prev))
    } else if (type === 'offer') {
      const peerKey = String(from)
      let pc = peersRef.current[peerKey]
      if (!pc) pc = createPeer(from, localStreamRef.current, shouldInitiatePeer(from))
      const polite = !shouldInitiatePeer(from)
      const offerCollision = pc.signalingState !== 'stable'
      if (offerCollision && !polite) return
      Promise.resolve()
        .then(() => offerCollision && pc.signalingState !== 'stable' ? pc.setLocalDescription({ type: 'rollback' }) : undefined)
        .then(() => pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)))
        .then(() => flushPendingIce(peerKey, pc))
        .then(() => pc.createAnswer({ voiceActivityDetection: false }))
        .then(answer => pc.setLocalDescription(answer))
        .then(() => socketVcSignal(from, { type: 'answer', sdp: pc.localDescription }))
        .catch(() => {})
    } else if (type === 'answer') {
      const pc = peersRef.current[String(from)]
      if (pc) pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).then(() => flushPendingIce(String(from), pc)).catch(() => {})
    } else if (type === 'ice') {
      const peerKey = String(from)
      const pc = peersRef.current[peerKey]
      if (!pc) {
        pendingIceCandidatesRef.current[peerKey] = [...(pendingIceCandidatesRef.current[peerKey] || []), msg.candidate]
      } else if (!pc.remoteDescription) {
        pendingIceCandidatesRef.current[peerKey] = [...(pendingIceCandidatesRef.current[peerKey] || []), msg.candidate]
      } else {
        pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {})
      }
    } else if (type === 'mute') {
      setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(from) ? { ...p, isMuted: msg.isMuted } : p))
    } else if (type === 'video') {
      const isOn = Boolean(msg.isVideoOn)
      setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(from) ? { ...p, isVideoOn: isOn } : p))
      if (!isOn) closeExpandedVideoForUser(from)
    } else if (type === 'screen') {
      const isSharing = Boolean(msg.isScreenSharing)
      setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(from) ? { ...p, isScreenSharing: isSharing, screenStream: isSharing ? p.screenStream : null } : p))
      if (!isSharing) closeScreenViewForUser(from)
    } else if (type === 'remote_ctrl_req' && String(msg.targetUserId) === String(uid)) {
      setRemoteControlReq({ requesterId: from, requesterName: msg.requesterName, targetUserId: uid })
    } else if (type === 'remote_ctrl_accept' && String(msg.requesterId) === String(uid)) {
      setRemoteControlActive({ controllerId: uid, controllerName: currentUserRef.current?.name, sharingUserId: from, sharingUserName: msg.sharingUserName })
    } else if (type === 'remote_ctrl_decline' && String(msg.requesterId) === String(uid)) {
      setRemoteControlActive(null)
      addNotification('Remote control request was declined.')
    } else if (type === 'remote_ctrl_stop') {
      setRemoteControlActive(null)
      addNotification('Remote control session ended.')
    } else if (type === 'nudge' && String(msg.targetUserId) === String(uid)) {
      addNotification(`${msg.senderName} nudged you!`, { type: 'dm', userId: String(from) })
      playSound.nudge()
      setActiveNudge({ id: from, name: msg.senderName })
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 1000)
      setTimeout(() => setActiveNudge(null), 6000) // auto hide toast
    }
  }
  vcEventHandlerRef.current = handleVcEvent
  currentUserRef.current = currentUser

  const channelFullToastTimerRef = useRef(null)
  const showChannelFullToast = () => {
    setChannelFullToast(true)
    if (channelFullToastTimerRef.current) clearTimeout(channelFullToastTimerRef.current)
    channelFullToastTimerRef.current = setTimeout(() => setChannelFullToast(false), 3000)
  }


  const showMediaUnavailable = (kind = 'media') => {
    const label = kind === 'screen' ? 'Ekran paylaşımı' : kind === 'camera' ? 'Kamera' : 'Sesli sohbet'
    const message = `${label} için tarayıcıda güvenli bağlantı gerekiyor. Localhost veya HTTPS üzerinde test edin; normal HTTP bağlantısında mikrofon/kamera/ekran paylaşımı tarayıcı tarafından engellenebilir.`
    console.warn(message)
    if (typeof window !== 'undefined') window.alert(message)
  }

  const joinVoiceChannel = async (reelmId, channelId, channelName) => {
    // If already in a different media channel, leave it first
    if (vcRoomRef.current && vcRoomRef.current.channelId !== channelId) {
      leaveVoiceChannel()
    }
    // Capacity check
    const reelm = reelms.find(r => r.id === reelmId)
    const ch = reelm?.categories.flatMap(c => c.channels).find(c => c.id === channelId)
    if (ch && ch.capacity > 0) {
      const currentCount = vcCountFor(reelmId, channelId)
      if (currentCount >= ch.capacity) { showChannelFullToast(); return }
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showMediaUnavailable('voice')
        return
      }
      const envDoc = await userGetDoc('environment').catch(() => ({})) || {}
      const noiseSuppression = envDoc.noiseSuppression ?? true
      const echoCancellation = envDoc.echoCancellation ?? true
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression, echoCancellation, autoGainControl: noiseSuppression },
        video: false,
      })
      const shouldStartMuted = ch?.type === 'stage' && !canSpeakInStageClient(reelm, ch, uid)
      if (shouldStartMuted) stream.getAudioTracks().forEach(t => { t.enabled = false })
      localStreamRef.current = stream
      const myInfo = { userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, isMuted: shouldStartMuted, isVideoOn: false, stream }
      setVoiceParticipants([myInfo])
      setVoiceChannel({ channelId, reelmId, channelName })
      setVoiceMuted(shouldStartMuted); setVoiceVideoOn(false); setVoiceScreenSharing(false)
      if (shouldStartMuted) addNotification('You joined as a listener. A moderator can make you a speaker.')
      vcRoomRef.current = { reelmId, channelId }

      // SFU negotiation: Check if server provides LiveKit SFU for this voice room
      const roomKey = `${reelmId}_${channelId}`
      const authToken = await getIdToken().catch(() => null)
      if (authToken) {
        try {
          const sfuData = await fetchVoiceToken(BACKEND_URL, authToken, roomKey, !shouldStartMuted)
          if (sfuData?.sfuEnabled && sfuData?.token && sfuData?.url) {
            const session = await createLivekitSession({
              url: sfuData.url,
              token: sfuData.token,
              audioConstraints: { noiseSuppression, echoCancellation, autoGainControl: noiseSuppression },
              onTrackSubscribed: (track, publication, participant) => {
                const pId = participant.identity
                if (track.kind === 'audio') {
                  const mediaStream = new MediaStream([track.mediaStreamTrack])
                  setVoiceParticipants(prev => {
                    const exists = prev.some(p => String(p.userId) === String(pId))
                    if (exists) return prev.map(p => String(p.userId) === String(pId) ? { ...p, stream: mediaStream } : p)
                    return [...prev, { userId: pId, userName: participant.name || 'Member', userPhoto: null, isMuted: false, isVideoOn: false, stream: mediaStream }]
                  })
                  playRemoteStream(pId, mediaStream)
                } else if (track.kind === 'video') {
                  const mediaStream = new MediaStream([track.mediaStreamTrack])
                  const isScreen = track.source === 'screen_share'
                  setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(pId)
                    ? (isScreen ? { ...p, isScreenSharing: true, screenStream: mediaStream } : { ...p, isVideoOn: true, stream: mediaStream })
                    : p
                  ))
                }
              },
              onActiveSpeakersChanged: (speakers) => {
                const speakerIds = new Set(speakers.map(s => String(s.identity)))
                setSpeakingUsers(speakerIds)
              },
              onParticipantDisconnected: (participant) => {
                const pId = participant.identity
                setVoiceParticipants(prev => prev.filter(p => String(p.userId) !== String(pId)))
                stopRemoteAudio(pId)
              },
              onDisconnected: () => {
                livekitSessionRef.current = null
              },
            })
            livekitSessionRef.current = session
          }
        } catch (sfuErr) {
          console.warn('[LiveKit SFU] Connection failed, continuing on P2P mesh:', sfuErr)
        }
      }

      // Announce join via Socket.IO — server broadcasts to room, replies come through handleVcEvent
      socketVcJoin(reelmId, channelId, currentUser.name, currentUser.photo || null)
      // Join spatial position channel
      socketJoinChannel(`${reelmId}_vc_${channelId}`)
      const initX = 0.5, initY = 0.5
      voicePositionsRef.current = { [uid]: { x: initX, y: initY } }
      setVoicePositions({ [uid]: { x: initX, y: initY } })
      socketEmitVoicePosition(reelmId, channelId, initX, initY)
    } catch (err) { console.warn('Voice join failed:', err) }
  }

  const spatialEmitThrottleRef = useRef(0)
  const handleSpatialMove = (x, y) => {
    // Update locally immediately
    voicePositionsRef.current = { ...voicePositionsRef.current, [uid]: { x, y } }
    setVoicePositions(prev => ({ ...prev, [uid]: { x, y } }))
    // Update listener position
    const ctx = spatialContextRef.current
    if (ctx) {
      const spread = (spatialSettingsRef.current.depth / 50) * 10
      const l = ctx.listener
      if (l.positionX) { l.positionX.value = (x - 0.5) * spread; l.positionZ.value = (y - 0.5) * spread }
      else l.setPosition((x - 0.5) * spread, 0, (y - 0.5) * spread)
    }
    // Throttle socket emit to ~20fps
    const now = Date.now()
    if (now - spatialEmitThrottleRef.current < 50) return
    spatialEmitThrottleRef.current = now
    if (voiceChannel) socketEmitVoicePosition(voiceChannel.reelmId, voiceChannel.channelId, x, y)
  }

  const leaveVoiceChannel = () => {
    if (livekitSessionRef.current) {
      try { livekitSessionRef.current.disconnect() } catch { /* noop */ }
      livekitSessionRef.current = null
    }
    const vc = vcRoomRef.current
    if (vc) { socketVcLeave(vc.reelmId, vc.channelId); vcRoomRef.current = null }
    if (voiceChannel) { const k = `${voiceChannel.reelmId}_vc_${voiceChannel.channelId}`; socketLeaveChannel(k) }
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    screenStreamRef.current?.getTracks().forEach(t => t.stop()); screenStreamRef.current = null
    Object.values(peersRef.current).forEach(pc => pc.close()); peersRef.current = {}
    dataChannelsRef.current = {}
    screenTrackIdsRef.current.clear()
    Object.values(remoteAudiosRef.current).forEach(a => { try { a.source?.disconnect(); a.panner?.disconnect() } catch { /* noop */ } }); remoteAudiosRef.current = {}
    Object.values(remoteAudioElementsRef.current).forEach(a => { try { a.pause(); a.srcObject = null; a.remove() } catch { /* noop */ } }); remoteAudioElementsRef.current = {}
    pannerNodesRef.current = {}
    voicePositionsRef.current = {}
    if (spatialContextRef.current) { spatialContextRef.current.close().catch(() => {}); spatialContextRef.current = null }
    setVoicePositions({})
    setVoiceChannel(null); setVoiceParticipants([]); setVoiceMuted(false); setVoiceVideoOn(false); setVoiceScreenSharing(false)
    setRemoteControlActive(null)
    setRemoteControlReq(null)
    setSpeakingUsers(new Set())
    const analyzers = audioAnalyzersRef.current
    Object.values(analyzers).forEach(a => { try { a.context.close() } catch { /* noop */ } })
    audioAnalyzersRef.current = {}
  }

  useEffect(() => {
    if (!voiceChannel?.reelmId || !voiceChannel?.channelId) return undefined
    const { reelmId, channelId } = voiceChannel
    const beat = () => socketVcHeartbeat(reelmId, channelId)
    beat()
    const heartbeatTimer = window.setInterval(beat, 15_000)
    const leaveOnPageExit = () => {
      socketVcLeave(reelmId, channelId)
      socketLeaveChannel(`${reelmId}_vc_${channelId}`)
    }
    window.addEventListener('pagehide', leaveOnPageExit)
    window.addEventListener('beforeunload', leaveOnPageExit)
    return () => {
      window.clearInterval(heartbeatTimer)
      window.removeEventListener('pagehide', leaveOnPageExit)
      window.removeEventListener('beforeunload', leaveOnPageExit)
    }
  }, [voiceChannel?.reelmId, voiceChannel?.channelId])


  const updateStageSpeaker = (channelId, targetUid, shouldSpeak) => {
    if (!selectedReelm || !channelId || !targetUid) return
    if (!canManageVoiceClient(selectedReelm, uid)) { addNotification('You do not have permission to manage speakers.'); return }
    const updater = (r) => ({
      ...r,
      categories: (r.categories || []).map(cat => ({
        ...cat,
        channels: (cat.channels || []).map(ch => String(ch.id) !== String(channelId) ? ch : {
          ...ch,
          speakerIds: shouldSpeak
            ? Array.from(new Set([...(ch.speakerIds || []).map(String), String(targetUid)]))
            : (ch.speakerIds || []).map(String).filter(id => id !== String(targetUid))
        })
      }))
    })
    const next = updater(selectedReelm)
    updateReelm(next)
    if (String(targetUid) === String(uid) && !shouldSpeak) {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false })
      setVoiceMuted(true)
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isMuted: true } : p))
      vcBroadcast({ type: 'mute', userId: uid, isMuted: true })
    }
    addNotification(shouldSpeak ? 'Member added as a speaker.' : 'Member moved back to listener.')
  }

  const kickVoiceUserFromChannel = (reelmId, channelId, participant) => {
    if (!reelmId || !channelId || !participant?.userId || String(participant.userId) === String(uid)) return
    if (!canManageVoiceClient(selectedReelm, uid)) { addNotification('You do not have permission to manage voice rooms.'); return }
    socketVcKick(reelmId, channelId, participant.userId)
    setVoiceTileMenuUser(null)
    setVoiceRoomUserMenu(null)
    addNotification(`${participant.userName || 'Member'} was removed from the voice room.`)
  }

  const kickVoiceParticipant = (participant) => {
    if (!voiceChannel) return
    kickVoiceUserFromChannel(voiceChannel.reelmId, voiceChannel.channelId, participant)
  }

  const moderatorMuteVoiceUserFromChannel = (reelmId, channelId, participant) => {
    if (!reelmId || !channelId || !participant?.userId) return
    if (!canManageVoiceClient(selectedReelm, uid)) { addNotification('You do not have permission to mute voice members.'); return }
    socketVcModeratorMute(reelmId, channelId, participant.userId)
    setVoiceRoomUserMenu(null)
    setVoiceTileMenuUser(null)
    addNotification(`${participant.userName || 'Member'} was muted for this voice room. They can unmute again.`)
  }

  const moderatorMuteVoiceParticipant = (participant) => {
    if (!voiceChannel) return
    moderatorMuteVoiceUserFromChannel(voiceChannel.reelmId, voiceChannel.channelId, participant)
  }

  const moveMemberToVoiceChannel = (reelmId, channelId, channelName, member) => {
    const targetUid = member?.userId || member?.id
    if (!reelmId || !channelId || !targetUid || String(targetUid) === String(uid)) return
    const reelm = reelms.find(r => String(r.id) === String(reelmId)) || selectedReelm
    if (!canManageVoiceClient(reelm, uid)) { addNotification('You do not have permission to move voice members.'); return }
    const room = reelm ? getVoiceRoomForMember(reelm, targetUid) : null
    if (room && String(room.reelmId) === String(reelmId) && String(room.channelId) === String(channelId)) {
      addNotification(`${member.userName || member.name || 'Member'} is already in this voice room.`)
      return
    }
    socketVcMove(reelmId, channelId, targetUid)
    addNotification(room ? `${member.userName || member.name || 'Member'} is being moved to ${channelName || 'voice'}.` : `${member.userName || member.name || 'Member'} is not in a room; an invite will be sent.`)
  }

  const inviteMemberToVoiceChannel = (reelmId, channelId, channelName, member) => {
    const targetUid = member?.userId || member?.id
    if (!reelmId || !channelId || !targetUid || String(targetUid) === String(uid)) return
    const reelm = reelms.find(r => String(r.id) === String(reelmId)) || selectedReelm
    const targetName = member.userName || member.name || 'Member'
    const room = reelm ? getVoiceRoomForMember(reelm, targetUid) : null
    if (room && String(room.reelmId) === String(reelmId) && String(room.channelId) === String(channelId)) {
      addNotification(`${targetName} is already in this voice room.`)
      return
    }
    if (room) {
      addNotification(`${targetName} is already in ${room.channelName}. Join their room instead.`)
      return
    }
    socketVcInvite(reelmId, channelId, targetUid)
    addNotification(`Voice invite sent to ${targetName}.`, { type: 'reelm', reelmId, channelId })
  }

  const inviteMemberToCurrentVoice = (member) => {
    if (!voiceChannel || !member?.userId || String(member.userId) === String(uid)) return
    const targetName = member.userName || member.name || 'Member'
    const room = selectedReelm ? getVoiceRoomForMember(selectedReelm, member.userId) : null
    if (room && String(room.reelmId) === String(voiceChannel.reelmId) && String(room.channelId) === String(voiceChannel.channelId)) {
      addNotification(`${targetName} is already in this voice room.`)
      return
    }
    if (room) {
      addNotification(`${targetName} is already in ${room.channelName}. Join their room instead.`)
      return
    }
    inviteMemberToVoiceChannel(voiceChannel.reelmId, voiceChannel.channelId, voiceChannel.channelName, member)
  }

  useEffect(() => {
    if (!blurBg || !expandedVideoUser || expandedVideoUser.userId !== uid) {
      if (blurAnimFrameRef.current) { cancelAnimationFrame(blurAnimFrameRef.current); blurAnimFrameRef.current = null }
      if (blurSegRef.current) { blurSegRef.current.close(); blurSegRef.current = null }
      return
    }
    const stream = expandedVideoUser.stream
    if (!stream) return
    let cancelled = false
    let offscreen = null
    const seg = new SelfieSegmentation({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${f}`
    })
    seg.setOptions({ modelSelection: 1, selfieMode: false })
    blurSegRef.current = seg
    seg.onResults((results) => {
      if (cancelled) return
      const canvas = blurCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const W = canvas.width, H = canvas.height
      if (!offscreen || offscreen.width !== W || offscreen.height !== H) {
        offscreen = new OffscreenCanvas(W, H)
      }
      ctx.save()
      ctx.filter = 'blur(18px)'
      ctx.drawImage(results.image, -24, -24, W + 48, H + 48)
      ctx.restore()
      const octx = offscreen.getContext('2d')
      octx.clearRect(0, 0, W, H)
      octx.drawImage(results.image, 0, 0, W, H)
      octx.globalCompositeOperation = 'destination-in'
      octx.drawImage(results.segmentationMask, 0, 0, W, H)
      ctx.drawImage(offscreen, 0, 0)
    })
    let lastTime = 0
    const processFrame = async (time) => {
      if (cancelled) return
      blurAnimFrameRef.current = requestAnimationFrame(processFrame)
      if (time - lastTime < 33) return
      lastTime = time
      const vid = blurHiddenVideoRef.current
      const canvas = blurCanvasRef.current
      if (vid && vid.readyState >= 2 && canvas) {
        if (canvas.width !== vid.videoWidth || canvas.height !== vid.videoHeight) {
          canvas.width = vid.videoWidth || 640
          canvas.height = vid.videoHeight || 360
        }
        await seg.send({ image: vid })
      }
    }
    seg.initialize().then(() => { if (!cancelled) requestAnimationFrame(processFrame) })
    return () => {
      cancelled = true
      if (blurAnimFrameRef.current) { cancelAnimationFrame(blurAnimFrameRef.current); blurAnimFrameRef.current = null }
      seg.close()
      blurSegRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurBg, expandedVideoUser, uid])

  const requestRemoteControl = (targetUserId, targetUserName) => {
    const peerKey = String(targetUserId)
    const inVoiceWithPeer = !!voiceChannel && voiceParticipants.some(p => String(p.userId) === peerKey)
    if (!inVoiceWithPeer) {
      addNotification('Remote control requires both of you to be in the same voice or Live Action channel.')
      return
    }
    socketVcSignal(peerKey, { type: 'remote_ctrl_req', requesterId: uid, requesterName: currentUser.name, targetUserId: peerKey })
    setRemoteControlActive({ controllerId: uid, controllerName: currentUser.name, sharingUserId: peerKey, sharingUserName: targetUserName, pending: true })
  }

  const acceptRemoteControl = () => {
    if (!remoteControlReq) return
    if (!window.electronAPI?.execControlEvent) {
      addNotification('Screen control only works when you use the Reelms desktop app (screen sharing host).')
      setRemoteControlReq(null)
      return
    }
    socketVcSignal(remoteControlReq.requesterId, { type: 'remote_ctrl_accept', requesterId: remoteControlReq.requesterId, sharingUserId: uid, sharingUserName: currentUser.name })
    setRemoteControlActive({ controllerId: remoteControlReq.requesterId, controllerName: remoteControlReq.requesterName, sharingUserId: uid, sharingUserName: currentUser.name })
    setRemoteControlReq(null)
  }

  const declineRemoteControl = () => {
    if (!remoteControlReq) return
    socketVcSignal(remoteControlReq.requesterId, { type: 'remote_ctrl_decline', requesterId: remoteControlReq.requesterId })
    setRemoteControlReq(null)
  }

  const releaseRemoteControl = (targetUserId) => {
    const peerKey = String(targetUserId || remoteControlActive?.sharingUserId || remoteControlActive?.controllerId || '')
    if (peerKey) {
      socketVcSignal(peerKey, { type: 'remote_ctrl_stop', requesterId: uid, sharingUserId: peerKey })
    }
    setRemoteControlActive(null)
    addNotification('Remote control session ended.')
  }

  useEffect(() => {
    const analyzers = audioAnalyzersRef.current
    voiceParticipants.forEach(p => {
      if (!p.stream || p.isMuted) {
        if (analyzers[p.userId]) { try { analyzers[p.userId].context.close() } catch { /* noop */ } ; delete analyzers[p.userId] }
        return
      }
      if (!analyzers[p.userId]) {
        try {
          const context = new AudioContext()
          const source = context.createMediaStreamSource(p.stream)
          const analyser = context.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analyzers[p.userId] = { context, analyser }
        } catch { /* noop */ }
      }
    })
    Object.keys(analyzers).forEach(userId => {
      if (!voiceParticipants.find(p => p.userId === userId)) {
        try { analyzers[userId].context.close() } catch { /* noop */ }
        delete analyzers[userId]
      }
    })
    const data = new Uint8Array(64)
    let animFrame
    let prevSpeakingIds = ''
    const tick = () => {
      const speaking = new Set()
      Object.entries(analyzers).forEach(([userId, { analyser }]) => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > 8) speaking.add(userId)
      })
      // Only update state when the set of speaking users actually changes
      const ids = [...speaking].sort().join(',')
      if (ids !== prevSpeakingIds) {
        prevSpeakingIds = ids
        setSpeakingUsers(speaking)
      }
      animFrame = requestAnimationFrame(tick)
    }
    if (Object.keys(analyzers).length > 0) tick()
    return () => cancelAnimationFrame(animFrame)
  }, [voiceParticipants])

  const vcBroadcast = (payload) => {
    const vc = vcRoomRef.current
    if (vc) socketVcBroadcast(vc.reelmId, vc.channelId, payload)
  }

  const voiceToggleMute = () => {
    const next = !voiceMuted
    if (!next && selectedChannel?.type === 'stage' && !canSpeakInStageClient(selectedReelm, selectedChannel, uid)) {
      addNotification('Only selected speakers can unmute in this room.')
      return
    }
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next })
    setVoiceMuted(next)
    setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isMuted: next } : p))
    vcBroadcast({ type: 'mute', userId: uid, isMuted: next })
  }

  useEffect(() => {
    Object.values(remoteAudioElementsRef.current || {}).forEach(audioEl => {
      try { audioEl.muted = voiceDeafened; audioEl.volume = voiceDeafened ? 0 : 1 } catch { /* noop */ }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceDeafened])

  const voiceToggleDeafen = () => {
    setVoiceDeafened(next => !next)
  }

  const voiceToggleFullMute = () => {
    const next = !(voiceMuted && voiceDeafened)
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next })
    setVoiceMuted(next)
    setVoiceDeafened(next)
    setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isMuted: next } : p))
    vcBroadcast({ type: 'mute', userId: uid, isMuted: next })
  }

  const voiceToggleVideo = async () => {
    if (!voiceVideoOn) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showMediaUnavailable('camera'); return }
        const envDoc = await userGetDoc('environment').catch(() => ({})) || {}
        const cameraQuality = envDoc.cameraQuality || 'hd'
        const videoConstraints = cameraQuality === 'fullhd'
          ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }
        const vs = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
        const vt = vs.getVideoTracks()[0]
        if (vt) {
          try { vt.contentHint = 'motion' } catch { /* noop */ }
          localStreamRef.current?.addTrack(vt)
          Object.values(peersRef.current).forEach(pc => addTrackToPeer(pc, vt, localStreamRef.current, { screen: false }))
        }
        setVoiceVideoOn(true)
        setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isVideoOn: true, stream: localStreamRef.current } : p))
        vcBroadcast({ type: 'video', userId: uid, isVideoOn: true })
      } catch (e) { console.warn('Camera error', e) }
    } else {
      localStreamRef.current?.getVideoTracks().forEach(t => {
        Object.values(peersRef.current).forEach(pc => {
          pc.getSenders().filter(s => s.track === t || s.track?.id === t.id).forEach(s => { try { pc.removeTrack(s) } catch { /* noop */ } })
        })
        t.stop(); try { localStreamRef.current.removeTrack(t) } catch { /* noop */ }
      })
      setVoiceVideoOn(false)
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isVideoOn: false } : p))
      closeExpandedVideoForUser(uid)
      vcBroadcast({ type: 'video', userId: uid, isVideoOn: false })
    }
  }

  const voiceToggleScreen = async () => {
    if (!voiceScreenSharing) {
      if (selectedChannel?.screenShareModOnly) {
        const member = selectedReelm?.members?.find(m => String(m.userId) === String(uid))
        const isAdmin = (member?.roleIds || []).some(rid => isManagerRoleClient(selectedReelm?.roles?.find(r => r.id === rid)))
        if (!isAdmin) return
      }
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { showMediaUnavailable('screen'); return }
        const envDoc = await userGetDoc('environment').catch(() => ({})) || {}
        const resolution = envDoc.screenResolution || '1080p'
        const displayVideo = resolution === '720p'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 }, cursor: 'always' }
          : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 }, cursor: 'always' }
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: displayVideo, audio: Boolean(envDoc.screenShareAudio) })
        screenStreamRef.current = ss
        const screenVideoTrackIds = ss.getVideoTracks().map(t => t.id)
        // Register our own screen track IDs so ontrack on the other side can identify them
        screenVideoTrackIds.forEach(id => screenTrackIdsRef.current.add(id))
        ss.getTracks().forEach(t => { try { if (t.kind === 'video') t.contentHint = 'detail' } catch { /* noop */ } })
        Object.keys(peersRef.current).forEach((peerKey) => {
          const pc = peersRef.current[peerKey]
          ss.getTracks().forEach(t => addTrackToPeer(pc, t, ss, { screen: true }))
          sendScreenStreamIdsToPeer(peerKey)
        })
        const stopScreen = () => {
          screenTrackIdsRef.current.clear()
          screenStreamRef.current = null
          setVoiceScreenSharing(false)
          setVoiceParticipants(prev => prev.map(p => String(p.userId) === String(uid) ? { ...p, isScreenSharing: false, screenStream: null } : p))
          setVoiceScreenFullscreen(false)
          setNativeFullscreenMode(false)
          setExpandedScreenUser(null)
          vcBroadcast({ type: 'screen', userId: uid, isScreenSharing: false })
          setRemoteControlActive(prev => (prev && String(prev.sharingUserId) === String(uid) ? null : prev))
        }
        ss.getVideoTracks()[0].onended = stopScreen
        setVoiceScreenSharing(true)
        setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isScreenSharing: true, screenStream: ss } : p))
        vcBroadcast({ type: 'screen', userId: uid, isScreenSharing: true })
      } catch { /* noop */ }
    } else {
      if (screenStreamRef.current) {
        const screenTracks = screenStreamRef.current.getTracks()
        Object.values(peersRef.current).forEach(pc => {
          pc.getSenders().filter(s => screenTracks.some(t => t === s.track)).forEach(s => { try { pc.removeTrack(s) } catch { /* noop */ } })
        })
        screenTracks.forEach(t => t.stop())
        screenStreamRef.current = null
      }
      screenTrackIdsRef.current.clear()
      setVoiceScreenSharing(false)
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, isScreenSharing: false, screenStream: null } : p))
      setVoiceScreenFullscreen(false)
      setNativeFullscreenMode(false)
      setExpandedScreenUser(null)
      vcBroadcast({ type: 'screen', userId: uid, isScreenSharing: false })
    }
  }

  useEffect(() => {
    if (expandedVideoUser && !voiceParticipants.some(p => String(p.userId) === String(expandedVideoUser.userId) && p.isVideoOn && p.stream)) {
      setExpandedVideoUser(null)
      setVideoExpandFullscreen(false)
      setNativeFullscreenMode(false)
      setBlurBg(false)
    }
    if (expandedScreenUser && !voiceParticipants.some(p => String(p.userId) === String(expandedScreenUser.userId) && p.isScreenSharing && p.screenStream)) {
      setExpandedScreenUser(null)
      setVoiceScreenFullscreen(false)
      setNativeFullscreenMode(false)
    }
    if (voiceScreenFullscreen && !voiceParticipants.some(p => p.isScreenSharing && p.screenStream)) {
      setVoiceScreenFullscreen(false)
      setNativeFullscreenMode(false)
    }
  }, [expandedVideoUser, expandedScreenUser, voiceParticipants, voiceScreenFullscreen])

  const applyReelmRealtimeDoc = (reelmId, sk, data) => {
    const id = String(reelmId || '')
    if (!id || !sk) return
    let patch = null
    if (sk === 'join_requests') patch = { joinRequests: Array.isArray(data) ? data : [] }
    else if (sk === 'ban_list') patch = { banList: Array.isArray(data) ? data : [] }
    else if (sk === 'timeout_list') patch = { timeoutList: Array.isArray(data) ? data : [] }
    else if (sk === 'members') patch = { members: Array.isArray(data) ? data : [] }
    else if (sk === 'roles') patch = { roles: Array.isArray(data) ? data : [] }
    else if (sk === 'structure') patch = { categories: Array.isArray(data?.categories) ? data.categories : [] }
    else if (sk === 'meta' && data && typeof data === 'object') patch = { ...data }
    if (!patch) return
    const apply = (r) => String(r?.id || '') === id ? { ...r, ...patch, updatedAt: Date.now() } : r
    setReelms(prev => Array.isArray(prev) ? prev.map(apply) : prev)
    setSelectedReelm(prev => String(prev?.id || '') === id ? apply(prev) : prev)
  }

  const scheduleReelmCoreHydrate = (reelmId, delay = 150) => {
    const id = String(reelmId || '')
    if (!id) return
    const timers = reelmRealtimeHydrateTimersRef.current || {}
    if (timers[id]) clearTimeout(timers[id])
    timers[id] = setTimeout(() => {
      delete timers[id]
      hydrateReelmCore(id).then(r => r && mergeReelmIntoState(r)).catch(() => {})
    }, delay)
    reelmRealtimeHydrateTimersRef.current = timers
  }

  const hydrateReelmCore = async (reelmId) => {
    if (!reelmId) return null

    const [meta, structure, roles, members] = await Promise.all([
      reelmGetDoc(reelmId, 'meta').catch(() => null),
      reelmGetDoc(reelmId, 'structure').catch(() => null),
      reelmGetDoc(reelmId, 'roles').catch(() => []),
      reelmGetDoc(reelmId, 'members').catch(() => []),
    ])
    if (!meta) return null

    const baseReelm = {
      ...meta,
      roles: Array.isArray(roles) ? roles : [],
      members: Array.isArray(members) ? members : [],
      categories: Array.isArray(structure?.categories) ? structure.categories : [],
      joined: true,
    }

    try {
      localStorage.setItem(`reelms:reelm_cache:${reelmId}`, JSON.stringify({
        members: baseReelm.members,
        roles: baseReelm.roles,
        categories: baseReelm.categories
      }))
    } catch {}

    const permissionSet = getReelmPermissionSetClient(baseReelm, uid)
    const canReadJoinRequests = permissionSet.has('manageReelm') || permissionSet.has('manageJoinRequests')
    const canReadModeration = permissionSet.has('manageReelm') || permissionSet.has('manageModeration')

    const [joinRequests, banList, timeoutList] = await Promise.all([
      canReadJoinRequests ? reelmGetDoc(reelmId, 'join_requests').catch(() => []) : Promise.resolve(undefined),
      canReadModeration ? reelmGetDoc(reelmId, 'ban_list').catch(() => []) : Promise.resolve(undefined),
      canReadModeration ? reelmGetDoc(reelmId, 'timeout_list').catch(() => []) : Promise.resolve(undefined),
    ])

    return {
      ...baseReelm,
      ...(Array.isArray(joinRequests) ? { joinRequests } : {}),
      ...(Array.isArray(banList) ? { banList } : {}),
      ...(Array.isArray(timeoutList) ? { timeoutList } : {}),
    }
  }

  const mergeReelmIntoState = (nextReelm, { persist = false } = {}) => {
    if (!nextReelm?.id) return
    const id = String(nextReelm.id)

    if (Array.isArray(nextReelm.members) && nextReelm.members.length > 0) {
      try {
        localStorage.setItem(`reelms:reelm_cache:${id}`, JSON.stringify({
          members: nextReelm.members,
          roles: nextReelm.roles || [],
          categories: nextReelm.categories || []
        }))
      } catch {}
    }

    setSelectedReelm(prev => {
      if (String(prev?.id || '') !== id && prev) return prev
      const merged = { ...(prev || {}), ...nextReelm }
      if (prev && (!Array.isArray(nextReelm.members) || nextReelm.members.length === 0) && Array.isArray(prev.members) && prev.members.length > 0) {
        merged.members = prev.members
      }
      if (prev && (!Array.isArray(nextReelm.roles) || nextReelm.roles.length === 0) && Array.isArray(prev.roles) && prev.roles.length > 0) {
        merged.roles = prev.roles
      }
      if (prev && !Array.isArray(nextReelm.joinRequests) && Array.isArray(prev.joinRequests)) merged.joinRequests = prev.joinRequests
      if (prev && !Array.isArray(nextReelm.banList) && Array.isArray(prev.banList)) merged.banList = prev.banList
      if (prev && !Array.isArray(nextReelm.timeoutList) && Array.isArray(prev.timeoutList)) merged.timeoutList = prev.timeoutList
      return merged
    })

    setReelms(prev => {
      const next = prev.some(r => String(r.id) === id)
        ? prev.map(r => {
            if (String(r.id) !== id) return r
            const merged = { ...r, ...nextReelm }
            if ((!Array.isArray(nextReelm.members) || nextReelm.members.length === 0) && Array.isArray(r.members) && r.members.length > 0) {
              merged.members = r.members
            }
            if ((!Array.isArray(nextReelm.roles) || nextReelm.roles.length === 0) && Array.isArray(r.roles) && r.roles.length > 0) {
              merged.roles = r.roles
            }
            if (!Array.isArray(nextReelm.joinRequests) && Array.isArray(r.joinRequests)) merged.joinRequests = r.joinRequests
            if (!Array.isArray(nextReelm.banList) && Array.isArray(r.banList)) merged.banList = r.banList
            if (!Array.isArray(nextReelm.timeoutList) && Array.isArray(r.timeoutList)) merged.timeoutList = r.timeoutList
            return merged
          })
        : [nextReelm, ...prev]
      if (persist) scheduleUserPersist('reelms', next)
      return next
    })
  }

  const persistReelmCore = async (reelm, options = {}) => {
    if (!reelm?.id) return
    const only = Array.isArray(options.only) ? new Set(options.only) : null
    if (!only || only.has('meta')) {
      await reelmPutDoc(reelm.id, 'meta', {
        id: reelm.id,
        name: reelm.name,
        code: reelm.code,
        ownerId: reelm.ownerId || null,
        announcementChannelId: reelm.announcementChannelId || null,
        image: reelm.image || null,
        showInDiscover: reelm.showInDiscover === true,
        joinMode: reelm.joinMode || 'request',
        autoJoinOnInvite: reelm.autoJoinOnInvite === true,
        memberInvitesEnabled: reelm.memberInvitesEnabled !== false,
        memberInviteMode: reelm.memberInviteMode === 'auto' ? 'auto' : 'request',
        ageRating: reelm.ageRating || 'under18',
        updatedAt: Date.now(),
      }).catch(() => {})
    }
    if (!only || only.has('structure')) {
      await reelmPutDoc(reelm.id, 'structure', { categories: reelm.categories || [] }).catch(() => {})
    }
    const includeMembership = options.includeMembership === true || !!only
    if ((includeMembership && (!only || only.has('roles'))) && Array.isArray(reelm.roles)) {
      await reelmPutDoc(reelm.id, 'roles', reelm.roles)
    }
    if ((includeMembership && (!only || only.has('members'))) && Array.isArray(reelm.members)) {
      await reelmPutDoc(reelm.id, 'members', reelm.members, { allowMemberRemoval: options.allowMemberRemoval === true })
    }
  }

  const createDefaultReelm = (name, template = null, t = k => k) => {
    const reelmId = Date.now().toString()
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const mkId = () => 'ch-' + Math.random().toString(36).substring(2, 8)
    const mkCat = () => 'cat-' + Math.random().toString(36).substring(2, 8)

    let announcementChannelId, categories
    if (template) {
      const bChannels = template.beginning.map(n => ({ id: mkId(), name: n, type: 'announcement' }))
      announcementChannelId = bChannels[0].id
      categories = [
        { id: mkCat(), name: t('cat_beginning'), type: 'announcement', icon: 'general', collapsed: false, channels: bChannels },
        { id: mkCat(), name: t('cat_text'), type: 'text', icon: 'text', collapsed: false,
          channels: template.text.map(n => ({ id: mkId(), name: n, type: 'text' })) },
        { id: mkCat(), name: t('cat_voice'), type: 'voice', icon: 'multimedia', collapsed: false,
          channels: template.mm.map((n, i) => ({ id: mkId(), name: n, type: 'voice', capacity: i === 0 ? 8 : 4, current: 0 })) },
        { id: mkCat(), name: t('cat_live'), type: 'live', icon: 'liveaction', collapsed: false,
          channels: template.live.map(n => ({ id: mkId(), name: n, type: 'live' })) },
      ]
    } else {
      announcementChannelId = 'ch-tumu'
      categories = [
        { id: 'cat-baslangic', name: t('cat_beginning'), type: 'announcement', icon: 'general', collapsed: false,
          channels: [{ id: 'ch-tumu', name: t('ch_everything'), type: 'announcement' }] },
        { id: 'cat-text', name: t('cat_text'), type: 'text', icon: 'text', collapsed: false,
          channels: [{ id: 'ch-general', name: t('ch_chat'), type: 'text' }] },
        { id: 'cat-voice', name: t('cat_voice'), type: 'voice', icon: 'multimedia', collapsed: false,
          channels: [
            { id: 'ch-voice-room', name: t('ch_voice_room'), type: 'voice', capacity: 8, current: 0 },
            { id: 'ch-video-room', name: t('ch_video_room'), type: 'voice', capacity: 4, current: 0 },
          ] },
        { id: 'cat-live', name: t('cat_live'), type: 'live', icon: 'liveaction', collapsed: false,
          channels: [{ id: 'ch-ortam', name: t('ch_space'), type: 'live', screenShareModOnly: true }] },
      ]
    }

    return {
      id: reelmId, code, name, updatedAt: Date.now(), ownerId: uid,
      showInDiscover: true,
      joinMode: 'request',
      autoJoinOnInvite: false,
      memberInvitesEnabled: true,
      memberInviteMode: 'request',
      ageRating: 'under18',
      announcementChannelId,
      roles: [
        { id: 'role-admin-' + reelmId, name: 'Admin', color: '#f87171', position: 0, permissions: { manageReelm: true } },
        { id: 'role-member-' + reelmId, name: 'Member', color: '#60a5fa', position: 1, permissions: {} },
      ],
      members: [{ userId: uid, userName: currentUser.name, userPhoto: currentUser.photo || null, roleIds: ['role-admin-' + reelmId] }],
      categories,
    }
  }

  const handleCreateReelm = async () => {
    const name = reelmNameInput.trim()
    if (!name) return
    const draftReelm = createDefaultReelm(name, activeTemplate, getT(language))
    let newReelm = draftReelm
    try {
      newReelm = await createReelmRemote(draftReelm) || draftReelm
    } catch (err) {
      console.warn('Remote reelm create failed; falling back to compatibility writes:', err)
      persistReelmCore(draftReelm, { includeMembership: true }).catch(() => {})
    }

    setReelms(prev => {
      const next = [newReelm, ...prev.filter(r => String(r.id) !== String(newReelm.id))]
      scheduleUserPersist('reelms', next)
      return next
    })
    socketJoinReelm(newReelm.id)
    const firstCh = newReelm.categories?.flatMap(c => c.channels || []).find(c => c.type === 'text' || c.type === 'announcement') || newReelm.categories?.[0]?.channels?.[0] || null
    if (firstCh) setSelectedChannel(firstCh)
    handleSelectReelm(newReelm)
    setSelectedChat(null)
    setShowNotificationsPanel(false)
    setShowFriendsPanel(false)
    setShowDiscover(false)
    setShowSettings(false)
    setShowChatList(false)
    setMobileLeftPanelOpen(false)
    setReelmNameInput('')
    setSelectedTemplateId(null)
    setCreateReelmStep(null)
    setShowMenu(false)

    const annChId = newReelm.announcementChannelId || newReelm.categories?.find(c => c.type === 'announcement')?.channels?.[0]?.id
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const creationMessages = [
      `Today was the day... ${dateStr}, ${name} created. ✦`,
      `And just like that, ${name} existed. ${dateStr}.`,
      `${name} has entered the chat. Permanently. (${dateStr})`,
      `Somewhere, a server whispered: ${name} is now real. ${dateStr}.`,
      `Big day. ${dateStr}. ${name} was born into this world.`,
    ]
    const msg = creationMessages[Math.floor(Math.random() * creationMessages.length)]
    if (annChId) postSystemMessage(newReelm.id, annChId, msg)
  }

  const requestJoinDiscoverReelm = async (reelm) => {
    if (!reelm?.id) return
    if (reelms.some(r => String(r.id) === String(reelm.id))) {
      handleSelectReelm(reelms.find(r => String(r.id) === String(reelm.id)))
      setShowDiscover(false)
      return
    }
    const isOpen = reelm.joinMode === 'open' || reelm.isPublic !== false
    try {
      const result = await requestJoinReelm(reelm.id)
      if (result?.joined || isOpen) {
        const joinedReelm = result?.reelm || await hydrateReelmCore(reelm.id).catch(() => null) || {
          id: reelm.id,
          name: reelm.name,
          code: reelm.code || 'REELM',
          ownerId: reelm.ownerId || null,
          category: reelm.category || 'community',
          description: reelm.description || '',
          isPublic: true,
          joinMode: 'open',
          roles: [],
          members: [{ id: currentUserId, userId: currentUserId, name: currentUser?.name || currentUser?.username || 'Member' }],
          categories: [
            { id: `cat-${reelm.id}-start`, name: 'Welcome', type: 'announcement', icon: 'general', collapsed: false, channels: [{ id: `ch-${reelm.id}-welcome`, name: 'welcome', type: 'announcement' }] },
            { id: `cat-${reelm.id}-general`, name: 'General', type: 'text', icon: 'text', collapsed: false, channels: [{ id: `ch-${reelm.id}-chat`, name: 'chat', type: 'text' }] },
            { id: `cat-${reelm.id}-voice`, name: 'Voice & Video', type: 'voice', icon: 'multimedia', collapsed: false, channels: [{ id: `ch-${reelm.id}-lounge`, name: 'Lounge', type: 'voice', capacity: 20, current: 0 }] }
          ]
        }
        setPendingReelmJoinIds(prev => prev.filter(id => String(id) !== String(reelm.id)))
        mergeReelmIntoState(joinedReelm)
        handleSelectReelm(joinedReelm)
        setShowDiscover(false)
        addNotification(`Joined ${joinedReelm.name}.`, { type: 'reelm', reelmId: joinedReelm.id })
      } else {
        setPendingReelmJoinIds(prev => prev.includes(String(reelm.id)) ? prev : [...prev, String(reelm.id)])
        setDiscoverReelmsList(prev => prev.map(r => String(r.id) === String(reelm.id) ? { ...r, pending: true } : r))
        addNotification(`Join request sent to ${reelm.name}.`, { type: 'reelm_join_pending', reelmId: reelm.id })
      }
    } catch (err) {
      if (isOpen) {
        const fallbackReelm = {
          id: reelm.id,
          name: reelm.name,
          code: reelm.code || 'REELM',
          ownerId: reelm.ownerId || null,
          category: reelm.category || 'community',
          description: reelm.description || '',
          isPublic: true,
          joinMode: 'open',
          roles: [],
          members: [{ id: currentUserId, userId: currentUserId, name: currentUser?.name || currentUser?.username || 'Member' }],
          categories: [
            { id: `cat-${reelm.id}-start`, name: 'Welcome', type: 'announcement', icon: 'general', collapsed: false, channels: [{ id: `ch-${reelm.id}-welcome`, name: 'welcome', type: 'announcement' }] },
            { id: `cat-${reelm.id}-general`, name: 'General', type: 'text', icon: 'text', collapsed: false, channels: [{ id: `ch-${reelm.id}-chat`, name: 'chat', type: 'text' }] },
            { id: `cat-${reelm.id}-voice`, name: 'Voice & Video', type: 'voice', icon: 'multimedia', collapsed: false, channels: [{ id: `ch-${reelm.id}-lounge`, name: 'Lounge', type: 'voice', capacity: 20, current: 0 }] }
          ]
        }
        setPendingReelmJoinIds(prev => prev.filter(id => String(id) !== String(reelm.id)))
        mergeReelmIntoState(fallbackReelm)
        handleSelectReelm(fallbackReelm)
        setShowDiscover(false)
        addNotification(`Joined ${reelm.name}.`, { type: 'reelm', reelmId: reelm.id })
      } else if (err?.code === 'reelm/banned' || err?.message === 'reelm_banned') {
        addNotification(err?.payload?.ban?.message || `You are banned from ${reelm.name}.`)
      } else {
        addNotification(`Could not join ${reelm.name}.`)
      }
    }
  }

  const approveReelmJoinRequest = async (reelmId, requesterId) => {
    try {
      const result = await approveJoinReelm(reelmId, requesterId)
      const nextReelm = result?.reelm
      if (nextReelm) mergeReelmIntoState(nextReelm)
      else hydrateReelmCore(reelmId).then(r => r && mergeReelmIntoState(r)).catch(() => {})
    } catch { addNotification('Could not approve join request.') }
  }

  const rejectReelmJoinRequest = async (reelmId, requesterId) => {
    try {
      await rejectJoinReelm(reelmId, requesterId)
      setSelectedReelm(prev => String(prev?.id || '') === String(reelmId)
        ? { ...prev, joinRequests: (prev.joinRequests || []).filter(r => String(r.userId || r.id || '') !== String(requesterId)) }
        : prev)
      setReelms(prev => prev.map(r => String(r.id) === String(reelmId)
        ? { ...r, joinRequests: (r.joinRequests || []).filter(req => String(req.userId || req.id || '') !== String(requesterId)) }
        : r))
    } catch { addNotification('Could not reject join request.') }
  }

  const inviteFriendToReelm = async (reelmId, targetUid) => {
    try {
      const result = await inviteReelmFriend(reelmId, targetUid)
      if (result?.alreadyMember) addNotification('This user is already in this Reelm.', { type: 'reelm_invite_sent', reelmId })
      else if (result?.bypassApproval) addNotification('Invite sent. They can join directly.', { type: 'reelm_invite_sent', reelmId })
      else addNotification('Invite sent. The owner/admin will approve after they accept.', { type: 'reelm_invite_sent', reelmId })
    } catch (err) {
      if (err?.code === 'reelm/banned' || err?.message === 'reelm_banned') addNotification('This user is banned from this Reelm.')
      else if (err?.message === 'forbidden' || err?.code === 'forbidden') addNotification('You do not have permission to invite members here.')
      else addNotification('Could not send invite.')
    }
  }

  const banMemberFromReelm = async (reelmId, targetUid, providedReason = null) => {
    if (!reelmId || !targetUid) return
    const reelmName = reelmsRef.current.find(r => String(r.id) === String(reelmId))?.name || selectedReelmRef.current?.name || 'this Reelm'
    const reason = providedReason != null ? providedReason : window.prompt('Ban message shown to this user on behalf of the server:', `You were banned from ${reelmName}.`)
    if (reason == null) return
    if (!String(reason).trim()) { addNotification('Ban message is required.'); return }
    try {
      const result = await banReelmMember(reelmId, targetUid, reason)
      if (result?.banList) {
        setSelectedReelm(prev => String(prev?.id || '') === String(reelmId)
          ? { ...prev, banList: result.banList, members: (prev.members || []).filter(m => String(m.userId) !== String(targetUid)), joinRequests: (prev.joinRequests || []).filter(r => String(r.userId || r.id || '') !== String(targetUid)), timeoutList: (prev.timeoutList || []).filter(t => String(t.userId || t.id || '') !== String(targetUid)) }
          : prev)
        setReelms(prev => prev.map(r => String(r.id) === String(reelmId)
          ? { ...r, banList: result.banList, members: (r.members || []).filter(m => String(m.userId) !== String(targetUid)), joinRequests: (r.joinRequests || []).filter(req => String(req.userId || req.id || '') !== String(targetUid)), timeoutList: (r.timeoutList || []).filter(t => String(t.userId || t.id || '') !== String(targetUid)) }
          : r))
      }
      hydrateReelmCore(reelmId).then(r => r && mergeReelmIntoState(r)).catch(() => {})
      addNotification('User banned from Reelm.', { type: 'reelm_ban', reelmId })
    } catch (err) {
      if (err?.code === 'cannot_ban_owner' || err?.message === 'cannot_ban_owner') addNotification('You cannot ban the Reelm owner.')
      else if (err?.code === 'cannot_ban_protected' || err?.message === 'cannot_ban_protected') addNotification('This protected admin cannot be banned.')
      else addNotification('Could not ban user.')
    }
  }

  const timeoutMemberInReelm = async (reelmId, targetUid, providedMinutes = null, providedReason = null) => {
    if (!reelmId || !targetUid) return
    const minutesRaw = providedMinutes != null ? providedMinutes : window.prompt('Timeout duration in minutes:', '10')
    if (minutesRaw == null) return
    const minutes = Math.max(1, Math.min(40320, Math.round(Number(minutesRaw) || 10)))
    const reason = providedReason != null ? providedReason : window.prompt('Timeout message shown to this user on behalf of the server:', `You are timed out for ${minutes} minute${minutes === 1 ? '' : 's'}.`)
    if (reason == null) return
    try {
      const result = await timeoutReelmMember(reelmId, targetUid, minutes, reason)
      if (result?.timeoutList) {
        setSelectedReelm(prev => String(prev?.id || '') === String(reelmId) ? { ...prev, timeoutList: result.timeoutList } : prev)
        setReelms(prev => prev.map(r => String(r.id) === String(reelmId) ? { ...r, timeoutList: result.timeoutList } : r))
      }
      hydrateReelmCore(reelmId).then(r => r && mergeReelmIntoState(r)).catch(() => {})
      addNotification('User timed out.', { type: 'reelm_timeout', reelmId })
    } catch (err) {
      if (err?.code === 'cannot_timeout_owner' || err?.message === 'cannot_timeout_owner') addNotification('You cannot timeout the Reelm owner.')
      else if (err?.code === 'cannot_timeout_protected' || err?.message === 'cannot_timeout_protected') addNotification('This protected admin cannot be timed out.')
      else addNotification('Could not timeout user.')
    }
  }

  const untimeoutMemberInReelm = async (reelmId, targetUid) => {
    if (!reelmId || !targetUid) return
    try {
      const result = await untimeoutReelmMember(reelmId, targetUid)
      if (result?.timeoutList) {
        setSelectedReelm(prev => String(prev?.id || '') === String(reelmId) ? { ...prev, timeoutList: result.timeoutList } : prev)
        setReelms(prev => prev.map(r => String(r.id) === String(reelmId) ? { ...r, timeoutList: result.timeoutList } : r))
      }
      addNotification('Timeout removed.', { type: 'reelm_timeout_removed', reelmId })
    } catch { addNotification('Could not remove timeout.') }
  }

  const unbanMemberFromReelm = async (reelmId, targetUid) => {
    if (!reelmId || !targetUid) return
    try {
      const result = await unbanReelmMember(reelmId, targetUid)
      if (result?.banList) {
        setSelectedReelm(prev => String(prev?.id || '') === String(reelmId) ? { ...prev, banList: result.banList } : prev)
        setReelms(prev => prev.map(r => String(r.id) === String(reelmId) ? { ...r, banList: result.banList } : r))
      }
      addNotification('User removed from ban list.', { type: 'reelm_unban', reelmId })
    } catch { addNotification('Could not unban user.') }
  }

  const handleJoinReelm = async () => {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    const existing = reelms.find(r => String(r.code || '').toUpperCase() === code)
    if (existing) {
      setSelectedReelm(existing)
      socketJoinReelm(existing.id)
      setSelectedChat(null)
      setCreateReelmStep(null)
      setShowMenu(false)
      return
    }
    setJoining(true)
    setJoinError('')
    try {
      let newReelm = null
      try {
        newReelm = await joinReelmByCode(code)
      } catch (err) {
        if (err?.code === 'reelm/banned' || err?.message === 'reelm_banned' || err?.code === 'reelm/timeout' || err?.message === 'reelm_timeout') throw err
        // Backward compatible fallback for older local APIs.
        const meta = await reelmByCode(code)
        if (meta?.id) {
          const [structure, roles, members] = await Promise.all([
            reelmGetDoc(meta.id, 'structure').catch(() => null),
            reelmGetDoc(meta.id, 'roles').catch(() => []),
            reelmGetDoc(meta.id, 'members').catch(() => []),
          ])
          newReelm = {
            ...meta,
            roles: Array.isArray(roles) ? roles : [],
            members: Array.isArray(members) ? members : [],
            joined: true,
            categories: structure?.categories || meta.categories || [
              { id: 'cat-general', name: 'General', type: 'text', channels: [{ id: 'ch-general', name: 'general', type: 'text' }] },
            ],
          }
        }
      }
      if (!newReelm) { setJoinError('Reelm not found. Check the code and try again.'); setJoining(false); return }
      if (newReelm.pending) {
        setPendingReelmJoinIds(prev => prev.includes(String(newReelm.reelmId)) ? prev : [...prev, String(newReelm.reelmId)])
        setJoinError(`Join request sent${newReelm.name ? ` to ${newReelm.name}` : ''}.`)
        setJoining(false)
        return
      }
      if (newReelm.reelm) newReelm = newReelm.reelm
      setReelms(prev => {
        const next = [newReelm, ...prev.filter(r => String(r.id) !== String(newReelm.id))]
        scheduleUserPersist('reelms', next)
        return next
      })
      setSelectedReelm(newReelm)
      socketJoinReelm(newReelm.id)
      setSelectedChat(null)
      setCreateReelmStep(null)
      setShowMenu(false)
    } catch (err) {
      if (err?.code === 'reelm/banned' || err?.message === 'reelm_banned') setJoinError(err?.payload?.ban?.message || 'You are banned from this Reelm.')
      else setJoinError('Something went wrong. Please try again.')
    }
    setJoining(false)
  }

  const toggleCategory = (reelmId, catId) => {
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : {
        ...r,
        categories: r.categories.map(c => c.id !== catId ? c : { ...c, collapsed: !c.collapsed })
      })
      scheduleUserPersist('reelms', next)
      return next
    })
    if (selectedReelm?.id === reelmId) {
      setSelectedReelm(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id !== catId ? c : { ...c, collapsed: !c.collapsed })
      }))
    }
  }

  const addChannel = (reelmId, catId) => {
    const cat = selectedReelm?.categories.find(c => c.id === catId)
    if (!cat) return
    const newChannel = {
      id: 'ch-' + Date.now(),
      name: cat.type === 'text' ? 'new-channel' : cat.type === 'voice' ? 'New Room' : cat.type === 'live' ? 'new-space' : 'new-channel',
      type: cat.type,
      ...(cat.type === 'voice' ? { capacity: 8, current: 0 } : {})
    }
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : {
        ...r,
        categories: r.categories.map(c => c.id !== catId ? c : { ...c, channels: [...c.channels, newChannel] })
      })
      scheduleUserPersist('reelms', next)
      return next
    })
    const updatedSelected = selectedReelm ? {
      ...selectedReelm,
      categories: selectedReelm.categories.map(c => c.id !== catId ? c : { ...c, channels: [...c.channels, newChannel] })
    } : null
    if (updatedSelected) {
      setSelectedReelm(updatedSelected)
      persistReelmCore(updatedSelected)
    }
    setEditingChannelId(newChannel.id)
    setEditingChannelName('')
    if (cat.type === 'voice') setNewVoiceChannelId(newChannel.id)
  }

  const saveChannelName = (reelmId, catId, chId) => {
    const name = editingChannelName.trim()
    if (!name) { setEditingChannelId(null); setNewVoiceChannelId(null); return }
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : {
        ...c,
        channels: c.channels.map(ch => ch.id !== chId ? ch : { ...ch, name })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setEditingChannelId(null)
  }

  const saveChannelCapacity = (reelmId, catId, chId, cap) => {
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : {
        ...c,
        channels: c.channels.map(ch => ch.id !== chId ? ch : { ...ch, capacity: cap })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
  }

  const deleteChannel = (reelmId, catId, chId) => {
    const updater = prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id !== catId ? c : {
        ...c, channels: c.channels.filter(ch => ch.id !== chId)
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    if (selectedChannel?.id === chId) setSelectedChannel(null)
  }

  const createSubchannel = (reelmId, catId, parentChId) => {
    const newSubchannel = {
      id: 'subch-' + Date.now(),
      name: 'new-subchannel',
      type: 'text',
      parentId: parentChId,
      createdAt: Date.now()
    }
    const updater = prev => ({
      ...prev,
      categories: (prev.categories || []).map(c => c.id !== catId ? c : {
        ...c,
        channels: (c.channels || []).map(ch => ch.id !== parentChId ? ch : {
          ...ch,
          subchannels: [...(ch.subchannels || []), newSubchannel]
        })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setEditingChannelId(newSubchannel.id)
    setEditingChannelName('')
  }

  const deleteSubchannel = (reelmId, catId, parentChId, subChId) => {
    const updater = prev => ({
      ...prev,
      categories: (prev.categories || []).map(c => c.id !== catId ? c : {
        ...c,
        channels: (c.channels || []).map(ch => ch.id !== parentChId ? ch : {
          ...ch,
          subchannels: (ch.subchannels || []).filter(s => s.id !== subChId)
        })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    if (selectedChannel?.id === subChId) setSelectedChannel(null)
  }

  const saveSubchannelName = (reelmId, catId, parentChId, subChId) => {
    const name = editingChannelName.trim()
    if (!name) { setEditingChannelId(null); return }
    const updater = prev => ({
      ...prev,
      categories: (prev.categories || []).map(c => c.id !== catId ? c : {
        ...c,
        channels: (c.channels || []).map(ch => ch.id !== parentChId ? ch : {
          ...ch,
          subchannels: (ch.subchannels || []).map(s => s.id !== subChId ? s : { ...s, name })
        })
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setEditingChannelId(null)
  }

  const createReelmEvent = (reelmId, eventData) => {
    const newEvent = {
      id: 'ev-' + Date.now(),
      title: eventData.title || 'New Event',
      description: eventData.description || '',
      startTime: eventData.startTime || new Date(Date.now() + 86400000).toISOString(),
      location: eventData.location || '',
      createdBy: uid,
      interestedUids: [uid],
      createdAt: Date.now()
    }
    const updater = prev => ({
      ...prev,
      events: [...(prev.events || []), newEvent]
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
    setShowCreateEventModal(null)
  }

  const deleteReelmEvent = (reelmId, eventId) => {
    const updater = prev => ({
      ...prev,
      events: (prev.events || []).filter(e => e.id !== eventId)
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
  }

  const toggleEventInterest = (reelmId, eventId) => {
    const updater = prev => ({
      ...prev,
      events: (prev.events || []).map(e => {
        if (e.id !== eventId) return e
        const uids = e.interestedUids || []
        const has = uids.includes(uid)
        return {
          ...e,
          interestedUids: has ? uids.filter(u => u !== uid) : [...uids, uid]
        }
      })
    })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
  }

  const updateReelmImage = (reelmId, imageDataUrl) => {
    const updater = r => ({ ...r, image: imageDataUrl })
    setReelms(prev => {
      const next = prev.map(r => r.id !== reelmId ? r : updater(r))
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(prev => {
      const next = updater(prev)
      persistReelmCore(next)
      return next
    })
  }

  const leaveReelm = async (reelmId) => {
    const id = String(reelmId || '')
    if (!id) return
    const target = reelmsRef.current.find(r => String(r.id) === id) || selectedReelmRef.current
    setShowReelmMenu(false)
    if (!target) return
    if (String(target.ownerId || '') === String(uid) && !isDefaultCommunity(target)) {
      addNotification('You own this Reelm. Transfer ownership before leaving it.')
      return
    }
    const wasSelected = String(selectedReelmRef.current?.id || '') === id
    try {
      await leaveReelmRemote(id)
    } catch (err) {
      if (err?.code === 'owner_cannot_leave' || err?.message === 'owner_cannot_leave') addNotification('You own this Reelm. Transfer ownership before leaving it.')
      else addNotification(`Could not leave ${target.name || 'this Reelm'}. Please try again.`)
      return
    }
    if (voiceChannel?.reelmId && String(voiceChannel.reelmId) === id) leaveVoiceChannel()
    socketLeaveReelm(id)
    setPendingReelmJoinIds(prev => prev.filter(x => String(x) !== id))
    setReelms(prev => {
      const next = prev.filter(r => String(r.id) !== id)
      scheduleUserPersist('reelms', next)
      return next
    })
    if (wasSelected) {
      setSelectedReelm(null)
      setSelectedChannel(null)
      setShowFeed(false)
    }
    addNotification(`Left ${target.name || 'Reelm'}.`)
  }

  const closeReelm = async (reelmId, confirmName) => {
    const id = String(reelmId || '')
    if (!id) return
    const target = reelmsRef.current.find(r => String(r.id) === id) || selectedReelmRef.current
    if (!target || isDefaultCommunity(target)) return
    try {
      await closeReelmRemote(id, confirmName)
      if (voiceChannel?.reelmId && String(voiceChannel.reelmId) === id) leaveVoiceChannel()
      socketLeaveReelm(id)
      setReelms(prev => {
        const next = prev.filter(r => String(r.id) !== id)
        scheduleUserPersist('reelms', next)
        return next
      })
      setSelectedReelm(null)
      setSelectedChannel(null)
      setShowReelmSettings(false)
      addNotification(`${target.name || 'Reelm'} was closed.`)
    } catch (err) {
      if (err?.code === 'confirmation_required' || err?.message === 'confirmation_required') addNotification('Type the exact server name to close it.')
      else if (err?.code === 'forbidden' || err?.message === 'forbidden') addNotification('Only the server owner/admin can close this server.')
      else addNotification('Could not close this server. Please try again.')
    }
  }

  const updateReelm = async (updatedReelm, options = {}) => {
    setReelms(prev => {
      const next = prev.map(r => r.id === updatedReelm.id ? updatedReelm : r)
      scheduleUserPersist('reelms', next)
      return next
    })
    setSelectedReelm(updatedReelm)
    const scope = options?.scope
    if (scope === 'roles-members') return persistReelmCore(updatedReelm, { only: ['roles', 'members'], allowMemberRemoval: options?.allowMemberRemoval === true })
    return persistReelmCore(updatedReelm)
  }

  const removeMemberFromSelectedReelm = (targetUid, reason = '') => {
    if (!selectedReelm || !targetUid) return
    const member = (selectedReelm.members || []).find(m => String(m.userId) === String(targetUid))
    if (!canActOnReelmMemberClient(selectedReelm, uid, member, 'manageMembers')) { addNotification('You cannot kick this member.'); return }
    const next = { ...selectedReelm, members: (selectedReelm.members || []).filter(m => String(m.userId) !== String(targetUid)) }
    updateReelm(next, { scope: 'roles-members', allowMemberRemoval: true })
    addNotification(reason ? `Member kicked from Reelm: ${reason}` : 'Member kicked from Reelm.')
  }

  const openServerMemberAction = (type, reelmId, user) => {
    if (!type || !reelmId || !user?.id) return
    setServerMemberAction({ type, reelmId, user })
    setServerActionMinutes(10)
    setServerActionReason(type === 'ban' ? `You were banned from ${selectedReelmRef.current?.name || 'this Reelm'}.` : type === 'timeout' ? 'Please cool down before rejoining the conversation.' : '')
  }

  const confirmServerMemberAction = async () => {
    const action = serverMemberAction
    if (!action?.user?.id) return
    const targetUid = action.user.id
    const reelmId = action.reelmId
    const reason = String(serverActionReason || '').trim()
    setServerMemberAction(null)
    setServerActionReason('')
    try {
      if (action.type === 'ban') await banMemberFromReelm(reelmId, targetUid, reason)
      else if (action.type === 'timeout') await timeoutMemberInReelm(reelmId, targetUid, Number(serverActionMinutes) || 10, reason)
      else if (action.type === 'remove') removeMemberFromSelectedReelm(targetUid, reason)
    } catch { addNotification('Could not complete server action.') }
  }

  const handleMenuItemClick = (action) => {
    if (action === 'createReelm') {
      setCreateReelmStep('naming')
      setReelmNameInput('')
      return
    }
    if (action === 'joinReelm') {
      setCreateReelmStep('joining')
      setJoinCodeInput('')
      setJoinError('')
      return
    }
    if (action === 'startChat') {
      setCreateReelmStep('startChat')
      setFriendSelectorQuery('')
      return
    }
    if (action === 'startGroupChat') {
      setCreateReelmStep('group_friends')
      setGroupSelectedFriends([])
      setGroupNameInput('')
      setGroupPhotoInput(null)
      return
    }
    setShowMenu(false)
  }

  const isMod = Boolean(currentUser?.isModerator)
  const [showModInbox, setShowModInbox] = useState(false)
  const totalUnread = chats.reduce((s, c) => s + (unreadCounts[c.id] || 0), 0)

  const openReport = (type, targetId, targetContent, targetUserId, targetUserName, context) => {
    setReportModal({ type, targetId, targetContent: (targetContent || '').slice(0, 200), targetUserId, targetUserName, context: context || '' })
  }

  const _submitReport = (reason) => {
    if (!reportModal) return
    const report = {
      id: Date.now().toString(),
      reporterId: uid,
      reporterName: currentUser.name || 'Unknown',
      ...reportModal,
      reason,
      reelmId: selectedReelm?.id || '',
      timestamp: Date.now(),
      resolved: false,
    }
    const next = [report, ...reports]
    setReports(next)
    appPutDoc('reports', next).catch(() => {})
    modReportSend(report).catch(() => {})
    setReportModal(null)
  }

  const modDeleteMessage = (msgKey, msgId) => {
    let snapshot = null
    setMessages(prev => {
      snapshot = prev[msgKey] || []
      const filtered = snapshot.filter(m => String(m.id) !== String(msgId))
      saveCachedMessages(msgKey, filtered)
      return { ...prev, [msgKey]: filtered }
    })
    messageDelete(msgKey, msgId).catch((err) => {
      // Server refused (e.g. not allowed) — roll back so the UI matches reality
      if (snapshot) {
        saveCachedMessages(msgKey, snapshot)
        setMessages(prev => ({ ...prev, [msgKey]: snapshot }))
      }
      setModerationWarning(err?.status === 403 ? 'You are not allowed to delete this message.' : 'Message could not be deleted.')
      setTimeout(() => setModerationWarning(''), 4000)
    })
  }

  const modDeletePost = async (postId) => {
    const rId = selectedReelm?.id || 'global'
    try {
      const raw = await reelmGetDoc(rId, 'feed_posts')
      const posts = (Array.isArray(raw) ? raw : []).filter(p => p.id !== postId)
      patchReelmCache(rId, { feed_posts: posts })
      await reelmPutDoc(rId, 'feed_posts', posts)
      setModDeleteTick(t => t + 1)
    } catch { /* noop */ }
  }

  const _modDeleteReelm = (reelmId) => {
    setReelms(prev => prev.filter(r => r.id !== reelmId))
    if (selectedReelm?.id === reelmId) setSelectedReelm(null)
  }

  const handleRemoteMessageError = (err, msgKey, localId) => {
    if (err?.code === 'reelm/timeout' || err?.message === 'reelm_timeout') {
      if (localId) setMessages(prev => ({ ...prev, [msgKey]: (prev[msgKey] || []).filter(m => String(m.id) !== String(localId)) }))
      const timeout = err?.payload?.timeout
      setModerationWarning(timeout?.message || 'You are timed out in this Reelm.')
      setTimeout(() => setModerationWarning(''), 4500)
      return
    }
    if (localId) setMessages(prev => ({ ...prev, [msgKey]: (prev[msgKey] || []).filter(m => String(m.id) !== String(localId)) }))
    setModerationWarning('Message could not be sent.')
    setTimeout(() => setModerationWarning(''), 3000)
  }

  const postSystemMessage = (reelmId, channelId, text) => {
    const msgKey = `${reelmId}_${channelId}`
    const msg = { id: createClientMessageId(), text, sender: { id: 'system', name: 'Reelms', photo: null }, time: Date.now(), isSystem: true }
    messageSend(msgKey, msg).catch(err => handleRemoteMessageError(err, msgKey, msg.id))
  }

  const BOT_COMMANDS = [
    {
      bot: 'General',
      commands: [
        { cmd: '/shrug', args: '[message]', desc: 'Append ¯\\_(ツ)_/¯ shrug emoji' },
        { cmd: '/tableflip', args: '', desc: 'Rage table flip (╯°□°)╯︵ ┻━┻' },
        { cmd: '/unflip', args: '', desc: 'Put table back ┬─┬ノ( º _ ºノ)' },
        { cmd: '/poll', args: '<question>', desc: 'Create a quick poll with 👍/👎 reactions' },
        { cmd: '/roll', args: '<NdM>', desc: 'Roll dice (e.g. /roll 1d20, /roll 2d6)' },
        { cmd: '/flip', args: '', desc: 'Flip a coin (Heads / Tails)' },
        { cmd: '/clear', args: '', desc: 'Clear local channel messages' },
        { cmd: '/tts', args: '<text>', desc: 'Read text aloud via text-to-speech' },
        { cmd: '/me', args: '<action>', desc: 'Send an italicized action message' },
        { cmd: '/help', args: '', desc: 'List interactive chat commands' },
      ]
    },
    {
      bot: 'Reelms Intelligence',
      commands: [
        { cmd: '/ai', args: '<message>', desc: t('slash_cmd_ai_desc') },
        { cmd: '/summarize', args: '[n]', desc: t('slash_cmd_summarize_desc') },
        { cmd: '/digest', args: '', desc: t('slash_cmd_digest_desc') },
        { cmd: '/ai-reset', args: '', desc: t('slash_cmd_ai_reset_desc') },
        { cmd: '/ai-help', args: '', desc: t('slash_cmd_ai_help_desc') },
      ]
    },
    {
      bot: 'Reelm Radio',
      commands: [
        { cmd: '/play', args: '<query>', desc: t('slash_cmd_play_desc') },
        { cmd: '/skip', args: '', desc: t('slash_cmd_skip_desc') },
        { cmd: '/queue', args: '', desc: t('slash_cmd_queue_desc') },
        { cmd: '/stop', args: '', desc: t('slash_cmd_stop_desc') },
      ]
    },
  ]

  const [slashShowAll, setSlashShowAll] = useState(false)
  // Which bot's commands are shown in the slash menu (no-filter view). null → default:
  // "Reelms Intelligence" if present, otherwise the bot with the longest command list.
  const [slashExpandedBot, setSlashExpandedBot] = useState(null)

  const slashOptions = useMemo(() => {
    if (!slashMenu) return []
    const f = slashMenu.filter.toLowerCase()
    if (!f) return []
    const all = BOT_COMMANDS.flatMap(b => b.commands)
    return all.filter(c => c.cmd.slice(1).startsWith(f))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slashMenu])

  // ── Rich text editor (contentEditable) helpers ──────────────────────────────
  const FMT_COLORS = ['#ff4d4f', '#ff9f1c', '#ffd60a', '#34d399', '#22d3ee', '#3b82f6', '#a855f7', '#f472b6', '#ffffff', '#94a3b8', '#1f2937', '#000000']

  // Move the caret to the end of the editor after we replace its contents.
  const placeCaretAtEnd = (el) => {
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  // Replace the editor with plain text (used by mentions/slash/clear) and sync state.
  const setEditorPlainText = (text) => {
    messageInputRef.current = text
    setMessageInput(text)
    const el = editorRef.current
    if (el) {
      el.textContent = text
      placeCaretAtEnd(el)
    }
  }

  // Plain-text caret offset, so mention/slash detection keeps working in the rich editor.
  const getCaretCharOffset = (el) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !el) return 0
    const range = sel.getRangeAt(0)
    if (!el.contains(range.endContainer)) return 0
    const pre = range.cloneRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.endContainer, range.endOffset)
    return pre.toString().length
  }

  const syncEditorTyping = (val) => {
    const tMsgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!tMsgKey) return
    if (val.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true
        socketEmitTyping(tMsgKey, { name: currentUser?.displayName || currentUser?.name || '', photo: currentUser?.photoURL || currentUser?.photo || '' })
      }
      clearTimeout(typingEmitTimer.current)
      typingEmitTimer.current = setTimeout(() => {
        isTypingRef.current = false
        socketEmitTypingStop(tMsgKey)
      }, 3000)
    } else if (isTypingRef.current) {
      isTypingRef.current = false
      clearTimeout(typingEmitTimer.current)
      socketEmitTypingStop(tMsgKey)
    }
  }

  const handleEditorInput = (e) => {
    const el = e.currentTarget
    const val = el.innerText.replace(/\n$/, '')
    // Clear leftover <br>/<div> so the :empty placeholder shows again.
    if (!val.trim() && el.innerHTML !== '') el.innerHTML = ''
    messageInputRef.current = val
    setMessageInput(val)
    const cursor = getCaretCharOffset(el)
    const before = val.slice(0, cursor)
    const mentionMatch = before.match(/@(\w*)$/)
    if (mentionMatch) { setMentionQuery({ query: mentionMatch[1], triggerStart: cursor - mentionMatch[0].length }); setMentionSelIdx(0) }
    else setMentionQuery(null)
    const slashMatch = val.match(/^\/(\w*)$/)
    if (slashMatch) { setSlashMenu({ filter: slashMatch[1] }); setSlashSelIdx(0); setSlashExpandedBot(null); setSlashShowAll(false) }
    else { setSlashMenu(null); setSlashExpandedBot(null); setSlashShowAll(false) }
    syncEditorTyping(val)
  }

  const handleEditorContextMenu = (e) => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !editorRef.current?.contains(sel.anchorNode)) return
    e.preventDefault()
    savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    setFmtColorOpen(false)
    setFmtMenu({ x: e.clientX, y: e.clientY })
  }

  const restoreSavedRange = () => {
    const el = editorRef.current
    if (!el) return false
    el.focus()
    const sel = window.getSelection()
    if (savedRangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
      return true
    }
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      return true
    }
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  }

  const insertCodeBlock = (lang = 'javascript') => {
    const el = editorRef.current
    if (!el) return
    restoreSavedRange()
    const sel = window.getSelection()
    const selectedText = sel ? sel.toString() : ''
    const snippet = '```' + lang + '\n' + (selectedText || '// Code here') + '\n```\n'
    document.execCommand('insertText', false, snippet)
    messageInputRef.current = el.innerText.replace(/\n$/, '')
    setMessageInput(messageInputRef.current)
  }

  const insertLink = (title, url) => {
    const el = editorRef.current
    if (!el) return
    restoreSavedRange()
    const linkUrl = url || prompt('Enter link URL (e.g. https://example.com):')
    if (!linkUrl) return
    const linkText = title || linkUrl
    document.execCommand('insertHTML', false, `<a href="${linkUrl}" class="msg-link" style="color: #38bdf8; text-decoration: underline;">${linkText}</a>`)
    messageInputRef.current = el.innerText.replace(/\n$/, '')
    setMessageInput(messageInputRef.current)
  }

  const applyEditorFormat = (kind) => {
    if (!restoreSavedRange()) return
    const sel = window.getSelection()
    const selText = sel ? sel.toString() : ''

    if (kind === 'spoiler') {
      document.execCommand('insertHTML', false, `<span class="msg-spoiler-inline" style="background: rgba(255,255,255,0.18); border-radius: 4px; padding: 1px 4px; font-weight: 500;">||${selText || 'spoiler'}||</span>`)
    } else if (kind === 'quote') {
      if (selText) {
        document.execCommand('insertHTML', false, `<span class="msg-quote-inline" style="color: var(--accent, #b99887); border-left: 2px solid var(--accent, #b99887); padding-left: 6px; display: inline-block;">&gt; ${selText}</span>`)
      } else {
        document.execCommand('insertHTML', false, `<span class="msg-quote-inline" style="color: var(--accent, #b99887); border-left: 2px solid var(--accent, #b99887); padding-left: 6px; display: inline-block;">&gt; quote</span>`)
      }
    } else if (kind === 'code' || kind === 'mono') {
      document.execCommand('insertHTML', false, `<code class="msg-mono" style="font-family: monospace; background: rgba(255,255,255,0.12); padding: 1px 4px; border-radius: 4px;">${selText || 'code'}</code>`)
    } else if (kind === 'bold') {
      if (selText) {
        document.execCommand('bold', false, null)
      } else {
        document.execCommand('insertHTML', false, '<strong>bold</strong>')
      }
    } else if (kind === 'italic') {
      if (selText) {
        document.execCommand('italic', false, null)
      } else {
        document.execCommand('insertHTML', false, '<em>italic</em>')
      }
    } else if (kind === 'underline') {
      if (selText) {
        document.execCommand('underline', false, null)
      } else {
        document.execCommand('insertHTML', false, '<u>underline</u>')
      }
    } else if (kind === 'strike') {
      if (selText) {
        document.execCommand('strikeThrough', false, null)
      } else {
        document.execCommand('insertHTML', false, '<s>strikethrough</s>')
      }
    } else if (kind === 'clear') {
      document.execCommand('removeFormat', false, null)
    }
    const el = editorRef.current
    if (el) { messageInputRef.current = el.innerText.replace(/\n$/, ''); setMessageInput(messageInputRef.current) }
    setFmtMenu(null)
    setFmtColorOpen(false)
  }

  const applyEditorColor = (colorIdOrHex) => {
    if (!restoreSavedRange()) return
    const sel = window.getSelection()
    const selText = sel ? sel.toString() : ''
    const colorVal = colorIdOrHex.startsWith('#')
      ? colorIdOrHex
      : (SEMANTIC_COLOR_MAP.get(colorIdOrHex) || colorIdOrHex)
    const content = selText || 'colored text'
    document.execCommand('insertHTML', false, `<span style="color: ${colorVal}; font-weight: 500;" data-color="${colorIdOrHex}">${content}</span>`)
    const el = editorRef.current
    if (el) { messageInputRef.current = el.innerText.replace(/\n$/, ''); setMessageInput(messageInputRef.current) }
    setFmtMenu(null)
    setFmtColorOpen(false)
  }

  const insertSlashCommand = (opt) => {
    const text = opt.args ? opt.cmd + ' ' : opt.cmd
    setEditorPlainText(text)
    setSlashMenu(null)
    setSlashSelIdx(0)
    setSlashShowAll(false)
  }

  const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'mJ5UEhU6epu6RoFCjTqiEC1oMFFr130E'

  const fetchGiphy = useCallback(async (query, isSticker) => {
    if (!GIPHY_KEY) return []
    setGifLoading(true)
    try {
      const type = isSticker ? 'stickers' : 'gifs'
      const endpoint = query
        ? `https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`
      const res = await fetch(endpoint)
      const data = await res.json()
      return (data.data || []).map(r => ({
        id: r.id,
        url: r.images?.fixed_height?.url || r.images?.original?.url || '',
        preview: r.images?.fixed_height_small?.webp || r.images?.fixed_height_small?.url || r.images?.fixed_height?.url || '',
        width: Number(r.images?.fixed_height_small?.width) || 120,
        height: Number(r.images?.fixed_height_small?.height) || 120,
      })).filter(r => r.url)
    } catch {
      return []
    } finally {
      setGifLoading(false)
    }
  }, [GIPHY_KEY])

  useEffect(() => {
    if (!showGifPicker) return
    const timer = setTimeout(() => {
      fetchGiphy(gifSearch, gifTab === 'sticker').then(setGifResults)
    }, gifSearch ? 400 : 0)
    return () => clearTimeout(timer)
  }, [showGifPicker, gifSearch, gifTab, fetchGiphy])

  const sendGif = (item) => {
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey || !currentUser) return
    const now = Date.now()
    const msg = {
      id: createClientMessageId(),
      mediaUrl: item.url,
      mediaType: gifTab === 'sticker' ? 'sticker' : 'gif',
      sender: { id: currentUser.id, name: currentUser.name, photo: getPersonPhoto(currentUser) || null },
      time: now,
    }
    setMessages(prev => appendUniqueMessage(prev, msgKey, msg))
    messageSend(msgKey, msg).catch(err => handleRemoteMessageError(err, msgKey, msg.id))
    setShowGifPicker(false)
    setGifSearch('')
  }

  const mentionOptions = useMemo(() => {
    if (!mentionQuery || !selectedReelm) return []
    const q = mentionQuery.query.toLowerCase()
    const opts = []
    if ('everyone'.startsWith(q)) opts.push({ type: 'everyone', displayName: 'everyone', sub: 'Herkesten bahset' })
    const reelmRoles = selectedReelm.roles || []
    reelmRoles.forEach(r => { if (!q || r.name.toLowerCase().includes(q)) opts.push({ type: 'role', displayName: r.name, color: r.color, sub: 'Rol' }) })
    const reelmMembers = selectedReelm.members || []
    reelmMembers.forEach(m => { if (!q || m.userName.toLowerCase().includes(q)) opts.push({ type: 'user', userId: m.userId, displayName: m.userName, photo: m.userPhoto, sub: m.userName }) })
    return opts.slice(0, 7)
  }, [mentionQuery, selectedReelm])

  const insertMention = (opt) => {
    const cur = messageInputRef.current
    const start = mentionQuery.triggerStart
    const end = start + 1 + mentionQuery.query.length
    const newText = cur.slice(0, start) + `@${opt.displayName} ` + cur.slice(end)
    setEditorPlainText(newText)
    setMentionQuery(null)
    setMentionSelIdx(0)
  }

  const notifyMentions = (text) => {
    if (!selectedReelm || !selectedChannel || !text) return
    const reelmMembers = selectedReelm.members || []
    const roles = selectedReelm.roles || []
    const notify = new Set()
    text.split(/\s+/).forEach(word => {
      if (!word.startsWith('@')) return
      const name = word.slice(1).replace(/\W/g, '').toLowerCase()
      if (name === 'everyone') {
        reelmMembers.forEach(m => { if (String(m.userId) !== String(uid)) notify.add(String(m.userId)) })
        return
      }
      const role = roles.find(r => r.name.toLowerCase() === name)
      if (role) { reelmMembers.filter(m => m.roleIds?.includes(role.id) && String(m.userId) !== String(uid)).forEach(m => notify.add(String(m.userId))); return }
      const member = reelmMembers.find(m => m.userName.toLowerCase() === name)
      if (member && String(member.userId) !== String(uid)) notify.add(String(member.userId))
    })
    notify.forEach(targetUid => _pushNotifTo(targetUid, `${currentUser.name} mentioned you in #${selectedChannel.name} channel`, { type: 'reelm', reelmId: selectedReelm.id, channelId: selectedChannel.id }))
  }

  const sendNudge = async (targetId, targetName = 'member') => {
    const target = String(targetId || '')
    if (!target || target === String(uid)) return
    try {
      await socialNotify(target, `${currentUser?.name || 'Someone'} nudged you!`, { type: 'dm', userId: String(uid), nudge: true })
      addNotification(`Nudged ${targetName || 'member'}.`)
    } catch {
      addNotification('Could not send nudge right now.')
    }
  }

  const handleTriggerAIChat = async (msgKey, userText, userMsg) => {
    try {
      const channelMessages = (messages[msgKey] || [])
      const aiBotId = 'reelms-ai-bot'
      const aiBotSender = { id: aiBotId, name: 'Reelms Intelligence', username: 'reelmsintelligence', photo: null, isBot: true }
      
      let aiResultText = ''
      if (userText.startsWith('/ai-help')) {
        aiResultText = `✨ **Reelms Intelligence:**\n\n• \`/ai <mesaj>\` veya \`@Reelms Intelligence <mesaj>\` — Bana seslen, sohbete katılayım!\n• \`/summarize [n]\` — Kanaldaki konuşulanları özetleyeyim\n• Mesaj kutusundaki **✨ Reelms Intelligence** ikonundan veya kanal başlığından özet ve moderasyon menüsüne ulaşabilirsin.`
      } else if (userText.startsWith('/summarize')) {
        const res = await aiSummarize({ msgKey, channelName: selectedChannel?.name || selectedChat?.name || 'Kanal', messages: channelMessages.slice(-50) })
        aiResultText = res?.summary || 'Özet alınamadı.'
      } else {
        let cleanPrompt = userText
        if (cleanPrompt.startsWith('/ai')) cleanPrompt = cleanPrompt.replace(/^\/ai\s*/, '')
        cleanPrompt = cleanPrompt.replace(/@(?:reelms\s*intelligence|reelmsintelligence|reelms-intelligence|reelmsai|intelligence|ai)\b/gi, '').trim()
        if (!cleanPrompt) {
          if (userMsg?.replyTo) {
            cleanPrompt = `Yanıt verilen mesaj: "${userMsg.replyTo.text || ''}". Bu mesaja samimi bir arkadaş gibi yanıt ver.`
          } else {
            cleanPrompt = 'Selam! Neler yapıyorsunuz, sohbet nasıl gidiyor?'
          }
        }
        
        // Build recent history with contextual sender names
        const history = channelMessages.slice(-12).map(m => ({
          role: String(m.sender?.id) === aiBotId ? 'assistant' : 'user',
          content: `${m.sender?.name || m.sender?.username || 'Kullanıcı'}: ${m.text || ''}`
        }))
        const res = await aiChat({ prompt: cleanPrompt, messages: history })
        aiResultText = res?.text || 'Buradayım! Nasıl yardımcı olabilirim?'
      }

      if (aiResultText) {
        const aiMsg = {
          id: createClientMessageId(),
          text: aiResultText,
          sender: aiBotSender,
          time: Date.now(),
          replyTo: userMsg ? { id: userMsg.id, text: userMsg.text?.slice(0, 80), senderName: currentUser.name, senderId: currentUser.id } : undefined
        }
        setMessages(prev => appendUniqueMessage(prev, msgKey, aiMsg))
        messageSend(msgKey, aiMsg).catch(() => {})
      }
    } catch (err) {
      console.error('[AI UI] error:', err)
    }
  }

  const handleAICopilotSend = async () => {
    const prompt = aiCopilotInput.trim()
    if (!prompt || aiCopilotLoading) return
    const userEntry = { role: 'user', content: prompt }
    const nextList = [...aiCopilotMessages, userEntry]
    setAiCopilotMessages(nextList)
    setAiCopilotInput('')
    setAiCopilotLoading(true)
    try {
      const history = nextList.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await aiChat({ prompt, messages: history.slice(0, -1) })
      if (res?.text) {
        setAiCopilotMessages(prev => [...prev, { role: 'assistant', content: res.text }])
      } else {
        setAiCopilotMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, şu anda yanıt oluşturulamadı.' }])
      }
    } catch (err) {
      setAiCopilotMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Hata: ${err?.message || 'Bağlantı kurulamadı'}` }])
    } finally {
      setAiCopilotLoading(false)
    }
  }

  const handleAICopilotSummarize = async (overrideRange) => {
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return
    const channelMessages = messages[msgKey] || []
    const range = overrideRange || aiSummarizeRange
    let limit = 50
    let since = undefined
    let rangeDescription = 'Son 50 mesaj'

    if (range === 'all') {
      limit = 'all'
      rangeDescription = 'Tüm kanal geçmişi'
    } else if (range === '100') {
      limit = 100
      rangeDescription = 'Son 100 mesaj'
    } else if (range === '24h') {
      since = Date.now() - 24 * 60 * 60 * 1000
      rangeDescription = 'Son 24 saat'
      limit = 'all'
    }

    setAiCopilotLoading(true)
    try {
      let filteredMessages = channelMessages
      if (since) {
        filteredMessages = channelMessages.filter(m => Number(m.time) >= since)
      } else if (limit !== 'all') {
        filteredMessages = channelMessages.slice(-Number(limit))
      }

      const res = await aiSummarize({
        msgKey,
        channelName: selectedChannel?.name || selectedChat?.name || 'Sohbet',
        messages: filteredMessages,
        limit,
        since,
        rangeDescription
      })
      setAiCopilotSummary(res?.summary || 'Bu kanalda özetlenecek mesaj bulunamadı.')
    } catch (err) {
      setAiCopilotSummary(`⚠️ Özet alınamadı: ${err?.message || 'Hata oluştu'}`)
    } finally {
      setAiCopilotLoading(false)
    }
  }

  const handleAICopilotModerate = async () => {
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return
    const channelMessages = messages[msgKey] || []
    setAiModerateLoading(true)
    try {
      const res = await aiModerate({
        msgKey,
        channelName: selectedChannel?.name || selectedChat?.name || 'Sohbet',
        messages: channelMessages.slice(-60),
        serverRules: selectedReelm?.rules || 'Saygılı iletişim, spam ve hakaret yasağı.'
      })
      setAiModerationResult(res)
    } catch (err) {
      setAiModerationResult({ safe: false, summary: `⚠️ Denetim başarısız: ${err?.message || 'Hata oluştu'}`, flaggedMessages: [], moderationAdvice: 'Lütfen tekrar deneyin.' })
    } finally {
      setAiModerateLoading(false)
    }
  }

  const handleAICopilotGenerate = async () => {
    setAiGenerateLoading(true)
    try {
      const res = await aiGenerate({
        type: aiGenerateType,
        context: aiGenerateContext || (selectedChannel ? selectedChannel.name : selectedReelm?.name || 'Reelms')
      })
      setAiGenerateResult(res?.result || '')
    } catch (err) {
      setAiGenerateResult(`⚠️ Üretilemedi: ${err?.message || 'Hata oluştu'}`)
    } finally {
      setAiGenerateLoading(false)
    }
  }

  const sendMessage = async () => {
    const text = messageInputRef.current.trim()
    const richMarkup = editorHasFormatting(editorRef.current) ? serializeRichEditor(editorRef.current).trim() : ''
    const richText = richMarkup && richMarkup !== text ? richMarkup : null
    const attach = pendingAttachment
    if (!text && !attach) return

    // If currently editing an existing message
    if (editingMessage) {
      const editText = text
      if (!editText) return
      const eMsgId = editingMessage.id
      const eChatKey = editingMessage.chatKey
      setEditingMessage(null)
      messageInputRef.current = ''
      setMessageInput('')
      if (editorRef.current) editorRef.current.innerHTML = ''
      setFmtMenu(null)

      // Optimistic update
      setMessages(prev => ({
        ...prev,
        [eChatKey]: (prev[eChatKey] || []).map(m => String(m.id) === String(eMsgId)
          ? { ...m, text: editText, isEdited: true, editedAt: Date.now() }
          : m
        )
      }))

      messageEdit(eChatKey, eMsgId, editText).catch(() => {
        setModerationWarning('Message could not be edited.')
        setTimeout(() => setModerationWarning(''), 3000)
      })
      return
    }

    if (isReelmsSystemChat(selectedChat)) {
      setModerationWarning('Reelms System is a read-only server notification inbox.')
      return
    }
    if (selectedChat?.type === 'dm' && blocked.some(b => String(b.id) === String(selectedChat.friendId))) {
      setModerationWarning('This user is blocked. Unblock them before sending a message.')
      return
    }
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return

    const now = Date.now()
    const baseMessageId = createClientMessageId()
    const replySnap = replyingTo
    if (attach) setPendingAttachment(null)
    messageInputRef.current = ''
    setMessageInput('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    setFmtMenu(null)
    setReplyingTo(null)
    if (isTypingRef.current) {
      isTypingRef.current = false
      clearTimeout(typingEmitTimer.current)
      socketEmitTypingStop(msgKey)
    }

    // Send image/video first
    if (attach) {
      const vanish = selectedChat && currentUser.vanishingMediaDuration
        ? (() => { const dur = { '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[currentUser.vanishingMediaDuration]; return dur ? { vanishAt: now + dur } : {} })()
        : {}
      let mediaUrl = attach.dataUrl
      let uploadedMedia = null
      if (attach.file) {
        try {
          uploadedMedia = await mediaUploadToS3(attach.file)
          mediaUrl = uploadedMedia?.url || uploadedMedia?.mediaUrl || mediaUrl
        } catch {
          // Local/dev fallback keeps beta usable when S3 is not configured.
        }
      }
      const imageMsg = {
        id: `${baseMessageId}_media`,
        sender: { id: currentUser.id, name: currentUser.name, photo: getPersonPhoto(currentUser) || null },
        time: now, mediaUrl, mediaType: attach.mediaType, isSpoiler: Boolean(attach.isSpoiler), mediaStorage: uploadedMedia ? 's3' : 'inline', mediaId: uploadedMedia?.id || null, ...vanish,
        ...(replySnap ? { replyTo: { id: replySnap.id, text: replySnap.text, senderName: replySnap.senderName, senderId: replySnap.senderId } } : {})
      }
      setMessages(prev => appendUniqueMessage(prev, msgKey, imageMsg))
      messageSend(msgKey, imageMsg).catch(err => handleRemoteMessageError(err, msgKey, imageMsg.id))
      setNewMsgId(imageMsg.id)
    }

    // Then send text
    if (text) {
      const isAIMention = /@(?:reelms\s*intelligence|reelmsintelligence|reelms-intelligence|reelmsai|intelligence|ai)\b/i.test(outgoingText) || (replySnap && (String(replySnap.senderId) === 'reelms-ai-bot' || String(replySnap.senderName || '').toLowerCase().includes('intelligence')))
      const isAICommand = outgoingText.startsWith('/ai ') || outgoingText === '/ai' || outgoingText.startsWith('/summarize') || outgoingText.startsWith('/ai-help') || isAIMention

      if (outgoingText.startsWith('/shrug')) {
        const rest = outgoingText.slice(6).trim()
        outgoingText = rest ? `${rest} ¯\\_(ツ)_/¯` : '¯\\_(ツ)_/¯'
      } else if (outgoingText.startsWith('/tableflip')) {
        outgoingText = '(╯°□°)╯︵ ┻━┻'
      } else if (outgoingText.startsWith('/unflip')) {
        outgoingText = '┬─┬ノ( º _ ºノ)'
      } else if (outgoingText.startsWith('/flip')) {
        outgoingText = Math.random() > 0.5 ? '🪙 Coin flip: **Heads** (Yazı)' : '🪙 Coin flip: **Tails** (Tura)'
      } else if (outgoingText.startsWith('/roll')) {
        const dice = outgoingText.slice(5).trim() || '1d6'
        const match = dice.match(/^(\d*)d(\d+)$/i)
        if (match) {
          const count = Math.min(20, Math.max(1, parseInt(match[1] || '1', 10)))
          const sides = Math.min(1000, Math.max(2, parseInt(match[2], 10)))
          const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
          const sum = rolls.reduce((a, b) => a + b, 0)
          outgoingText = `🎲 Rolled ${count}d${sides}: **${sum}** ${count > 1 ? `(${rolls.join(', ')})` : ''}`
        } else {
          outgoingText = `🎲 Rolled 1d6: **${Math.floor(Math.random() * 6) + 1}**`
        }
      } else if (outgoingText.startsWith('/clear')) {
        setMessages(prev => ({ ...prev, [msgKey]: [] }))
        return
      } else if (outgoingText.startsWith('/tts')) {
        const ttsText = outgoingText.slice(4).trim()
        if (ttsText && window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(ttsText)
          window.speechSynthesis.speak(u)
        }
        outgoingText = `📢 *${ttsText}*`
      } else if (outgoingText.startsWith('/me')) {
        const action = outgoingText.slice(3).trim()
        outgoingText = `*${action}*`
      } else if (outgoingText.startsWith('/poll')) {
        const q = outgoingText.slice(5).trim()
        if (q) {
          outgoingText = `📊 **Poll:** ${q}`
          isPollCommand = true
        }
      } else if (outgoingText.startsWith('/help')) {
        outgoingText = '💡 **Commands:** `/ai <soru>`, `/summarize`, `/shrug`, `/tableflip`, `/unflip`, `/poll <q>`, `/roll <NdM>`, `/flip`, `/clear`, `/tts <text>`, `/me <action>`'
      }

      const isOnlineNow = isAppOnline()
      const textId = attach ? `${baseMessageId}_text` : baseMessageId
      const msg = {
        id: textId, text: outgoingText,
        ...(richText ? { richText } : {}),
        sender: { id: currentUser.id, name: currentUser.name, photo: getPersonPhoto(currentUser) || null },
        time: now,
        isQueued: !isOnlineNow,
        ...(replySnap ? { replyTo: { id: replySnap.id, text: replySnap.text, senderName: replySnap.senderName, senderId: replySnap.senderId } } : {})
      }
      setMessages(prev => {
        const next = appendUniqueMessage(prev, msgKey, msg)
        saveCachedMessages(msgKey, next[msgKey] || [])
        return next
      })

      if (isAICommand) {
        handleTriggerAIChat(msgKey, outgoingText, msg)
      }

      if (!isOnlineNow) {
        enqueueOutboxMessage(msgKey, msg)
        triggerTopTicker({ sender: 'Kuyruk', text: 'Çevrimdışısınız. Mesaj kuyruğa alındı, bağlantı gelince gönderilecek.' })
      } else {
        messageSend(msgKey, msg).catch(err => {
          if (err?.code === 'offline' || !isAppOnline()) {
            enqueueOutboxMessage(msgKey, { ...msg, isQueued: true })
            setMessages(prev => {
              const updated = (prev[msgKey] || []).map(m => (m.id === msg.id ? { ...m, isQueued: true } : m))
              saveCachedMessages(msgKey, updated)
              return { ...prev, [msgKey]: updated }
            })
            triggerTopTicker({ sender: 'Kuyruk', text: 'Bağlantı kesildi. Mesaj kuyruğa eklendi.' })
          } else {
            handleRemoteMessageError(err, msgKey, msg.id)
          }
        })
      }
      if (isPollCommand) {
        setTimeout(() => {
          toggleReaction(msgKey, textId, '👍')
          setTimeout(() => toggleReaction(msgKey, textId, '👎'), 150)
        }, 120)
      }
      notifyMentions(outgoingText)
      if (replySnap && String(replySnap.senderId) !== String(uid)) {
        _pushNotifTo(replySnap.senderId, `${currentUser.name || 'Someone'} ${t('replied_to_you')}`,
          selectedChat ? { type: 'dm', chatId: selectedChat.id } : { type: 'reelm', reelmId: selectedReelm?.id, channelId: selectedChannel?.id })
      }

      // Moderate text in reelm channels in background (not DMs — privacy)
      if (selectedReelm && selectedChannel) {
        moderateText(text, selectedReelm?.ageRating).then(mod => {
          if (!mod.allowed) {
            setMessages(prev => {
              const existing = prev[msgKey] || []
              return { ...prev, [msgKey]: existing.filter(m => String(m?.id) !== String(textId)) }
            })
            setModerationWarning(mod.message || 'Message blocked by content policy.')
            setTimeout(() => setModerationWarning(''), 4000)
          }
        }).catch(() => {})
      }
      setNewMsgId(textId)
    }

    if (selectedChat) {
      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, updatedAt: now } : c))
      setSelectedChat(prev => ({ ...prev, updatedAt: now }))
      setRecentlyBumpedChatId(selectedChat.id)
      setTimeout(() => setRecentlyBumpedChatId(null), 600)
    } else if (selectedReelm) {
      setReelms(prev => prev.map(r => r.id === selectedReelm.id ? { ...r, updatedAt: now } : r))
      setSelectedReelm(prev => ({ ...prev, updatedAt: now }))
      setRecentlyBumpedChatId(selectedReelm.id)
      setTimeout(() => setRecentlyBumpedChatId(null), 600)
    }
  }

  // Clear pending attachment, reply and edit state when switching channel or chat
  useEffect(() => { setPendingAttachment(null); setReplyingTo(null); setEditingMessage(null); setMsgCtxMenu(null) }, [selectedChannel?.id, selectedChat?.id])

  // Track active chat key for sound routing
  useEffect(() => {
    if (selectedChat?.id) activeMsgKeyRef.current = selectedChat.id
    else if (selectedReelm?.id && selectedChannel?.id) activeMsgKeyRef.current = `${selectedReelm.id}_${selectedChannel.id}`
    else activeMsgKeyRef.current = null
  }, [selectedChat?.id, selectedReelm?.id, selectedChannel?.id])

  // Emit read receipt when opening a DM chat or when new messages arrive in the open DM
  useEffect(() => {
    if (!selectedChat?.id || !uid) return
    const chatMsgs = messages[selectedChat.id] || []
    if (!chatMsgs.length) return
    const lastMsg = chatMsgs[chatMsgs.length - 1]
    if (!lastMsg?.id) return
    const privacy = currentUserRef.current?.readReceiptsVisibility
    if (privacy === 'nobody') return
    const myPhoto = getPersonPhoto(currentUserRef.current) || null
    socketEmitReadReceipt(selectedChat.id, String(lastMsg.id), myPhoto)
  }, [selectedChat?.id, messages, uid])

  const toggleReaction = (msgKey, msgId, emoji) => {
    if (String(msgKey || '').startsWith('dm_') && String(msgKey || '').slice(3).split('_').some(isReelmsSystemUid)) return
    const myUid = String(uid)
    const id = String(msgId)
    setMsgReactions(prev => {
      const ch = { ...(prev[msgKey] || {}) }
      const mr = { ...(ch[id] || {}) }
      const users = [...(mr[emoji] || [])]
      const idx = users.indexOf(myUid)
      if (idx >= 0) users.splice(idx, 1); else users.push(myUid)
      if (users.length) mr[emoji] = users; else delete mr[emoji]
      if (Object.keys(mr).length) ch[id] = mr; else delete ch[id]
      return { ...prev, [msgKey]: ch }
    })
    setShowMsgEmojiFor(null)
    reactionsToggle(msgKey, id, emoji, myUid).catch(() => {})
  }

  useEffect(() => {
    const key = selectedChat?.id ?? composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!key) return
    reactionsGet(key).then(d => {
      if (d?.data) setMsgReactions(prev => sameDocValue(prev[key], d.data) ? prev : ({ ...prev, [key]: d.data }))
    }).catch(() => {})
  }, [selectedChat?.id, selectedChannel?.id, selectedReelm?.id])

  const sendAttachment = async (file, type) => {
    if (!file) return
    if (isReelmsSystemChat(selectedChat)) {
      setModerationWarning('Reelms System is a read-only server notification inbox.')
      return
    }
    if (selectedChat?.type === 'dm' && blocked.some(b => String(b.id) === String(selectedChat.friendId))) {
      setModerationWarning('This user is blocked. Unblock them before sending a message.')
      return
    }
    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
    if (!msgKey) return
    let uploaded = null
    let fallbackDataUrl = ''
    try { uploaded = await mediaUploadToS3(file) } catch {
      fallbackDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result)
        reader.onerror = () => reject(new Error('FileReader failed'))
        reader.readAsDataURL(file)
      })
    }
    const objectUrl = uploaded?.url || fallbackDataUrl
    const msg = {
        id: Date.now(),
        sender: { id: currentUser.id, name: currentUser.name, photo: getPersonPhoto(currentUser) || null },
        time: Date.now(),
        ...(type === 'doc'
          ? { fileUrl: objectUrl, fileName: file.name, fileSize: file.size, fileStorage: uploaded ? 's3' : 'inline', mediaId: uploaded?.id || null }
          : { mediaUrl: objectUrl, mediaType: file.type.startsWith('video/') ? 'video' : 'image', mediaStorage: uploaded ? 's3' : 'inline', mediaId: uploaded?.id || null }
        ),
        ...(selectedChat && currentUser.vanishingMediaDuration ? (() => {
          const dur = { '1d': 86400000, '7d': 604800000, '30d': 2592000000 }[currentUser.vanishingMediaDuration]
          return dur ? { vanishAt: Date.now() + dur } : {}
        })() : {})
      }
    messageSend(msgKey, msg).catch(err => handleRemoteMessageError(err, msgKey, msg.id))
    setNewMsgId(msg.id)
  }

  const serverRole = null
  const currentActivity = currentUser?.activity || null
  const setActivity = (act) => {
    updateUserData({ activity: act || null })
  }

  // Automatic game/app detection via Electron IPC (only in desktop app)
  const currentActivityRef = useRef(currentActivity)
  useEffect(() => { currentActivityRef.current = currentActivity }, [currentActivity])
  useEffect(() => {
    if (!window.electronAPI?.onActivityUpdate) return
    window.electronAPI.onActivityUpdate((detected) => {
      const existing = currentActivityRef.current
      // Don't override a manually-set activity (no auto flag)
      if (existing?.name && !existing?.auto) return
      if (detected) {
        if (!existing || existing.name !== detected.name) {
          updateUserData({ activity: { ...detected } })
        }
      } else if (existing?.auto) {
        // Auto-clear when the process is no longer running
        updateUserData({ activity: null })
      }
    })
  }, [])


  const renderFriendProfileSurface = () => {
    if (!friendProfileTarget) return null
    const f = friendProfileTarget.friend
    if (!f?.id) return null
    const canShare = f?.allowProfileSharing !== false
    const profileReelm = (friendProfileTarget.serverContext === 'reelm' || selectedReelm) ? selectedReelm : null
    const memberRecord = profileReelm ? (profileReelm.members || []).find(m => String(m.userId) === String(f?.id)) : null
    const orderedRoles = profileReelm ? getOrderedReelmRolesClient(profileReelm) : []
    const memberRoles = memberRecord ? orderedRoles.filter(r => getMemberRoleIdsClient(memberRecord).includes(String(r.id))) : []
    const canActMembers = profileReelm && memberRecord ? canActOnReelmMemberClient(profileReelm, uid, memberRecord, 'manageMembers') : false
    const canActModeration = profileReelm && memberRecord ? canActOnReelmMemberClient(profileReelm, uid, memberRecord, 'manageModeration') : false
    const canActVoice = profileReelm && memberRecord ? canActOnReelmMemberClient(profileReelm, uid, memberRecord, 'manageVoice') : false
    const userRoom = profileReelm ? getVoiceRoomForMember(profileReelm, f?.id) : null
    const currentRoomName = voiceChannel?.channelName || null
    const isInSameRoom = !!(userRoom && voiceChannel && String(userRoom.reelmId) === String(voiceChannel.reelmId) && String(userRoom.channelId) === String(voiceChannel.channelId))
    const canInviteToCurrentRoom = !!(voiceChannel && profileReelm && String(voiceChannel.reelmId) === String(profileReelm.id) && !userRoom && canManageVoiceClient(profileReelm, uid))
    const voiceContext = profileReelm ? {
      userRoom,
      isInSameRoom,
      currentRoomName,
      canInviteToCurrentRoom,
      onJoinRoom: (room) => joinVoiceChannel(room.reelmId, room.channelId, room.channelName),
      onInviteToCurrentRoom: () => inviteMemberToCurrentVoice({ userId: f?.id, userName: f?.name || f?.username || 'Member', userPhoto: getPersonPhoto(f) || null }),
    } : null
    const voiceTargets = profileReelm ? (profileReelm.categories || []).flatMap(cat => (cat.channels || [])
      .filter(ch => ['voice', 'video', 'liveaction', 'stage'].includes(ch.type))
      .map(ch => ({ reelmId: profileReelm.id, channelId: ch.id, channelName: ch.name || 'Voice' })))
      .filter(room => !(userRoom && String(userRoom.channelId) === String(room.channelId))) : []
    const moderationContext = profileReelm && memberRecord ? {
      canShow: canActMembers || canActModeration || canActVoice,
      voiceRoom: userRoom,
      currentRoomName,
      voiceTargets,
      canInviteVoice: !!(voiceChannel && !userRoom && canActVoice),
      canMoveVoice: canActVoice && voiceTargets.length > 0,
      canKickVoice: canActVoice && !!userRoom,
      canTimeout: canActModeration,
      canRemove: canActMembers,
      canBan: canActModeration,
      onJoinVoice: () => userRoom && joinVoiceChannel(userRoom.reelmId, userRoom.channelId, userRoom.channelName),
      onInviteVoice: () => inviteMemberToCurrentVoice({ userId: f?.id, userName: f?.name || f?.username || 'Member', userPhoto: getPersonPhoto(f) || null }),
      onMoveVoice: (room) => moveMemberToVoiceChannel(room.reelmId, room.channelId, room.channelName, { userId: f?.id, userName: f?.name || f?.username || 'Member' }),
      onKickVoice: () => userRoom && kickVoiceUserFromChannel(userRoom.reelmId, userRoom.channelId, userRoom.participant || { userId: f?.id, userName: f?.name || f?.username || 'Member' }),
      onTimeout: () => openServerMemberAction('timeout', profileReelm.id, f),
      onRemove: () => openServerMemberAction('remove', profileReelm.id, f),
      onBan: () => openServerMemberAction('ban', profileReelm.id, f),
    } : null
    const canManageRoles = profileReelm ? (hasReelmPermissionClient(profileReelm, uid, 'manageRoles') || canManageReelmClient(profileReelm, uid)) : false
    const memberRoleIds = memberRecord ? getMemberRoleIdsClient(memberRecord).map(String) : []
    const toggleMemberRole = (roleId) => {
      if (!profileReelm || !canManageRoles) return
      const rid = String(roleId)
      const currentMembers = Array.isArray(profileReelm.members) ? [...profileReelm.members] : []
      const targetUid = String(f?.id || f?.userId || '')
      if (!targetUid) return
      let targetMemberIdx = currentMembers.findIndex(m => String(m.userId || m.id || '') === targetUid)
      let targetMember = targetMemberIdx !== -1 ? { ...currentMembers[targetMemberIdx] } : {
        userId: targetUid,
        userName: f?.name || f?.username || 'Member',
        userPhoto: getPersonPhoto(f) || null,
        roleIds: []
      }
      const existingRoleIds = new Set(getMemberRoleIdsClient(targetMember))
      if (existingRoleIds.has(rid)) {
        existingRoleIds.delete(rid)
      } else {
        existingRoleIds.add(rid)
      }
      targetMember.userId = targetUid
      targetMember.roleIds = Array.from(existingRoleIds)
      if (targetMemberIdx === -1) {
        currentMembers.push(targetMember)
      } else {
        currentMembers[targetMemberIdx] = targetMember
      }
      const updatedReelm = { ...profileReelm, members: currentMembers }
      updateReelm(updatedReelm, { scope: 'roles-members' })
    }
    const roleContext = profileReelm ? {
      roles: memberRoles,
      allRoles: orderedRoles,
      memberRoleIds,
      canManageRoles,
      onToggleRole: toggleMemberRole,
      expanded: String(expandedProfileRolesUserId || '') === String(f?.id || ''),
      onToggleExpanded: () => setExpandedProfileRolesUserId(prev => String(prev || '') === String(f?.id || '') ? null : String(f?.id || ''))
    } : null
    return (
      <FriendProfilePopup
        friend={f}
        status={getUserStatus(f?.id || f?.userId || f?.uid)}
        anchorRect={friendProfileTarget.anchorRect}
        serverContext={friendProfileTarget.serverContext}
        onClose={() => setFriendProfileTarget(null)}
        onRemove={removeFriend}
        onBlock={blockUserFn}
        onUnblock={unblockUserFn}
        onAddFriend={sendFriendRequest}
        onNudge={sendNudge}
        onMention={(nameOrUser) => {
          const handle = '@' + String(nameOrUser || '').replace(/^@/, '') + ' '
          if (editorRef.current) {
            editorRef.current.focus()
            document.execCommand('insertText', false, handle)
            setMessageInput(editorRef.current.innerText)
          }
        }}
        isFriend={friends.some(fr => String(fr.id) === String(f.id))}
        isBlocked={blocked.some(b => String(b.id) === String(f.id))}
        isMutedUser={(() => {
          const targetIds = [String(f?.id || ''), String(f?.userId || '')].filter(Boolean)
          const dmChat = (chats || []).find(c => c.type === 'dm' && (String(c.friendId) === String(f?.id) || String(c.id) === String(f?.id)))
          if (dmChat?.id) targetIds.push(String(dmChat.id))
          return targetIds.some(id => mutedChatIds.map(String).includes(id))
        })()}
        onToggleMuteUser={(targetId) => {
          const tid = String(targetId || f?.id || '')
          if (!tid) return
          const dmChat = (chats || []).find(c => c.type === 'dm' && (String(c.friendId) === tid || String(c.id) === tid))
          const targetIds = [tid, dmChat ? String(dmChat.id) : null].filter(Boolean)
          const isCurrentlyMuted = targetIds.some(id => mutedChatIds.map(String).includes(id))
          setMutedChatIds(prev => {
            const next = isCurrentlyMuted
              ? prev.filter(x => !targetIds.includes(String(x)))
              : Array.from(new Set([...prev, ...targetIds]))
            scheduleUserPersist('muted_chats', next)
            userPutDoc('muted_chats', next).catch(() => {})
            return next
          })
        }}
        nickname={nicknames[f.id] || ''}
        onNicknameChange={(nick) => saveNickname(f.id, nick)}
        canShare={canShare}
        onMessage={() => {
          const fInFriends = friends.find(fr => fr.id === f.id) || f
          startDM(fInFriends)
        }}
        onCreateGroup={(friend) => {
          setShowGroupCreator('friends')
          setGroupSelectedFriends([friend])
          setGroupNameInput('')
          setGroupPhotoInput(null)
        }}
        onRequestRemoteControl={(friend) => requestRemoteControl(friend.id, friend.name)}
        voiceContext={voiceContext}
        moderationContext={moderationContext}
        roleContext={roleContext}
        isSelf={String(friendProfileTarget.friend?.id) === String(uid)}
        canEditNickname={!isReelmsSystemUid(f.id)}
        onViewFullProfile={(friend) => { setFriendProfileTarget(null); setFullProfileTarget({ isSelf: false, user: friend }) }}
        rightPanelWidth={rightWidth}
      />
    )
  }

  const renderReelmMembersPanel = (panelKey = 'reelm') => {
    const activeReelm = (reelms || []).find(r => String(r.id) === String(selectedReelm?.id)) || selectedReelm
    if (!activeReelm) return null
    let members = Array.isArray(activeReelm.members) && activeReelm.members.length > 0
      ? activeReelm.members
      : (REELM_CACHE[activeReelm.id]?.members?.length ? REELM_CACHE[activeReelm.id].members : [])

    if (!members.length) {
      try {
        const stored = localStorage.getItem(`reelms:reelm_cache:${activeReelm.id}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed?.members) && parsed.members.length > 0) {
            members = parsed.members
          }
        }
      } catch {}
    }

    if (!members.length && currentUser && uid) {
      members = [{ userId: uid, userName: currentUser.name || 'User', userPhoto: currentUser.photo || null }]
    }

    const showCitizenNotice = false
    const presence = reelmPresence[activeReelm.id] || {}
    const { groups, getMemberPresence, getMemberStatus } = buildReelmMemberGroupsClient({
      reelm: activeReelm,
      members,
      presence,
      currentUser,
      uid,
      profileStatus,
      getPresenceForUser,
    })
    const orderedPanelRoles = getOrderedReelmRolesClient(activeReelm)
    const getPrimaryPanelRole = (m) => {
      const roleIds = new Set(getMemberRoleIdsClient(m).map(String))
      return orderedPanelRoles.find(role => roleIds.has(String(role.id))) || null
    }
    const renderMember = (m) => {
      const info = getMemberPresence(m)
      const status = getMemberStatus(m)
      const isMe = String(m.userId) === String(uid)
      const displayName = isMe ? currentUser.name : (info.userName || m.userName)
      const displayPhoto = isMe ? (currentUser.photo || info.userPhoto || m.userPhoto) : (info.userPhoto || m.userPhoto)
      const nowPlaying = !isMe ? spotifyFriendsNowPlaying[m.userId] : null
      const primaryRole = getPrimaryPanelRole(m)
      return (
        <React.Fragment key={m.userId}>
          <div
            className={`rp-member-card${isActiveStatus(status) ? ' rp-member-card--active' : ''}${isMainAdminMemberClient(selectedReelm, m) ? ' rp-member-card--main-admin' : ''}`}
            onClick={e => openFriendProfile({ id: m.userId, name: displayName, photo: displayPhoto, isBot: m.isBot, username: m.username }, e, { serverContext: true })}
          >
            <div className="rp-member-avatar-wrap">
              <div className={`rp-member-avatar${m.isBot ? ' rp-member-avatar--bot' : ''}`}>
                {displayPhoto
                  ? <CachedProfileImage src={displayPhoto} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : (displayName || '?').charAt(0).toUpperCase()
                }
              </div>
              {!m.isBot && <span className="rp-member-status-dot" style={{ background: STATUS_COLORS[status] || STATUS_COLORS.offline }} />}
              {m.isBot && <span className="rp-member-bot-dot" title="Bot" />}
            </div>
            <div className="rp-member-info">
              <span className={`rp-member-name${nowPlaying ? ' rp-member-name--listening' : ''}`} style={primaryRole?.color ? { '--member-role-color': primaryRole.color } : undefined}>{displayName}</span>
              {nowPlaying && (
                <div className="rp-member-nowplaying" aria-live="polite">
                  <span className="rp-member-nowplaying-track">{nowPlaying.name}</span>
                  <span className="rp-member-nowplaying-sep"> • </span>
                  <span className="rp-member-nowplaying-artist">{nowPlaying.artist}</span>
                </div>
              )}
            </div>
          </div>
        </React.Fragment>
      )
    }
    const globalQuery = reelmMemberSearch.trim().toLowerCase()
    const matchesGlobal = (m) => !globalQuery
      || String((getMemberPresence(m).userName || m.userName || '')).toLowerCase().includes(globalQuery)
      || String(m.username || '').toLowerCase().includes(globalQuery)
    return (
      <div className="rp-members-panel-wrap">
        <div className="rp-members-panel">
          <span className="rp-members-header">In this Reelm</span>
          {groups.map(group => {
            let list = group.members.filter(matchesGlobal)
            if (group.noRole && group.members.length > 18 && rightPanelNoRoleSearch.trim()) {
              const nq = rightPanelNoRoleSearch.trim().toLowerCase()
              list = list.filter(m => String((getMemberPresence(m).userName || m.userName || '')).toLowerCase().includes(nq))
            }
            if (globalQuery && list.length === 0) return null
            return (
              <div key={`${panelKey}-${group.role.id}`} className={`rp-role-section${group.noRole ? ' rp-role-section--no-role' : ''}`}>
                <div className="rp-role-section-header" style={{ color: group.role.color }}>
                  <span>{group.isBotsGroup ? t('bots_group_label') : group.role.name}</span>
                  <span className="rp-role-section-count">{globalQuery ? list.length : group.members.length}</span>
                </div>
                {!globalQuery && group.noRole && group.members.length > 18 && (
                  <input
                    className="rp-no-role-search"
                    value={rightPanelNoRoleSearch}
                    onChange={e => setRightPanelNoRoleSearch(e.target.value)}
                    placeholder="Search no-role members…"
                  />
                )}
                <div className={`rp-members-group${group.noRole ? ' rp-members-group-offline' : ''}`}>{list.map(renderMember)}</div>
              </div>
            )
          })}
          {showCitizenNotice && (
            <div className="rp-citizen-notice">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{t('community_citizens_hidden')}</span>
            </div>
          )}
          <div className="rp-members-bottom-spacer" />
        </div>
        <div className={`rp-member-search${reelmMemberSearchOpen ? ' rp-member-search--open' : ''}`}>
          <input
            ref={reelmSearchInputRef}
            className="rp-member-search-input"
            value={reelmMemberSearch}
            onChange={e => setReelmMemberSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setReelmMemberSearch(''); setReelmMemberSearchOpen(false) } }}
            placeholder={t('search')}
            aria-label={t('search')}
            tabIndex={reelmMemberSearchOpen ? 0 : -1}
          />
          <button
            type="button"
            className="rp-member-search-btn"
            title={t('search')}
            onClick={() => {
              setReelmMemberSearchOpen(open => {
                const next = !open
                if (!next) setReelmMemberSearch('')
                else setTimeout(() => reelmSearchInputRef.current?.focus(), 60)
                return next
              })
            }}
          >
            {reelmMemberSearchOpen && reelmMemberSearch
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
          </button>
        </div>
      </div>
    )
  }


  if (!currentUser) {
    if (!authUser?.uid) return null
    return (
      <div
        className={`dashboard-root${isShaking ? ' app-shake-active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'rgba(185, 152, 135, 0.85)',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
        }}
      >
        Loading profile…
      </div>
    )
  }

  return (
    <div
      className={[
        'dashboard-root',
        customization.bgImage ? 'has-bg' : '',
        customization.bgImage && isBgLight ? 'bg-light' : '',
        !customization.showCategoryIcons ? 'hide-category-icons' : '',
        !customization.showTimestamps ? 'hide-timestamps' : '',
        activeTheme.noGradient ? 'theme-no-gradient' : '',
        activeTheme.noAccentGlow ? 'theme-no-accent-glow' : '',
      ].filter(Boolean).join(' ')}
      style={{
        '--bg-image': customization.bgImage ? `url("${normalizeMediaUrl(customization.bgImage) || customization.bgImage}")` : 'none',
        '--bg-blur-outside': `${customization.bgBlur ?? (customization.reduceBlur ? 8 : 16)}px`,
        '--bg-dim': `${(customization.bgDim ?? 30) / 100}`,
        '--bg-blur-panel-extra': customization.reduceBlur ? '10px' : '12px',
      }}
    >
      {customization.bgImage && (
        <div className="dashboard-bg" style={{ backgroundImage: `url("${normalizeMediaUrl(customization.bgImage) || customization.bgImage}")` }} key={customization.bgImage} />
      )}
      <div className={`dashboard-fg${isMobile && (selectedReelm || selectedChat) ? ' dashboard-fg--no-nav' : ''}`}>
        <div className="dashboard-top-row su-drop su-drop-1" style={showMenu ? { filter: 'blur(4px)' } : {}}>
          <div className="dashboard-top-left-wrap">
            <div className="sidebar-logo-area" style={{ cursor: 'pointer' }} onClick={goHome} title="Reelms">
              <img src={reelmsLogo} alt="Reelms" className="sidebar-logo" />
            </div>
            {!isMobile && topTicker && (
              <div
                key={topTicker.key}
                className={`top-header-ticker ${topTickerExiting ? 'top-header-ticker--exit' : 'top-header-ticker--enter'}`}
                onClick={() => {
                  if (topTicker.link) navigateToNotificationLink(topTicker.link)
                  setTopTicker(null)
                }}
                onMouseEnter={pauseTopTickerTimer}
                onMouseLeave={resumeTopTickerTimer}
                title="Görüntülemek için tıkla"
              >
                <div className="top-header-ticker-inner">
                  {topTicker.avatar ? (
                    <img src={topTicker.avatar} alt="" className="top-header-ticker-avatar" />
                  ) : topTicker.fallbackInitial ? (
                    <div className="top-header-ticker-letter">{topTicker.fallbackInitial}</div>
                  ) : (
                    <div className="top-header-ticker-dot" />
                  )}
                  <span className="top-header-ticker-text">
                    {topTicker.sender && <strong className="top-header-ticker-sender">{topTicker.sender}: </strong>}
                    <span className="top-header-ticker-body">{topTicker.text}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="dashboard-top-actions">
            {!isMobile && (
              <div className={`profile-card${showProfilePopup ? ' profile-card-active' : ''}`} onClick={() => setShowProfilePopup(v => !v)} style={{ cursor: 'pointer' }}>
                <div className="profile-info">
                  <div className="profile-name-row">
                    <span className={`profile-name${(currentUser.name || '').length > 14 ? ' profile-name--small' : ''}${spotifyNowPlaying ? ' profile-name--listening' : ''}`}>{currentUser.name}</span>
                    <span className="profile-status-dot" style={{ background: { online: '#4ade80', idle: '#fbbf24', busy: '#f87171', invisible: '#9ca3af' }[profileStatus] }} />
                  </div>
                  {spotifyNowPlaying ? (
                    <div className="profile-nowplaying" aria-live="polite">
                      <span className="profile-nowplaying-track">{spotifyNowPlaying.name}</span>
                      <span className="profile-nowplaying-sep"> • </span>
                      <span className="profile-nowplaying-artist">{spotifyNowPlaying.artist}</span>
                    </div>
                  ) : (
                    <>
                      {serverRole && <span className="profile-role">{serverRole}</span>}
                      {currentActivity?.name && <ActivityBadge activity={currentActivity} />}
                    </>
                  )}
                </div>
                <img src={getPersonPhoto(currentUser) || avatarUIcon} alt="Avatar" className="profile-avatar" />
              </div>
            )}
            <div className="header-icons-group">
              {!isMobile && (
                <button className="header-settings-btn" onClick={toggleFriendsPopup} style={{ opacity: showFriendsPopup ? 0 : 1 }}>
                  <MaskIcon src={friendsIcon} alt="Friends" className="header-icon" />
                </button>
              )}
              {isMobile ? (
                <button
                  className={`header-settings-btn header-settings-btn--mobile-notifs${showNotificationsPanel ? ' header-settings-btn--active' : ''}`}
                  onClick={() => {
                    if (showNotificationsPanel) {
                      openMobileTab(prevMobileTab || 'messages')
                    } else {
                      openMobileTab('notifications')
                    }
                  }}
                  title={t('notifications')}
                >
                  <span className="notif-icon-wrap">
                    <MaskIcon src={notificationIcon} alt="Notifications" className="header-icon" />
                    {notifications.length > notifSeenCount && (
                      <span className="notif-badge">{capBadge(notifications.length - notifSeenCount)}</span>
                    )}
                  </span>
                </button>
              ) : (
                <button className="header-settings-btn" onClick={toggleNotifPopup} style={{ opacity: showNotificationsPopup ? 0 : 1 }}>
                  <span className="notif-icon-wrap">
                    <MaskIcon src={notificationIcon} alt="Notifications" className="header-icon" />
                    {notifications.length > notifSeenCount && (
                      <span className="notif-badge">{capBadge(notifications.length - notifSeenCount)}</span>
                    )}
                  </span>
                </button>
              )}
              {isMobile ? (
                <button
                  className="header-settings-btn header-settings-btn--mobile-menu"
                  onClick={() => {
                    setShowInsightsModal(null)
                    setShowSettings(v => {
                      if (!v) setSelectedSettingsCategory(null)
                      return !v
                    })
                    setSelectedReelm(null)
                    setSelectedChat(null)
                    setShowDiscover(false)
                    setShowFriendsPanel(false)
                  }}
                  title="Menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ta)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="header-menu-burger-icon">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              ) : (
                <button
                  className="header-settings-btn"
                  onClick={() => {
                    setShowInsightsModal(null)
                    setShowSettings(v => {
                      if (!v) setSelectedSettingsCategory('account')
                      return !v
                    })
                    setSelectedReelm(null)
                    setSelectedChat(null)
                    setShowDiscover(false)
                    setShowFriendsPanel(false)
                  }}
                  title="Settings"
                >
                  <MaskIcon src={settingsIcon} alt="Settings" className="header-icon header-settings-icon" />
                </button>
              )}
            </div>
          </div>
        </div>

        {msgCtxMenu && (
          <div
            className="msg-ctx-menu msg-ctx-menu-fixed"
            style={{
              position: 'fixed',
              left: Math.max(8, Math.min(msgCtxMenu.x, window.innerWidth - 220)),
              top: Math.max(8, Math.min(msgCtxMenu.y, window.innerHeight - 180)),
              zIndex: 9999
            }}
          >
            <div className="msg-ctx-reactions-bar">
              {['👍', '❤️', '😂', '🔥', '😮', '🎉'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className="msg-ctx-emoji-btn"
                  onClick={() => {
                    toggleReaction(msgCtxMenu.chatKey, msgCtxMenu.msgId, emoji)
                    setMsgCtxMenu(null)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button className="msg-ctx-item" onClick={() => { setReplyingTo(msgCtxMenu.replyInfo); setMsgCtxMenu(null) }}>{t('reply')}</button>
            {msgCtxMenu.msgText && (
              <button
                className="msg-ctx-item"
                onClick={() => {
                  try { navigator.clipboard.writeText(msgCtxMenu.msgText) } catch {}
                  setMsgCtxMenu(null)
                }}
              >
                {t('copy') || 'Kopyala'}
              </button>
            )}
            {msgCtxMenu.isOwn && msgCtxMenu.msgText && !isReelmsSystemChat(selectedChat) && (
              <button
                className="msg-ctx-item"
                onClick={() => {
                  setEditingMessage({ id: msgCtxMenu.msgId, text: msgCtxMenu.msgText, chatKey: msgCtxMenu.chatKey })
                  setMessageInput(msgCtxMenu.msgText)
                  if (editorRef.current) editorRef.current.innerText = msgCtxMenu.msgText
                  setMsgCtxMenu(null)
                  setTimeout(() => {
                    if (editorRef.current) {
                      editorRef.current.focus()
                      try {
                        const range = document.createRange()
                        const sel = window.getSelection()
                        range.selectNodeContents(editorRef.current)
                        range.collapse(false)
                        sel.removeAllRanges()
                        sel.addRange(range)
                      } catch {}
                    }
                  }, 50)
                }}
              >
                {t('edit')}
              </button>
            )}
            {msgCtxMenu.canPin && !isReelmsSystemChat(selectedChat) && (
              <button
                className="msg-ctx-item"
                onClick={() => {
                  if (msgCtxMenu.isPinned) {
                    handleUnpinMessage(msgCtxMenu.chatKey)
                  } else {
                    handlePinMessage(msgCtxMenu.chatKey, msgCtxMenu.msgData)
                  }
                  setMsgCtxMenu(null)
                }}
              >
                {msgCtxMenu.isPinned ? t('unpin_message') : t('pin_message')}
              </button>
            )}
            {msgCtxMenu.canDelete && <button className="msg-ctx-item msg-ctx-item--danger" onClick={() => { modDeleteMessage(msgCtxMenu.chatKey, msgCtxMenu.msgId); setMsgCtxMenu(null) }}>{t('delete')}</button>}
          </div>
        )}

        <div
          className={`panel-system${isMobile ? (mobileLeftPanelOpen ? ' panel-system--left-open' : mobileRightPanelOpen ? ' panel-system--right-open' : '') : ''}`}
          style={showMenu ? { filter: 'blur(4px)' } : {}}
          onTouchStart={isMobile ? (e) => {
            mobileTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          } : undefined}
          onTouchEnd={isMobile ? (e) => {
            if (!mobileTouchRef.current) return
            const dx = e.changedTouches[0].clientX - mobileTouchRef.current.x
            const dy = e.changedTouches[0].clientY - mobileTouchRef.current.y
            mobileTouchRef.current = null
            if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 35) return

            if (selectedReelm) {
              if (dx > 45) {
                // Swipe right: close members if open, or open channels
                if (mobileRightPanelOpen) {
                  setMobileRightPanelOpen(false)
                } else if (!mobileLeftPanelOpen) {
                  setMobileLeftPanelOpen(true)
                } else {
                  goBackMobile()
                }
              } else if (dx < -45) {
                // Swipe left: close channels if open, or open members
                if (mobileLeftPanelOpen) {
                  setMobileLeftPanelOpen(false)
                } else if (!mobileRightPanelOpen) {
                  setMobileRightPanelOpen(true)
                }
              }
              return
            }

            if (selectedChat) {
              if (dx > 45) {
                if (mobileRightPanelOpen) {
                  setMobileRightPanelOpen(false)
                } else if (!mobileLeftPanelOpen) {
                  goBackMobile()
                } else {
                  setMobileLeftPanelOpen(false)
                }
              } else if (dx < -45) {
                if (mobileLeftPanelOpen) {
                  setMobileLeftPanelOpen(false)
                } else if (!mobileRightPanelOpen && selectedChat.type === 'group') {
                  setMobileRightPanelOpen(true)
                }
              }
              return
            }

            if (dx > 45) {
              if (showNotificationsPanel || showFriendsPanel || showDiscover || showSettings) {
                goBackMobile()
              }
            }
          } : undefined}
        >
          {!isMobile && (
            <>
              <aside className="dashboard-dynamic-sidebar">
                <button
                  className="new-chat-btn sidebar-new-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  title="New"
                >
                  <MaskIcon src={newIcon} alt="New" className="header-new-icon" />
                </button>
                <div className="sidebar-divider" />
                <div className="chats-list-vertical" ref={barScrollRef}>
                  {(() => {
                    const blockedIds = new Set((blocked || []).map(b => String(b.id || b.userId || '')))
                    const topChatItems = (Array.isArray(chats) ? chats : [])
                      .filter(c => !(c.type === 'dm' && blockedIds.has(String(c.friendId || ''))))
                      .filter(c => showHiddenBarItems || !hiddenBarIds.map(String).includes(String(c.id)))

                    // Identify items (chats or reelms) grouped inside folders
                    const folderedIdSet = new Set((chatFolders || []).flatMap(f => f.chatIds || []).map(String))
                    const standaloneChats = topChatItems.filter(c => !folderedIdSet.has(String(c.id)))
                    const standaloneReelms = reelms
                      .filter(r => showHiddenBarItems || !hiddenBarIds.map(String).includes(String(r.id)))
                      .filter(r => !folderedIdSet.has(String(r.id)))

                    // Folder items that contain existing valid chats or reelms
                    const folderItems = (chatFolders || []).map(f => {
                      const fItems = (f.chatIds || []).map(cid => {
                        const chatMatch = (chats || []).find(c => String(c.id) === String(cid))
                        if (chatMatch) return { ...chatMatch, itemType: 'chat' }
                        const reelmMatch = (reelms || []).find(r => String(r.id) === String(cid))
                        if (reelmMatch) return { ...reelmMatch, itemType: 'reelm' }
                        return null
                      }).filter(Boolean)
                      return {
                        ...f,
                        itemType: 'folder',
                        chats: fItems,
                        updatedAt: Math.max(f.createdAt || 0, ...fItems.map(c => c.updatedAt || 0))
                      }
                    }).filter(f => f.chats.length > 0)

                    const allItemsFlat = [
                      ...standaloneReelms.map(r => ({ ...r, itemType: 'reelm' })),
                      ...standaloneChats.map(c => ({ ...c, itemType: 'chat' })),
                      ...folderItems
                    ]
                    const pinnedItems = pinnedItemIds.map(id => allItemsFlat.find(i => i.id === id)).filter(Boolean)
                    const unpinnedItems = allItemsFlat.filter(i => !pinnedItemIds.includes(i.id)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                    const allItems = [...pinnedItems, ...unpinnedItems]
                    if (allItems.length === 0) return null

                    return allItems.map(item => {
                      if (item.itemType === 'folder') {
                        const folderChats = item.chats || []
                        const folderUnread = folderChats.reduce((sum, c) => sum + (c.itemType === 'chat' ? getChatUnreadCount(c) : (unreadCounts[c.id] || 0)), 0)
                        const isFolderActive = folderChats.some(c => (c.itemType === 'reelm' ? selectedReelm?.id === c.id : selectedChat?.id === c.id))
                        return (
                          <div
                            key={item.id}
                            data-bar-id={item.id}
                            className={`bar-item bar-item--folder${isFolderActive ? ' bar-item-active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenFolderId(prev => prev === item.id ? null : item.id)
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              const rect = e.currentTarget.getBoundingClientRect()
                              const estimatedHeight = 240
                              const fitsBelow = rect.top + estimatedHeight <= window.innerHeight - 10
                              const y = fitsBelow
                                ? Math.round(rect.top)
                                : Math.round(Math.max(10, rect.bottom - estimatedHeight))
                              const coverEl = document.querySelector('.reelm-cover-wrap')
                              const menuX = coverEl && coverEl.getBoundingClientRect().left > 0
                                ? Math.round(coverEl.getBoundingClientRect().left)
                                : Math.round(rect.right + 11)
                              setBarCtxMenu({
                                x: menuX,
                                y,
                                item
                              })
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              e.dataTransfer.dropEffect = 'move'
                              if (_barDragId && _barDragId !== String(item.id)) {
                                e.currentTarget.classList.add('bar-item--dragover')
                              }
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bar-item--dragover')
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              e.currentTarget.classList.remove('bar-item--dragover')
                              document.querySelectorAll('.bar-item--dragover').forEach(el => el.classList.remove('bar-item--dragover'))
                              const fromId = String(_barDragId || e.dataTransfer.getData('text/plain') || '')
                              _barDragId = null
                              if (!fromId || fromId === String(item.id)) return
                              const alreadyIn = (item.chatIds || []).map(String).includes(fromId)
                              if (alreadyIn) return
                              const currentFolders = chatFoldersRef.current || []
                              const next = currentFolders.map(f => {
                                if (f.id === item.id) return { ...f, chatIds: [...(f.chatIds || []), fromId] }
                                return f
                              })
                              saveChatFolders(next)
                            }}
                            title={item.name || 'Chat Group'}
                          >
                            <span className="bar-item-wrap">
                              <div className="bar-item-avatar bar-item-avatar--folder">
                                {folderChats.length === 2 ? (
                                  <div className="folder-avatar-grid folder-avatar-grid--2">
                                    {folderChats.slice(0, 2).map((c, i) => {
                                      const src = c.itemType === 'chat' ? getChatAvatarSrc(c) : c.image
                                      const name = c.itemType === 'chat' ? getChatDisplayName(c) : c.name
                                      return (
                                        <div key={c.id || i} className={`folder-mini-avatar folder-mini-avatar--diag-${i + 1}`}>
                                          {isDefaultCommunity(c) ? <ReelmsCommunityGlyph size={14} /> : src ? <img src={src} alt={name} draggable={false} /> : (name || '?').charAt(0).toUpperCase()}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : folderChats.length === 3 ? (
                                  <div className="folder-avatar-grid folder-avatar-grid--3">
                                    {folderChats.slice(0, 3).map((c, i) => {
                                      const src = c.itemType === 'chat' ? getChatAvatarSrc(c) : c.image
                                      const name = c.itemType === 'chat' ? getChatDisplayName(c) : c.name
                                      return (
                                        <div key={c.id || i} className={`folder-mini-avatar folder-mini-avatar--tri-${i + 1}`}>
                                          {isDefaultCommunity(c) ? <ReelmsCommunityGlyph size={14} /> : src ? <img src={src} alt={name} draggable={false} /> : (name || '?').charAt(0).toUpperCase()}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="folder-avatar-grid folder-avatar-grid--4">
                                    {folderChats.slice(0, 4).map((c, i) => {
                                      const src = c.itemType === 'chat' ? getChatAvatarSrc(c) : c.image
                                      const name = c.itemType === 'chat' ? getChatDisplayName(c) : c.name
                                      return (
                                        <div key={c.id || i} className={`folder-mini-avatar folder-mini-avatar--grid-${i + 1}`}>
                                          {i === 3 && folderChats.length > 4 ? (
                                            <span className="folder-mini-more">+{folderChats.length - 3}</span>
                                          ) : (
                                            isDefaultCommunity(c) ? <ReelmsCommunityGlyph size={12} /> : src ? <img src={src} alt={name} draggable={false} /> : (name || '?').charAt(0).toUpperCase()
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              {folderUnread > 0 && (
                                <span className="bar-item-badge">{capBadge(folderUnread)}</span>
                              )}
                              {pinnedItemIds.includes(item.id) && <span className="bar-item-pin-dot" />}
                            </span>
                          </div>
                        )
                      }

                      // Standalone Chat / Reelm item
                      const canDrag = !isDefaultCommunity(item)
                      return (
                        <div
                          key={item.id}
                          data-bar-id={item.id}
                          className={'bar-item bar-item--' + item.itemType + (isDefaultCommunity(item) ? ' bar-item--community-root' : '') + (item.itemType === 'reelm' && mutedReelmIds.map(String).includes(String(item.id)) ? ' bar-item--muted' : '') + (item.itemType === 'chat' && item.type === 'dm' && isUserActive(item.friendId) ? ' bar-item--online' : '') + ((item.itemType === 'reelm' ? selectedReelm?.id : selectedChat?.id) === item.id ? ' bar-item-active' : '')}
                          draggable={canDrag}
                          onDragStart={(e) => {
                            if (canDrag) {
                              _barDragId = String(item.id)
                              e.currentTarget.classList.add('bar-item--dragging')
                              e.dataTransfer.setData('text/plain', String(item.id))
                              e.dataTransfer.setData('application/x-reelms-bar-item', String(item.id))
                              e.dataTransfer.effectAllowed = 'move'
                            }
                          }}
                          onDragEnd={() => {
                            _barDragId = null
                            document.querySelectorAll('.bar-item--dragging').forEach(el => el.classList.remove('bar-item--dragging'))
                            document.querySelectorAll('.bar-item--dragover').forEach(el => el.classList.remove('bar-item--dragover'))
                          }}
                          onDragOver={(e) => {
                            if (canDrag) {
                              e.preventDefault()
                              e.stopPropagation()
                              e.dataTransfer.dropEffect = 'move'
                              if (_barDragId && _barDragId !== String(item.id)) {
                                e.currentTarget.classList.add('bar-item--dragover')
                              }
                            }
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('bar-item--dragover')
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            document.querySelectorAll('.bar-item--dragging').forEach(el => el.classList.remove('bar-item--dragging'))
                            document.querySelectorAll('.bar-item--dragover').forEach(el => el.classList.remove('bar-item--dragover'))
                            const fromId = String(_barDragId || e.dataTransfer.getData('text/plain') || '')
                            _barDragId = null
                            if (!fromId || fromId === String(item.id)) return
                            
                            const currentFolders = chatFoldersRef.current || []
                            // Check if either item is already in a folder
                            const nextFolders = currentFolders.map(f => ({
                              ...f,
                              chatIds: (f.chatIds || []).filter(cid => String(cid) !== fromId && String(cid) !== String(item.id))
                            })).filter(f => (f.chatIds || []).length > 0)

                            // Create a new folder with the two items
                            const newFolder = {
                              id: 'folder_' + Date.now(),
                              name: 'Group',
                              chatIds: [String(item.id), fromId],
                              createdAt: Date.now()
                            }
                            saveChatFolders([...nextFolders, newFolder])
                          }}
                          onClick={() => {
                            setShowInsightsModal(null)
                            if (item.itemType !== 'reelm') clearUnread(item.id)
                            if (item.itemType === 'reelm') { setSelectedReelm(item); setSelectedChat(null); setShowDiscover(false); setShowFriendsPanel(false); setShowSettings(false); setReelmLoading(true); setTimeout(() => setReelmLoading(false), 350) }
                            else { setSelectedChat(item); setSelectedReelm(null); setSelectedChannel(null); setShowDiscover(false); setShowFriendsPanel(false); setShowSettings(false) }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            const rect = e.currentTarget.getBoundingClientRect()
                            const estimatedHeight = item.itemType === 'chat' && item.type === 'dm' ? 260 : 220
                            const fitsBelow = rect.top + estimatedHeight <= window.innerHeight - 10
                            const y = fitsBelow
                              ? Math.round(rect.top)
                              : Math.round(Math.max(10, rect.bottom - estimatedHeight))
                            const coverEl = document.querySelector('.reelm-cover-wrap')
                            const menuX = coverEl && coverEl.getBoundingClientRect().left > 0
                              ? Math.round(coverEl.getBoundingClientRect().left)
                              : Math.round(rect.right + 11)
                            setBarCtxMenu({
                              x: menuX,
                              y,
                              item
                            })
                          }}
                          title={item.itemType === 'reelm' ? (isDefaultCommunity(item) ? 'Community' : item.name) : getChatDisplayName(item)}
                        >
                          <span className={`bar-item-wrap${item.id === recentlyBumpedChatId ? ' bar-item-bumped' : ''}`}>
                            <div className={`bar-item-avatar${item.itemType === 'reelm' ? ' bar-item-avatar--server' : ' bar-item-avatar--profile'}${isDefaultCommunity(item) ? ' bar-item-avatar--community' : ''}`}>
                              {(() => {
                                if (isDefaultCommunity(item)) return <ReelmsCommunityGlyph />
                                const avatarSrc = item.itemType === 'chat' ? getChatAvatarSrc(item) : item.image
                                const label = item.itemType === 'chat' ? getChatDisplayName(item) : item.name
                                return avatarSrc
                                  ? <img src={avatarSrc} alt={label} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px', pointerEvents: 'none' }} />
                                  : (label || '?').charAt(0).toUpperCase()
                              })()}
                            </div>
                            {unreadCounts[item.id] > 0 && (
                              <span className="bar-item-badge">{capBadge(unreadCounts[item.id])}</span>
                            )}
                            {pinnedItemIds.includes(item.id) && <span className="bar-item-pin-dot" />}
                            {item.itemType === 'reelm' && mutedReelmIds.map(String).includes(String(item.id)) && <span className="bar-item-muted-dot" title="Muted" />}
                            {item.itemType === 'chat' && item.type === 'dm' && (
                              <span className="bar-item-status-dot" style={{ background: STATUS_COLORS[getUserStatus(item.friendId)] || STATUS_COLORS.offline }} />
                            )}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>
                <div className="sidebar-divider" />
                <div className="dynamic-bar-bottom-actions">
                  <button
                    className={`bar-item bar-item-nav${(showChatList || (selectedChat && !selectedReelm)) && !showDiscover && !showSettings && !showFeed && !showFriendsPanel ? ' bar-item-active' : ''}`}
                    onClick={() => {
                      setShowInsightsModal(null)
                      setSelectedReelm(null)
                      setSelectedChat(null)
                      setShowChatList(true)
                      setChatListFilter('all')
                      setShowDiscover(false)
                      setShowFeed(false)
                      setShowFriendsPanel(false)
                      setShowSettings(false)
                      setShowMsgRequests(false)
                    }}
                    title={t('messages')}
                  >
                    <span className="bar-item-wrap">
                      <div className="bar-item-avatar bar-item-avatar--nav">
                        <MaskIcon src={messagesIcon} alt="Messages" className="bar-nav-icon bar-nav-icon--msg" />
                      </div>
                      {totalUnread > 0 && (
                        <span className="bar-item-badge">{capBadge(totalUnread)}</span>
                      )}
                    </span>
                  </button>

                  <button
                    className={`bar-item bar-item-nav${showDiscover ? ' bar-item-active' : ''}`}
                    onClick={() => {
                      setShowInsightsModal(null)
                      setShowDiscover(true)
                      setSelectedReelm(null)
                      setSelectedChat(null)
                      setShowChatList(false)
                      setShowFeed(false)
                      setShowFriendsPanel(false)
                      setShowSettings(false)
                      setShowMsgRequests(false)
                      setDiscoverQuery('')
                    }}
                    title={t('discover')}
                  >
                    <span className="bar-item-wrap">
                      <div className="bar-item-avatar bar-item-avatar--nav">
                        <MaskIcon src={discoverIcon} alt="Discover" className="bar-nav-icon" />
                      </div>
                    </span>
                  </button>
                </div>
              </aside>
              <div className="panel-divider dynamic-bar-divider" />
            </>
          )}

          {openFolderId && (() => {
            const folder = (chatFolders || []).find(f => f.id === openFolderId)
            if (!folder) return null
            const folderItems = (folder.chatIds || []).map(cid => {
              const chatMatch = (chats || []).find(c => String(c.id) === String(cid))
              if (chatMatch) return { ...chatMatch, itemType: 'chat' }
              const reelmMatch = (reelms || []).find(r => String(r.id) === String(cid))
              if (reelmMatch) return { ...reelmMatch, itemType: 'reelm' }
              return null
            }).filter(Boolean)

            const folderEl = document.querySelector(`[data-bar-id="${folder.id}"]`)
            const rect = folderEl ? folderEl.getBoundingClientRect() : null
            const estimatedHeight = 50 + folderItems.length * 44
            const fitsBelow = rect ? rect.top + estimatedHeight <= window.innerHeight - 12 : true
            const y = rect
              ? (fitsBelow
                  ? Math.round(rect.top)
                  : Math.round(Math.max(12, rect.bottom - estimatedHeight)))
              : 80
            const coverEl = document.querySelector('.reelm-cover-wrap')
            const x = coverEl && coverEl.getBoundingClientRect().left > 0
              ? Math.round(coverEl.getBoundingClientRect().left)
              : (rect ? Math.round(rect.right + 11) : 71)

            return (
              <div
                className="bar-folder-drawer"
                style={{
                  position: 'fixed',
                  left: x,
                  top: y,
                  zIndex: 9999
                }}
              >
                <div className="bar-folder-drawer-header">
                  {renamingFolderId === folder.id ? (
                    <input
                      className="bar-folder-rename-input"
                      value={folderNameInput}
                      onChange={e => setFolderNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          saveChatFolders(chatFolders.map(f => f.id === folder.id ? { ...f, name: folderNameInput.trim() || 'Group' } : f))
                          setRenamingFolderId(null)
                        } else if (e.key === 'Escape') setRenamingFolderId(null)
                      }}
                      onBlur={() => {
                        saveChatFolders(chatFolders.map(f => f.id === folder.id ? { ...f, name: folderNameInput.trim() || 'Group' } : f))
                        setRenamingFolderId(null)
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="bar-folder-title"
                      onClick={() => { setRenamingFolderId(folder.id); setFolderNameInput(folder.name || 'Group') }}
                      title="Click to rename"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      {folder.name || 'Group'}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                  <button
                    type="button"
                    className="bar-folder-ungroup-btn"
                    onClick={() => {
                      saveChatFolders(chatFolders.filter(f => f.id !== folder.id))
                      setOpenFolderId(null)
                    }}
                    title="Disband group"
                  >
                    Ungroup
                  </button>
                </div>
                <div className="bar-folder-items">
                  {folderItems.map(c => {
                    const avatarSrc = c.itemType === 'chat' ? getChatAvatarSrc(c) : c.image
                    const displayName = c.itemType === 'chat' ? getChatDisplayName(c) : c.name
                    const unread = c.itemType === 'chat' ? getChatUnreadCount(c) : (unreadCounts[c.id] || 0)
                    const isActive = (c.itemType === 'reelm' ? selectedReelm?.id === c.id : selectedChat?.id === c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`bar-folder-item${isActive ? ' bar-folder-item-active' : ''}`}
                        onClick={() => {
                          if (c.itemType === 'reelm') {
                            setSelectedReelm(c)
                            setSelectedChat(null)
                            setSelectedChannel(null)
                            setShowDiscover(false)
                            setShowSettings(false)
                            setShowFriendsPanel(false)
                            setReelmLoading(true)
                            setTimeout(() => setReelmLoading(false), 350)
                          } else {
                            setSelectedChat(c)
                            setSelectedReelm(null)
                            setSelectedChannel(null)
                            setShowDiscover(false)
                            setShowSettings(false)
                            setShowFriendsPanel(false)
                            clearUnread(c.id)
                          }
                          setOpenFolderId(null)
                        }}
                      >
                        <div className="discover-result-avatar" style={{ width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0, borderRadius: c.itemType === 'reelm' ? 8 : '50%' }}>
                          {avatarSrc
                            ? <img src={avatarSrc} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: c.itemType === 'reelm' ? 8 : '50%' }} />
                            : isDefaultCommunity(c) ? <ReelmsCommunityGlyph /> : (displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', textAlign: 'left' }}>
                          {displayName}
                        </span>
                        {unread > 0 && <span className="bar-item-badge" style={{ position: 'static', margin: 0 }}>{capBadge(unread)}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {barCtxMenu && ReactDOM.createPortal(
            <div
              className="bar-ctx-menu"
              style={{ position: 'fixed', left: barCtxMenu.x, top: barCtxMenu.y, zIndex: 99999 }}
            >
              {barCtxMenu.item.itemType === 'folder' && (
                <>
                  <button
                    type="button"
                    className="bar-ctx-menu-item"
                    onClick={() => {
                      saveChatFolders(chatFolders.filter(f => f.id !== barCtxMenu.item.id))
                      setOpenFolderId(null)
                      setBarCtxMenu(null)
                    }}
                  >
                    Ungroup
                  </button>
                  <button
                    type="button"
                    className="bar-ctx-menu-item"
                    onClick={() => {
                      (barCtxMenu.item.chatIds || []).forEach(cid => clearUnread(cid))
                      setBarCtxMenu(null)
                    }}
                  >
                    Mark all as read
                  </button>
                  {(() => {
                    const fChatIds = barCtxMenu.item.chatIds || []
                    const allMuted = fChatIds.length > 0 && fChatIds.every(cid => mutedChatIds.map(String).includes(String(cid)))
                    return (
                      <button
                        type="button"
                        className="bar-ctx-menu-item"
                        onClick={() => {
                          let nextMuted = [...mutedChatIds]
                          if (allMuted) {
                            nextMuted = nextMuted.filter(id => !fChatIds.map(String).includes(String(id)))
                          } else {
                            fChatIds.forEach(id => {
                              if (!nextMuted.map(String).includes(String(id))) nextMuted.push(String(id))
                            })
                          }
                          setMutedChatIds(nextMuted)
                          scheduleUserPersist('muted_chats', nextMuted)
                          setBarCtxMenu(null)
                        }}
                      >
                        {allMuted ? 'Unmute all' : 'Mute all'}
                      </button>
                    )
                  })()}
                  <button
                    type="button"
                    className="bar-ctx-menu-item"
                    onClick={() => {
                      setRenamingFolderId(barCtxMenu.item.id)
                      setFolderNameInput(barCtxMenu.item.name || 'Group')
                      setOpenFolderId(barCtxMenu.item.id)
                      setBarCtxMenu(null)
                    }}
                  >
                    Rename group
                  </button>
                </>
              )}
              {barCtxMenu.item.type === 'dm' && (
                <button
                  className="bar-ctx-menu-item"
                  onClick={() => {
                    const friend = { id: barCtxMenu.item.friendId, name: barCtxMenu.item.name, photo: barCtxMenu.item.photo }
                    setBarCtxMenu(null)
                    setFullProfileTarget({ isSelf: false, user: friend })
                  }}
                >
                  {t('bar_view_friend_profile')}
                </button>
              )}
              {pinnedItemIds.includes(barCtxMenu.item.id) ? (
                <button
                  className="bar-ctx-menu-item"
                  onClick={() => {
                    const id = barCtxMenu.item.id
                    setBarCtxMenu(null)
                    setPinnedItemIds(prev => {
                      const next = prev.filter(p => p !== id)
                      scheduleUserPersist('pinned_items', next)
                      return next
                    })
                  }}
                >
                  {t('bar_unpin')}
                </button>
              ) : (
                <button
                  className={`bar-ctx-menu-item${pinnedItemIds.length >= 5 ? ' bar-ctx-menu-item--disabled' : ''}`}
                  onClick={() => {
                    if (pinnedItemIds.length >= 5) return
                    const id = barCtxMenu.item.id
                    setBarCtxMenu(null)
                    setPinnedItemIds(prev => {
                      const next = [...prev, id]
                      scheduleUserPersist('pinned_items', next)
                      return next
                    })
                  }}
                >
                  {pinnedItemIds.length >= 5 ? t('bar_pin_max') : t('bar_pin')}
                </button>
              )}
              {barCtxMenu.item.itemType === 'chat' && (
                <button
                  type="button"
                  className="bar-ctx-menu-item"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const item = barCtxMenu.item
                    setBarCtxMenu(null)
                    toggleMuteChatById(item.id)
                  }}
                >
                  {mutedChatIds.map(String).includes(String(barCtxMenu.item.id)) ? t('bar_unmute') : t('bar_mute_notifications')}
                </button>
              )}
              {barCtxMenu.item.itemType === 'reelm' && (
                <>
                  {(() => {
                    const r = reelms.find(re => String(re.id) === String(barCtxMenu.item.id)) || barCtxMenu.item
                    const mm = r.members?.find(m => m.userId === uid)
                    const mr = (r.roles || []).filter(role => (mm?.roleIds || []).includes(role.id))
                    const canView = canManageReelmClient(r, uid) || mr.some(isManagerRoleClient)
                    if (!canView) return null
                    return (
                      <button
                        type="button"
                        className="bar-ctx-menu-item bar-ctx-menu-insights"
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation()
                          const targetReelm = reelms.find(re => String(re.id) === String(barCtxMenu.item.id)) || barCtxMenu.item
                          setBarCtxMenu(null)
                          setShowInsightsModal(targetReelm)
                        }}
                      >
                        <div className="reelm-menu-left-row">
                          <svg className="reelm-insights-icon" width="13" height="12" viewBox="0 0 12 11" fill="currentColor">
                            <rect x="0" y="6" width="2.5" height="5" rx="1"/>
                            <rect x="4.75" y="0" width="2.5" height="11" rx="1"/>
                            <rect x="9.5" y="3.5" width="2.5" height="7.5" rx="1"/>
                          </svg>
                          <span>Insights</span>
                        </div>
                        <span className="reelm-intel-pill">
                          <svg className="reelm-intel-star" width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
                          </svg>
                          intelligence
                        </span>
                      </button>
                    )
                  })()}
                  <button
                    type="button"
                    className="bar-ctx-menu-item"
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      const item = barCtxMenu.item
                      setBarCtxMenu(null)
                      toggleMuteReelmById(item.id)
                    }}
                  >
                    {mutedReelmIds.map(String).includes(String(barCtxMenu.item.id)) ? t('bar_unmute') : t('bar_mute')}
                  </button>
                </>
              )}
              <button
                type="button"
                className="bar-ctx-menu-item"
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const item = barCtxMenu.item
                  setBarCtxMenu(null)
                  toggleHideBarItem(item.id)
                }}
              >
                {hiddenBarIds.map(String).includes(String(barCtxMenu.item.id)) ? t('bar_show_in_dynamic') : t('bar_hide_in_dynamic')}
              </button>
              {barCtxMenu.item.itemType === 'chat' && barCtxMenu.item.type === 'dm' && (
                <button
                  type="button"
                  className="bar-ctx-menu-item bar-ctx-menu-item--danger"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const item = barCtxMenu.item
                    setBarCtxMenu(null)
                    deleteConversation(item.id)
                  }}
                >
                  {t('bar_delete_chat')}
                </button>
              )}
              {barCtxMenu.item.itemType === 'chat' && barCtxMenu.item.type === 'group' && (
                <button
                  type="button"
                  className="bar-ctx-menu-item bar-ctx-menu-item--danger"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const item = barCtxMenu.item
                    setBarCtxMenu(null)
                    clearChatMessages(item.id)
                  }}
                >
                  {t('bar_clear_chat')}
                </button>
              )}
            </div>,
            document.body
          )}

          {showInviteModal && selectedReelm && (
            <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
              <div className="invite-modal" onClick={e => e.stopPropagation()}>
                <div className="invite-modal-title">Invite friends</div>
                <div className="invite-modal-reelm-name">{selectedReelm.name}</div>
                <div className="invite-modal-code-label">Reelm Code</div>
                <div className="invite-modal-code-row">
                  <span className="invite-modal-code">{selectedReelm.code || '——'}</span>
                  <button
                    className="invite-modal-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedReelm.code || '')
                      setCopiedInvite(true)
                      setTimeout(() => setCopiedInvite(false), 1800)
                    }}
                  >
                    {copiedInvite ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="invite-modal-link-label">Invite Link</div>
                <div className="invite-modal-code-row">
                  <span className="invite-modal-link">{getPublicWebUrl()}/r/{selectedReelm.code || '——'}</span>
                  <button
                    className="invite-modal-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${getPublicWebUrl()}/r/${selectedReelm.code || ''}`)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 1800)
                    }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="invite-modal-link-label">Reelms friends</div>
                <input
                  className="invite-modal-search"
                  value={inviteFriendSearch}
                  onChange={e => setInviteFriendSearch(e.target.value)}
                  placeholder="Search friends to invite..."
                />
                <div className="invite-modal-friend-list">
                  {friends
                    .filter(f => f?.id && !(selectedReelm.members || []).some(m => String(m.userId) === String(f.id)))
                    .filter(f => {
                      const q = inviteFriendSearch.trim().toLowerCase()
                      if (!q) return true
                      return String(f.name || '').toLowerCase().includes(q) || String(f.username || '').toLowerCase().includes(q)
                    })
                    .slice(0, 20)
                    .map(f => (
                      <div key={f.id} className="invite-modal-friend-row">
                        <div className="invite-modal-friend-info">
                          <img src={getPersonPhoto(f) || avatarUIcon} alt="" className="invite-modal-friend-avatar" />
                          <span>{f.name || f.username || 'Friend'}</span>
                        </div>
                        <button className="invite-modal-copy-btn" onClick={() => inviteFriendToReelm(selectedReelm.id, f.id)}>Invite</button>
                      </div>
                    ))}
                  {friends.filter(f => f?.id && !(selectedReelm.members || []).some(m => String(m.userId) === String(f.id))).length === 0 && (
                    <div className="invite-modal-empty">No friends available to invite.</div>
                  )}
                </div>
                <button className="invite-modal-close" onClick={() => setShowInviteModal(false)}>Close</button>
              </div>
            </div>
          )}

          {showAICopilot && (
            <div className="ai-copilot-overlay" onClick={() => setShowAICopilot(false)}>
              <div className="ai-copilot-modal" onClick={e => e.stopPropagation()}>
                <div className="ai-copilot-header">
                  <div className="ai-copilot-title-row">
                    <div className="ai-copilot-icon-badge">
                      <IntelligenceIcon size={22} />
                    </div>
                    <div>
                      <div className="ai-copilot-title">Reelms Intelligence Copilot</div>
                      <div className="ai-copilot-subtitle">OpenRouter • nvidia/nemotron-3.5-lightning:free</div>
                    </div>
                  </div>
                  <button className="ai-copilot-close-btn" onClick={() => setShowAICopilot(false)} title="Kapat">
                    ✕
                  </button>
                </div>

                <div className="ai-copilot-tabs">
                  <button
                    type="button"
                    className={`ai-copilot-tab-btn${aiCopilotTab === 'chat' ? ' active' : ''}`}
                    onClick={() => setAiCopilotTab('chat')}
                  >
                    💬 Sohbet
                  </button>
                  <button
                    type="button"
                    className={`ai-copilot-tab-btn${aiCopilotTab === 'summarize' ? ' active' : ''}`}
                    onClick={() => setAiCopilotTab('summarize')}
                  >
                    📝 Kanal Özeti
                  </button>
                  <button
                    type="button"
                    className={`ai-copilot-tab-btn${aiCopilotTab === 'moderate' ? ' active' : ''}`}
                    onClick={() => setAiCopilotTab('moderate')}
                  >
                    🛡️ Moderasyon
                  </button>
                  <button
                    type="button"
                    className={`ai-copilot-tab-btn${aiCopilotTab === 'generate' ? ' active' : ''}`}
                    onClick={() => setAiCopilotTab('generate')}
                  >
                    💡 Araçlar
                  </button>
                </div>

                <div className="ai-copilot-body">
                  {aiCopilotTab === 'chat' && (
                    <div className="ai-copilot-chat-view">
                      <div className="ai-copilot-chat-history">
                        {aiCopilotMessages.map((msg, i) => (
                          <div key={i} className={`ai-copilot-msg-bubble ${msg.role}`}>
                            <div className="ai-copilot-msg-author">
                              {msg.role === 'assistant' ? '🤖 Reelms Intelligence' : (currentUser?.name || 'Sen')}
                            </div>
                            <div className="ai-copilot-msg-text">{msg.content}</div>
                            {msg.role === 'assistant' && (
                              <div className="ai-copilot-msg-actions">
                                <button
                                  type="button"
                                  className="ai-copilot-action-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content)
                                    addNotification('Yanıt kopyalandı!')
                                  }}
                                >
                                  📋 Kopyala
                                </button>
                                <button
                                  type="button"
                                  className="ai-copilot-action-btn"
                                  onClick={() => {
                                    if (editorRef.current) {
                                      editorRef.current.innerText = msg.content
                                      messageInputRef.current = msg.content
                                      setMessageInput(msg.content)
                                    }
                                    setShowAICopilot(false)
                                    addNotification('Metin mesaj kutusuna eklendi!')
                                  }}
                                >
                                  💬 Kutuya Aktar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {aiCopilotLoading && (
                          <div className="ai-copilot-msg-bubble assistant loading">
                            <span className="ai-copilot-typing-dots">✨ Reelms Intelligence yanıt hazırlıyor...</span>
                          </div>
                        )}
                      </div>

                      <div className="ai-copilot-quick-prompts">
                        <button
                          type="button"
                          className="ai-copilot-chip"
                          onClick={() => {
                            setAiCopilotInput('Bu kanal için ilgi çekici 3 sohbet başlatıcı konu önerir misin?')
                          }}
                        >
                          💡 Konu Öner
                        </button>
                        <button
                          type="button"
                          className="ai-copilot-chip"
                          onClick={() => {
                            setAiCopilotInput('Topluluk için adil ve samimi 5 temel kural yazabilir misin?')
                          }}
                        >
                          📜 Sunucu Kuralları
                        </button>
                        <button
                          type="button"
                          className="ai-copilot-chip"
                          onClick={() => {
                            setAiCopilotInput('Yeni katılan üyeler için sıcak bir karşılama mesajı hazırla.')
                          }}
                        >
                          👋 Karşılama Mesajı
                        </button>
                      </div>

                      <form
                        className="ai-copilot-input-form"
                        onSubmit={e => {
                          e.preventDefault()
                          handleAICopilotSend()
                        }}
                      >
                        <input
                          className="ai-copilot-input"
                          placeholder="Reelms Intelligence'a bir şey sor..."
                          value={aiCopilotInput}
                          onChange={e => setAiCopilotInput(e.target.value)}
                          disabled={aiCopilotLoading}
                        />
                        <button
                          type="submit"
                          className="ai-copilot-send-btn"
                          disabled={!aiCopilotInput.trim() || aiCopilotLoading}
                        >
                          {aiCopilotLoading ? '...' : 'Gönder'}
                        </button>
                      </form>
                    </div>
                  )}

                  {aiCopilotTab === 'summarize' && (
                    <div className="ai-copilot-summarize-view">
                      <div className="ai-copilot-summary-header">
                        <div style={{ flex: 1 }}>
                          <div className="ai-copilot-summary-title">
                            #{selectedChannel?.name || selectedChat?.name || 'Sohbet'} Kanal Özeti
                          </div>
                          <div className="ai-copilot-range-selector">
                            <span className="ai-range-label">Aralık:</span>
                            <div className="ai-range-chips">
                              <button
                                type="button"
                                className={`ai-range-chip${aiSummarizeRange === 'all' ? ' active' : ''}`}
                                onClick={() => setAiSummarizeRange('all')}
                              >
                                📚 Tüm Kanal
                              </button>
                              <button
                                type="button"
                                className={`ai-range-chip${aiSummarizeRange === '100' ? ' active' : ''}`}
                                onClick={() => setAiSummarizeRange('100')}
                              >
                                Son 100 Mesaj
                              </button>
                              <button
                                type="button"
                                className={`ai-range-chip${aiSummarizeRange === '50' ? ' active' : ''}`}
                                onClick={() => setAiSummarizeRange('50')}
                              >
                                Son 50 Mesaj
                              </button>
                              <button
                                type="button"
                                className={`ai-range-chip${aiSummarizeRange === '24h' ? ' active' : ''}`}
                                onClick={() => setAiSummarizeRange('24h')}
                              >
                                ⏳ Son 24 Saat
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ai-copilot-primary-btn"
                          onClick={() => handleAICopilotSummarize()}
                          disabled={aiCopilotLoading}
                        >
                          {aiCopilotLoading ? '✨ Analiz ediliyor...' : '📊 Şimdi Özetle'}
                        </button>
                      </div>

                      {aiCopilotSummary && (
                        <div className="ai-copilot-summary-result">
                          <div className="ai-copilot-summary-text">{aiCopilotSummary}</div>
                          <div className="ai-copilot-msg-actions">
                            <button
                              type="button"
                              className="ai-copilot-action-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(aiCopilotSummary)
                                addNotification('Özet kopyalandı!')
                              }}
                            >
                              📋 Özeti Kopyala
                            </button>
                            <button
                              type="button"
                              className="ai-copilot-action-btn"
                              onClick={() => {
                                const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
                                if (msgKey) {
                                  const aiMsg = {
                                    id: createClientMessageId(),
                                    text: aiCopilotSummary,
                                    sender: { id: 'reelms-ai-bot', name: 'Reelms Intelligence', username: 'reelmsai', photo: null, isBot: true },
                                    time: Date.now()
                                  }
                                  setMessages(prev => appendUniqueMessage(prev, msgKey, aiMsg))
                                  messageSend(msgKey, aiMsg).catch(() => {})
                                  setShowAICopilot(false)
                                  addNotification('Özet kanala paylaşıldı!')
                                }
                              }}
                            >
                              🚀 Kanala Paylaş
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {aiCopilotTab === 'moderate' && (
                    <div className="ai-copilot-moderate-view">
                      <div className="ai-copilot-summary-header">
                        <div>
                          <div className="ai-copilot-summary-title">
                            #{selectedChannel?.name || 'Kanal'} Moderasyon Denetimi
                          </div>
                          <div className="ai-copilot-summary-desc">
                            Topluluk kurallarına aykırı mesajları, küfür, spam veya hakaretleri yapay zeka ile denetleyin.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ai-copilot-primary-btn"
                          onClick={handleAICopilotModerate}
                          disabled={aiModerateLoading}
                        >
                          {aiModerateLoading ? '🛡️ Denetleniyor...' : '🛡️ Kanalı Denetle'}
                        </button>
                      </div>

                      {aiModerationResult && (
                        <div className="ai-copilot-summary-result">
                          <div className="ai-mod-status-row">
                            <span className={`ai-mod-badge ${aiModerationResult.safe ? 'safe' : 'warning'}`}>
                              {aiModerationResult.safe ? '✅ Kanal Güvenli' : '⚠️ İnceleme Gerektiren Durumlar Var'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                              {aiModerationResult.scannedCount || 0} mesaj tarandı
                            </span>
                          </div>

                          <div className="ai-copilot-summary-text" style={{ marginTop: 8 }}>
                            {aiModerationResult.summary}
                          </div>

                          {aiModerationResult.moderationAdvice && (
                            <div className="ai-mod-advice-box">
                              <strong>💡 Yönetici Tavsiyesi:</strong> {aiModerationResult.moderationAdvice}
                            </div>
                          )}

                          {Array.isArray(aiModerationResult.flaggedMessages) && aiModerationResult.flaggedMessages.length > 0 && (
                            <div className="ai-flagged-list">
                              <div className="ai-flagged-title">🚩 İşaretlenen Mesajlar:</div>
                              {aiModerationResult.flaggedMessages.map((flag, idx) => (
                                <div key={idx} className="ai-flagged-item">
                                  <div className="ai-flagged-header">
                                    <span className="ai-flagged-author">{flag.senderName || 'Kullanıcı'}:</span>
                                    <span className={`ai-flagged-severity ${flag.severity || 'medium'}`}>{flag.severity || 'uyarı'}</span>
                                  </div>
                                  <div className="ai-flagged-text">"{flag.text}"</div>
                                  <div className="ai-flagged-reason">Sebep: {flag.reason}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {aiCopilotTab === 'generate' && (
                    <div className="ai-copilot-generate-view">
                      <div className="ai-copilot-form-group">
                        <label className="ai-copilot-form-label">Üretim Türü</label>
                        <select
                          className="ai-copilot-select"
                          value={aiGenerateType}
                          onChange={e => setAiGenerateType(e.target.value)}
                        >
                          <option value="bio">👤 Profil Biyografisi (Bio)</option>
                          <option value="channel_topic">💡 Kanal Sohbet Konusu / Başlığı</option>
                          <option value="reelm_rules">📜 Sunucu / Reelm Kuralları</option>
                          <option value="welcome_message">👋 Topluluk Karşılama Mesajı</option>
                        </select>
                      </div>

                      <div className="ai-copilot-form-group">
                        <label className="ai-copilot-form-label">İçerik / İpuçları</label>
                        <input
                          className="ai-copilot-input"
                          placeholder="Örn: Oyun, müzik ve yazılım odaklı topluluk"
                          value={aiGenerateContext}
                          onChange={e => setAiGenerateContext(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        className="ai-copilot-primary-btn"
                        onClick={handleAICopilotGenerate}
                        disabled={aiGenerateLoading}
                      >
                        {aiGenerateLoading ? '✨ Üretiliyor...' : '✨ İçerik Üret'}
                      </button>

                      {aiGenerateResult && (
                        <div className="ai-copilot-summary-result" style={{ marginTop: 14 }}>
                          <div className="ai-copilot-summary-text">{aiGenerateResult}</div>
                          <div className="ai-copilot-msg-actions">
                            <button
                              type="button"
                              className="ai-copilot-action-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(aiGenerateResult)
                                addNotification('Kopyalandı!')
                              }}
                            >
                              📋 Kopyala
                            </button>
                            <button
                              type="button"
                              className="ai-copilot-action-btn"
                              onClick={() => {
                                if (editorRef.current) {
                                  editorRef.current.innerText = aiGenerateResult
                                  messageInputRef.current = aiGenerateResult
                                  setMessageInput(aiGenerateResult)
                                }
                                setShowAICopilot(false)
                                addNotification('Metin kutusuna aktarıldı!')
                              }}
                            >
                              💬 Kutuya Aktar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {serverMemberAction && (
            <div className="server-action-modal-backdrop" onClick={() => setServerMemberAction(null)}>
              <div className="server-action-modal" onClick={e => e.stopPropagation()}>
                <div className="server-action-title">{serverMemberAction.type === 'ban' ? 'Ban member' : serverMemberAction.type === 'timeout' ? 'Timeout member' : 'Kick from Reelm'}</div>
                <div className="server-action-target">{serverMemberAction.user?.name || serverMemberAction.user?.username || 'Member'}</div>
                {serverMemberAction.type === 'timeout' && (
                  <label className="server-action-label">
                    Duration, minutes
                    <input className="server-action-input" type="number" min="1" max="40320" value={serverActionMinutes} onChange={e => setServerActionMinutes(e.target.value)} />
                  </label>
                )}
                <label className="server-action-label">
                  Reason / message
                  <textarea className="server-action-textarea" value={serverActionReason} onChange={e => setServerActionReason(e.target.value)} placeholder="Write the reason shown to the member or kept for moderation notes…" />
                </label>
                <div className="server-action-actions">
                  <button className="server-action-cancel" onClick={() => setServerMemberAction(null)}>Cancel</button>
                  <button className={`server-action-confirm${serverMemberAction.type !== 'timeout' ? ' server-action-confirm--danger' : ''}`} onClick={confirmServerMemberAction}>
                    {serverMemberAction.type === 'ban' ? 'Ban' : serverMemberAction.type === 'timeout' ? 'Apply timeout' : 'Kick'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {voiceRoomUserMenu && (
            <div className="voice-room-user-menu-backdrop" onClick={() => setVoiceRoomUserMenu(null)}>
              <div
                className="voice-room-user-menu"
                style={{ left: voiceRoomUserMenu.x, top: voiceRoomUserMenu.y }}
                onClick={e => e.stopPropagation()}
              >
                <div className="voice-room-user-menu-head">
                  <span className="voice-room-user-menu-avatar">
                    {voiceRoomUserMenu.userPhoto ? <img src={voiceRoomUserMenu.userPhoto} alt="" /> : <span>{(voiceRoomUserMenu.userName || '?').charAt(0).toUpperCase()}</span>}
                  </span>
                  <span className="voice-room-user-menu-name">{voiceRoomUserMenu.userName || 'Member'}</span>
                </div>
                {(() => {
                  const menuRoom = selectedReelm?.categories?.flatMap(c => c.channels || []).find(ch => String(ch.id) === String(voiceRoomUserMenu.channelId))
                  const isSpeaker = (menuRoom?.speakerIds || []).map(String).includes(String(voiceRoomUserMenu.userId))
                  if (!menuRoom || menuRoom.type !== 'stage' || !canManageVoiceClient(selectedReelm, uid)) return null
                  return (
                    <button
                      type="button"
                      className="voice-room-user-menu-action"
                      onClick={() => { updateStageSpeaker(voiceRoomUserMenu.channelId, voiceRoomUserMenu.userId, !isSpeaker); setVoiceRoomUserMenu(null) }}
                    >
                      {isSpeaker ? 'Move to listener' : 'Make speaker'}
                    </button>
                  )
                })()}
                <button
                  type="button"
                  className="voice-room-user-menu-action"
                  onClick={() => moderatorMuteVoiceUserFromChannel(voiceRoomUserMenu.reelmId, voiceRoomUserMenu.channelId, voiceRoomUserMenu)}
                >
                  Mute microphone
                </button>
                <button
                  type="button"
                  className="voice-room-user-menu-action voice-room-user-menu-action-danger"
                  onClick={() => kickVoiceUserFromChannel(voiceRoomUserMenu.reelmId, voiceRoomUserMenu.channelId, voiceRoomUserMenu)}
                >
                  Kick from room
                </button>
              </div>
            </div>
          )}

            {(mobileLeftPanelOpen || mobileRightPanelOpen) && isMobile && (
              <div
                className="mobile-panel-backdrop"
                onClick={() => { setMobileLeftPanelOpen(false); setMobileRightPanelOpen(false) }}
              />
            )}
            {showInsightsModal ? (
              <ReelmsInsights
                reelm={showInsightsModal}
                language={language}
                onClose={() => setShowInsightsModal(null)}
                onNavigateChannel={(ch) => {
                  setSelectedChannel(ch)
                  setShowInsightsModal(null)
                }}
              />
            ) : showReelmSettings && selectedReelm ? (
              <ReelmSettings
                reelm={selectedReelm}
                currentUser={currentUser}
                friends={friends}
                onUpdate={updateReelm}
                onClose={() => setShowReelmSettings(false)}
                onApproveJoin={approveReelmJoinRequest}
                onRejectJoin={rejectReelmJoinRequest}
                onInviteFriend={inviteFriendToReelm}
                onBanMember={banMemberFromReelm}
                onUnbanMember={unbanMemberFromReelm}
                onTimeoutMember={timeoutMemberInReelm}
                onUntimeoutMember={untimeoutMemberInReelm}
                onCloseReelm={closeReelm}
                onAnnouncement={({ type, userName }) => {
                  const annChId = selectedReelm.announcementChannelId
                    || selectedReelm.categories?.find(c => c.type === 'announcement')?.channels?.[0]?.id
                  if (!annChId) return
                  if (type === 'join') postSystemMessage(selectedReelm.id, annChId, `👋 ${userName} joined the reelm!`)
                }}
              />
            ) : showSettings ? (
              <div className={`settings-layout${isMobile ? (!selectedSettingsCategory ? ' settings-layout--mobile-menu' : ' settings-layout--mobile-content') : ''}`}>
                <button
                  type="button"
                  className="settings-floating-close-btn"
                  onClick={() => setShowSettings(false)}
                  title={t('close')}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="settings-sidebar">
                  <h2 className="settings-title">{t('settings')}</h2>
                  <nav className="settings-nav">
                    {[
                      { id: 'account',         label: t('your_account') },
                      { id: 'privacy',         label: t('privacy_safety') },
                      { id: 'customization',   label: t('customization') },
                      { id: 'usage',           label: t('usage') },
                      { id: 'environment',     label: t('environment') },
                      { id: 'companions',      label: t('companions') },
                      { id: 'authorized_apps', label: t('authorized_apps') || 'Authorized apps' },
                      { id: 'accessibility',   label: t('accessibility') },
                      { id: 'about',           label: t('about') },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={`settings-nav-item${selectedSettingsCategory === item.id ? ' settings-nav-item-active' : ''}`}
                        onClick={() => setSelectedSettingsCategory(item.id)}
                      >
                        <span className="settings-nav-item-label">{item.label}</span>
                        {isMobile && <svg className="settings-nav-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    ))}
                    <div className="settings-nav-divider" />
                    <button
                      type="button"
                      className={`settings-nav-item${selectedSettingsCategory === 'ignite' ? ' settings-nav-item-active' : ''}`}
                      onClick={() => setSelectedSettingsCategory('ignite')}
                    >
                      <span className="settings-ignite-label">
                        Reelms <span className="settings-ignite-word">Ignite</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`settings-nav-item${selectedSettingsCategory === 'desktop' ? ' settings-nav-item-active' : ''}`}
                      onClick={() => setSelectedSettingsCategory('desktop')}
                    >
                      <span className="settings-nav-item-label">{t('app_experiences') || 'App experiences'}</span>
                      {isMobile && <svg className="settings-nav-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                  </nav>
                  <button
                    type="button"
                    className={`settings-help-center-btn${selectedSettingsCategory === 'help_center' ? ' settings-help-center-btn--active' : ''}`}
                    onClick={() => {
                      setHelpForm({ name: currentUser?.displayName || '', email: currentUser?.email || '', message: '' })
                      setHelpStatus('idle')
                      setSelectedSettingsCategory('help_center')
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="12" cy="17" r="1" fill="currentColor"/>
                    </svg>
                    {getT(language)('help_center')}
                  </button>
                  <button type="button" className="settings-sidebar-signout-btn" onClick={onLogOut}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('sign_out')}
                  </button>
                </div>
                <div className="settings-content">
                  {isMobile && selectedSettingsCategory && (
                    <div className="settings-mobile-topbar">
                      <button type="button" className="settings-mobile-back-btn" onClick={() => setSelectedSettingsCategory(null)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                  <div key={selectedSettingsCategory} className="settings-content-panel">
                    {selectedSettingsCategory === 'account' && (
                      <AccountSettingsPanel
                        user={currentUser}
                        onUpdate={updateUserData}
                        onLogOut={onLogOut}
                        profileBio={profileBio}
                        onBioChange={setProfileBio}
                        uid={uid}
                        reelms={reelms}
                        onUnblock={unblockUserFn}
                        onOpenProfileEdit={() => { setShowSettings(false); setShowProfilePopup(true); setProfilePopupInitialEdit(true) }}
                      />
                    )}
                    {selectedSettingsCategory === 'privacy' && (
                      <PrivacySafetyPanel
                        user={currentUser}
                        onUpdate={updateUserData}
                        uid={uid}
                        onUnblock={unblockUserFn}
                        blockedList={blocked}
                        sessionsList={sessionsList}
                        onSessionsUpdate={(next) => {
                          setSessionsList(next)
                          userPutDoc('sessions', next).catch(() => {})
                        }}
                        showHiddenBarItems={showHiddenBarItems}
                        onShowHiddenBarItemsChange={(val) => {
                          setShowHiddenBarItems(val)
                          scheduleUserPersist('bar_prefs', { showHidden: val })
                          userPutDoc('bar_prefs', { showHidden: val }).catch(() => {})
                        }}
                        friends={friends}
                        lastSeenAllowList={lastSeenAllowList}
                        onLastSeenAllowListChange={(next) => {
                          setLastSeenAllowList(next)
                          userPutDoc('last_seen_allow_list', next).catch(() => {})
                        }}
                      />
                    )}
                    {selectedSettingsCategory === 'authorized_apps' && (
                      <AuthorizedAppsPanel
                        user={currentUser}
                        spotifyConnected={spotifyConnected}
                        onSpotifyConnect={connectSpotify}
                        onSpotifyDisconnect={disconnectSpotify}
                      />
                    )}
                    {selectedSettingsCategory === 'customization' && (
                      <CustomizationPanel
                        customization={customization}
                        onChange={updateCustomization}
                        bodyFont={bodyFont}
                        BODY_FONTS={BODY_FONTS}
                        onFontChange={updateBodyFont}
                        user={currentUser}
                      />
                    )}
                    {selectedSettingsCategory === 'environment' && (
                      <EnvironmentPanel uid={uid} />
                    )}
                    {selectedSettingsCategory === 'companions' && (
                      <CompanionsPanel reelms={reelms} />
                    )}
                    {selectedSettingsCategory === 'accessibility' && (
                      <AccessibilityPanel uid={uid} />
                    )}
                    {selectedSettingsCategory === 'usage' && (
                      <div className="usage-settings-panel">
                        {/* Section 1: When entering a reelm, Panels, and Category Icons grouped without dividers */}
                        <div className="accs-section">
                          <div className="usage-unified-group">
                            <div className="usage-block">
                              <div className="accs-section-title">{t('when_entering_reelm')}</div>
                              <p className="accs-note" style={{ margin: '0 0 12px' }}>
                                {t('when_entering_reelm_desc')}
                              </p>
                              <div style={{ display: 'flex', gap: 10 }}>
                                {[{ val: 'chat', label: t('chat') }, { val: 'feed', label: t('feed') }].map(opt => (
                                  <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => updateReelmLandingView(opt.val)}
                                    className={`usage-choice-btn${reelmLandingView === opt.val ? ' usage-choice-btn--active' : ''}`}
                                  >{opt.label}</button>
                                ))}
                              </div>
                            </div>

                            <div className="usage-block">
                              <div className="accs-section-title">{t('panels')}</div>
                              <p className="accs-note" style={{ margin: '0 0 12px' }}>
                                {t('panels_desc')}
                              </p>
                              <button
                                type="button"
                                className="usage-action-btn"
                                onClick={() => {
                                  setLeftWidth(PANEL_DEFAULT)
                                  setRightWidth(PANEL_DEFAULT)
                                  userPutDoc('lpw', String(PANEL_DEFAULT)).catch(() => {})
                                  userPutDoc('rpw', String(PANEL_DEFAULT)).catch(() => {})
                                }}
                              >{t('reset_panels')}</button>
                            </div>

                            <div className="usage-block">
                              <div className="accs-section-title">{t('category_icons') || 'Category Icons'}</div>
                              <div className="cust-toggle-row" style={{ marginTop: 0 }}>
                                <div>
                                  <span className="cust-toggle-label">{t('category_icons') || 'Show category icons'}</span>
                                  <p className="accs-note">{t('category_icons_desc') || 'Display category icons next to channel groups.'}</p>
                                </div>
                                <button
                                  type="button"
                                  className={`cust-toggle${customization.showCategoryIcons !== false ? ' cust-toggle-on' : ''}`}
                                  onClick={() => updateCustomizationData({ showCategoryIcons: customization.showCategoryIcons === false ? true : false })}
                                ><span className="cust-toggle-knob" /></button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Language */}
                        <div className="accs-section">
                          <div className="accs-section-title">{t('language')}</div>
                          <p className="accs-note" style={{ margin: '0 0 14px' }}>
                            {t('language_desc')}
                          </p>
                          <div style={{ maxWidth: 260 }}>
                            <ReelmsCustomSelect
                              value={language}
                              options={LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
                              placeholder=""
                              onChange={code => onLanguageChange(code)}
                            />
                          </div>
                        </div>

                        {/* Section 3: Sounds (Optimized compact grid with custom select) */}
                        <div className="accs-section">
                          <div className="accs-section-title">{t('sounds')}</div>
                          <p className="accs-note" style={{ margin: '0 0 16px' }}>
                            {t('sounds_desc')}
                          </p>
                          <div className="usage-sounds-grid">
                            {SOUND_CATEGORIES.map(cat => (
                              <div key={cat.key} className="usage-sound-item">
                                <span className="usage-sound-label" title={cat.label}>{cat.label}</span>
                                <div className="usage-sound-ctrls">
                                  <ReelmsCustomSelect
                                    value={soundSettings[cat.key] || ''}
                                    placeholder="— Off —"
                                    options={availableSounds.map(f => ({ value: f, label: f.replace(/\.[^.]+$/, '') }))}
                                    onChange={val => {
                                      const next = { ...soundSettings, [cat.key]: val }
                                      setSoundSettings(next)
                                      userPutDoc('sounds', next).catch(() => {})
                                      if (val) previewSound(val)
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="usage-sound-preview-btn"
                                    onClick={() => soundSettings[cat.key] && previewSound(soundSettings[cat.key])}
                                    disabled={!soundSettings[cat.key]}
                                    title="Preview"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                      <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedSettingsCategory === 'desktop' && (
                      <DesktopDownloadSettingsPanel language={language} />
                    )}
                    {selectedSettingsCategory === 'about' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        <div className="accs-section">
                          <div className="accs-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            Reelms
                            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'rgba(var(--ta-rgb), 0.4)', background: 'rgba(var(--ta-rgb), 0.07)', borderRadius: 8, padding: '2px 8px' }}>
                              Beta 2.1/1092026
                            </span>
                          </div>
                          {updateAvailable ? (
                            <div className="about-update-notice">
                              <div className="about-update-dot" />
                              <span className="about-update-text">{t('update_available')}</span>
                              <button className="about-update-btn" onClick={() => window.location.reload()}>{t('update')}</button>
                            </div>
                          ) : (
                            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.4)', lineHeight: 1.5 }}>
                              {t('app_up_to_date')}
                            </p>
                          )}
                        </div>
                        <div className="accs-section">
                          <div className="accs-section-title">{t('release_notes')}</div>
                          {changelog.length === 0 ? (
                            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.4)' }}>Loading…</p>
                          ) : (() => {
                            const [latestRelease, ...prevReleases] = changelog
                            const renderReleaseContent = (release) => {
                              const langKey = `notes_${language}`
                              const descKey = `description_${language}`
                              const notes = release[langKey] || release.notes || []
                              const desc = release[descKey] || release.description || ''
                              return (
                                <>
                                  {release.title && (
                                    <div className="about-release-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ta)', marginBottom: 6 }}>
                                      {release.title}
                                    </div>
                                  )}
                                  {desc && (
                                    <p className="about-release-desc" style={{ fontSize: '0.78rem', color: 'rgba(var(--ta-rgb), 0.7)', lineHeight: 1.5, margin: '0 0 12px' }}>
                                      {desc}
                                    </p>
                                  )}
                                  <ul className="about-release-notes">
                                    {notes.map((note, i) => {
                                      const dashIndex = note.indexOf(' — ')
                                      if (dashIndex !== -1) {
                                        const prefix = note.slice(0, dashIndex).replace(/^\*\*/, '').replace(/\*\*$/, '')
                                        const suffix = note.slice(dashIndex + 3)
                                        return (
                                          <li key={i}>
                                            <strong style={{ color: 'rgba(var(--ta-rgb), 0.85)' }}>{prefix}</strong> — {suffix}
                                          </li>
                                        )
                                      }
                                      return <li key={i}>{note}</li>
                                    })}
                                  </ul>
                                </>
                              )
                            }

                            return (
                              <div className="about-releases-container">
                                {latestRelease && (
                                  <div key={latestRelease.version} className="about-release about-release--latest">
                                    <div className="about-release-header">
                                      <span className="about-release-version">{latestRelease.label || `v${latestRelease.version}`}</span>
                                      {!latestRelease.label && <span className="about-release-date">{latestRelease.date}</span>}
                                      <span className="about-release-highlight" style={{ background: 'rgba(185, 152, 135, 0.2)', color: '#b99887' }}>Latest</span>
                                      {latestRelease.highlights && (
                                        <span className="about-release-highlight">{latestRelease.highlights}</span>
                                      )}
                                    </div>
                                    {renderReleaseContent(latestRelease)}
                                  </div>
                                )}

                                {prevReleases.length > 0 && (
                                  <div className="about-prev-section" style={{ marginTop: 18 }}>
                                    <button
                                      type="button"
                                      className={`about-prev-toggle${showPrevVersions ? ' open' : ''}`}
                                      onClick={() => setShowPrevVersions(v => !v)}
                                    >
                                      <span>{t('previous_versions', 'Previous versions')} ({prevReleases.length})</span>
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: showPrevVersions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                                      >
                                        <polyline points="6 9 12 15 18 9"/>
                                      </svg>
                                    </button>

                                    {showPrevVersions && (
                                      <div className="about-prev-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                        {prevReleases.map(release => {
                                          const isExpanded = expandedReleaseVersions.includes(release.version)
                                          return (
                                            <div key={release.version} className={`about-release about-release--prev${isExpanded ? ' about-release--expanded' : ''}`}>
                                              <button
                                                type="button"
                                                className="about-release-header about-release-header--btn"
                                                onClick={() => {
                                                  setExpandedReleaseVersions(prev =>
                                                    prev.includes(release.version)
                                                      ? prev.filter(v => v !== release.version)
                                                      : [...prev, release.version]
                                                  )
                                                }}
                                              >
                                                <div className="about-release-header-left">
                                                  <span className="about-release-version">{release.label || `v${release.version}`}</span>
                                                  {!release.label && <span className="about-release-date">{release.date}</span>}
                                                  {release.highlights && (
                                                    <span className="about-release-highlight">{release.highlights}</span>
                                                  )}
                                                </div>
                                                <svg
                                                  width="14"
                                                  height="14"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  style={{
                                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s ease',
                                                    color: 'rgba(var(--ta-rgb), 0.55)',
                                                    flexShrink: 0
                                                  }}
                                                >
                                                  <polyline points="6 9 12 15 18 9"/>
                                                </svg>
                                              </button>
                                              {isExpanded && (
                                                <div className="about-release-body">
                                                  {renderReleaseContent(release)}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                    {selectedSettingsCategory === 'ignite' && (
                      <div className="ignite-settings-panel">
                        <div className="ignite-settings-sections">
                          <div className="ignite-settings-section">
                            <div className="ignite-settings-section-title">
                              <span className="settings-ignite-word">Ignite</span>
                            </div>
                            <p className="ignite-settings-soon">Ignite is coming soon.</p>
                          </div>
                          <div className="ignite-settings-section">
                            <div className="ignite-settings-section-title">
                              <span className="settings-ignite-word">Ignite All</span>
                            </div>
                            <p className="ignite-settings-soon">Ignite All is coming soon.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedSettingsCategory === 'help_center' && (
                      <HelpCenterPanel
                        currentUser={currentUser}
                        language={language}
                        helpForm={helpForm}
                        setHelpForm={setHelpForm}
                        helpStatus={helpStatus}
                        setHelpStatus={setHelpStatus}
                        feedbackSend={feedbackSend}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : showFeed && selectedReelm ? (
              <>
                <div className={`panel panel-left${isMobile && mobileLeftPanelOpen ? ' panel-left--open' : ''}`} style={isMobile ? undefined : { flex: `0 0 ${leftWidth}px` }}>
                  <div className="reelm-sidebar">
                    <div
                      className={`reelm-cover-wrap${selectedReelm.image ? ' reelm-cover-wrap--has-image' : ''}${isDefaultCommunity(selectedReelm) ? ' reelm-cover-wrap--community' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (showReelmInfoMenu) { setShowReelmInfoMenu(null); return }
                        setShowReelmMenu(null)
                        const r = e.currentTarget.getBoundingClientRect()
                        const menuWidth = Math.max(260, Math.round(r.width))
                        const x = Math.min(e.clientX || r.left, window.innerWidth - menuWidth - 12)
                        const y = Math.min((e.clientY || r.bottom) + 4, window.innerHeight - 340)
                        setShowReelmInfoMenu({ x: Math.max(10, x), y: Math.max(10, y), w: menuWidth })
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (showReelmMenu) { setShowReelmMenu(null); return; }
                        setShowReelmInfoMenu(null)
                        const r = e.currentTarget.getBoundingClientRect()
                        const menuWidth = Math.max(220, Math.round(r.width))
                        const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12)
                        const y = Math.min(e.clientY, window.innerHeight - 260)
                        setShowReelmMenu({ x: Math.max(10, x), y: Math.max(10, y), w: menuWidth })
                      }}
                    >
                      {isDefaultCommunity(selectedReelm)
                        ? <div className="reelm-cover-community-art"><CommunityDoodlePattern /><ReelmsCommunityGlyph size={52} /></div>
                        : selectedReelm.image
                          ? <img src={selectedReelm.image} alt="cover" className="reelm-cover-img" />
                          : <div className="reelm-cover-placeholder"></div>
                      }
                      {selectedReelm.image && !isDefaultCommunity(selectedReelm) && <div className="reelm-cover-blur-strip" />}
                      <div className="reelm-sidebar-name-row" onClick={e => {
                        e.stopPropagation()
                        if (showReelmInfoMenu) { setShowReelmInfoMenu(null); return }
                        setShowReelmMenu(null)
                        const r = e.currentTarget.getBoundingClientRect()
                        const menuWidth = Math.max(260, Math.round(r.width))
                        const x = Math.min(e.clientX || r.left, window.innerWidth - menuWidth - 12)
                        const y = Math.min((e.clientY || r.bottom) + 4, window.innerHeight - 340)
                        setShowReelmInfoMenu({ x: Math.max(10, x), y: Math.max(10, y), w: menuWidth })
                      }}>
                        <span className="reelm-sidebar-name">{isDefaultCommunity(selectedReelm) ? (t('reelms_community') || (language === 'tr' ? 'Reelms Topluluğu' : 'Reelms Community')) : selectedReelm.name}</span>
                        {showReelmInfoMenu && ReactDOM.createPortal(
                          <ReelmInfoMenu
                            reelm={selectedReelm}
                            pos={showReelmInfoMenu}
                            onClose={() => setShowReelmInfoMenu(null)}
                            onOpenInsights={(r) => setShowInsightsModal(r)}
                            isOwnerOrAdmin={canManageReelmClient(selectedReelm, uid)}
                            t={t}
                            uid={uid}
                            onCopyCode={() => addNotification('Reelm kodu kopyalandı!')}
                          />,
                          document.body
                        )}
                        {showReelmMenu && ReactDOM.createPortal(
                          <div className="reelm-name-menu" style={{ top: showReelmMenu.y, left: showReelmMenu.x, minWidth: 208 }} onClick={e => e.stopPropagation()}>
                            {((!isDefaultCommunity(selectedReelm) && hasReelmPermissionClient(selectedReelm, uid, 'manageOverview')) || canManageReelmClient(selectedReelm, uid)) && (
                              <button
                                type="button"
                                className="reelm-name-menu-item"
                                onClick={() => {
                                  reelmImageInputRef.current?.click()
                                  setShowReelmMenu(null)
                                }}
                              >
                                {selectedReelm.image ? (t('change_reelm_image') || 'Change Reelm image') : (t('add_reelm_image') || 'Add Reelm image')}
                              </button>
                            )}
                            {canOpenReelmSettingsClient(selectedReelm, uid) && (
                              <button className="reelm-name-menu-item" onClick={() => { setShowReelmSettings(true); setShowReelmMenu(null) }}>{t('reelm_settings_menu')}</button>
                            )}
                            <button className="reelm-name-menu-item" onClick={() => { setShowInviteModal(true); setShowReelmMenu(null) }}>{t('invite_friends_menu')}</button>
                            <button className="reelm-name-menu-item" onClick={() => { setShareTarget({ type: 'reelm', title: selectedReelm.name, subtitle: 'Join this Reelm now', image: selectedReelm.image || null, data: selectedReelm }); setShowReelmMenu(null) }}>{t('share_reelm')}</button>
                            <div className="reelm-name-menu-divider" />
                            <button className="reelm-name-menu-item reelm-name-menu-leave" onClick={() => leaveReelm(selectedReelm.id)}>{t('leave_reelm')}</button>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                    <div className="feed-left-nav" onDragOver={e => e.preventDefault()}>
                      {feedNavOrder.map((key, idx) => {
                        const item = ALL_FEED_NAV.find(n => n.key === key)
                        if (!item) return null
                        return (
                          <div
                            key={item.key}
                            className="feed-nav-row"
                            draggable
                            onDragStart={e => e.dataTransfer.setData('text/plain', String(idx))}
                            onDrop={e => {
                              e.preventDefault()
                              const from = parseInt(e.dataTransfer.getData('text/plain'))
                              if (from === idx) return
                              const newOrder = [...feedNavOrder]
                              const [removed] = newOrder.splice(from, 1)
                              newOrder.splice(idx, 0, removed)
                              updateFeedNavOrder(newOrder)
                            }}
                          >
                            <button
                              className={`feed-nav-btn${feedTab === item.key ? ' feed-nav-btn-active' : ''}`}
                              onClick={() => setFeedTab(item.key)}
                            >
                              {item.icon && <img src={item.icon} alt="" className="feed-nav-icon" />}
                              {item.label}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {selectedReelm && !isMobile && (
                    <div className="reelm-left-bottom-feed-bar">
                      <button
                        type="button"
                        className={`reelm-left-bottom-feed-btn${showFeed ? ' reelm-left-bottom-feed-btn--active' : ''}`}
                        onClick={() => {
                          setShowFeed(f => !f)
                          setShowDiscover(false)
                          setSelectedChat(null)
                        }}
                        title={showFeed ? (t('chat') || 'Chat') : `${selectedReelm.name || 'Reelm'} Feed`}
                      >
                        <img src={feedIcon} alt="Feed" className="reelm-left-bottom-feed-icon" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'left', startX: e.clientX, startWidth: leftWidth } }}
                />
                {showModInbox && isMod
                  ? <ModInboxPanel onClose={() => setShowModInbox(false)} />
                  : <FeedPage key={selectedReelm.id} currentUser={currentUser} uid={uid} tab={feedTab} selectedReelm={selectedReelm} isMod={isMod} onReport={openReport} onModDeletePost={modDeletePost} modDeleteTick={modDeleteTick} appStoriesTick={appStoriesTick} onShare={setShareTarget} pushNotifTo={_pushNotifTo} />}
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'right', startX: e.clientX, startWidth: rightWidth } }}
                />
                <div className={`panel panel-right${isMobile && mobileRightPanelOpen ? ' panel-right--open' : ''}`} style={isMobile ? undefined : { flex: `0 0 ${rightWidth}px` }}>
                  {renderReelmMembersPanel('right-1')}
                </div>
              </>
            ) : !showDiscover && !showSettings && !showFriendsPanel && !showNotificationsPanel && !showMsgRequests && ((isMod ? false : (showChatList || selectedChat)) || selectedReelm) ? (
              <>
                <div className={`panel panel-left${isMobile && mobileLeftPanelOpen ? ' panel-left--open' : ''}${isMobile && !selectedReelm && showChatList && !selectedChat ? ' panel-left--chat' : ''}`} style={isMobile ? undefined : { flex: `0 0 ${leftWidth}px` }}>
                  {showChatList && !selectedReelm && (
                    <div className="chat-list-sidebar-panel">
                      <div className="chat-list-sidebar-header">
                        <span className="chat-list-sidebar-title">{t('messages')}</span>
                        <div className="chat-list-filter-row">
                          {(() => {
                            const allUnread = chats.reduce((sum, c) => sum + getChatUnreadCount(c), 0)
                            const unreadCount = chats.filter(c => getChatUnreadCount(c) > 0).length
                            const groupsUnread = chats.filter(c => c.type === 'group').reduce((sum, c) => sum + getChatUnreadCount(c), 0)
                            return (
                              <>
                                <button
                                  type="button"
                                  className={`chat-list-cat-btn${chatListFilter === 'all' ? ' chat-list-cat-btn-active' : ''}`}
                                  onClick={() => { setChatListFilter('all'); setSelectedChat(null); setShowChatFilterMore(false) }}
                                >
                                  <span>{t('all_filter') || 'All'}</span>
                                  {allUnread > 0 && <span className="chat-list-cat-count">{capBadge(allUnread)}</span>}
                                </button>

                                <button
                                  type="button"
                                  className={`chat-list-cat-btn${chatListFilter === 'unread' ? ' chat-list-cat-btn-active' : ''}`}
                                  onClick={() => { setChatListFilter('unread'); setSelectedChat(null); setShowChatFilterMore(false) }}
                                >
                                  <span>{t('unread_filter') || 'Unread'}</span>
                                  {unreadCount > 0 && <span className="chat-list-cat-count">{capBadge(unreadCount)}</span>}
                                </button>

                                <button
                                  type="button"
                                  className={`chat-list-cat-btn${chatListFilter === 'requests' ? ' chat-list-cat-btn-active' : ''}`}
                                  onClick={() => { setChatListFilter('requests'); setSelectedChat(null); setShowChatFilterMore(false) }}
                                >
                                  <span>Requests</span>
                                  {msgRequests.length > 0 && <span className="chat-list-cat-count">{capBadge(msgRequests.length)}</span>}
                                </button>

                                <div className="chat-list-filter-more-wrap" style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    className={`chat-list-more-btn${['groups', 'friends'].includes(chatListFilter) ? ' chat-list-more-btn--active' : ''}`}
                                    onClick={() => setShowChatFilterMore(v => !v)}
                                    title="More filters"
                                  >
                                    •••
                                  </button>
                                  {showChatFilterMore && (
                                    <div className="chat-list-more-menu">
                                      <button
                                        type="button"
                                        className={`chat-list-more-item${chatListFilter === 'groups' ? ' chat-list-more-item--active' : ''}`}
                                        onClick={() => { setChatListFilter('groups'); setSelectedChat(null); setShowChatFilterMore(false) }}
                                      >
                                        <span>{t('groups_filter') || 'Groups'}</span>
                                        {groupsUnread > 0 && <span className="chat-list-cat-count">{capBadge(groupsUnread)}</span>}
                                      </button>
                                      <button
                                        type="button"
                                        className={`chat-list-more-item${chatListFilter === 'friends' ? ' chat-list-more-item--active' : ''}`}
                                        onClick={() => { setChatListFilter('friends'); setSelectedChat(null); setShowChatFilterMore(false) }}
                                      >
                                        <span>Friends</span>
                                        {friends.length > 0 && <span className="chat-list-cat-count" style={{ background: 'rgba(var(--ta-rgb), 0.2)', color: 'var(--ta)' }}>{friends.length}</span>}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )
                          })()}
                        </div>
                        <input
                          className="chat-list-search"
                          value={chatListSearch}
                          onChange={e => setChatListSearch(e.target.value)}
                          placeholder={chatListFilter === 'friends' ? 'Search friends…' : (chatListFilter === 'groups' ? 'Search groups…' : (chatListFilter === 'requests' ? 'Search requests…' : 'Search conversations…'))}
                        />
                      </div>
                      {isMobile && reelms.length > 0 && (
                        <>
                          <div className="mobile-section-label">Reelms</div>
                          <div className="mobile-reelms-list">
                            {[...reelms].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(r => (
                              <div
                                key={r.id}
                                className={`chat-list-row${selectedReelm?.id === r.id ? ' chat-list-row--active' : ''}`}
                                onClick={() => { setSelectedReelm(r); setSelectedChat(null); setShowChatList(false); setMobileLeftPanelOpen(false) }}
                              >
                                <div className="chat-list-row-avatar chat-list-row-avatar--server">
                                  {r.image
                                    ? <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                    : <span style={{ fontSize: 13, fontWeight: 600 }}>{(r.name || '?').charAt(0)}</span>
                                  }
                                </div>
                                <div className="chat-list-row-info">
                                  <span className="chat-list-row-name">{r.name}</span>
                                </div>
                                {unreadCounts[r.id] > 0 && <span className="chat-list-row-badge">{capBadge(unreadCounts[r.id])}</span>}
                              </div>
                            ))}
                          </div>
                          <div className="mobile-section-label">Directs</div>
                        </>
                      )}
                      <div className="chat-list-sidebar-items">
                        {(() => {
                          const q = chatListSearch.trim().toLowerCase()
                          if (chatListFilter === 'requests') {
                            const reqRows = (msgRequests || []).filter(r => {
                              const label = String(r.fromName || r.name || r.fromUsername || r.username || '').toLowerCase()
                              return !q || label.includes(q)
                            })
                            if (!reqRows.length) return <p className="chat-list-empty">No message requests.</p>
                            return reqRows.map(req => {
                              const requesterName = req.fromName || req.name || 'User'
                              const requesterPhoto = req.fromPhoto || req.photo || null
                              const requesterUsername = req.fromUsername || req.username
                              return (
                                <div key={req.id || req.fromId} className="chat-list-row chat-list-row--request" style={{ cursor: 'default' }}>
                                  <div className="chat-list-avatar-wrap">
                                    <div className="discover-result-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}>
                                      {requesterPhoto
                                        ? <img src={requesterPhoto} alt={requesterName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        : requesterName.charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="discover-result-info" style={{ flex: 1, minWidth: 0 }}>
                                    <span className="discover-result-name">{requesterName}</span>
                                    <span className="discover-result-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {req.lastMessage || (requesterUsername ? `@${requesterUsername}` : 'Wants to message you')}
                                    </span>
                                  </div>
                                  <div className="friend-req-actions" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button
                                      className="friend-add-btn"
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                      title="Accept"
                                      onClick={() => {
                                        const peer = { id: req.fromId || req.id, name: requesterName, username: requesterUsername, photo: requesterPhoto }
                                        const updated = msgRequests.filter(r => (r.id !== req.id && r.fromId !== req.fromId))
                                        setMsgRequests(updated)
                                        saveMsgRequests(updated)
                                        const newChat = createOrGetDMChat(peer)
                                        setSelectedChat(newChat)
                                        setShowChatList(false)
                                      }}
                                    >✓</button>
                                    <button
                                      className="friend-reject-btn"
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                      title="Decline"
                                      onClick={() => {
                                        const updated = msgRequests.filter(r => (r.id !== req.id && r.fromId !== req.fromId))
                                        setMsgRequests(updated)
                                        saveMsgRequests(updated)
                                      }}
                                    >×</button>
                                  </div>
                                </div>
                              )
                            })
                          }
                          if (chatListFilter === 'friends') {
                            const friendRows = (friends || []).filter(f => {
                              const label = String(nicknames[f.id] || f.name || f.username || '').toLowerCase()
                              const uname = String(f.username || '').toLowerCase()
                              return !q || label.includes(q) || uname.includes(q)
                            })
                            if (!friendRows.length) return <p className="chat-list-empty">No friends found.</p>
                            return friendRows.map(f => {
                              const displayName = nicknames[f.id] || f.name || f.username || 'Friend'
                              const avatarSrc = getPersonPhoto(f) || null
                              return (
                                <div key={f.id} className="chat-list-row" onClick={() => { startDM(f); setShowChatList(false) }}>
                                  <div className="chat-list-avatar-wrap">
                                    <div className="discover-result-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}>
                                      {avatarSrc ? <img src={avatarSrc} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (displayName || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="chat-list-status-dot" style={{ background: STATUS_COLORS[getUserStatus(f.id)] || STATUS_COLORS.offline }} />
                                  </div>
                                  <div className="discover-result-info">
                                    <span className="discover-result-name">{displayName}</span>
                                    <span className="discover-result-meta">Click to message</span>
                                  </div>
                                </div>
                              )
                            })
                          }
                          let filtered = [...chats]
                          if (chatListFilter === 'unread') filtered = filtered.filter(c => getChatUnreadCount(c) > 0)
                          if (chatListFilter === 'groups') filtered = chats.filter(c => c.type === 'group')
                          if (q) filtered = filtered.filter(c => {
                            const peer = getChatPeer(c) || {}
                            return [getChatDisplayName(c), c.name, c.username, peer.username, c.lastMessage].some(value => String(value || '').toLowerCase().includes(q))
                          })
                          if (filtered.length === 0) return <p className="chat-list-empty">{t('no_chats_yet')}</p>
                          return filtered.map(c => {
                            const unread = getChatUnreadCount(c)
                            const avatarSrc = getChatAvatarSrc(c)
                            const displayName = getChatDisplayName(c)
                            return (
                            <div
                              key={c.id}
                              className={`chat-list-row${selectedChat?.id === c.id ? ' chat-list-row--active' : ''}${unread > 0 ? ' chat-list-row--unread' : ''}`}
                              onClick={() => {
                                setSelectedChat(c); setSelectedChannel(null); setSelectedReelm(null); setShowChatList(false); setShowMediaGallery(null); clearUnread(c.id)
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setChatCtxMenu({ x: e.clientX, y: e.clientY, chat: c })
                              }}
                            >
                              <div className="chat-list-avatar-wrap">
                                <div className="discover-result-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}>
                                  {avatarSrc
                                    ? <img src={avatarSrc} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : (displayName || '?').charAt(0).toUpperCase()
                                  }
                                </div>
                                {c.type === 'dm' && <span className="chat-list-status-dot" style={{ background: STATUS_COLORS[getUserStatus(c.friendId)] || STATUS_COLORS.offline }} />}
                              </div>
                              <div className="discover-result-info">
                                <span className="discover-result-name">{displayName}</span>
                              </div>
                              {unread > 0 && (
                                <span className="notif-badge chat-list-unread-count">{capBadge(unread)}</span>
                              )}
                            </div>
                          )})
                        })()}
                      </div>
                    </div>
                  )}
                  {!showChatList && selectedChat && (() => {
                    if (selectedChat.type === 'group') {
                      const vapor = vaporDurations[selectedChat.id]
                      const VAPOR_OPTS = [
                        { labelKey: 'vapor_after_read', value: 'read' },
                        { labelKey: 'vapor_12h', value: 12 * 3600000 },
                        { labelKey: 'vapor_24h', value: 24 * 3600000 },
                        { labelKey: 'vapor_48h', value: 48 * 3600000 },
                        { labelKey: 'vapor_1w', value: 7 * 86400000 },
                        { labelKey: 'vapor_1m', value: 30 * 86400000 },
                      ]
                      const _isOwner = selectedChat.ownerId === uid
                      const createdDate = selectedChat.createdAt
                        ? new Date(selectedChat.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                        : null
                      return (
                        <div className="dm-sidebar group-sidebar">
                          <button className="dm-back-btn" onClick={() => { setSelectedChat(null); setShowChatList(true); setChatListFilter('all'); setShowMediaGallery(null) }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>

                          {/* Group avatar & header with toggle drawer */}
                          <div className="group-avatar-edit-wrap" onClick={() => setGroupDetailsOpen(v => !v)} title="Group details & settings">
                            <div className="dm-friend-avatar" style={{ width: 76, height: 76, fontSize: '1.8rem' }}>
                              {selectedChat.photo
                                ? <img src={selectedChat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : selectedChat.name?.charAt(0).toUpperCase()
                              }
                            </div>
                            <div className="group-avatar-edit-overlay" onClick={(e) => { e.stopPropagation(); groupEditPhotoInputRef.current?.click() }} title="Change group photo">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3.414 1.414 1.414-3.414A4 4 0 019 13z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          </div>
                          <input
                            ref={groupEditPhotoInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) setGroupCropModal(file)
                              e.target.value = ''
                            }}
                          />

                          {/* Group name */}
                          {groupNameEditing ? (
                            <div className="group-name-edit-row">
                              <input
                                className="group-name-input"
                                value={groupNameEditValue}
                                autoFocus
                                onChange={e => setGroupNameEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const name = groupNameEditValue.trim()
                                    if (name) {
                                      const updatedChats = chats.map(c => c.id === selectedChat.id ? { ...c, name } : c)
                                      setChats(updatedChats)
                                      setSelectedChat(prev => prev ? { ...prev, name } : null)
                                      appPutDoc('chats', updatedChats).catch(() => {})
                                    }
                                    setGroupNameEditing(false)
                                  } else if (e.key === 'Escape') {
                                    setGroupNameEditing(false)
                                  }
                                }}
                                onBlur={() => {
                                  const name = groupNameEditValue.trim()
                                  if (name) {
                                    const updatedChats = chats.map(c => c.id === selectedChat.id ? { ...c, name } : c)
                                    setChats(updatedChats)
                                    setSelectedChat(prev => prev ? { ...prev, name } : null)
                                    appPutDoc('chats', updatedChats).catch(() => {})
                                  }
                                  setGroupNameEditing(false)
                                }}
                              />
                            </div>
                          ) : (
                            <div className="group-name-row" onClick={() => setGroupDetailsOpen(v => !v)} title="Group Details">
                              <span className="dm-friend-name">{selectedChat.name}</span>
                            </div>
                          )}

                          {/* Slide-out Group Details Drawer */}
                          <div className={`dm-profile-slide${groupDetailsOpen ? ' dm-profile-slide--open' : ''}`}>
                            <div className="dm-profile-slide-inner">
                              {(createdDate || selectedChat.createdByName) && (
                                <p className="group-side-meta">
                                  {selectedChat.createdByName ? `${selectedChat.createdByName} ${t('created_group_text') || 'created this group'}` : (t('group_created') || 'Created')}
                                  {createdDate ? ` · ${createdDate}` : ''}
                                </p>
                              )}
                              <div className="dm-profile-inline-actions">
                                <button type="button" className="dm-profile-inline-action" onClick={() => { setShowGroupCreator('friends'); setGroupSelectedFriends([]); setGroupNameInput(selectedChat.name); setGroupPhotoInput(null); setGroupDetailsOpen(false) }}>
                                  <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: '0.9rem', fontWeight: 700 }}>+</span>
                                  <span>{t('add_members') || 'Add Members'}</span>
                                </button>
                                <button type="button" className="dm-profile-inline-action" onClick={() => { setGroupNameEditValue(selectedChat.name); setGroupNameEditing(true); setGroupDetailsOpen(false) }}>
                                  <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>✏️</span>
                                  <span>{t('edit_name') || 'Rename Group'}</span>
                                </button>
                                <button type="button" className="dm-profile-inline-action dm-profile-inline-action--danger" onClick={() => deleteConversation(selectedChat.id)}>
                                  <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>🚪</span>
                                  <span>{t('leave_group') || 'Leave Group'}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="group-side-divider" />

                          {/* Quick controls when menu is closed */}
                          <div className="group-side-menu">
                            <button className={`group-side-menu-item${groupSideExpanded === 'vapor' ? ' group-side-menu-item--active' : ''}`} onClick={() => setGroupSideExpanded(v => v === 'vapor' ? null : 'vapor')}>
                              <span style={{ fontSize: '0.8rem', width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>✦</span>
                              {t('vapor_chat_title') || 'Vapor Chat'}{vapor ? ' ·' : ''}
                              {vapor && <span className="group-vapor-on-dot" />}
                              <svg className={`group-side-chevron${groupSideExpanded === 'vapor' ? ' group-side-chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {groupSideExpanded === 'vapor' && (
                              <div className="group-side-expand">
                                <span className="vapor-chat-desc">{t('vapor_chat_desc')}</span>
                                <div className="vapor-opts" style={{ marginTop: 6 }}>
                                  {VAPOR_OPTS.map(opt => (
                                    <button key={opt.value} className={`vapor-pill${vapor === opt.value ? ' vapor-pill--active' : ''}`}
                                      onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: vapor === opt.value ? null : opt.value }))}>
                                      {t(opt.labelKey)}
                                    </button>
                                  ))}
                                  {vapor && <button className="vapor-pill vapor-pill--off" onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: null }))}>{t('turn_off')}</button>}
                                </div>
                              </div>
                            )}

                            <button className="group-side-menu-item" onClick={() => startCall('audio')}>
                              <span>🔊</span>
                              {t('voice_call') || 'Voice Room / Call'}
                            </button>

                            <button className="group-side-menu-item" onClick={() => startCall('video')}>
                              <span>📹</span>
                              {t('video_call') || 'Video Room / Call'}
                            </button>
                          </div>

                          <div style={{ flex: 1 }} />

                          {/* Media Gallery button at bottom aligned with input */}
                          <div className="dm-bottom-section">
                            <button
                              type="button"
                              className="dm-media-gallery-btn"
                              onClick={() => setShowMediaGallery({ kind: 'group', key: selectedChat.id, name: selectedChat.name })}
                            >
                              🖼️ {t('media') || 'Media'}
                            </button>
                          </div>
                        </div>
                      )
                    }
                    const selectedBlockedEntry = getBlockedEntry(selectedChat.friendId)
                    const selectedChatPeer = selectedBlockedEntry || dmFriendProfile || getChatPeer(selectedChat)
                    const dmPeerId = String(selectedChat.friendId || selectedChatPeer?.id || '')
                    const displayName = nicknames[selectedChat.friendId] || selectedChatPeer?.name || selectedChat.name || ''
                    const customNickname = nicknames[selectedChat.friendId]
                    const fpRaw = dmFriendProfile || selectedBlockedEntry || selectedChatPeer
                    const fp = fpRaw ? { ...fpRaw, id: fpRaw.id || dmPeerId } : (dmPeerId ? { id: dmPeerId, name: displayName } : null)
                    const dmIsSelf = dmPeerId && String(dmPeerId) === String(uid)
                    const dmIsBlocked = !!selectedBlockedEntry || isBlocked(dmPeerId)
                    const dmIsFriend = !dmIsBlocked && isFriend(dmPeerId)
                    const dmHasPendingRequest = !dmIsBlocked && hasSentRequest(dmPeerId)
                    const selectedAvatarSrc = getPersonPhoto(fp) || getChatAvatarSrc(selectedChat)
                    const dmSocialPlatforms = [
                      { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: '#E1306C', baseUrl: 'https://www.instagram.com/' },
                      { key: 'twitter', label: 'X', Icon: XIcon, color: '#e0c9bc', baseUrl: 'https://x.com/' },
                      { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon, color: '#b0b0b0', baseUrl: 'https://www.tiktok.com/@' },
                      { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, color: '#0A66C2', baseUrl: 'https://www.linkedin.com/in/' },
                      { key: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon, color: '#25D366', baseUrl: 'https://wa.me/' },
                      { key: 'discord', label: 'Discord', Icon: DiscordSocialIcon, color: '#5865F2', baseUrl: null },
                      { key: 'snapchat', label: 'Snapchat', Icon: SnapchatIcon, color: '#FFFC00', baseUrl: 'https://www.snapchat.com/add/' },
                    ]
                    const activeSocials = fp?.socialorder?.length
                      ? fp.socialorder.filter(k => fp.sociallinks?.[k])
                      : Object.keys(fp?.sociallinks || {}).filter(k => fp.sociallinks[k])
                    const friendNowPlaying = spotifyFriendsNowPlaying[selectedChat.friendId]
                    return (
                      <div className="dm-sidebar dm-sidebar-redesign">
                        <button className="dm-back-btn" onClick={() => { setSelectedChat(null); setShowChatList(true); setChatListFilter('all'); setShowMediaGallery(null) }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>

                        {/* Top Clean Profile Card */}
                        <div className="dm-avatar-card" onClick={() => setDmProfileExpanded(v => !v)} title="Click to view options">
                          <div className="dm-friend-avatar-wrap">
                            <div className="dm-friend-avatar" style={{ width: 86, height: 86, fontSize: '2rem' }}>
                              {selectedAvatarSrc
                                ? <img src={selectedAvatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : (displayName || '?').charAt(0).toUpperCase()
                              }
                            </div>
                          </div>
                          <span className="dm-display-name">{displayName}</span>
                          {fp?.username && (
                            <span className="dm-nickname-italic">
                              {`@${fp.username.startsWith('@') ? fp.username.slice(1) : fp.username}`}
                            </span>
                          )}
                          {!dmIsSelf && getLastSeenLabel(dmPeerId) && (
                            <span className="dm-friend-lastseen" style={{ marginTop: 3 }}>{getLastSeenLabel(dmPeerId)}</span>
                          )}
                        </div>

                        {/* Bio & Status */}
                        {fp?.bio && <p className="dm-bio-preview">{fp.bio}</p>}
                        {friendNowPlaying && (
                          <div className="dm-profile-nowplaying" style={{ marginTop: 6 }}>
                            <SpotifyIcon size={13} />
                            <span className="dm-profile-nowplaying-track">{friendNowPlaying.name}</span>
                            <span className="dm-profile-nowplaying-sep"> · </span>
                            <span className="dm-profile-nowplaying-artist">{friendNowPlaying.artist}</span>
                          </div>
                        )}
                        {activeSocials.length > 0 && (
                          <div className="dm-profile-socials" style={{ marginTop: 8 }}>
                            {activeSocials.map(key => {
                              const platform = dmSocialPlatforms.find(p => p.key === key)
                              if (!platform) return null
                              const { Icon, color, baseUrl, label } = platform
                              const handle = fp.sociallinks[key]
                              return (
                                <button
                                  key={key}
                                  className="dm-profile-social-chip"
                                  style={{ color }}
                                  title={`${label}: ${handle}`}
                                  onClick={e => { e.stopPropagation(); if (baseUrl) window.open(baseUrl + handle, '_blank') }}
                                >
                                  <Icon />
                                  <span>{handle}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Slide-out Menu on avatar/name click */}
                        <div className={`dm-profile-slide${dmProfileExpanded ? ' dm-profile-slide--open' : ''}`}>
                          <div className="dm-profile-slide-inner">
                            <div className="dm-profile-inline-actions">
                              {fp?.allowProfileSharing !== false && !isReelmsSystemChat(selectedChat) && (
                                <button type="button" className="dm-profile-inline-action" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`${getPublicWebUrl()}/u/${fp?.username || dmPeerId || fp?.id}`) }}>
                                  <span>🔗</span>
                                  <span>{t('share_profile') || 'Share Profile'}</span>
                                </button>
                              )}
                              {!isReelmsSystemChat(selectedChat) && (
                                <button type="button" className="dm-profile-inline-action" onClick={() => setDmSideTab(t => t === 'vapor' ? 'profile' : 'vapor')}>
                                  <span>✦</span>
                                  <span>{t('vapor_chat_title') || 'Vapor Chat'}</span>
                                </button>
                              )}
                              {!isReelmsSystemChat(selectedChat) && !dmIsSelf && dmIsBlocked && (
                                <button type="button" className="dm-profile-inline-action" onClick={(e) => { e.stopPropagation(); unblockUserFn(dmPeerId) }}>
                                  <span>🔓</span>
                                  <span>Unblock</span>
                                </button>
                              )}
                              {!isReelmsSystemChat(selectedChat) && !dmIsSelf && !dmIsBlocked && dmIsFriend && (
                                <button type="button" className="dm-profile-inline-action dm-profile-inline-action--danger" onClick={(e) => { e.stopPropagation(); removeFriend(dmPeerId) }}>
                                  <span>👤</span>
                                  <span>{t('remove_friend') || 'Remove Friend'}</span>
                                </button>
                              )}
                              {!isReelmsSystemChat(selectedChat) && !dmIsSelf && !dmIsBlocked && fp && (
                                <button type="button" className="dm-profile-inline-action dm-profile-inline-action--danger" onClick={(e) => { e.stopPropagation(); blockUserFn(fp) }}>
                                  <span>🚫</span>
                                  <span>{t('block') || 'Block'}</span>
                                </button>
                              )}
                              <button type="button" className="dm-profile-inline-action dm-profile-inline-action--danger" onClick={(e) => { e.stopPropagation(); deleteConversation(selectedChat.id) }}>
                                <span>🗑️</span>
                                <span>{t('delete_conversation') || 'Delete Conversation'}</span>
                              </button>
                            </div>

                            {/* Vapor settings expand if enabled */}
                            {dmSideTab === 'vapor' && !isReelmsSystemChat(selectedChat) && (() => {
                              const dmVapor = vaporDurations[selectedChat.id]
                              const DM_VAPOR_OPTS = [
                                { labelKey: 'vapor_after_read', value: 'read' },
                                { labelKey: 'vapor_12h', value: 12 * 3600000 },
                                { labelKey: 'vapor_24h', value: 24 * 3600000 },
                                { labelKey: 'vapor_48h', value: 48 * 3600000 },
                                { labelKey: 'vapor_1w', value: 7 * 86400000 },
                                { labelKey: 'vapor_1m', value: 30 * 86400000 },
                              ]
                              return (
                                <div className="chat-side-section" style={{ marginTop: 8 }}>
                                  <div className="vapor-chat-header">
                                    <span className="vapor-chat-title">✦ {t('vapor_chat_title')}</span>
                                    <span className="vapor-chat-desc">{t('vapor_chat_desc')}</span>
                                  </div>
                                  <div className="vapor-opts">
                                    {DM_VAPOR_OPTS.map(opt => (
                                      <button key={opt.value} className={`vapor-pill${dmVapor === opt.value ? ' vapor-pill--active' : ''}`}
                                        onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: dmVapor === opt.value ? null : opt.value }))}>
                                        {t(opt.labelKey)}
                                      </button>
                                    ))}
                                    {dmVapor && <button className="vapor-pill vapor-pill--off" onClick={() => setVaporDurations(prev => ({ ...prev, [selectedChat.id]: null }))}>{t('turn_off')}</button>}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Bottom Actions Section */}
                        <div className="dm-bottom-section">
                          <button
                            type="button"
                            className="dm-media-gallery-btn"
                            onClick={() => setShowMediaGallery({ kind: 'dm', key: selectedChat.id, name: displayName })}
                          >
                            🖼️ {t('media') || 'Media'}
                          </button>

                          {!isReelmsSystemChat(selectedChat) && !dmIsSelf && !dmIsFriend && !dmIsBlocked && (
                            dmHasPendingRequest
                              ? <button type="button" className="dm-bottom-btn" disabled>Friend request sent</button>
                              : <button type="button" className="dm-bottom-btn dm-bottom-btn--primary" onClick={() => sendFriendRequest(fp || { id: dmPeerId, name: displayName })}>+ {t('add_friend') || 'Add Friend'}</button>
                          )}

                          {!isReelmsSystemChat(selectedChat) && (
                            <button
                              type="button"
                              className="dm-bottom-btn"
                              onClick={() => {
                                const friend = friends.find(f => String(f.id) === String(selectedChat.friendId)) || { id: selectedChat.friendId, name: selectedChat.name, photo: selectedChat.photo }
                                setFullProfileTarget({ isSelf: dmIsSelf, user: friend })
                              }}
                            >
                              {t('see_full_profile') || 'See Full Profile'} →
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  {!selectedChat && selectedReelm && (
                    <div className="reelm-sidebar">
                      <div
                        className={`reelm-cover-wrap${selectedReelm.image ? ' reelm-cover-wrap--has-image' : ''}${isDefaultCommunity(selectedReelm) ? ' reelm-cover-wrap--community' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (showReelmInfoMenu) { setShowReelmInfoMenu(null); return }
                          setShowReelmMenu(null)
                          const r = e.currentTarget.getBoundingClientRect()
                          const menuWidth = Math.max(260, Math.round(r.width))
                          const x = Math.min(e.clientX || r.left, window.innerWidth - menuWidth - 12)
                          const y = Math.min((e.clientY || r.bottom) + 4, window.innerHeight - 340)
                          setShowReelmInfoMenu({ x: Math.max(10, x), y: Math.max(10, y), w: menuWidth })
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (showReelmMenu) { setShowReelmMenu(null); return; }
                          setShowReelmInfoMenu(null)
                          const r = e.currentTarget.getBoundingClientRect()
                          const menuWidth = Math.max(220, Math.round(r.width))
                          const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12)
                          const y = Math.min(e.clientY, window.innerHeight - 260)
                          setShowReelmMenu({ x: Math.max(10, x), y: Math.max(10, y), w: menuWidth })
                        }}
                      >
                        {isDefaultCommunity(selectedReelm)
                          ? <div className="reelm-cover-community-art"><CommunityDoodlePattern /><ReelmsCommunityGlyph size={44} /></div>
                          : selectedReelm.image
                            ? <img src={selectedReelm.image} alt="cover" className="reelm-cover-img" />
                            : <div className="reelm-cover-placeholder"><span>+</span></div>
                        }
                        {selectedReelm.image && !isDefaultCommunity(selectedReelm) && <div className="reelm-cover-blur-strip" />}
                        <div className="reelm-sidebar-name-row" onClick={e => {
                          e.stopPropagation()
                          if (showReelmInfoMenu) { setShowReelmInfoMenu(null); return }
                          setShowReelmMenu(null)
                          const r = e.currentTarget.getBoundingClientRect()
                          const menuWidth = Math.max(260, Math.round(r.width))
                          const x = Math.min(e.clientX || r.left, window.innerWidth - menuWidth - 12)
                          const y = Math.min((e.clientY || r.bottom) + 4, window.innerHeight - 340)
                          setShowReelmInfoMenu({ x: Math.max(10, x), y: Math.max(10, y), w: menuWidth })
                        }}>
                          <span className="reelm-sidebar-name">{isDefaultCommunity(selectedReelm) ? (t('reelms_community') || (language === 'tr' ? 'Reelms Topluluğu' : 'Reelms Community')) : selectedReelm.name}</span>
                          {showReelmInfoMenu && ReactDOM.createPortal(
                            <ReelmInfoMenu
                              reelm={selectedReelm}
                              pos={showReelmInfoMenu}
                              onClose={() => setShowReelmInfoMenu(null)}
                              onOpenInsights={(r) => setShowInsightsModal(r)}
                              isOwnerOrAdmin={canManageReelmClient(selectedReelm, uid)}
                              t={t}
                              uid={uid}
                              onCopyCode={() => addNotification('Reelm kodu kopyalandı!')}
                            />,
                            document.body
                          )}
                          {showReelmMenu && ReactDOM.createPortal(
                            <div className="reelm-name-menu" style={{ top: showReelmMenu.y, left: showReelmMenu.x, minWidth: 208 }} onClick={e => e.stopPropagation()}>
                              {((!isDefaultCommunity(selectedReelm) && hasReelmPermissionClient(selectedReelm, uid, 'manageOverview')) || canManageReelmClient(selectedReelm, uid)) && (
                                <button
                                  type="button"
                                  className="reelm-name-menu-item"
                                  onClick={() => {
                                    reelmImageInputRef.current?.click()
                                    setShowReelmMenu(null)
                                  }}
                                >
                                  {selectedReelm.image ? (t('change_reelm_image') || 'Change Reelm image') : (t('add_reelm_image') || 'Add Reelm image')}
                                </button>
                              )}
                              {canOpenReelmSettingsClient(selectedReelm, uid) && (
                                <button className="reelm-name-menu-item" onClick={() => { setShowReelmSettings(true); setShowReelmMenu(null) }}>{t('reelm_settings_menu')}</button>
                              )}
                              <button className="reelm-name-menu-item" onClick={() => { setShowInviteModal(true); setShowReelmMenu(null) }}>{t('invite_friends_menu')}</button>
                              <button className="reelm-name-menu-item" onClick={() => { setShareTarget({ type: 'reelm', title: selectedReelm.name, subtitle: 'Join this Reelm now', image: selectedReelm.image || null, data: selectedReelm }); setShowReelmMenu(null) }}>{t('share_reelm')}</button>
                              <div className="reelm-name-menu-divider" />
                              <button className="reelm-name-menu-item reelm-name-menu-leave" onClick={() => leaveReelm(selectedReelm.id)}>{t('leave_reelm')}</button>
                            </div>,
                            document.body
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          ref={reelmImageInputRef}
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            ;(async () => {
                              try {
                                const url = await uploadProfileImageFile(file, 'reelm-icon')
                                updateReelmImage(selectedReelm.id, url)
                              } catch (err) {
                                console.warn('Reelm image upload failed:', err)
                              }
                            })()
                            e.target.value = ''
                          }}
                        />
                      </div>

                      {/* Events Section directly below Reelm cover */}
                      {(() => {
                        const myMember = selectedReelm.members?.find(m => m.userId === uid)
                        const myRoles = (selectedReelm.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                        const isAuthorized = canManageReelmClient(selectedReelm, uid) || myRoles.some(isManagerRoleClient)
                        const allEvents = Array.isArray(selectedReelm.events) ? [...selectedReelm.events] : []
                        const now = Date.now()
                        const upcomingEvents = allEvents
                          .filter(ev => !ev.startTime || new Date(ev.startTime).getTime() >= now - 3600000)
                          .sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime())
                        const displayedEvents = upcomingEvents.slice(0, 2)
                        const hasMore = upcomingEvents.length > 2

                        return (
                          <div
                            className="reelm-events-sidebar-section"
                            onContextMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setEventCtxMenu({ x: e.clientX, y: e.clientY, reelmId: selectedReelm.id, isAuthorized })
                            }}
                          >
                            <div className="reelm-events-header">
                              <div className="reelm-events-title-wrap" onClick={() => setShowAllEventsModal(selectedReelm.id)}>
                                <svg className="reelm-events-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                  <line x1="16" y1="2" x2="16" y2="6"/>
                                  <line x1="8" y1="2" x2="8" y2="6"/>
                                  <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                <span className="reelm-events-title">{t('events') || 'Events'}</span>
                                {upcomingEvents.length > 0 && <span className="reelm-events-count">{upcomingEvents.length}</span>}
                              </div>
                              {isAuthorized && (
                                <button
                                  type="button"
                                  className="reelm-events-add-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowCreateEventModal(selectedReelm.id)
                                  }}
                                  title="Create Event"
                                >
                                  +
                                </button>
                              )}
                            </div>

                            {upcomingEvents.length === 0 ? (
                              <div className="reelm-events-empty" onClick={() => { if (isAuthorized) setShowCreateEventModal(selectedReelm.id) }}>
                                <span>{t('no_upcoming_events') === 'no_upcoming_events' ? 'No upcoming events' : t('no_upcoming_events')}</span>
                              </div>
                            ) : (
                              <div className="reelm-events-list">
                                {displayedEvents.map(ev => {
                                  const isInterested = (ev.interestedUids || []).includes(uid)
                                  const interestedCount = (ev.interestedUids || []).length
                                  const dateStr = formatEventTime(ev.startTime)
                                  return (
                                    <div key={ev.id} className="reelm-event-card" onClick={() => setShowAllEventsModal(selectedReelm.id)}>
                                      <div className="reelm-event-card-top">
                                        <span className="reelm-event-date-badge">{dateStr}</span>
                                        <button
                                          type="button"
                                          className={`reelm-event-rsvp-btn${isInterested ? ' reelm-event-rsvp-btn--active' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleEventInterest(selectedReelm.id, ev.id)
                                          }}
                                          title={isInterested ? 'You are interested' : 'Mark as interested'}
                                        >
                                          ★ {interestedCount > 0 ? interestedCount : ''}
                                        </button>
                                      </div>
                                      <div className="reelm-event-info">
                                        <span className="reelm-event-name">{ev.title}</span>
                                        {ev.location && <span className="reelm-event-location">📍 {ev.location}</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                                {hasMore && (
                                  <button
                                    type="button"
                                    className="reelm-events-view-all-btn"
                                    onClick={() => setShowAllEventsModal(selectedReelm.id)}
                                  >
                                    {t('view_all_events') || `View all events (${upcomingEvents.length})`} →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      <div className="reelm-categories-scroll">
                      {selectedReelm.categories.map(cat => (
                        <div key={cat.id} className="reelm-category">
                          <div
                            className="reelm-category-header"
                            onContextMenu={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              const myMember = selectedReelm.members?.find(m => m.userId === uid)
                              const myRoles = (selectedReelm.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                              const isAdmin = selectedReelm.ownerId === uid || selectedReelm.userId === uid || canManageReelmClient(selectedReelm, uid) || myRoles.some(isManagerRoleClient)
                              const canVapor = hasReelmPermissionClient(selectedReelm, uid, 'createVaporRoom') || isAdmin
                              setOpenCategoryMenu({ id: cat.id, x: e.clientX, y: e.clientY, isAdmin, canVapor })
                            }}
                          >
                            <span
                              className="reelm-category-name"
                              onClick={() => toggleCategory(selectedReelm.id, cat.id)}
                            >
                              {(() => {
                                const key = cat.icon || (cat.type === 'announcement' ? 'general' : cat.type === 'text' ? 'text' : cat.type === 'voice' ? 'multimedia' : 'liveaction')
                                const src = { general: channelGeneralIcon, text: channelTextIcon, multimedia: channelMultimediaIcon, liveaction: channelLiveactionIcon }[key]
                                return <span className="reelm-category-icon"><MaskIcon src={src} className="reelm-category-icon-img" style={{ width: 14, height: 14 }} /></span>
                              })()}
                              {getCategoryDisplayName(cat)}
                            </span>
                          </div>
                          {!cat.collapsed && (
                            <div className="reelm-channels">
                              {cat.channels.map(ch => (
                                <React.Fragment key={ch.id}>
                                  <div className={`reelm-channel${ch.isFlyingRoom ? ' reelm-channel-flying' : ''}${(unreadCounts[`${selectedReelm.id}_${ch.id}`] || 0) > 0 ? ' reelm-channel--unread' : ''}`} onClick={() => {
                                      setChannelCtxMenu(null); setSelectedChannel(ch); clearReelmChannelUnread(selectedReelm.id, ch.id)
                                      if (isMobile) setMobileLeftPanelOpen(false)
                                      if (['voice', 'video', 'liveaction', 'stage'].includes(ch.type) && (selectedReelm.autoJoinVoice !== false) && voiceChannel?.channelId !== ch.id) {
                                        joinVoiceChannel(selectedReelm.id, ch.id, ch.name)
                                      }
                                    }}
                                    onDragOver={e => { if (['voice', 'video', 'liveaction', 'stage'].includes(ch.type) && canManageVoiceClient(selectedReelm, uid)) e.preventDefault() }}
                                    onDrop={e => {
                                      if (!['voice', 'video', 'liveaction', 'stage'].includes(ch.type) || !canManageVoiceClient(selectedReelm, uid)) return
                                      e.preventDefault(); e.stopPropagation()
                                      let payload = e.dataTransfer.getData('application/x-reelms-member') || e.dataTransfer.getData('text/plain')
                                      try {
                                        const member = JSON.parse(payload)
                                        if ((member?.type === 'voice-participant' || member?.type === 'reelm-member') && String(member.reelmId) === String(selectedReelm.id)) {
                                          moveMemberToVoiceChannel(selectedReelm.id, ch.id, ch.name, { userId: member.userId, userName: member.userName, userPhoto: member.userPhoto })
                                        }
                                      } catch { /* noop */ }
                                    }}
                                    onContextMenu={e => {
                                      e.preventDefault()
                                      const myMember = selectedReelm.members?.find(m => m.userId === uid)
                                      const myRoles = (selectedReelm.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                                      const isAuthorized = canManageReelmClient(selectedReelm, uid) || myRoles.some(isManagerRoleClient)
                                      setChannelCtxMenu({ x: e.clientX, y: e.clientY, catId: cat.id, chId: ch.id, chType: ch.type, catChannelCount: cat.channels.length, isAuthorized })
                                    }}
                                  >
                                    <span className={"reelm-channel-label" + (selectedChannel?.id === ch.id ? " reelm-channel-label-active" : "")}>
                                      {(ch.type === 'announcement' || ch.type === 'text') && (
                                        <span className="reelm-channel-prefix">#</span>
                                      )}
                                      {editingChannelId === ch.id ? (
                                        <input
                                          className="reelm-channel-name-input"
                                          value={editingChannelName}
                                          onChange={e => setEditingChannelName(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') saveChannelName(selectedReelm.id, cat.id, ch.id)
                                            if (e.key === 'Escape') setEditingChannelId(null)
                                          }}
                                          onBlur={() => saveChannelName(selectedReelm.id, cat.id, ch.id)}
                                          placeholder={['voice', 'video', 'liveaction', 'stage'].includes(ch.type) ? 'Room name' : 'channel-name'}
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="reelm-channel-name">{ch.name}</span>
                                      )}
                                      {(unreadCounts[`${selectedReelm.id}_${ch.id}`] || 0) > 0 && (
                                        <span className="reelm-channel-unread-badge">{capBadge(unreadCounts[`${selectedReelm.id}_${ch.id}`])}</span>
                                      )}
                                    </span>
                                    {['voice', 'video', 'liveaction', 'stage'].includes(ch.type) && editingChannelId !== ch.id && newVoiceChannelId !== ch.id && (() => {
                                      const participants = vcParticipantsFor(selectedReelm.id, ch.id)
                                      const count = participants.length || vcCountFor(selectedReelm.id, ch.id)
                                      return (
                                        <div className={`reelm-channel-voice-meta${count > 0 ? ' reelm-channel-voice-meta--active' : ''}`}>
                                          <span className="reelm-channel-capacity">{count}/{ch.capacity == null || ch.capacity === 0 ? '+' : ch.capacity}</span>
                                          {participants.length > 0 && (
                                            <div className="reelm-channel-voice-users" title={participants.map(p => p.userName || 'Member').join(', ')}>
                                              {participants.slice(0, 3).map(p => (
                                                <span
                                                  key={p.userId}
                                                  className="reelm-channel-voice-user"
                                                  draggable={String(p.userId) !== String(uid) && canManageVoiceClient(selectedReelm, uid)}
                                                  onDragStart={(e) => {
                                                    const payload = JSON.stringify({ type: 'voice-participant', reelmId: selectedReelm.id, channelId: ch.id, userId: p.userId, userName: p.userName, userPhoto: p.userPhoto })
                                                    e.dataTransfer.setData('application/x-reelms-member', payload)
                                                    e.dataTransfer.setData('text/plain', payload)
                                                    e.dataTransfer.effectAllowed = 'move'
                                                  }}
                                                  onClick={(e) => {
                                                    if (String(p.userId) === String(uid) || !canManageVoiceClient(selectedReelm, uid)) return
                                                    e.stopPropagation()
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setVoiceRoomUserMenu({ x: rect.left + 8, y: rect.bottom + 4, reelmId: selectedReelm.id, channelId: ch.id, userId: p.userId, userName: p.userName, userPhoto: p.userPhoto })
                                                  }}
                                                  onContextMenu={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    if (String(p.userId) === String(uid) || !canManageVoiceClient(selectedReelm, uid)) return
                                                    setVoiceRoomUserMenu({ x: e.clientX, y: e.clientY, reelmId: selectedReelm.id, channelId: ch.id, userId: p.userId, userName: p.userName, userPhoto: p.userPhoto })
                                                  }}
                                                >
                                                  <span className="reelm-channel-voice-avatar">
                                                    {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                                  </span>
                                                  <span className="reelm-channel-voice-name">{p.userName || 'Member'}</span>
                                                </span>
                                              ))}
                                              {participants.length > 3 && <span className="reelm-channel-voice-more">+{participants.length - 3}</span>}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                    {ch.isFlyingRoom && editingChannelId !== ch.id && (
                                      <span className="reelm-flying-badge" title={`Expires in ${formatTimeLeft(ch.expiresAt)}`}>
                                        {flyingRoomTick >= 0 && formatTimeLeft(ch.expiresAt)}
                                      </span>
                                    )}
                                    {newVoiceChannelId === ch.id && (
                                      <div className="reelm-ch-capacity-picker" onClick={e => e.stopPropagation()}>
                                        {[2, 4, 8, 16].map(cap => (
                                          <button key={cap} className={`reelm-ch-cap-pick-btn${ch.capacity === cap ? ' active' : ''}`}
                                            onClick={() => { saveChannelCapacity(selectedReelm.id, cat.id, ch.id, cap); setNewVoiceChannelId(null) }}>{cap}</button>
                                        ))}
                                        <button className={`reelm-ch-cap-pick-btn${ch.capacity === 0 ? ' active' : ''}`}
                                          onClick={() => { saveChannelCapacity(selectedReelm.id, cat.id, ch.id, 0); setNewVoiceChannelId(null) }}>+</button>
                                      </div>
                                    )}
                                  </div>
                                  {ch.subchannels && ch.subchannels.length > 0 && (
                                    <div className="reelm-subchannels-tree">
                                      {ch.subchannels.map(sub => {
                                        const isSubSelected = selectedChannel?.id === sub.id
                                        return (
                                          <div
                                            key={sub.id}
                                            className={`reelm-channel reelm-subchannel${isSubSelected ? ' reelm-channel--active' : ''}${(unreadCounts[`${selectedReelm.id}_${sub.id}`] || 0) > 0 ? ' reelm-channel--unread' : ''}`}
                                            onClick={() => {
                                              setChannelCtxMenu(null)
                                              setSelectedChannel(sub)
                                              clearReelmChannelUnread(selectedReelm.id, sub.id)
                                            }}
                                            onContextMenu={e => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              const myMember = selectedReelm.members?.find(m => m.userId === uid)
                                              const myRoles = (selectedReelm.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                                              const isAuthorized = canManageReelmClient(selectedReelm, uid) || myRoles.some(isManagerRoleClient)
                                              setChannelCtxMenu({ x: e.clientX, y: e.clientY, catId: cat.id, chId: sub.id, parentChId: ch.id, isSubchannel: true, chType: sub.type, isAuthorized })
                                            }}
                                          >
                                            <span className="reelm-subchannel-branch" />
                                            <span className={"reelm-channel-label" + (isSubSelected ? " reelm-channel-label-active" : "")}>
                                              <span className="reelm-channel-prefix">#</span>
                                              {editingChannelId === sub.id ? (
                                                <input
                                                  className="reelm-channel-name-input"
                                                  value={editingChannelName}
                                                  onChange={e => setEditingChannelName(e.target.value)}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') saveSubchannelName(selectedReelm.id, cat.id, ch.id, sub.id)
                                                    if (e.key === 'Escape') setEditingChannelId(null)
                                                  }}
                                                  onBlur={() => saveSubchannelName(selectedReelm.id, cat.id, ch.id, sub.id)}
                                                  placeholder="subchannel-name"
                                                  autoFocus
                                                />
                                              ) : (
                                                <span className="reelm-channel-name">{sub.name}</span>
                                              )}
                                              {(unreadCounts[`${selectedReelm.id}_${sub.id}`] || 0) > 0 && (
                                                <span className="reelm-channel-unread-badge">{capBadge(unreadCounts[`${selectedReelm.id}_${sub.id}`])}</span>
                                              )}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                  {selectedReelm && !isMobile && (
                    <div className="reelm-left-bottom-feed-bar">
                      {voiceChannel && (
                        <div
                          className="global-voice-dock global-voice-dock--draggable"
                          style={voiceDockPos ? {
                            position: 'fixed',
                            left: `${voiceDockPos.x}px`,
                            top: `${voiceDockPos.y}px`,
                            bottom: 'auto',
                            right: 'auto',
                            zIndex: 99999,
                            cursor: isDraggingVoiceDock ? 'grabbing' : 'grab'
                          } : {}}
                          onDoubleClick={() => setVoiceDockPos(null)}
                          onMouseDown={handleVoiceDockDragStart}
                          onTouchStart={handleVoiceDockTouchStart}
                          title="Drag to move anywhere. Double click to reset to default position."
                        >
                          <div
                            className="gvd-info"
                            onClick={() => {
                              const reelm = reelms.find(r => r.id === voiceChannel.reelmId)
                              if (!reelm) return
                              const ch = reelm.categories.flatMap(c => c.channels).find(c => c.id === voiceChannel.channelId)
                              if (!ch) return
                              setSelectedReelm(reelm); setSelectedChannel(ch); setShowDiscover(false); setSelectedChat(null); setShowSettings(false)
                            }}
                          >
                            <span className="gvd-pulse-dot" />
                            <div className="gvd-text">
                              <span className="gvd-name">{voiceChannel.channelName || 'Voice Room'}</span>
                              <span className="gvd-sub">Connected</span>
                            </div>
                          </div>
                          <div className="gvd-actions">
                            <button
                              type="button"
                              className={`gvd-btn${voiceMuted ? ' gvd-btn--active' : ''}`}
                              onClick={voiceToggleMute}
                              title={voiceMuted ? 'Unmute' : 'Mute'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={`gvd-btn${voiceDeafened ? ' gvd-btn--active' : ''}`}
                              onClick={voiceToggleDeafen}
                              title={voiceDeafened ? 'Undeafen' : 'Deafen'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="gvd-btn gvd-btn--disconnect"
                              onClick={() => leaveVoiceChannel(voiceChannel.reelmId, voiceChannel.channelId)}
                              title="Disconnect"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className={`reelm-left-bottom-feed-btn${showFeed ? ' reelm-left-bottom-feed-btn--active' : ''}`}
                        onClick={() => {
                          setShowFeed(f => !f)
                          setShowDiscover(false)
                          setSelectedChat(null)
                        }}
                        title={showFeed ? (t('chat') || 'Chat') : `${selectedReelm.name || 'Reelm'} Feed`}
                      >
                        <img src={feedIcon} alt="Feed" className="reelm-left-bottom-feed-icon" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'left', startX: e.clientX, startWidth: leftWidth } }}
                />
                <div className={`panel panel-middle${isMobile && showChatList && !selectedChat && !selectedReelm ? ' panel-middle--chat-list-only' : ''}`}>
                {showMediaGallery ? (
                  <MediaGalleryPanel
                    showMediaGallery={showMediaGallery}
                    messages={messages}
                    mediaGalleryTab={mediaGalleryTab}
                    setMediaGalleryTab={setMediaGalleryTab}
                    onClose={() => setShowMediaGallery(null)}
                    onOpenLightbox={(url) => setLightboxSrc(url)}
                  />
                ) : (
                  <>
                {showChatList && !selectedChat && !selectedReelm && !isMobile && (
                  <div className="chat-list-empty-middle">
                    <span>Select a conversation</span>
                  </div>
                )}
                {(selectedChannel?.type === 'voice' || selectedChannel?.type === 'live') && (() => {
                  const isLive = selectedChannel.type === 'live'
                  const isInCall = voiceChannel?.channelId === selectedChannel.id
                  return (
                    <div className={`voice-panel ${isLive && isInCall ? 'live-action-layout' : ''}`}>
                      {selectedChannel?.name && (
                        <div className="channel-header-float">
                          <span className="channel-header-name">{selectedChannel.name}</span>
                        </div>
                      )}
                      {!isInCall ? (
                        <div className="voice-join-screen">
                          <div className="voice-join-icon">
                            {isLive ? (
                              <img src={channelLiveactionIcon} alt="" width="38" height="38" style={{opacity:0.7}} />
                            ) : (
                              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <p className="voice-join-title">{selectedChannel.name}</p>
                          <p className="voice-join-hint">{isLive ? 'Live Action' : 'Voice Room'}</p>
                          <button className="voice-join-btn" onClick={() => joinVoiceChannel(selectedReelm.id, selectedChannel.id, selectedChannel.name)}>
                            Join Room
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className={isLive ? "live-action-center" : "voice-call-body"}>
                            {isLive && (
                            <div className="live-screen-area">
                              {voiceParticipants.filter(p => p.isScreenSharing).length === 0 ? (
                                <div className="live-no-screen">
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                                    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                  </svg>
                                  <span>No screen shared yet</span>
                                </div>
                              ) : (
                                voiceParticipants.filter(p => p.isScreenSharing).map(p => (
                                  <div key={p.userId} className="live-screen-tile">
                                    <div className="live-screen-header">
                                      <div className="live-screen-user-avatar">
                                        {p.userPhoto ? <img src={p.userPhoto} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/> : (p.userName||'?').charAt(0)}
                                      </div>
                                      <span className="live-screen-user-name">{p.userId === uid ? 'Your screen' : p.userName}</span>
                                      {p.userId !== uid && p.screenStream && (
                                        <button
                                          className={`live-remote-ctrl-btn${isActivelyControllingPeer(p.userId) ? ' live-remote-ctrl-btn--active' : ''}`}
                                          onClick={() => isActivelyControllingPeer(p.userId) ? releaseRemoteControl(p.userId) : requestRemoteControl(p.userId, p.userName)}
                                          title={isActivelyControllingPeer(p.userId) ? 'Kontrolü Bırak' : 'Ekran Kontrolü İste'}
                                          disabled={remoteControlActive?.pending && String(remoteControlActive.controllerId) === String(uid)}
                                        >
                                          <img src={channelLiveactionIcon} alt="Remote control" width="14" height="14" style={{filter:'brightness(0.8)',opacity:0.85}}/>
                                          <span>{isActivelyControllingPeer(p.userId) ? 'Kontrol Ediliyor (Bırak)' : (remoteControlActive?.pending && String(remoteControlActive.sharingUserId) === String(p.userId) ? 'Bekleniyor…' : 'Kontrol İste')}</span>
                                        </button>
                                      )}
                                      {String(p.userId) === String(uid) && remoteControlActive?.sharingUserId === uid && !remoteControlActive?.pending && (
                                        <button className="live-controlled-badge" onClick={() => releaseRemoteControl(remoteControlActive.controllerId)} title="Kontrolü Sonlandır" style={{ cursor: 'pointer' }}>
                                          🔴 {remoteControlActive.controllerName} kontrol ediyor (Sonlandır)
                                        </button>
                                      )}
                                    </div>
                                    <div className="live-screen-preview">
                                      {p.screenStream ? (
                                          <video
                                            key={`screen-${p.userId}`}
                                            data-screen-user={p.userId}
                                            className="live-screen-video"
                                            autoPlay playsInline muted
                                            ref={el => { if (el && p.screenStream && el.srcObject !== p.screenStream) el.srcObject = p.screenStream }}
                                            {...getScreenControlHandlers(p.userId)}
                                          />
                                      ) : (
                                        <div className="live-screen-mock">
                                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.25">
                                            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                            <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          {!isLive && (() => {
                            const isScreenSharingActive = voiceParticipants.some(p => p.isScreenSharing)
                            const isCardView = voiceParticipants.length > 8
                            return (
                              <>
                                {expandedScreenUser && expandedScreenUser.screenStream && (
                                  <div
                                    className={`voice-screen-area${voiceScreenFullscreen ? ' voice-screen-fullscreen' : ''}${fullscreenUiVisible ? ' voice-fullscreen-ui-visible' : ' voice-fullscreen-ui-idle'}`}
                                    onMouseMove={voiceScreenFullscreen ? showFullscreenUi : undefined}
                                  >
                                    <div className="voice-screen-tile">
                                        <div className="voice-screen-bar">
                                          <span className="voice-screen-bar-name">{String(expandedScreenUser.userId) === String(uid) ? 'Your screen' : `${expandedScreenUser.userName || 'Member'}'s screen`}</span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {String(expandedScreenUser.userId) !== String(uid) && expandedScreenUser.screenStream && (
                                              <button
                                                type="button"
                                                className={`live-remote-ctrl-btn${isActivelyControllingPeer(expandedScreenUser.userId) ? ' live-remote-ctrl-btn--active' : ''}`}
                                                onClick={() => isActivelyControllingPeer(expandedScreenUser.userId) ? releaseRemoteControl(expandedScreenUser.userId) : requestRemoteControl(expandedScreenUser.userId, expandedScreenUser.userName)}
                                                title={isActivelyControllingPeer(expandedScreenUser.userId) ? 'Kontrolü Bırak' : 'Ekran Kontrolü İste'}
                                              >
                                                <img src={channelLiveactionIcon} alt="" width="14" height="14" style={{ filter: 'brightness(0.8)', opacity: 0.85 }} />
                                                <span>{isActivelyControllingPeer(expandedScreenUser.userId) ? 'Kontrol Ediliyor (Bırak)' : 'Kontrol İste'}</span>
                                              </button>
                                            )}
                                            <button type="button" className="voice-screen-bar-btn" onClick={toggleVoiceScreenFullscreen} title={voiceScreenFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            </button>
                                            <button type="button" className="voice-screen-bar-btn" onClick={() => { setExpandedScreenUser(null); setVoiceScreenFullscreen(false); setNativeFullscreenMode(false) }} title="Close">×</button>
                                          </div>
                                        </div>
                                      <video
                                        key={`screen-expand-${expandedScreenUser.userId}`}
                                        data-screen-user={expandedScreenUser.userId}
                                        className="voice-screen-video"
                                        autoPlay playsInline muted={String(expandedScreenUser.userId) === String(uid)}
                                        ref={el => { if (el && expandedScreenUser.screenStream && el.srcObject !== expandedScreenUser.screenStream) el.srcObject = expandedScreenUser.screenStream }}
                                        onClick={voiceScreenFullscreen ? showFullscreenUi : undefined}
                                        {...getScreenControlHandlers(expandedScreenUser.userId)}
                                      />
                                    </div>
                                  </div>
                                )}
                                {!isCardView && (
                                  <div className="voice-participants">
                                  {voiceParticipants.map(p => {
                                    const isBlockedParticipant = blocked.some(b => b.id === p.userId)
                                    return (
                                    <div
                                      key={p.userId}
                                      className={`voice-tile${(p.isMuted || isBlockedParticipant) ? ' voice-tile-muted' : ''}${p.userId === uid ? ' voice-tile-self' : ''}${speakingUsers.has(p.userId) && !p.isMuted && !isBlockedParticipant ? ' voice-tile-speaking' : ''}${isBlockedParticipant ? ' voice-tile-blocked' : ''}`}
                                      onClick={() => {
                                        if (p.isScreenSharing && p.screenStream) { setExpandedScreenUser(p); setVoiceScreenFullscreen(false); return }
                                        if (p.isVideoOn && p.stream) { setExpandedVideoUser(p); return }
                                        if (p.userId !== uid) setVoiceTileMenuUser({ userId: p.userId, userName: p.userName, userPhoto: p.userPhoto })
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault()
                                        if (p.userId !== uid) setVoiceTileMenuUser({ userId: p.userId, userName: p.userName, userPhoto: p.userPhoto, context: true })
                                      }}
                                    >
                                      <div className="voice-tile-media">
                                        {p.isScreenSharing && p.screenStream ? (
                                          <video
                                            className="voice-tile-video"
                                            autoPlay playsInline muted
                                            ref={el => { if (el && p.screenStream && el.srcObject !== p.screenStream) el.srcObject = p.screenStream }}
                                          />
                                        ) : p.isVideoOn && p.stream ? (
                                          <video
                                            className="voice-tile-video"
                                            autoPlay playsInline muted={p.userId === uid}
                                            style={p.userId === uid && v('mirrorCamera', true) ? { transform: 'scaleX(-1)' } : undefined}
                                            ref={el => { if (el && p.stream && el.srcObject !== p.stream) el.srcObject = p.stream }}
                                          />
                                        ) : null}
                                        <div className={`voice-tile-avatar${(p.isVideoOn || p.isScreenSharing) ? ' voice-tile-avatar--overlay' : ''}`}>
                                          {p.userPhoto
                                            ? <img src={p.userPhoto} alt="" />
                                            : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>
                                          }
                                        </div>
                                        {p.isMuted && (
                                          <div className="voice-tile-mute-badge">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <span className="voice-tile-name">{p.userId === uid ? 'You' : p.userName}</span>
                                    </div>
                                    )
                                  })}
                                  </div>
                                )}
                                {isCardView && (
                                  <div className="voice-participants voice-participants--card-mode">
                                    <div className="voice-card-stack" onClick={() => setShowVoiceParticipantsPopup(true)}>
                                      {voiceParticipants.slice(0, 5).map((p, i) => (
                                        <div key={p.userId} className="voice-card-avatar" style={{ left: i * 34 }}>
                                          {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                        </div>
                                      ))}
                                      {voiceParticipants.length > 5 && (
                                        <div className="voice-card-more" style={{ left: 5 * 34 }}>+{voiceParticipants.length - 5}</div>
                                      )}
                                    </div>
                                    {showVoiceParticipantsPopup && (
                                      <div className="voice-participants-popup-card">
                                        <div className="voice-popup-card-header">
                                          <span>{voiceParticipants.length} participants</span>
                                          <button className="voice-popup-card-close" onClick={() => setShowVoiceParticipantsPopup(false)}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                            </svg>
                                          </button>
                                        </div>
                                        <div className="voice-popup-card-grid">
                                          {voiceParticipants.map(p => {
                                            const isSpeaking = speakingUsers.has(p.userId) && !p.isMuted
                                            return (
                                              <div key={p.userId} className={`voice-popup-avatar${isSpeaking ? ' voice-popup-avatar--speaking' : ''}`}>
                                                <div className="voice-popup-avatar-img">
                                                  {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <span className="voice-popup-name">{p.userId === uid ? 'You' : p.userName}</span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {voiceTileMenuUser && (
                                  <div className="voice-tile-menu-overlay" onClick={() => setVoiceTileMenuUser(null)}>
                                    <div className="voice-tile-menu-card" onClick={e => e.stopPropagation()}>
                                      <div className="voice-tile-menu-avatar">
                                        {voiceTileMenuUser.userPhoto
                                          ? <img src={voiceTileMenuUser.userPhoto} alt="" />
                                          : <span>{(voiceTileMenuUser.userName || '?').charAt(0).toUpperCase()}</span>
                                        }
                                      </div>
                                      <span className="voice-tile-menu-name">{voiceTileMenuUser.userName}</span>
                                      {canManageVoiceClient(selectedReelm, uid) && voiceTileMenuUser.userId !== uid && (
                                        <>
                                          {selectedChannel?.type === 'stage' && (() => {
                                            const isSpeaker = (selectedChannel.speakerIds || []).map(String).includes(String(voiceTileMenuUser.userId))
                                            return (
                                              <button className="voice-tile-menu-action" onClick={() => { updateStageSpeaker(selectedChannel.id, voiceTileMenuUser.userId, !isSpeaker); setVoiceTileMenuUser(null) }}>
                                                {isSpeaker ? 'Move to listener' : 'Make speaker'}
                                              </button>
                                            )
                                          })()}
                                          <button className="voice-tile-menu-action" onClick={() => moderatorMuteVoiceParticipant(voiceTileMenuUser)}>
                                            Mute microphone
                                          </button>
                                          <button className="voice-tile-menu-action voice-tile-menu-action-danger" onClick={() => kickVoiceParticipant(voiceTileMenuUser)}>
                                            Kick from room
                                          </button>
                                        </>
                                      )}
                                      <button className="voice-tile-menu-close" onClick={() => setVoiceTileMenuUser(null)}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          </div>
                          <div className={`voice-controls ${isLive ? 'live-action-controls' : ''}`}>
                            {(isLive || voiceParticipants.some(p => p.isScreenSharing)) && (
                              <div className="voice-controls-left">
                                <div className="voice-bar-participants">
                                  {voiceParticipants.map(p => {
                                    const isSpeaking = speakingUsers.has(p.userId) && !p.isMuted
                                    return (
                                      <div key={p.userId} className={`voice-bar-avatar${isSpeaking ? ' voice-bar-avatar--speaking' : ''}`} title={p.userId === uid ? 'You' : p.userName}>
                                        {p.userPhoto ? <img src={p.userPhoto} alt="" /> : <span>{(p.userName || '?').charAt(0).toUpperCase()}</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="voice-controls-actions">
                              <button className={`voice-ctrl-btn${voiceMuted ? ' voice-ctrl-on' : ''}`} onClick={voiceToggleMute} title={voiceMuted ? 'Unmute' : 'Mute'}>
                                <span className="voice-ctrl-icon">
                                  {voiceMuted ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                </span>
                                <span className="voice-ctrl-label">{voiceMuted ? 'Unmute' : 'Mute'}</span>
                              </button>
                              <button className={`voice-ctrl-btn${voiceDeafened ? ' voice-ctrl-on' : ''}`} onClick={voiceToggleDeafen} title={voiceDeafened ? 'Undeafen' : 'Deafen'}>
                                <span className="voice-ctrl-icon">🎧</span>
                                <span className="voice-ctrl-label">{voiceDeafened ? 'Hear' : 'Deafen'}</span>
                              </button>
                              <button className={`voice-ctrl-btn${voiceMuted && voiceDeafened ? ' voice-ctrl-on' : ''}`} onClick={voiceToggleFullMute} title="Mute mic and audio">
                                <span className="voice-ctrl-icon">🔇</span>
                                <span className="voice-ctrl-label">Silent</span>
                              </button>
                              <button className={`voice-ctrl-btn${voiceVideoOn ? ' voice-ctrl-on' : ''}`} onClick={voiceToggleVideo} title="Camera">
                                <span className="voice-ctrl-icon">
                                  {voiceVideoOn ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                </span>
                                <span className="voice-ctrl-label">{voiceVideoOn ? 'Stop Video' : 'Video'}</span>
                              </button>
                              {(() => {
                                const canShare = !selectedChannel?.screenShareModOnly || (() => {
                                  const mem = selectedReelm?.members?.find(m => String(m.userId) === String(uid))
                                  return (mem?.roleIds || []).some(rid => isManagerRoleClient(selectedReelm?.roles?.find(r => r.id === rid)))
                                })()
                                return (
                                  <button
                                    className={`voice-ctrl-btn${voiceScreenSharing ? ' voice-ctrl-on' : ''}${!canShare ? ' voice-ctrl-disabled' : ''}`}
                                    onClick={voiceToggleScreen}
                                    disabled={!canShare}
                                    title={canShare ? 'Screen Share' : 'Only admins can screen share in this channel'}
                                  >
                                    <span className="voice-ctrl-icon">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        {voiceScreenSharing && <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.8"/>}
                                      </svg>
                                    </span>
                                    <span className="voice-ctrl-label">{voiceScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                                  </button>
                                )
                              })()}
                              {!isLive && (
                                <div className="voice-ctrl-spatial-wrap">
                                  <button
                                    className={`voice-ctrl-btn voice-ctrl-btn-round${showSpatialPanel ? ' voice-ctrl-on' : ''}`}
                                    onClick={() => setShowSpatialPanel(p => !p)}
                                    title="Spatial Audio"
                                  >
                                    <span className="voice-ctrl-icon">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke="currentColor" strokeWidth="2"/>
                                      </svg>
                                    </span>
                                  </button>
                                  {showSpatialPanel && (
                                    <div className="spatial-popup">
                                      <div className="spatial-popup-header">
                                        <span className="spatial-popup-title">Spatial Audio</span>
                                        <button className="spatial-popup-close" onClick={() => setShowSpatialPanel(false)}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                          </svg>
                                        </button>
                                      </div>
                                      <SpatialRoom
                                        voicePositions={voicePositions}
                                        voiceParticipants={voiceParticipants}
                                        myUid={uid}
                                        myUser={currentUser}
                                        reelmId={voiceChannel?.reelmId}
                                        channelId={voiceChannel?.channelId}
                                        onMyMove={handleSpatialMove}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              <button className="voice-ctrl-btn voice-ctrl-btn-round voice-ctrl-leave" onClick={leaveVoiceChannel} title="Leave">
                                <span className="voice-ctrl-icon">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                </span>
                              </button>
                            </div>
                          </div>
                          {expandedVideoUser && (
                            <div
                              className={`video-expand-overlay${videoExpandFullscreen ? ' video-expand-overlay--fullscreen' : ''}${fullscreenUiVisible ? ' video-expand-ui-visible' : ' video-expand-ui-idle'}`}
                              onMouseMove={videoExpandFullscreen ? showFullscreenUi : undefined}
                              onClick={() => { if (!videoExpandFullscreen) { setExpandedVideoUser(null); setBlurBg(false) } else showFullscreenUi() }}
                            >
                              <div className={`video-expand-popup${videoExpandFullscreen ? ' video-expand-popup--fullscreen' : ''}`} onClick={e => { e.stopPropagation(); if (videoExpandFullscreen) showFullscreenUi() }}>
                                {expandedVideoUser.userId === uid && blurBg ? (
                                  <>
                                    <video
                                      style={{ display: 'none' }}
                                      autoPlay playsInline muted
                                      ref={el => { blurHiddenVideoRef.current = el; if (el && expandedVideoUser.stream && el.srcObject !== expandedVideoUser.stream) el.srcObject = expandedVideoUser.stream }}
                                    />
                                    <canvas
                                      ref={blurCanvasRef}
                                      className="video-expand-video"
                                      width={640}
                                      height={360}
                                      style={v('mirrorCamera', true) ? { transform: 'scaleX(-1)' } : undefined}
                                    />
                                  </>
                                ) : (
                                  <video
                                    className="video-expand-video"
                                    autoPlay playsInline
                                    muted={expandedVideoUser.userId === uid}
                                    style={expandedVideoUser.userId === uid && v('mirrorCamera', true) ? { transform: 'scaleX(-1)' } : undefined}
                                    ref={el => { if (el && expandedVideoUser.stream && el.srcObject !== expandedVideoUser.stream) el.srcObject = expandedVideoUser.stream }}
                                  />
                                )}
                                <div className="video-expand-name">{expandedVideoUser.userId === uid ? 'You' : expandedVideoUser.userName}</div>
                                <button className="video-expand-close video-expand-fullscreen" title={videoExpandFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={(e) => {
                                  e.stopPropagation()
                                  toggleVideoExpandFullscreen()
                                }}>{videoExpandFullscreen ? '↙' : '⛶'}</button>
                                <button className="video-expand-close" onClick={() => { setExpandedVideoUser(null); setVideoExpandFullscreen(false); setNativeFullscreenMode(false); setBlurBg(false) }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                                {expandedVideoUser.userId === uid && (
                                  <button
                                    className={`video-blur-pill${blurBg ? ' video-blur-pill--on' : ''}`}
                                    onClick={() => setBlurBg(b => !b)}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    {getT(language)('use_blur')}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })()}
                  {(() => {
                    const showBar = selectedChat || (selectedChannel && (selectedChannel.type === 'text' || selectedChannel.type === 'announcement'))
                    if (!showBar) return null
                    const isAnnouncement = !selectedChat && selectedChannel?.type === 'announcement'
                    const myMember = selectedReelm?.members?.find(m => m.userId === uid)
                    const myRoles = (selectedReelm?.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
                    const selectedChatBlockedEntry = selectedChat?.type === 'dm' ? getBlockedEntry(selectedChat.friendId) : null
                    const selectedChatSystemLocked = isReelmsSystemChat(selectedChat)
                    const canPost = selectedChat ? (!selectedChatBlockedEntry && !selectedChatSystemLocked) : (!isAnnouncement || selectedReelm?.ownerId === uid || myRoles.some(isManagerRoleClient))
                    const msgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
                    const msgs = dedupeMessagesForRender(messages[msgKey] || [])
                    const channelTitle = selectedChat
                      ? selectedChat.name
                      : selectedChannel?.name
                    return (
                      <>
                        {isMobile && selectedChat && (
                          <button
                            className="mobile-chat-back-btn"
                            onClick={() => setMobileLeftPanelOpen(v => !v)}
                            title="Konuşmalar"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        {channelTitle && (
                          <div className="channel-header-float">
                            {selectedChat && (
                              <div
                                className="channel-header-avatar"
                                onClick={isMobile ? () => setMobileLeftPanelOpen(v => !v) : undefined}
                              >
                                {getChatAvatarSrc(selectedChat)
                                  ? <img src={getChatAvatarSrc(selectedChat)} alt={getChatDisplayName(selectedChat)} />
                                  : (getChatDisplayName(selectedChat) || '?').charAt(0).toUpperCase()
                                }
                              </div>
                            )}
                            <span className="channel-header-name">
                              {!selectedChat && (selectedChannel?.type === 'announcement' || selectedChannel?.type === 'text') && <span className="channel-header-prefix">#</span>}
                              {channelTitle}
                              {selectedChannel?.isFlyingRoom && <span className="channel-header-flying">✦ {flyingRoomTick >= 0 && formatTimeLeft(selectedChannel.expiresAt)}</span>}
                            </span>
                          </div>
                        )}
                        {pinnedMessages[msgKey] && (
                          <div
                            className="channel-pinned-banner"
                            onClick={() => {
                              const pId = pinnedMessages[msgKey]?.id
                              if (pId) {
                                setNewMsgId(pId)
                                setTimeout(() => setNewMsgId(null), 2000)
                              }
                            }}
                          >
                            <div className="channel-pinned-content">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="channel-pinned-icon">
                                <line x1="12" y1="17" x2="12" y2="22"/>
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                              </svg>
                              <div className="channel-pinned-text-wrap">
                                <span className="channel-pinned-author">{pinnedMessages[msgKey].sender?.name || 'Member'}:</span>
                                <span className="channel-pinned-snippet">{pinnedMessages[msgKey].text || (pinnedMessages[msgKey].mediaUrl ? '📎 Medya' : '')}</span>
                              </div>
                            </div>
                            {canPinInChannel && (
                              <button
                                className="channel-pinned-unpin-btn"
                                title={t('unpin_message') || 'Sabitlemeyi Kaldır'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUnpinMessage(msgKey)
                                }}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                              </button>
                            )}
                          </div>
                        )}
                        <div className="msg-list" ref={msgListRef}>
                          <div className="msg-list-spacer" />
                          {selectedChat && msgs.length === 0 && (
                            <div className="e2ee-dm-notice">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                                <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                              <span>{t('e2ee_dm_notice')}</span>
                            </div>
                          )}
                          {msgs.length > 0 && (
                            <VirtualMessageList
                              msgs={msgs}
                              isBubbleMode={!!selectedChat}
                              uid={uid}
                              isMod={isMod}
                              blocked={blocked}
                              selectedChatSystemLocked={selectedChatSystemLocked}
                              selectedReelm={selectedReelm}
                              selectedChat={selectedChat}
                              msgKey2={msgKey}
                              newMsgId={newMsgId}
                              t={t}
                              canPinInChannel={canPinInChannel}
                              pinnedMessage={pinnedMessages[msgKey]}
                              setReplyingTo={setReplyingTo}
                              setMsgCtxMenu={setMsgCtxMenu}
                              handleMsgTouchStart={handleMsgTouchStart}
                              handleMsgTouchMove={handleMsgTouchMove}
                              handleMsgTouchEnd={handleMsgTouchEnd}
                              toggleReaction={toggleReaction}
                              showMsgEmojiFor={showMsgEmojiFor}
                              setShowMsgEmojiFor={setShowMsgEmojiFor}
                              setLightboxImg={setLightboxImg}
                              openFriendProfile={openFriendProfile}
                              dmReadReceipts={dmReadReceipts}
                              msgReactions={msgReactions}
                              msgListRef={msgListRef}
                              onVotePoll={handleVotePoll}
                            />
                          )}
                        </div>
                        {(() => {
                          const tMsgKey = selectedChat ? selectedChat.id : composeReelmMsgKey(selectedReelm, selectedChannel)
                          const typers = tMsgKey ? (typingUsers[tMsgKey] || []) : []
                          if (!typers.length) return null
                          return (
                            <div className="typing-indicator-row">
                              <div className="typing-avatars-stack">
                                {typers.slice(0, 4).map((typer, idx) => (
                                  <div
                                    key={typer.uid || idx}
                                    className="typing-avatar-item"
                                    style={{ zIndex: typers.length - idx }}
                                    title={typer.name || ''}
                                  >
                                    {typer.photo ? (
                                      <CachedProfileImage
                                        src={typer.photo}
                                        alt=""
                                        className="typing-indicator-avatar"
                                        fallback={<div className="typing-indicator-avatar typing-indicator-avatar--text">{(typer.name || '?').charAt(0).toUpperCase()}</div>}
                                      />
                                    ) : (
                                      <div className="typing-indicator-avatar typing-indicator-avatar--text">
                                        {(typer.name || '?').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="typing-dots" aria-label="Typing indicator">
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                              </div>
                            </div>
                          )
                        })()}
                        {!canPost && (
                          <div className="msg-bar-locked">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            {selectedChatSystemLocked ? 'Reelms System is a read-only server notification inbox.' : (selectedChatBlockedEntry ? 'You blocked this user. Unblock to send messages.' : 'Only admins can post in this channel.')}
                          </div>
                        )}
                        {moderationWarning && (
                          <div className="moderation-warning">{moderationWarning}</div>
                        )}
                        {canPost && <div className="msg-bar-wrap">
                          {slashMenu && (
                            <div className="mention-dropdown slash-dropdown">
                              <div className="slash-dropdown-header">{t('slash_commands_header')}</div>
                              {slashOptions.length > 0 ? (
                                <>
                                  {(slashShowAll ? slashOptions : slashOptions.slice(0, 2)).map((opt, i) => (
                                    <div
                                      key={opt.cmd}
                                      className={`mention-option${i === slashSelIdx ? ' mention-option--sel' : ''}`}
                                      onMouseEnter={() => setSlashSelIdx(i)}
                                      onMouseDown={e => { e.preventDefault(); insertSlashCommand(opt) }}
                                    >
                                      <code className="slash-option-cmd">
                                        {opt.cmd}{opt.args && <span className="slash-cmd-args"> {opt.args}</span>}
                                      </code>
                                      <span className="mention-option-sub">{opt.desc}</span>
                                    </div>
                                  ))}
                                  {!slashShowAll && slashOptions.length > 2 && (
                                    <div
                                      className="slash-see-more"
                                      onMouseDown={e => { e.preventDefault(); setSlashShowAll(true) }}
                                    >
                                      {t('slash_see_more').replace('{n}', slashOptions.length - 2)}
                                    </div>
                                  )}
                                </>
                              ) : (() => {
                                // Default-expanded bot: "Reelms AI" if present, else the one
                                // with the longest command list.
                                const fallbackBot = BOT_COMMANDS.reduce(
                                  (a, b) => (b.commands.length > a.commands.length ? b : a),
                                  BOT_COMMANDS[0]
                                )
                                const defaultBot = BOT_COMMANDS.find(b => b.bot === 'Reelms AI') || fallbackBot
                                const activeBot = BOT_COMMANDS.find(b => b.bot === slashExpandedBot) || defaultBot
                                return (
                                  <>
                                    {BOT_COMMANDS.length > 1 && (
                                      <div className="slash-bots-row">
                                        {BOT_COMMANDS.map(b => (
                                          <button
                                            key={b.bot}
                                            className={`slash-bot-chip${b.bot === activeBot.bot ? ' slash-bot-chip--active' : ''}`}
                                            onMouseDown={e => { e.preventDefault(); setSlashExpandedBot(b.bot); setSlashSelIdx(0) }}
                                          >{b.bot}</button>
                                        ))}
                                      </div>
                                    )}
                                    {activeBot.commands.map((opt, i) => (
                                      <div
                                        key={opt.cmd}
                                        className={`mention-option${i === slashSelIdx ? ' mention-option--sel' : ''}`}
                                        onMouseEnter={() => setSlashSelIdx(i)}
                                        onMouseDown={e => { e.preventDefault(); insertSlashCommand(opt) }}
                                      >
                                        <code className="slash-option-cmd">
                                          {opt.cmd}{opt.args && <span className="slash-cmd-args"> {opt.args}</span>}
                                        </code>
                                        <span className="mention-option-sub">{opt.desc}</span>
                                      </div>
                                    ))}
                                  </>
                                )
                              })()}
                            </div>
                          )}
                          {mentionQuery && mentionOptions.length > 0 && (
                            <div className="mention-dropdown">
                              {mentionOptions.map((opt, i) => (
                                <div
                                  key={`${opt.type}-${opt.displayName}`}
                                  className={`mention-option${i === mentionSelIdx ? ' mention-option--sel' : ''}`}
                                  onMouseEnter={() => setMentionSelIdx(i)}
                                  onMouseDown={e => { e.preventDefault(); insertMention(opt) }}
                                >
                                  {opt.type === 'user' && (
                                    <div className="mention-option-avatar">
                                      {opt.photo
                                        ? <img src={opt.photo} alt="" />
                                        : (opt.displayName || '?').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  {opt.type === 'role' && (
                                    <div className="mention-option-role-dot" style={{ background: opt.color }} />
                                  )}
                                  {opt.type === 'everyone' && (
                                    <div className="mention-option-everyone">@</div>
                                  )}
                                  <div className="mention-option-text">
                                    <span className="mention-option-name"
                                      style={opt.type === 'role' ? { color: opt.color } : undefined}>
                                      @{opt.displayName}
                                    </span>
                                    {opt.type !== 'user' && <span className="mention-option-sub">{opt.sub}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {replyingTo && (
                            <div className="msg-reply-banner">
                              <div className="msg-reply-banner-content">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                                <span className="msg-reply-banner-name">{t('replying_to')} {replyingTo.senderName}</span>
                                <span className="msg-reply-banner-text">{replyingTo.text ? replyingTo.text.slice(0, 80) : '📎'}</span>
                              </div>
                              <button className="msg-reply-banner-cancel" onClick={() => setReplyingTo(null)}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                              </button>
                            </div>
                          )}
                          {editingMessage && (
                            <div className="msg-reply-banner msg-edit-banner">
                              <div className="msg-reply-banner-content">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                <span className="msg-reply-banner-name">{t('editing_message')}</span>
                                <span className="msg-reply-banner-text">{editingMessage.text ? editingMessage.text.slice(0, 80) : ''}</span>
                              </div>
                              <button className="msg-reply-banner-cancel" onClick={() => {
                                setEditingMessage(null)
                                setMessageInput('')
                                if (editorRef.current) editorRef.current.innerText = ''
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                              </button>
                            </div>
                          )}
                          <div className={`msg-outer-row${spotifyNowPlaying ? ' msg-outer-row--spotify' : ''}`}>
                            <div className="msg-bar">
                          <div className={`msg-input-wrap${pendingAttachment ? ' msg-input-wrap--has-attach' : ''}`}>
                            <div
                              ref={editorRef}
                              className="msg-input msg-input--rich"
                              contentEditable={canPost}
                              suppressContentEditableWarning
                              role="textbox"
                              aria-multiline="true"
                              data-placeholder={selectedChatSystemLocked ? 'Reelms System is read-only.' : (selectedChatBlockedEntry ? 'You blocked this user. Unblock to send messages.' : (isAnnouncement ? 'Post an announcement' : 'Message'))}
                              onInput={handleEditorInput}
                              onContextMenu={handleEditorContextMenu}
                              onPaste={e => {
                                e.preventDefault()
                                const txt = e.clipboardData?.getData('text/plain') || ''
                                document.execCommand('insertText', false, txt)
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Escape' && editingMessage) {
                                  e.preventDefault()
                                  setEditingMessage(null)
                                  setMessageInput('')
                                  if (editorRef.current) editorRef.current.innerText = ''
                                  return
                                }
                                if (slashMenu && slashOptions.length > 0) {
                                  if (e.key === 'ArrowDown') { e.preventDefault(); setSlashSelIdx(i => Math.min(i + 1, slashOptions.length - 1)); return }
                                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashSelIdx(i => Math.max(i - 1, 0)); return }
                                  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertSlashCommand(slashOptions[slashSelIdx]); return }
                                  else if (e.key === 'Escape') { setSlashMenu(null); return }
                                }
                                if (mentionQuery && mentionOptions.length > 0) {
                                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionSelIdx(i => Math.min(i + 1, mentionOptions.length - 1)) }
                                  else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionSelIdx(i => Math.max(i - 1, 0)) }
                                  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mentionSelIdx]); return }
                                  else if (e.key === 'Escape') { setMentionQuery(null); return }
                                }
                                // Rich Keyboard Shortcuts (Ctrl/Cmd + B, I, U, Shift+S, Shift+C, K, Tab)
                                if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                                  const k = e.key.toLowerCase()
                                  if (k === 'b') { e.preventDefault(); applyEditorFormat('bold'); return }
                                  if (k === 'i') { e.preventDefault(); applyEditorFormat('italic'); return }
                                  if (k === 'u') { e.preventDefault(); applyEditorFormat('underline'); return }
                                  if (k === 's' && e.shiftKey) { e.preventDefault(); applyEditorFormat('strike'); return }
                                  if (k === 'c' && e.shiftKey) { e.preventDefault(); applyEditorFormat('code'); return }
                                  if (k === 'k') { e.preventDefault(); insertLink('', ''); return }
                                }
                                if (e.key === 'Tab') {
                                  const sel = window.getSelection()
                                  if (sel && sel.rangeCount) {
                                    e.preventDefault()
                                    document.execCommand('insertText', false, '  ')
                                    return
                                  }
                                }
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                              }}
                            />
                            <RichMessageComposerToolbar editorRef={editorRef} onApplyFormat={applyEditorFormat} onApplyColor={applyEditorColor} onInsertCodeBlock={insertCodeBlock} onInsertLink={insertLink} isMobile={isMobile} />
                            {fmtMenu && ReactDOM.createPortal(
                              <div className="fmt-menu" style={{ left: fmtMenu.x, top: fmtMenu.y }} onMouseDown={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}>
                                {!fmtColorOpen ? (
                                  <div className="fmt-menu-row">
                                    <button className="fmt-btn" title="Bold" onClick={() => applyEditorFormat('bold')}><b>B</b></button>
                                    <button className="fmt-btn" title="Italic" onClick={() => applyEditorFormat('italic')}><i>I</i></button>
                                    <button className="fmt-btn" title="Underline" onClick={() => applyEditorFormat('underline')}><u>U</u></button>
                                    <button className="fmt-btn" title="Strikethrough" onClick={() => applyEditorFormat('strike')}><s>S</s></button>
                                    <button className="fmt-btn fmt-btn--mono" title="Monospace" onClick={() => applyEditorFormat('mono')}>{'</>'}</button>
                                    <button className="fmt-btn fmt-btn--color" title="Color" onClick={() => setFmtColorOpen(true)}>
                                      <span className="fmt-color-dot" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="fmt-color-grid">
                                    {FMT_COLORS.map(c => (
                                      <button key={c} className="fmt-color-swatch" style={{ background: c }} title={c} onClick={() => applyEditorColor(c)} />
                                    ))}
                                  </div>
                                )}
                              </div>,
                              document.body
                            )}
                            {pendingAttachment && (
                              <div className="msg-attach-preview">
                                <button
                                  type="button"
                                  className={`msg-attach-spoiler-btn${pendingAttachment?.isSpoiler ? " is-spoiler" : ""}`}
                                  onClick={() => setPendingAttachment(prev => ({ ...prev, isSpoiler: !prev?.isSpoiler }))}
                                  title="Toggle spoiler for attachment"
                                >
                                  {pendingAttachment?.isSpoiler ? "⚠️ Spoiler On" : "Mark Spoiler"}
                                </button>
                                {pendingAttachment.mediaType === 'image' ? (
                                  <img className="msg-attach-thumb" src={pendingAttachment.dataUrl} alt="" />
                                ) : pendingAttachment.mediaType === 'audio' ? (
                                  <div className="msg-attach-thumb msg-attach-thumb--audio">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                  </div>
                                ) : (
                                  <div className="msg-attach-thumb msg-attach-thumb--video">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                  </div>
                                )}
                                <button className="msg-attach-remove" onClick={() => setPendingAttachment(null)}>
                                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none">
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                            {/* Unified actions toolbar: Gönder -> Emoji -> GIF -> Fotoğraf/Belge -> Ses -> Birlikte Yap -> Daha Fazlası */}
                            <div className="msg-actions-toolbar">
                              {/* 1. Gönder (Send) */}
                              <button className="msg-bar-btn msg-bar-btn--send" onClick={sendMessage} disabled={!canPost} title="Gönder">
                                <SendIcon size={20} />
                              </button>

                              <div className="msg-bar-divider" />

                              {/* 1.1 Reelms Intelligence */}
                              <button
                                type="button"
                                className={`msg-bar-btn msg-bar-btn--intelligence${showAICopilot ? ' active' : ''}`}
                                onClick={() => setShowAICopilot(v => !v)}
                                title="Reelms Intelligence"
                              >
                                <IntelligenceIcon size={20} />
                              </button>

                              {/* 2. Emoji */}
                              {!isMobile && (
                                <div className="msg-action-wrap">
                                  <button className="msg-bar-btn msg-bar-btn--emoji" title="Emoji" onClick={() => { setShowInputEmoji(v => !v); setShowGifPicker(false); setShowPlusMenu(false) }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="msg-bar-icon"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/></svg>
                                  </button>
                                  {showInputEmoji && (
                                    <div className="input-emoji-picker-wrap">
                                      <EmojiPickerReact emojiStyle={EmojiStyle.APPLE} height={320} width={280} searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={d => {
                                        const el = editorRef.current
                                        if (el) {
                                          el.focus()
                                          const sel = window.getSelection()
                                          if (!sel.rangeCount || !el.contains(sel.anchorNode)) placeCaretAtEnd(el)
                                          document.execCommand('insertText', false, d.emoji)
                                          messageInputRef.current = el.innerText.replace(/\n$/, '')
                                          setMessageInput(messageInputRef.current)
                                        }
                                        setShowInputEmoji(false)
                                      }} />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 3. GIF */}
                              {!isMobile && (
                                <div className="msg-action-wrap">
                                  <button className="msg-bar-btn msg-bar-btn--gif" title="GIF / Sticker" onClick={() => { setShowGifPicker(v => !v); setShowInputEmoji(false); setShowPlusMenu(false) }}>
                                    <span className="msg-gif-label">GIF</span>
                                  </button>
                                  {showGifPicker && (
                                    <div className="gif-picker">
                                      <div className="gif-picker-tabs">
                                        <button className={`gif-tab${gifTab === 'gif' ? ' gif-tab--active' : ''}`} onClick={() => { setGifTab('gif'); setGifSearch('') }}>GIF</button>
                                        <button className={`gif-tab${gifTab === 'sticker' ? ' gif-tab--active' : ''}`} onClick={() => { setGifTab('sticker'); setGifSearch('') }}>Sticker</button>
                                      </div>
                                      <input
                                        className="gif-search"
                                        placeholder={gifTab === 'gif' ? 'Search GIFs…' : 'Search Stickers…'}
                                        value={gifSearch}
                                        onChange={e => setGifSearch(e.target.value)}
                                        autoFocus
                                      />
                                      <div className="gif-grid">
                                        {gifLoading && <div className="gif-loading">…</div>}
                                        {!gifLoading && gifResults.length === 0 && GIPHY_KEY && <div className="gif-empty">No results</div>}
                                        {!GIPHY_KEY && <div className="gif-empty">Set VITE_GIPHY_API_KEY to enable GIFs</div>}
                                        {gifResults.map(item => (
                                          <img
                                            key={item.id}
                                            src={item.preview}
                                            alt=""
                                            className="gif-item"
                                            onClick={() => sendGif(item)}
                                            loading="lazy"
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. Fotoğraf / Belge */}
                              <button className="msg-bar-btn msg-bar-btn--media" title="Fotoğraf veya Belge Yükle" disabled={!canPost} onClick={() => mediaInputRef.current?.click()}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="msg-bar-icon">
                                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                                  <circle cx="8.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M3 17l5-5 3.5 4 2.5-2.5 5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <input ref={mediaInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" style={{ display: 'none' }} onChange={e => {
                                const file = e.target.files[0]
                                if (file) {
                                  const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/')
                                  if (isMedia) {
                                    const reader = new FileReader()
                                    reader.onload = ev => setPendingAttachment({ dataUrl: ev.target.result, file, mediaType: file.type.startsWith('video/') ? 'video' : 'image' })
                                    reader.readAsDataURL(file)
                                  } else {
                                    sendAttachment(file, 'doc')
                                  }
                                }
                                e.target.value = ''
                              }} />

                              {/* 5. Ses Kaydet */}
                              <button className={`msg-bar-btn msg-bar-btn--voice${isRecording ? ' msg-bar-btn--recording' : ''}`} title={isRecording ? `Durdur ve Gönder (${recordingSeconds}s)` : 'Sesli Mesaj'} disabled={!canPost} onClick={toggleRecording}>
                                {isRecording ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="msg-bar-icon"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="msg-bar-icon">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                  </svg>
                                )}
                              </button>

                              {/* 6. Birlikte Yap */}
                              {!isMobile && (
                                <button className="msg-bar-btn msg-bar-btn--together" title="Birlikte Yap" onClick={() => addNotification('Birlikte Yap özellikleri açılıyor...')}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="msg-bar-icon">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              )}

                              {/* 7. Daha Fazla (More - newIcon ile ve katmanı kaldırılmış) */}
                              {!isMobile && (
                                <div className="msg-action-wrap msg-plus-wrap">
                                  <button className="msg-bar-btn msg-bar-btn--more" onClick={() => { setShowPlusMenu(v => !v); setShowInputEmoji(false); setShowGifPicker(false) }} title="Daha Fazla">
                                    <img src={newIcon} alt="Daha Fazla" className="msg-bar-icon msg-bar-icon--new" />
                                  </button>
                                  {showPlusMenu && (
                                    <div className="msg-plus-menu">
                                      <button className="msg-plus-menu-item" onClick={() => { setShowPollCreator(true); setShowPlusMenu(false) }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                                          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                          <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                          <line x1="9" y1="9" x2="9" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                        </svg>
                                        <span>Anket Oluştur</span>
                                      </button>
                                      <button className="msg-plus-menu-item" onClick={() => { insertCodeBlock(); setShowPlusMenu(false) }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                          <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <span>Kod Bloğu Ekle</span>
                                      </button>
                                      <button className="msg-plus-menu-item" onClick={() => {
                                        if (editorRef.current) {
                                          editorRef.current.focus()
                                          document.execCommand('insertText', false, '📌 Hatırlatıcı: ')
                                        }
                                        setShowPlusMenu(false)
                                      }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                                          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                        </svg>
                                        <span>Hatırlatıcı / Not</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          </div>
                          {spotifyNowPlaying && !isMobile && (
                            <div className="msg-spotify-bar">
                              {spotifyNowPlaying.albumArt && (
                                <img src={spotifyNowPlaying.albumArt} alt="" className="msb-art" />
                              )}
                              <div className="msb-info">
                                <span className="msb-name">{spotifyNowPlaying.name}</span>
                                <span className="msb-artist">{spotifyNowPlaying.artist}</span>
                              </div>
                              <div className="msb-controls">
                                <button className="msb-btn" onClick={handleSpotifyPrev} title="Previous Track">
                                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15L14 1.108A.7.7 0 0 1 15 1.7v12.6a.7.7 0 0 1-1.05.607L4 9.149V13.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"/></svg>
                                </button>
                                <button className="msb-btn msb-btn-play" onClick={handleSpotifyTogglePlay} title={spotifyInlinePaused ? 'Play' : 'Pause'}>
                                  {spotifyInlinePaused
                                    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/></svg>
                                    : <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/></svg>
                                  }
                                </button>
                                <button className="msb-btn" onClick={handleSpotifyNext} title="Next Track">
                                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.108A.7.7 0 0 0 1 1.7v12.6a.7.7 0 0 0 1.05.607L12 9.149V13.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"/></svg>
                                </button>
                              </div>
                            </div>
                          )}
                          </div>
                          {showPollCreator && (
                            <div className="poll-creator-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPollCreator(false) }}>
                              <div className="poll-creator">
                                <div className="poll-creator-header">
                                  <div className="poll-creator-title-row">
                                    <span className="poll-creator-badge">📊</span>
                                    <span className="poll-creator-title">Anket Oluştur</span>
                                  </div>
                                  <button className="poll-creator-close" onClick={() => setShowPollCreator(false)} title="Kapat">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                                  </button>
                                </div>
                                <div className="poll-creator-body">
                                  <label className="poll-creator-label">Soru</label>
                                  <input
                                    className="poll-creator-question"
                                    placeholder="Bir soru sorun..."
                                    value={pollQuestion}
                                    onChange={e => setPollQuestion(e.target.value)}
                                    maxLength={200}
                                    autoFocus
                                  />
                                  <label className="poll-creator-label">Seçenekler</label>
                                  <div className="poll-creator-options">
                                    {pollOptions.map((opt, i) => (
                                      <div key={i} className="poll-creator-option-row">
                                        <input
                                          className="poll-creator-option-input"
                                          placeholder={`Seçenek ${i + 1}`}
                                          value={opt}
                                          onChange={e => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next) }}
                                          maxLength={100}
                                        />
                                        {pollOptions.length > 2 && (
                                          <button className="poll-creator-remove-opt" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} title="Seçeneği kaldır">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {pollOptions.length < 6 && (
                                      <button className="poll-creator-add-opt" onClick={() => setPollOptions([...pollOptions, ''])}>
                                        + Seçenek ekle
                                      </button>
                                    )}
                                  </div>

                                  <label className="poll-creator-label">Anket Süresi</label>
                                  <div className="poll-duration-pills">
                                    <button
                                      type="button"
                                      className={`poll-duration-pill${pollDuration === 86400000 ? ' poll-duration-pill--active' : ''}`}
                                      onClick={() => setPollDuration(prev => prev === 86400000 ? null : 86400000)}
                                    >
                                      ⏱️ 1 Gün
                                    </button>
                                    <button
                                      type="button"
                                      className={`poll-duration-pill${pollDuration === 604800000 ? ' poll-duration-pill--active' : ''}`}
                                      onClick={() => setPollDuration(prev => prev === 604800000 ? null : 604800000)}
                                    >
                                      📅 1 Hafta
                                    </button>
                                    <span className="poll-duration-hint">
                                      {pollDuration ? (pollDuration === 86400000 ? '1 gün sonra oylama kapanır' : '1 hafta sonra oylama kapanır') : 'Seçilmedi: Süresiz aktif kalır'}
                                    </span>
                                  </div>
                                </div>
                                <div className="poll-creator-footer">
                                  <button className="poll-creator-cancel" onClick={() => setShowPollCreator(false)}>İptal</button>
                                  <button className="poll-creator-send" onClick={sendPoll} disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}>
                                    Anketi Gönder
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>}
                      </>
                    )
                  })()}
                  </>
                )}
                </div>
                <div
                  className="panel-divider panel-divider-draggable"
                  onMouseDown={(e) => { e.preventDefault(); dragState.current = { side: 'right', startX: e.clientX, startWidth: rightWidth } }}
                />
                <div className={`panel panel-right${isMobile && mobileRightPanelOpen ? ' panel-right--open' : ''}`} style={isMobile ? undefined : { flex: `0 0 ${rightWidth}px` }}>
                  {selectedChat ? (() => {
                    const isDM = selectedChat.type === 'dm'
                    const groupMembers = isDM ? [] : (selectedChat.members || [])
                    const sendPoke = (targetId, targetName) => {
                      socketVcSignal(targetId, { type: 'poke', senderId: uid, senderName: currentUser.name, targetUserId: targetId })
                      addNotification(`${targetName} was poked.`)
                    }
                    return (
                      <div className="rp-chat-panel">
                        {!isDM && groupMembers.length > 0 && (
                          <div className="rp-members-panel" style={{ paddingTop: 0 }}>
                            <span className="rp-members-header">Members</span>
                            <div className="rp-members-group">
                              {groupMembers.filter((m, i, a) => a.findIndex(x => x.id === m.id) === i).map(m => (
                                <div key={m.id} className="rp-member-card" onClick={e => openFriendProfile({ id: m.id, name: m.name, photo: m.photo }, e)}>
                                  <div className="rp-member-avatar-wrap">
                                    <div className="rp-member-avatar">
                                      {m.photo
                                        ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        : (m.name || '?').charAt(0).toUpperCase()
                                      }
                                    </div>
                                  </div>
                                  <div className="rp-member-info">
                                    <span className="rp-member-name">{m.id === uid ? currentUser.name : m.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="rp-chat-actions">
                          {isDM && (
                            <button
                              className="rp-chat-action-btn"
                                title="Request Remote Control"
                              onClick={() => requestRemoteControl(selectedChat.friendId, selectedChat.name)}
                            >
                              <img src={channelLiveactionIcon} alt="" width="16" height="16" style={{ filter: 'brightness(0.75) sepia(0.3)', opacity: 0.85 }} />
                                <span>Request Remote Control</span>
                            </button>
                          )}
                            <button className="rp-chat-action-btn" title="Do Together">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                              <span>Do Together</span>
                          </button>
                          <button
                            className="rp-chat-action-btn"
                              title="Nudge"
                            onClick={() => {
                              if (isDM) {
                                  sendNudge(selectedChat.friendId, selectedChat.name)
                              } else {
                                  groupMembers.filter(m => m.id !== uid).forEach(m => sendNudge(m.id, m.name))
                              }
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                              <span>Nudge</span>
                          </button>
                        </div>
                      </div>
                    )
                  })() : selectedReelm && renderReelmMembersPanel('right-2')}
                </div>
              </>
            ) : showMsgRequests ? (
              <div className="panel panel-middle discover-panel">
                <div className="discover-header">
                  <h2 className="discover-title">Message Requests</h2>
                </div>
                <div className="discover-results">
                  {msgRequests.length === 0
                    ? <p className="discover-empty">No message requests.</p>
                    : msgRequests.map(req => (
                      <div key={req.id} className="discover-result-row">
                        <div className="discover-result-avatar">
                          {req.fromPhoto
                            ? <img src={req.fromPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (req.fromName || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="discover-result-info">
                          <span className="discover-result-name">{req.fromName}{req.fromUsername ? ` (@${req.fromUsername})` : ''}</span>
                          {req.preview && <span className="discover-result-type" style={{maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{req.preview}</span>}
                        </div>
                        <div style={{display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
                          <button className="friend-add-btn" onClick={() => {
                            const updated = msgRequests.filter(r => r.id !== req.id)
                            setMsgRequests(updated)
                            saveMsgRequests(updated)
                            const convId = [uid, req.fromId].sort().join('_dm_')
                            const newChat = { id: convId, convId, name: req.fromName, friendId: req.fromId, type: 'dm', photo: req.fromPhoto || null, updatedAt: Date.now() }
                            setChats(prev => prev.some(c => c.id === convId) ? prev : [newChat, ...prev])
                            setSelectedChat(newChat); setShowMsgRequests(false)
                          }}>Accept</button>
                          <button className="friend-reject-btn" onClick={() => {
                            const updated = msgRequests.filter(r => r.id !== req.id)
                            setMsgRequests(updated)
                            saveMsgRequests(updated)
                          }}>Decline</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ) : showDiscover ? (
              <div className="panel panel-middle discover-panel">
                {(() => {
                  const getLocalizedReelm = (r) => {
                    if (!r || !r.id) return r
                    const idKey = String(r.id).replace(/-/g, '_')
                    const nameKey = `seed_reelm_${idKey}_name`
                    const descKey = `seed_reelm_${idKey}_desc`
                    const localizedName = t(nameKey)
                    const localizedDesc = t(descKey)
                    return {
                      ...r,
                      name: (localizedName && localizedName !== nameKey) ? localizedName : r.name,
                      description: (localizedDesc && localizedDesc !== descKey) ? localizedDesc : r.description
                    }
                  }

                  const q = discoverQuery.trim().toLowerCase()
                  const joinedReelmIds = new Set((reelms || []).map(r => String(r.id)))

                  // Merge backend discoverReelmsList with SEED_REELMS
                  const combinedDiscoverMap = new Map()
                  for (const sr of SEED_REELMS) {
                    combinedDiscoverMap.set(String(sr.id), { ...sr })
                  }
                  for (const br of (discoverReelmsList || [])) {
                    if (br && br.id) {
                      combinedDiscoverMap.set(String(br.id), { ...combinedDiscoverMap.get(String(br.id)), ...br })
                    }
                  }

                  const allDiscoverableReelms = Array.from(combinedDiscoverMap.values())
                    .filter(r => !joinedReelmIds.has(String(r.id)))
                    .map(r => getLocalizedReelm(r))

                  const officialReelms = allDiscoverableReelms.filter(r => String(r.id || '').startsWith('reelms-'))
                  const communityReelms = allDiscoverableReelms.filter(r => !String(r.id || '').startsWith('reelms-'))

                  const filteredCommunityReelms = discoverCategory === 'all'
                    ? (q ? communityReelms : communityReelms.filter(r => r.showInDiscover === true))
                    : communityReelms.filter(r => (r.category || '').toLowerCase() === discoverCategory || (r.tags || []).some(t => t.toLowerCase() === discoverCategory))

                  const results = q ? [
                    ...reelms.filter(r => r.name?.toLowerCase().includes(q)).map(r => ({ ...r, _type: 'reelm', joined: true })),
                    ...allDiscoverableReelms.filter(r => {
                      const matchName = r.name?.toLowerCase().includes(q)
                      const matchDesc = r.description?.toLowerCase().includes(q)
                      const matchCategory = r.category?.toLowerCase().includes(q)
                      const matchTags = (r.tags || []).some(t => t.toLowerCase() === discoverCategory || t.toLowerCase().includes(q))
                      const matchCode = r.code?.toLowerCase().includes(q)
                      return matchName || matchDesc || matchCategory || matchTags || matchCode
                    }).map(r => ({ ...r, _type: 'reelm', joined: false })),
                    ...chats.filter(c => c.name?.toLowerCase().includes(q)).map(c => ({ ...c, _type: 'chat' })),
                    ...discoverUsers.map(u => ({ ...u, _type: 'user' })),
                  ] : filteredCommunityReelms.map(r => ({ ...r, _type: 'reelm', joined: false }))

                  const reelmResults = results.filter(item => item._type === 'reelm')
                  const otherResults = results.filter(item => item._type !== 'reelm')

                  return (
                    <>
                      <button className="discover-back-btn" onClick={() => { setShowDiscover(false); setShowFeed(true) }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <div className="discover-header">
                        <h2 className="discover-title">Discover</h2>
                        <div
                          className="discover-search-wrap"
                          onClick={() => setIsDiscoverSearchActive(true)}
                        >
                          <svg className="discover-search-icon" viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <circle cx="8.5" cy="8.5" r="5.5" stroke="rgba(185,152,135,0.6)" strokeWidth="1.6"/>
                            <path d="M13 13l3.5 3.5" stroke="rgba(185,152,135,0.6)" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                          <input
                            className="discover-search-input"
                            type="text"
                            placeholder="Search reelms, people..."
                            value={discoverQuery}
                            onFocus={() => setIsDiscoverSearchActive(true)}
                            onBlur={() => {
                              setTimeout(() => {
                                if (!discoverQuery.trim() && discoverCategory === 'all') {
                                  setIsDiscoverSearchActive(false)
                                }
                              }, 200)
                            }}
                            onChange={e => {
                              setDiscoverQuery(e.target.value)
                              if (!isDiscoverSearchActive) setIsDiscoverSearchActive(true)
                            }}
                          />
                          {discoverQuery && (
                            <button
                              className="discover-clear-btn"
                              onClick={() => {
                                setDiscoverQuery('')
                                setDiscoverCategory('all')
                              }}
                            >
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                                <path d="M3 3l10 10M13 3L3 13" stroke="rgba(185,152,135,0.7)" strokeWidth="1.6" strokeLinecap="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className={`discover-chips-row${(isDiscoverSearchActive || discoverQuery || discoverCategory !== 'all') ? ' discover-chips-row--visible' : ''}`}>
                          {[
                            { id: 'all', label: 'All' },
                            { id: 'gaming', label: '🎮 Gaming' },
                            { id: 'music', label: '🎵 Music' },
                            { id: 'community', label: '🌐 Community' },
                            { id: 'tech', label: '💻 Tech' },
                            { id: 'art', label: '🎨 Art' },
                          ].map(chip => (
                            <button
                              key={chip.id}
                              type="button"
                              className={`discover-chip${discoverCategory === chip.id ? ' discover-chip--active' : ''}`}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                setDiscoverCategory(chip.id)
                                setIsDiscoverSearchActive(true)
                              }}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>

                        {!q && officialReelms.length > 0 && (
                          <div className="discover-official-section">
                            <button
                              type="button"
                              className="discover-official-trigger"
                              onClick={() => setShowOfficialReelms(prev => !prev)}
                            >
                              <span className="discover-official-title">{t('official_reelms') || 'Official Reelms'}</span>
                              <svg
                                className={`discover-official-chevron${showOfficialReelms ? ' open' : ''}`}
                                viewBox="0 0 24 24"
                                width="18"
                                height="18"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>

                            <div className={`discover-official-accordion${showOfficialReelms ? ' open' : ''}`}>
                              <div className="discover-reelms-grid">
                                {officialReelms.map((item, i) => (
                                  <button
                                    key={`official-reelm-${item.id || i}`}
                                    type="button"
                                    className="discover-reelm-card"
                                    onClick={() => setDiscoverPreviewReelm(item)}
                                  >
                                    <div className="discover-reelm-icon-wrap">
                                      {item.image ? (
                                        <img src={item.image} alt={item.name} className="discover-reelm-icon-img" />
                                      ) : (
                                        <span className="discover-reelm-icon-fallback">
                                          {(item.name || '?').charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <span className="discover-reelm-card-name" title={item.name}>
                                      {item.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="discover-results">
                        {Boolean(q) && results.length === 0 && (
                          <p className="discover-empty">No results found.</p>
                        )}

                        {reelmResults.length > 0 && (
                          <div className="discover-reelms-grid">
                            {reelmResults.map((item, i) => (
                              <button
                                key={`reelm-${item.id || i}`}
                                type="button"
                                className="discover-reelm-card"
                                onClick={() => setDiscoverPreviewReelm(item)}
                              >
                                <div className="discover-reelm-icon-wrap">
                                  {item.image ? (
                                    <img src={item.image} alt={item.name} className="discover-reelm-icon-img" />
                                  ) : (
                                    <span className="discover-reelm-icon-fallback">
                                      {(item.name || '?').charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="discover-reelm-card-name" title={item.name}>
                                  {item.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {otherResults.length > 0 && (
                          <div className="discover-other-results">
                            {otherResults.map((item, i) => (
                              <div key={`other-${item.id || i}`} className="discover-result-row" onClick={() => {
                                if (item._type === 'chat') {
                                  setSelectedChat(item); setSelectedChannel(null); setSelectedReelm(null); setShowDiscover(false); setShowSettings(false)
                                }
                              }}>
                                <div className="discover-result-avatar">
                                  {item.image
                                    ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : (item.name || item.contact || '?').charAt(0).toUpperCase()
                                  }
                                </div>
                                <div className="discover-result-info">
                                  <span className="discover-result-name">{item.name || item.contact}</span>
                                  <span className="discover-result-type">
                                    {item._type === 'chat' ? 'Chat' : 'User'}
                                  </span>
                                </div>
                                {item._type === 'user' && String(item.id) !== String(uid) && (
                                  <div onClick={e => e.stopPropagation()} style={{display:'flex', gap:6, alignItems:'center', flexShrink:0}}>
                                    {isBlocked(item.id) ? (
                                      <button className="friend-add-btn" onClick={() => unblockUserFn(item.id)}>Unblock</button>
                                    ) : (
                                      <>
                                        <button className="friend-add-btn" onClick={() => setFullProfileTarget({ isSelf: false, user: item })}>See Profile</button>
                                        {isFriend(item.id)
                                          ? <button className="friend-add-btn" onClick={() => startDM(item)}>Message</button>
                                          : hasSentRequest(item.id)
                                            ? <span className="friend-badge-label friend-badge-pending">Pending</span>
                                            : <button className="friend-add-btn" onClick={() => sendFriendRequest(item)}>Add Friend</button>
                                        }
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {discoverPreviewReelm && (
                        <div className="menu-backdrop menu-backdrop--new-actions" onClick={() => setDiscoverPreviewReelm(null)}>
                          <div className="new-modal-panel discover-preview-modal" onClick={e => e.stopPropagation()}>
                            <div className="new-modal-header">
                              <button
                                type="button"
                                className="new-modal-back-btn"
                                onClick={() => setDiscoverPreviewReelm(null)}
                                title="Back"
                              >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="15 18 9 12 15 6" />
                                </svg>
                              </button>
                              <h3 className="new-modal-title">{discoverPreviewReelm.name}</h3>
                            </div>

                            <div className="discover-preview-avatar-wrap">
                              {discoverPreviewReelm.image ? (
                                <img src={discoverPreviewReelm.image} alt={discoverPreviewReelm.name} className="discover-preview-avatar-img" />
                              ) : (
                                <div className="discover-preview-avatar-fallback">
                                  {(discoverPreviewReelm.name || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <span className="discover-preview-category-tag">
                              {discoverPreviewReelm.category ? (discoverPreviewReelm.category.charAt(0).toUpperCase() + discoverPreviewReelm.category.slice(1)) : 'Community'}
                            </span>

                            <p className="discover-preview-description">
                              {discoverPreviewReelm.description || 'Welcome to this reelm! Join to connect with members and participate in channels.'}
                            </p>

                            <div className="discover-preview-stats">
                              <span>👥 {discoverPreviewReelm.membersCount || 1} members</span>
                            </div>

                            <div className="new-modal-btn-row" style={{ marginTop: '16px' }}>
                              {reelms.some(r => String(r.id) === String(discoverPreviewReelm.id)) ? (
                                <button
                                  type="button"
                                  className="pill-action-btn"
                                  onClick={() => {
                                    const matched = reelms.find(r => String(r.id) === String(discoverPreviewReelm.id))
                                    handleSelectReelm(matched || discoverPreviewReelm)
                                    setShowDiscover(false)
                                    setDiscoverPreviewReelm(null)
                                  }}
                                >
                                  Open Reelm
                                </button>
                              ) : (discoverPreviewReelm.joinMode === 'open' || discoverPreviewReelm.isPublic !== false) ? (
                                <button
                                  type="button"
                                  className="pill-action-btn"
                                  onClick={async () => {
                                    await requestJoinDiscoverReelm(discoverPreviewReelm)
                                    setDiscoverPreviewReelm(null)
                                  }}
                                >
                                  Join
                                </button>
                              ) : (discoverPreviewReelm.pending || pendingReelmJoinIds.includes(String(discoverPreviewReelm.id))) ? (
                                <button
                                  type="button"
                                  className="pill-action-btn"
                                  disabled
                                  style={{ opacity: 0.65, cursor: 'default' }}
                                >
                                  Requested
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="pill-action-btn"
                                  onClick={async () => {
                                    await requestJoinDiscoverReelm(discoverPreviewReelm)
                                    setDiscoverPreviewReelm(null)
                                  }}
                                >
                                  Request to Join
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            ) : showFriendsPanel ? (
              <div className="panel panel-middle discover-panel" style={{ position: 'relative' }}>
                <button className="discover-back-btn" onClick={() => { setShowFriendsPanel(false); setShowFeed(true) }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="discover-header">
                  <h2 className="discover-title">{t('friends')}</h2>
                </div>
                <div className="discover-results">
                  {friendRequests.length > 0 && (
                    <>
                      <p className="friends-section-label">{t('friend_requests')} ({friendRequests.length})</p>
                      {friendRequests.map((r, i) => (
                        <div key={i} className="discover-result-row">
                          <div className="discover-result-avatar">
                            {r.photo
                              ? <img src={r.photo} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : (r.name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="discover-result-info">
                            <span className="discover-result-name">{r.name}</span>
                            <span className="discover-result-type">{r.username ? `@${r.username}` : t('user_label')}</span>
                          </div>
                          <div className="friend-req-actions">
                            <button className="friend-add-btn" onClick={() => acceptFriendRequest(r)}>{t('accept')}</button>
                            <button className="friend-reject-btn" onClick={() => rejectFriendRequest(r.id)}>{t('reject')}</button>
                          </div>
                        </div>
                      ))}
                      <div className="friends-section-divider" />
                    </>
                  )}
                  {friends.length === 0
                    ? <p className="discover-empty">{t('no_friends_yet')}</p>
                    : friends.map((f, i) => (
                        <div key={i} className="discover-result-row" onClick={(e) => { if (!e.defaultPrevented) openFriendProfile(f, e) }} style={{ cursor: 'pointer' }}>
                          <div className="discover-result-avatar">
                            {f.photo
                              ? <img src={f.photo} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : (f.name || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="discover-result-info">
                            <span className="discover-result-name">{f.name}</span>
                            <span className="discover-result-type">{f.username ? `@${f.username}` : t('user_label')}</span>
                          </div>
                          <button className="friend-reject-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFriend(f.id) }}>{t('remove')}</button>
                        </div>
                      ))
                  }
                  {blocked && blocked.length > 0 && (
                    <>
                      <div className="friends-section-divider" />
                      <p className="friends-section-label">Blocked Users ({blocked.length})</p>
                      {blocked.map((b, i) => (
                        <div key={b.id || i} className="discover-result-row">
                          <div className="discover-result-avatar">
                            {getPersonPhoto(b)
                              ? <img src={getPersonPhoto(b)} alt={b.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : (b.name || b.username || '?').charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="discover-result-info">
                            <span className="discover-result-name">{b.name || b.username || 'Blocked user'}</span>
                            <span className="discover-result-type">{b.username ? `@${b.username}` : 'Blocked'}</span>
                          </div>
                          <button
                            className="friend-add-btn"
                            style={{ background: 'rgba(var(--ta-rgb), 0.15)', borderColor: 'rgba(var(--ta-rgb), 0.3)', color: 'var(--ta)' }}
                            onClick={() => unblockUserFn(b.id || b.userId)}
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="friends-blocked-btn"
                  onClick={() => setShowBlockedModal(true)}
                  title="View & manage blocked users"
                >
                  <span>Blocked ({blocked ? blocked.length : 0})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                </button>
              </div>
            ) : showNotificationsPanel ? (
              <div className="panel panel-middle discover-panel notifs-panel" style={{ position: 'relative' }}>
                <div className="discover-header">
                  <h2 className="discover-title">{t('notifications')}</h2>
                </div>
                <div className="discover-results">
                  {notifications.length === 0
                    ? <p className="discover-empty">{t('no_notifications')}</p>
                    : notifications.map((n) => {
                        const isReelmInvite = n.link?.type === 'reelm_invite'
                        return (
                          <div
                            key={n.id}
                            className="discover-result-row"
                            onClick={() => {
                              if (isReelmInvite) return
                              navigateToNotificationLink(n.link)
                              deleteNotification(n.id)
                              setShowNotificationsPanel(false)
                            }}
                          >
                            <div className="discover-result-avatar">
                              <MaskIcon src={notificationIcon} alt="" className="header-icon" />
                            </div>
                            <div className="discover-result-info">
                              <span className="discover-result-name">{n.text}</span>
                            </div>
                            {isReelmInvite && (
                              <div className="friend-req-actions" onClick={e => e.stopPropagation()}>
                                <button className="friend-add-btn" onClick={() => acceptReelmInviteNotification(n)}>Accept</button>
                                <button className="friend-reject-btn" onClick={() => rejectReelmInviteNotification(n)}>Decline</button>
                              </div>
                            )}
                            <button
                              className="friend-reject-btn notif-row-del-btn"
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })
                  }
                  {notifications.length > 0 && (
                    <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'center' }}>
                      <button className="friend-add-btn notif-clear-all-btn" onClick={clearAllNotifications}>
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : isMod ? (
              <div className="panel panel-middle" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ModInboxPanel onClose={() => {}} />
              </div>
            ) : (
              <div className="panel panel-middle home-panel">
                {(() => {
                  const greetingWord = customization.customGreeting || 'Hey'
                  const greetPunct = customization.greetingPunctuation === 'none' ? '' : (customization.greetingPunctuation || '!')
                  const greetName = currentUser?.name || currentUser?.username || ''

                  if (isMobile) {
                    return null
                  }

                  // Desktop & Web Floating Hub
                  const now = Date.now()
                  const LONG_INACTIVE_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

                  const allReelmsList = (Array.isArray(reelms) ? reelms : []).map(r => {
                    const unread = Number(unreadCounts[r.id] || 0)
                    const updatedAt = Number(r.updatedAt || 0)
                    const isLongInactive = !updatedAt || (now - updatedAt > LONG_INACTIVE_MS)
                    return {
                      type: 'reelm',
                      id: `reelm_${r.id}`,
                      rawId: r.id,
                      name: r.name || 'Reelm',
                      image: r.image || null,
                      unread: unread,
                      isLongInactive: isLongInactive && unread === 0,
                      item: r,
                      updatedAt: updatedAt,
                    }
                  })

                  const allChatsList = (Array.isArray(chats) ? chats : []).map(c => {
                    const displayName = getChatDisplayName(c)
                    const avatarSrc = getChatAvatarSrc(c)
                    const unread = getChatUnreadCount(c)
                    const isGroup = c.type === 'group'
                    const updatedAt = Number(c.updatedAt || 0)
                    const isLongInactive = !updatedAt || (now - updatedAt > LONG_INACTIVE_MS)
                    return {
                      type: 'chat',
                      id: `chat_${c.id}`,
                      rawId: c.id,
                      name: displayName || (isGroup ? 'Group Chat' : 'Direct Message'),
                      image: avatarSrc || null,
                      unread: unread,
                      isLongInactive: isLongInactive && unread === 0,
                      isGroup,
                      item: c,
                      updatedAt: updatedAt,
                    }
                  })

                  // Combine all nodes
                  const allNodes = [...allReelmsList, ...allChatsList]

                  // Sort nodes: unread items first (highest unread first), then by most recently updated
                  allNodes.sort((a, b) => {
                    if (b.unread !== a.unread) return b.unread - a.unread
                    return b.updatedAt - a.updatedAt
                  })

                  const totalUnreadCount = allNodes.reduce((sum, n) => sum + (n.unread > 0 ? n.unread : 0), 0)
                  const unreadConversationsCount = allNodes.filter(n => n.unread > 0).length

                  return (
                    <div className="floating-hub-wrapper">
                      <div className="floating-hub-header">
                        <h1 className="floating-hub-greeting">
                          {greetingWord}{greetName ? `, ${greetName}` : ''}{greetPunct}
                        </h1>
                        {totalUnreadCount > 0 && (
                          <div className="floating-hub-subtext floating-hub-subtext--has-unread">
                            <span className="floating-hub-subtext-dot" />
                            {totalUnreadCount} okunmamış mesaj ({unreadConversationsCount} sohbet)
                          </div>
                        )}
                      </div>

                      {allNodes.length > 0 ? (
                        <div className="floating-hub-stage floating-hub-stage--magnetic">
                          {allNodes.map((node, index) => {
                            const driftClass = `floating-node-drift-${index % 6}`
                            const hasUnread = node.unread > 0
                            const pos = (() => {
                              const total = allNodes.length
                              if (total === 1) return { x: 0, y: 0, ring: 0, isCenter: true }

                              // 2 nodes: Side by side, centered horizontally
                              if (total === 2) {
                                const gap = isMobile ? 60 : 86
                                return {
                                  x: index === 0 ? -gap : gap,
                                  y: 0,
                                  ring: 1,
                                  isCenter: false,
                                }
                              }

                              // 3+ nodes: Central core (index 0) + radial magnetic orbits (rings 1, 2, 3)
                              if (index === 0) return { x: 0, y: 0, ring: 0, isCenter: true }
                              let ring = 1
                              let ringIndex = 0
                              let ringTotal = 0
                              let radius = isMobile ? 88 : 142
                              const yRatio = isMobile ? 0.88 : 0.78

                              if (index <= 4 || total <= 5) {
                                ring = 1
                                ringIndex = index - 1
                                ringTotal = Math.min(total - 1, 4)
                                radius = total <= 3 ? (isMobile ? 80 : 126) : (isMobile ? 90 : 142)
                                const angleOffset = -Math.PI / 2 + (ringTotal % 2 === 0 ? Math.PI / ringTotal : 0)
                                const angle = angleOffset + (ringIndex * (2 * Math.PI / ringTotal))
                                return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * yRatio), ring, isCenter: false }
                              } else if (index <= 12) {
                                ring = 2
                                ringIndex = index - 5
                                ringTotal = Math.min(total - 5, 8)
                                radius = isMobile ? 148 : 238
                                const angleOffset = -Math.PI / 3
                                const angle = angleOffset + (ringIndex * (2 * Math.PI / ringTotal))
                                return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * yRatio), ring, isCenter: false }
                              } else {
                                ring = 3
                                ringIndex = index - 13
                                ringTotal = total - 13
                                radius = isMobile ? 195 : 325
                                const angleOffset = -Math.PI / 4
                                const angle = angleOffset + (ringIndex * (2 * Math.PI / ringTotal))
                                return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * yRatio), ring, isCenter: false }
                              }
                            })()

                            const sizeClass = pos.isCenter
                              ? (hasUnread ? 'floating-node--size-large' : 'floating-node--size-center-normal')
                              : (hasUnread
                                  ? 'floating-node--size-large'
                                  : (node.isLongInactive ? 'floating-node--size-small' : 'floating-node--size-normal'))

                            return (
                              <button
                                key={node.id}
                                type="button"
                                className={`floating-node floating-node--magnetic ${pos.isCenter ? 'floating-node--center' : ''} ${sizeClass}${hasUnread ? ' floating-node--has-unread' : ''}`}
                                style={{
                                  '--node-x': `${pos.x}px`,
                                  '--node-y': `${pos.y}px`,
                                }}
                                onClick={() => {
                                  if (node.type === 'reelm') {
                                    handleSelectReelm(node.item)
                                  } else {
                                    setSelectedChat(node.item)
                                    setSelectedReelm(null)
                                    setSelectedChannel(null)
                                    setShowChatList(false)
                                    setShowFeed(false)
                                    setShowDiscover(false)
                                  }
                                }}
                                title={`${node.name}${hasUnread ? ` (${node.unread} yeni mesaj)` : ''}`}
                              >
                                <div className={`floating-node-inner ${driftClass}`}>
                                  <div
                                    className={`floating-node-orb${isDefaultCommunity(node.item) ? ' floating-node-orb--community' : ''}`}
                                    style={isDefaultCommunity(node.item) ? { background: '#b99887', color: '#383835' } : undefined}
                                  >
                                    {isDefaultCommunity(node.item) ? (
                                      <ReelmsCommunityGlyph size={pos.isCenter ? 30 : (sizeClass === 'floating-node--size-large' ? 32 : (node.isLongInactive ? 18 : 24))} />
                                    ) : node.image ? (
                                      <img src={node.image} alt={node.name} className="floating-node-avatar-img" />
                                    ) : (
                                      <span className="floating-node-avatar-letter">
                                        {(node.name || '?').charAt(0)}
                                      </span>
                                    )}

                                    {/* Small indicator icon for item type */}
                                    <div className="floating-node-type-indicator">
                                      {node.type === 'reelm' ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                          <line x1="4" y1="22" x2="4" y2="15"/>
                                        </svg>
                                      ) : node.isGroup ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                          <circle cx="9" cy="7" r="4"/>
                                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                          <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                      )}
                                    </div>

                                    {/* Unread badge on top right */}
                                    {hasUnread && (
                                      <span className="floating-node-badge">
                                        {capBadge(node.unread)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="floating-node-tooltip">
                                  <span>{node.name}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="floating-hub-empty">
                          <div className="floating-hub-empty-orb">
                            <img src={readyreelmIcon} alt="" />
                          </div>
                          <h3 className="floating-hub-empty-title">Henüz sohbet veya Reelm yok</h3>
                          <p className="floating-hub-empty-desc">
                            Topluluklara katılmak için Reelm keşfedebilir veya arkadaşlarınızla sohbet başlatabilirsiniz.
                          </p>
                          <div className="floating-hub-empty-actions">
                            <button
                              type="button"
                              className="floating-hub-empty-btn"
                              onClick={() => { setShowDiscover(true); setDiscoverQuery('') }}
                            >
                              Reelm Keşfet
                            </button>
                            <button
                              type="button"
                              className="floating-hub-empty-btn"
                              onClick={() => { setSelectedChat(null); setShowChatList(true); setChatListFilter('all') }}
                            >
                              Sohbetler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

          {showProfilePopup && (
            <ProfilePopup
              user={currentUser}
              width={365}
              initialEditOpen={profilePopupInitialEdit}
              onClose={() => { setShowProfilePopup(false); setProfilePopupInitialEdit(false) }}
              onPhotoChange={(photo) => updateUserData({ photo })}
              cover={getPersonCover(currentUser)}
              onCoverChange={(cover) => updateUserData({ cover })}
              status={profileStatus}
              onStatusChange={updateProfileStatus}
              bio={profileBio}
              onBioChange={(bio) => { setProfileBio(bio || ''); updateUserData({ bio: bio || '' }) }}
              socialLinks={profileSocialLinks}
              onSocialLinksChange={(val) => {
                const next = typeof val === 'function' ? val(profileSocialLinks) : val
                setProfileSocialLinks(next || {})
              }}
              activePlatforms={profileActivePlatforms}
              onActivePlatformsChange={val => {
                const next = typeof val === 'function' ? val(profileActivePlatforms) : val
                setProfileActivePlatforms(Array.isArray(next) ? next : [])
              }}
              iconFilter={newIconThemeFilter(effectiveAccent)}
              reelms={reelms}
              uid={uid}
              spotifyConnected={spotifyConnected}
              spotifyNowPlaying={spotifyNowPlaying}
              onSpotifyConnect={connectSpotify}
              onSpotifyDisconnect={disconnectSpotify}
              activity={currentActivity}
              onActivityChange={setActivity}
              onViewFullProfile={() => { setShowProfilePopup(false); setFullProfileTarget({ isSelf: true, user: currentUser }) }}
            />
          )}
          {renderFriendProfileSurface()}
          {fullProfileTarget && (
            <FullProfilePage
              user={fullProfileTarget.isSelf ? currentUser : fullProfileTarget.user}
              isSelf={fullProfileTarget.isSelf}
              reelms={fullProfileTarget.isSelf ? reelms : reelms.filter(r => {
                const friendId = String(fullProfileTarget.user?.id || '')
                if (!friendId) return false
                return Array.isArray(r.members) && r.members.some(m => String(m.userId || m.id || '') === friendId)
              })}
              friends={fullProfileTarget.isSelf ? friends : []}
              onClose={() => setFullProfileTarget(null)}
              onMessage={() => {
                const friend = friends.find(f => String(f.id) === String(fullProfileTarget.user?.id)) || fullProfileTarget.user
                if (friend) startDM(friend)
              }}
              onAddFriend={sendFriendRequest}
              onRemove={removeFriend}
              onBlock={blockUserFn}
              onUnblock={unblockUserFn}
              isFriend={fullProfileTarget.user && friends.some(f => String(f.id) === String(fullProfileTarget.user.id))}
              isBlocked={fullProfileTarget.user && blocked.some(b => String(b.id) === String(fullProfileTarget.user.id))}
              isPending={fullProfileTarget.user && friendRequestsOut.map(String).includes(String(fullProfileTarget.user.id))}
              onOpenFriend={f => setFullProfileTarget({ isSelf: false, user: f })}
              spotifyConnected={fullProfileTarget.isSelf ? spotifyConnected : false}
              spotifyNowPlaying={fullProfileTarget.isSelf ? spotifyNowPlaying : null}
              onPhotoChange={fullProfileTarget.isSelf ? (url => updateUserData({ photo: url })) : undefined}
              onCoverChange={fullProfileTarget.isSelf ? (url => updateUserData({ cover: url })) : undefined}
              onBioChange={fullProfileTarget.isSelf ? (bio => { setProfileBio(bio || ''); updateUserData({ bio: bio || '' }) }) : undefined}
              onNameChange={fullProfileTarget.isSelf ? (name => updateUserData({ name })) : undefined}
              onSocialLinksChange={fullProfileTarget.isSelf ? (val => { const next = typeof val === 'function' ? val(profileSocialLinks) : val; setProfileSocialLinks(next || {}) }) : undefined}
              profileBio={fullProfileTarget.isSelf ? profileBio : undefined}
              socialLinks={fullProfileTarget.isSelf ? profileSocialLinks : undefined}
              activePlatforms={fullProfileTarget.isSelf ? profileActivePlatforms : undefined}
              lastSeenLabel={fullProfileTarget.isSelf ? null : getLastSeenLabel(fullProfileTarget.user?.id)}
              profileStatus={profileStatus}
              onStatusChange={updateProfileStatus}
            />
          )}
          {isMobile && !selectedReelm && !selectedChat && (
            <nav className="mobile-bottom-nav">
              <button
                className={`mobile-nav-btn${showDiscover && !showSettings && !showFriendsPanel && !showNotificationsPanel ? ' mobile-nav-btn--active' : ''}`}
                onClick={() => openMobileTab('discover')}
                title="Discover"
              >
                <img src={discoverIcon} alt="Discover" className="mobile-nav-icon" />
              </button>
              <button
                className={`mobile-nav-btn${showFriendsPanel && !showDiscover && !showSettings && !showNotificationsPanel ? ' mobile-nav-btn--active' : ''}`}
                onClick={() => openMobileTab('friends')}
                title={t('friends')}
              >
                <span className="mobile-nav-icon-wrap">
                  <img src={friendsIcon} alt="Friends" className="mobile-nav-icon" />
                  {friendRequests.length > 0 && <span className="mobile-nav-badge">{capBadge(friendRequests.length)}</span>}
                </span>
              </button>
              <button
                className={`mobile-nav-btn mobile-nav-btn--create${showMenu ? ' mobile-nav-btn--active' : ''}`}
                onClick={() => {
                  setShowMenu(v => !v)
                  setCreateReelmStep(null)
                  setSelectedTemplateId(null)
                }}
                title={t('create') || 'New / Create'}
              >
                <img src={newIcon} alt="New" className="mobile-nav-icon mobile-nav-icon--new" />
              </button>
              <button
                className={`mobile-nav-btn${(showChatList && !showDiscover && !showSettings && !showFriendsPanel && !showNotificationsPanel) ? ' mobile-nav-btn--active' : ''}`}
                onClick={() => openMobileTab('messages')}
                title={t('messages')}
              >
                <span className="mobile-nav-icon-wrap">
                  <img src={messagesIcon} alt="Messages" className="mobile-nav-icon" />
                  {totalUnread > 0 && <span className="mobile-nav-badge">{capBadge(totalUnread)}</span>}
                </span>
              </button>
              <button
                className={`mobile-nav-btn mobile-nav-btn--profile${showProfilePopup || fullProfileTarget?.isSelf ? ' mobile-nav-btn--active' : ''}`}
                onClick={() => {
                  let currentTab = 'messages'
                  if (showNotificationsPanel) currentTab = 'notifications'
                  else if (showFriendsPanel) currentTab = 'friends'
                  else if (showDiscover) currentTab = 'discover'
                  else if (showSettings) currentTab = 'settings'
                  else if (selectedChat || selectedReelm) currentTab = 'chat'
                  setPrevMobileTab(currentTab)
                  setFullProfileTarget({ isSelf: true, user: currentUser })
                }}
                title="Profile"
              >
                <div className="mobile-nav-profile-avatar">
                  <img src={getPersonPhoto(currentUser) || avatarUIcon} alt="Profile" />
                  <span className="mobile-nav-status-dot" style={{ background: { online: '#4ade80', idle: '#fbbf24', busy: '#f87171', invisible: '#9ca3af' }[profileStatus] }} />
                </div>
              </button>
            </nav>
          )}
        </div>
        {showMenu && (
          <div className="menu-backdrop menu-backdrop--new-actions" onClick={() => { setShowMenu(false); setCreateReelmStep(null); setSelectedTemplateId(null) }}>
            {createReelmStep ? (
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                {createReelmStep === 'naming' ? (
                  <div className="new-modal-panel">
                    <div className="new-modal-header">
                      <button className="new-modal-back-btn" onClick={() => { setCreateReelmStep(null); setSelectedTemplateId(null) }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h3 className="new-modal-title">Name your reelm</h3>
                    </div>
                    <input
                      className="new-modal-input"
                      value={reelmNameInput}
                      onChange={e => setReelmNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && reelmNameInput.trim()) handleCreateReelm() }}
                      placeholder="Name your reelm"
                      autoFocus
                      maxLength={50}
                    />
                    {activeTemplate ? (
                      <div className="new-modal-template-selected-row">
                        <span>{activeTemplate.emoji}</span>
                        <span>{activeTemplate.name}</span>
                        <button
                          type="button"
                          className="new-modal-template-change-btn"
                          onClick={() => setCreateReelmStep('templates')}
                        >
                          {t('change') || 'Değiştir'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="new-modal-template-link"
                        onClick={() => setCreateReelmStep('templates')}
                      >
                        <span>✦ Start from a template</span>
                      </button>
                    )}
                    <div className="new-modal-btn-row">
                      <button
                        type="button"
                        className="pill-action-btn"
                        onClick={handleCreateReelm}
                        disabled={!reelmNameInput.trim()}
                      >
                        Create Reelm
                      </button>
                    </div>
                  </div>
                ) : createReelmStep === 'templates' ? (
                  <div className="new-modal-panel new-modal-panel--wide">
                    <div className="new-modal-header">
                      <button className="new-modal-back-btn" onClick={() => setCreateReelmStep('naming')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h3 className="new-modal-title">Choose a template</h3>
                    </div>
                    <div className="new-modal-template-grid">
                      {reelmTemplates.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          className={`new-modal-template-card${selectedTemplateId === tpl.id ? ' new-modal-template-card--selected' : ''}`}
                          onClick={() => { setSelectedTemplateId(tpl.id); setCreateReelmStep('naming') }}
                        >
                          <div className="new-modal-template-emoji">{tpl.emoji}</div>
                          <div className="new-modal-template-name">{tpl.name}</div>
                          <p className="new-modal-template-desc">{tpl.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : createReelmStep === 'joining' ? (
                  <div className="new-modal-panel">
                    <div className="new-modal-header">
                      <button className="new-modal-back-btn" onClick={() => { setCreateReelmStep(null); setJoinError('') }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h3 className="new-modal-title">Join a Reelm</h3>
                    </div>
                    <input
                      className="new-modal-input"
                      value={joinCodeInput}
                      onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter' && !joining && joinCodeInput.trim()) handleJoinReelm() }}
                      placeholder="Enter Reelm code or link"
                      maxLength={32}
                      autoFocus
                    />
                    {joinError && <p className="create-reelm-error" style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#f87171' }}>{joinError}</p>}
                    <div className="new-modal-btn-row">
                      <button
                        type="button"
                        className="pill-action-btn"
                        onClick={handleJoinReelm}
                        disabled={!joinCodeInput.trim() || joining}
                      >
                        {joining ? 'Joining…' : 'Join Reelm'}
                      </button>
                    </div>
                  </div>
                ) : createReelmStep === 'startChat' ? (
                  <div className="new-modal-panel">
                    <div className="new-modal-header">
                      <button className="new-modal-back-btn" onClick={() => setCreateReelmStep(null)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h3 className="new-modal-title">Start a chat</h3>
                    </div>
                    <input
                      className="new-modal-input"
                      type="text"
                      placeholder="Search friends..."
                      value={friendSelectorQuery}
                      onChange={e => setFriendSelectorQuery(e.target.value)}
                      autoFocus
                    />
                    <div className="new-modal-friends-section-title">
                      {friendSelectorQuery ? 'Search Results' : 'Suggested'}
                    </div>
                    <div className="new-modal-friends-list">
                      {friends
                        .filter(f => !friendSelectorQuery || f.name?.toLowerCase().includes(friendSelectorQuery.toLowerCase()) || f.username?.toLowerCase().includes(friendSelectorQuery.toLowerCase()))
                        .slice(0, friendSelectorQuery ? 25 : 8)
                        .map((f, i) => (
                          <button key={i} className="new-modal-friend-item" onClick={() => startDM(f)}>
                            <div className="new-modal-friend-avatar">
                              {f.photo
                                ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : (f.name || '?').charAt(0).toUpperCase()
                              }
                            </div>
                            <div className="new-modal-friend-info">
                              <span className="new-modal-friend-name">{nicknames[f.id] || f.name}</span>
                              {f.username && <span className="new-modal-friend-username">@{f.username}</span>}
                            </div>
                          </button>
                        ))
                      }
                      {friends.length === 0 && <p className="friend-selector-empty">No friends yet.</p>}
                    </div>
                  </div>
                ) : createReelmStep === 'group_friends' ? (
                  <div className="new-modal-panel">
                    <div className="new-modal-header">
                      <button className="new-modal-back-btn" onClick={() => setCreateReelmStep(null)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h3 className="new-modal-title">Add people</h3>
                    </div>
                    <input
                      className="new-modal-input"
                      type="text"
                      placeholder="Search friends..."
                      value={friendSelectorQuery}
                      onChange={e => setFriendSelectorQuery(e.target.value)}
                      autoFocus
                    />
                    <div className="new-modal-friends-section-title">
                      {friendSelectorQuery ? 'Search Results' : 'Suggested'}
                    </div>
                    <div className="new-modal-friends-list">
                      {friends
                        .filter(f => !friendSelectorQuery || f.name?.toLowerCase().includes(friendSelectorQuery.toLowerCase()) || f.username?.toLowerCase().includes(friendSelectorQuery.toLowerCase()))
                        .slice(0, friendSelectorQuery ? 25 : 10)
                        .map((f, i) => {
                          const selected = groupSelectedFriends.some(s => s.id === f.id)
                          return (
                            <button key={i} className={`new-modal-friend-item${selected ? ' new-modal-friend-item--selected' : ''}`} onClick={() => {
                              setGroupSelectedFriends(prev => selected ? prev.filter(s => s.id !== f.id) : [...prev, f])
                            }}>
                              <div className="new-modal-friend-avatar">
                                {f.photo
                                  ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                  : (f.name || '?').charAt(0).toUpperCase()
                                }
                              </div>
                              <div className="new-modal-friend-info">
                                <span className="new-modal-friend-name">{nicknames[f.id] || f.name}</span>
                                {f.username && <span className="new-modal-friend-username">@{f.username}</span>}
                              </div>
                              <div className={`new-modal-checkbox${selected ? ' new-modal-checkbox--checked' : ''}`}>
                                {selected && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          )
                        })
                      }
                      {friends.length === 0 && <p className="friend-selector-empty">No friends yet.</p>}
                    </div>
                    <div className="new-modal-btn-row">
                      <button
                        type="button"
                        className="pill-action-btn"
                        disabled={groupSelectedFriends.length === 0}
                        onClick={() => setCreateReelmStep('group_setup')}
                      >
                        Next ({groupSelectedFriends.length}) →
                      </button>
                    </div>
                  </div>
                ) : createReelmStep === 'group_setup' ? (
                  <div className="new-modal-panel">
                    <div className="new-modal-header">
                      <button className="new-modal-back-btn" onClick={() => setCreateReelmStep('group_friends')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h3 className="new-modal-title">New group</h3>
                    </div>
                    <div className="new-modal-group-setup-row">
                      <div className="new-modal-group-avatar-btn" onClick={() => groupPhotoInputRef.current?.click()} title="Select group photo">
                        {groupPhotoInput
                          ? <img src={groupPhotoInput} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        }
                      </div>
                      <input
                        ref={groupPhotoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const img = new Image()
                            img.onload = () => {
                              const MAX = 256
                              const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                              const canvas = document.createElement('canvas')
                              canvas.width = Math.round(img.width * scale)
                              canvas.height = Math.round(img.height * scale)
                              canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                              setGroupPhotoInput(canvas.toDataURL('image/webp', 0.85))
                            }
                            img.src = ev.target.result
                          }
                          reader.readAsDataURL(file)
                          e.target.value = ''
                        }}
                      />
                      <input
                        className="new-modal-input"
                        style={{ marginBottom: 0, flex: 1 }}
                        placeholder="Group name (optional)"
                        value={groupNameInput}
                        onChange={e => setGroupNameInput(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="new-modal-group-chips">
                      {groupSelectedFriends.map(f => (
                        <span key={f.id} className="new-modal-group-chip">
                          <span>{nicknames[f.id] || f.name}</span>
                          <button type="button" onClick={() => setGroupSelectedFriends(prev => prev.filter(s => s.id !== f.id))}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="new-modal-btn-row">
                      <button
                        type="button"
                        className="pill-action-btn"
                        onClick={createGroup}
                      >
                        {groupNameInput.trim() || groupPhotoInput ? 'Create Group' : 'Skip & Create'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="new-actions-strip" onClick={(e) => e.stopPropagation()}>
                <button
                  className="new-action-card"
                  onClick={() => handleMenuItemClick('createReelm')}
                >
                  <div className="new-action-icon-circle">
                    <img src={feedIcon} alt="" className="new-action-icon new-action-icon--create" />
                  </div>
                  <span className="new-action-title">Create a Reelm</span>
                </button>

                <button
                  className="new-action-card"
                  onClick={() => handleMenuItemClick('joinReelm')}
                >
                  <div className="new-action-icon-circle">
                    <img src={readyreelmIcon} alt="" className="new-action-icon new-action-icon--join" />
                  </div>
                  <span className="new-action-title">Join a Reelm</span>
                </button>

                <button
                  className="new-action-card"
                  onClick={() => handleMenuItemClick('startChat')}
                >
                  <div className="new-action-icon-circle">
                    <img src={newdmIcon} alt="" className="new-action-icon new-action-icon--dm" />
                  </div>
                  <span className="new-action-title">Start a chat</span>
                </button>

                <button
                  className="new-action-card"
                  onClick={() => handleMenuItemClick('startGroupChat')}
                >
                  <div className="new-action-icon-circle">
                    <img src={newgroupIcon} alt="" className="new-action-icon new-action-icon--group" />
                  </div>
                  <span className="new-action-title">Start a group chat</span>
                </button>
              </div>
            )}
          </div>
        )}
        {showGroupCreator === 'friends' && (
          <div className="menu-backdrop menu-backdrop--new-actions" onClick={() => setShowGroupCreator(null)}>
            <div className="new-modal-panel" onClick={e => e.stopPropagation()}>
              <div className="new-modal-header">
                <button className="new-modal-back-btn" onClick={() => { setShowGroupCreator(null); setShowMenu(true) }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h3 className="new-modal-title">Add people</h3>
              </div>
              <input
                className="new-modal-input"
                type="text"
                placeholder="Search friends..."
                value={friendSelectorQuery}
                onChange={e => setFriendSelectorQuery(e.target.value)}
                autoFocus
              />
              <div className="new-modal-friends-section-title">
                {friendSelectorQuery ? 'Search Results' : 'Suggested'}
              </div>
              <div className="new-modal-friends-list">
                {friends
                  .filter(f => !friendSelectorQuery || f.name?.toLowerCase().includes(friendSelectorQuery.toLowerCase()) || f.username?.toLowerCase().includes(friendSelectorQuery.toLowerCase()))
                  .slice(0, friendSelectorQuery ? 25 : 10)
                  .map((f, i) => {
                    const selected = groupSelectedFriends.some(s => s.id === f.id)
                    return (
                      <button key={i} className={`new-modal-friend-item${selected ? ' new-modal-friend-item--selected' : ''}`} onClick={() => {
                        setGroupSelectedFriends(prev => selected ? prev.filter(s => s.id !== f.id) : [...prev, f])
                      }}>
                        <div className="new-modal-friend-avatar">
                          {f.photo
                            ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (f.name || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="new-modal-friend-info">
                          <span className="new-modal-friend-name">{nicknames[f.id] || f.name}</span>
                          {f.username && <span className="new-modal-friend-username">@{f.username}</span>}
                        </div>
                        <div className={`new-modal-checkbox${selected ? ' new-modal-checkbox--checked' : ''}`}>
                          {selected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })
                }
                {friends.length === 0 && <p className="friend-selector-empty">No friends yet.</p>}
              </div>
              <div className="new-modal-btn-row">
                <button
                  type="button"
                  className="pill-action-btn"
                  disabled={groupSelectedFriends.length === 0}
                  onClick={() => setShowGroupCreator('setup')}
                >
                  Next ({groupSelectedFriends.length}) →
                </button>
              </div>
            </div>
          </div>
        )}
        {showGroupCreator === 'setup' && (
          <div className="menu-backdrop menu-backdrop--new-actions" onClick={() => setShowGroupCreator(null)}>
            <div className="new-modal-panel" onClick={e => e.stopPropagation()}>
              <div className="new-modal-header">
                <button className="new-modal-back-btn" onClick={() => setShowGroupCreator('friends')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h3 className="new-modal-title">New group</h3>
              </div>
              <div className="new-modal-group-setup-row">
                <div className="new-modal-group-avatar-btn" onClick={() => groupPhotoInputRef.current?.click()} title="Select group photo">
                  {groupPhotoInput
                    ? <img src={groupPhotoInput} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  }
                </div>
                <input
                  ref={groupPhotoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const img = new Image()
                      img.onload = () => {
                        const MAX = 256
                        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                        const canvas = document.createElement('canvas')
                        canvas.width = Math.round(img.width * scale)
                        canvas.height = Math.round(img.height * scale)
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                        setGroupPhotoInput(canvas.toDataURL('image/webp', 0.85))
                      }
                      img.src = ev.target.result
                    }
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }}
                />
                <input
                  className="new-modal-input"
                  style={{ marginBottom: 0, flex: 1 }}
                  placeholder="Group name (optional)"
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="new-modal-group-chips">
                {groupSelectedFriends.map(f => (
                  <span key={f.id} className="new-modal-group-chip">
                    <span>{nicknames[f.id] || f.name}</span>
                    <button type="button" onClick={() => setGroupSelectedFriends(prev => prev.filter(s => s.id !== f.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="new-modal-btn-row">
                <button
                  type="button"
                  className="pill-action-btn"
                  onClick={createGroup}
                >
                  {groupNameInput.trim() || groupPhotoInput ? 'Create Group' : 'Skip & Create'}
                </button>
              </div>
            </div>
          </div>
        )}
        {showFriendSelector && (
          <div className="menu-backdrop menu-backdrop--new-actions" onClick={() => { setShowFriendSelector(false); setShowMenu(false) }}>
            <div className="new-modal-panel" onClick={e => e.stopPropagation()}>
              <div className="new-modal-header">
                <button className="new-modal-back-btn" onClick={() => { setShowFriendSelector(false); setShowMenu(true) }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h3 className="new-modal-title">Start a chat</h3>
              </div>
              <input
                className="new-modal-input"
                type="text"
                placeholder="Search friends..."
                value={friendSelectorQuery}
                onChange={e => setFriendSelectorQuery(e.target.value)}
                autoFocus
              />
              <div className="new-modal-friends-section-title">
                {friendSelectorQuery ? 'Search Results' : 'Suggested'}
              </div>
              <div className="new-modal-friends-list">
                {friends
                  .filter(f => !friendSelectorQuery || f.name?.toLowerCase().includes(friendSelectorQuery.toLowerCase()) || f.username?.toLowerCase().includes(friendSelectorQuery.toLowerCase()))
                  .slice(0, friendSelectorQuery ? 25 : 8)
                  .map((f, i) => (
                    <button key={i} className="new-modal-friend-item" onClick={() => startDM(f)}>
                      <div className="new-modal-friend-avatar">
                        {f.photo
                          ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          : (f.name || '?').charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="new-modal-friend-info">
                        <span className="new-modal-friend-name">{nicknames[f.id] || f.name}</span>
                        {f.username && <span className="new-modal-friend-username">@{f.username}</span>}
                      </div>
                    </button>
                  ))
                }
                {friends.length === 0 && <p className="friend-selector-empty">No friends yet.</p>}
              </div>
            </div>
          </div>
        )}
        {(showFriendsPopup || showNotificationsPopup) && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 149 }} onClick={() => { setShowFriendsPopup(false); setShowNotificationsPopup(false) }} />
        )}
        {showFriendsPopup && (
          <button className="hpopup-float-icon" style={{ right: '120px' }} onClick={toggleFriendsPopup}>
            <MaskIcon src={friendsIcon} alt="Friends" className="header-icon" />
          </button>
        )}
        {showNotificationsPopup && (
          <button className="hpopup-float-icon" style={{ right: '74px' }} onClick={toggleNotifPopup}>
            <MaskIcon src={notificationIcon} alt="Notifications" className="header-icon" />
          </button>
        )}
        {showFriendsPopup && (
          <div className="hpopup hpopup-friends" onClick={e => e.stopPropagation()}>
            <div className="hpopup-top-row">
              <span className="hpopup-title" style={{ fontFamily: "'Karla', sans-serif", fontWeight: 800 }}>{t('friends')}</span>
              {friendRequests.length > 0 && <span className="notif-badge--inline">{friendRequests.length}</span>}
            </div>
            <div className="hpopup-content">
              {friendRequests.length > 0 && (
                <>
                  <p className="friends-section-label" style={{ padding: '0 16px', marginBottom: '4px' }}>{t('requests_label')}</p>
                  {friendRequests.map((r, i) => (
                    <div key={r.id || i} className="hpopup-row">
                      <div className="hpopup-avatar">{getPersonPhoto(r) ? <img src={getPersonPhoto(r)} alt={r.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (r.name || '?').charAt(0).toUpperCase()}</div>
                      <span className="hpopup-name" style={{ flex: 1 }}>{r.name}</span>
                      <div className="friend-req-actions">
                        <button className="friend-add-btn friend-add-btn--compact" onClick={() => acceptFriendRequest(r)}>✓</button>
                        <button className="friend-reject-btn friend-reject-btn--compact" onClick={() => rejectFriendRequest(r.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                  {friends.length > 0 && <div className="friends-section-divider" style={{ margin: '6px 16px' }} />}
                </>
              )}
              {friends.length === 0 && friendRequests.length === 0
                ? <p className="hpopup-empty">No friends</p>
                : friends.map((f, i) => (
                    <div key={i} className="hpopup-row" onClick={(e) => openFriendProfile(f, e)} style={{ cursor: 'pointer' }}>
                      <div className="hpopup-avatar">{getPersonPhoto(f) ? <img src={getPersonPhoto(f)} alt={f.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (f.name || '?').charAt(0).toUpperCase()}</div>
                      <span className="hpopup-name">{f.name}</span>
                    </div>
                  ))
              }
            </div>
            <div className="hpopup-footer">
              <button className="hpopup-see-all" onClick={() => { setShowFriendsPanel(true); setShowFriendsPopup(false); setShowDiscover(false); setSelectedReelm(null); setSelectedChat(null) }}>
                {t('see_all')}
              </button>
            </div>
          </div>
        )}
        {showNotificationsPopup && (
          <div className="hpopup hpopup-notifs" onClick={e => e.stopPropagation()}>
            <div className="hpopup-top-row">
              <span className="hpopup-title" style={{ fontFamily: "'Karla', sans-serif", fontWeight: 800 }}>{t('notifications')}</span>
            </div>
            <div className="hpopup-content hpopup-content--scroll">
              {notifications.length === 0
                ? <p className="hpopup-empty">{t('no_notifications')}</p>
                : notifications.map((n) => {
                    const isReelmInvite = n.link?.type === 'reelm_invite'
                    return (
                      <div
                        key={n.id}
                        className={`hpopup-row${isReelmInvite ? ' hpopup-row--invite' : ''}`}
                        onClick={() => {
                          if (isReelmInvite) return
                          navigateToNotificationLink(n.link)
                          deleteNotification(n.id)
                          setShowNotificationsPopup(false)
                        }}
                      >
                        <span className="hpopup-name" style={{ flex: 1 }}>{n.text}</span>
                        {isReelmInvite && (
                          <div className="notif-invite-actions">
                            <button className="notif-invite-btn notif-invite-accept" onClick={e => { e.stopPropagation(); acceptReelmInviteNotification(n) }}>Accept</button>
                            <button className="notif-invite-btn" onClick={e => { e.stopPropagation(); rejectReelmInviteNotification(n) }}>Decline</button>
                          </div>
                        )}
                        <button className="notif-delete-btn" onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}>✕</button>
                      </div>
                    )
                  })
              }
            </div>
            {notifications.length > 0 && (
              <div className="hpopup-footer">
                <button className="notif-clear-all-btn notif-clear-all-bottom" onClick={clearAllNotifications}>Clear all</button>
              </div>
            )}
          </div>
        )}
      </div>

      {remoteControlReq && (
        <div className="remote-ctrl-req-overlay">
          <div className="remote-ctrl-req-card" onClick={e => e.stopPropagation()}>
            <div className="remote-ctrl-req-icon">
              <img src={channelLiveactionIcon} alt="" width="24" height="24" style={{filter:'brightness(1.2) sepia(0.4)'}}/>
            </div>
            <div className="remote-ctrl-req-text">
              <span className="remote-ctrl-req-name">{remoteControlReq.requesterName}</span>
              <span className="remote-ctrl-req-desc">{t('wants_control')}</span>
            </div>
            <div className="remote-ctrl-req-actions">
              <button className="remote-ctrl-req-accept" onClick={acceptRemoteControl}>{t('allow')}</button>
              <button className="remote-ctrl-req-decline" onClick={declineRemoteControl}>{t('decline')}</button>
            </div>
          </div>
        </div>
      )}
      {flyingRoomModal && (
        <div className="flying-room-overlay" onClick={() => setFlyingRoomModal(null)}>
          <div className="flying-room-modal" onClick={e => e.stopPropagation()}>
            <div className="flying-room-header">
              <span className="flying-room-icon">✦</span>
              <span className="flying-room-title">{t('create_vapor_title')}</span>
              <button className="flying-room-close" onClick={() => setFlyingRoomModal(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <p className="flying-room-desc">{t('vapor_rooms_desc')}</p>
            <input
              className="flying-room-name-input"
              placeholder={t('room_name_ph')}
              value={flyingRoomName}
              onChange={e => setFlyingRoomName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && flyingRoomName.trim()) {
                  createFlyingRoom(flyingRoomModal.reelmId, flyingRoomModal.catId, flyingRoomName, flyingRoomDuration)
                  setFlyingRoomModal(null)
                }
                if (e.key === 'Escape') setFlyingRoomModal(null)
              }}
              autoFocus
            />
            <div className="flying-room-duration-label">{t('how_long_live')}</div>
            <div className="flying-room-durations">
              {FLYING_ROOM_DURATIONS.map(d => (
                <button
                  key={d.ms}
                  className={`flying-room-pill${flyingRoomDuration === d.ms ? ' flying-room-pill-active' : ''}`}
                  onClick={() => setFlyingRoomDuration(d.ms)}
                >{t(d.localeKey)}</button>
              ))}
            </div>
            <div className="flying-room-actions">
              <button className="flying-room-cancel" onClick={() => setFlyingRoomModal(null)}>{t('cancel')}</button>
              <button
                className="flying-room-create"
                disabled={!flyingRoomName.trim()}
                onClick={() => {
                  createFlyingRoom(flyingRoomModal.reelmId, flyingRoomModal.catId, flyingRoomName, flyingRoomDuration)
                  setFlyingRoomModal(null)
                }}
              >{t('create_room')}</button>
            </div>
          </div>
        </div>
      )}
      {openCategoryMenu && ReactDOM.createPortal(
        <div className="reelm-name-menu reelm-category-ctx-menu" style={{ top: openCategoryMenu.y, left: openCategoryMenu.x }}
          onMouseDown={e => e.stopPropagation()}>
          {openCategoryMenu.isAdmin && (
            <button className="reelm-name-menu-item" onClick={() => { addChannel(selectedReelm.id, openCategoryMenu.id); setOpenCategoryMenu(null) }}>
              ➕ {t('new_channel') || 'New channel'}
            </button>
          )}
          {openCategoryMenu.canVapor && (
            <button className="reelm-name-menu-item reelm-category-menu-flying" onClick={() => {
              setFlyingRoomModal({ reelmId: selectedReelm.id, catId: openCategoryMenu.id })
              setFlyingRoomName('')
              setFlyingRoomDuration(60 * 60 * 1000)
              setOpenCategoryMenu(null)
            }}>
              ✦ {t('create_vapor_room') || 'Create vapor room'}
            </button>
          )}
          <button className="reelm-name-menu-item" onClick={() => {
            toggleCategory(selectedReelm.id, openCategoryMenu.id)
            setOpenCategoryMenu(null)
          }}>
            {selectedReelm.categories?.find(c => c.id === openCategoryMenu.id)?.collapsed
              ? `▼ ${t('expand_category') || 'Expand Category'}`
              : `▲ ${t('collapse_category') || 'Collapse Category'}`
            }
          </button>
          <button className="reelm-name-menu-item" onClick={() => {
            const cat = selectedReelm.categories?.find(c => c.id === openCategoryMenu.id)
            if (cat?.channels) {
              cat.channels.forEach(ch => clearReelmChannelUnread(selectedReelm.id, ch.id))
            }
            setOpenCategoryMenu(null)
          }}>
            ✓ {t('mark_category_read') || 'Mark as Read'}
          </button>
        </div>,
        document.body
      )}
      {channelCtxMenu && ReactDOM.createPortal(
        <div
          className="reelm-name-menu reelm-channel-ctx-menu"
          style={{
            top: Math.max(8, Math.min(channelCtxMenu.y, window.innerHeight - (channelCtxMenu.isAuthorized ? 280 : 100))),
            left: Math.max(8, Math.min(channelCtxMenu.x, window.innerWidth - 200)),
            minWidth: 168
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {channelCtxMenu.isAuthorized ? (
            channelCtxMenu.isSubchannel ? (
              <>
                <button
                  type="button"
                  className="reelm-name-menu-item"
                  onClick={() => {
                    setEditingChannelId(channelCtxMenu.chId)
                    const sub = (selectedReelm?.categories || [])
                      .flatMap(c => c.channels || [])
                      .flatMap(ch => ch.subchannels || [])
                      .find(s => s.id === channelCtxMenu.chId)
                    setEditingChannelName(sub?.name || '')
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">✏️</span>
                  <span className="ctx-item-label">{t('edit_name') || 'Edit name'}</span>
                </button>

                {(channelCtxMenu.chType === 'text' || channelCtxMenu.chType === 'announcement' || !channelCtxMenu.chType) && (
                  <button
                    type="button"
                    className="reelm-name-menu-item"
                    onClick={() => {
                      const sub = (selectedReelm?.categories || [])
                        .flatMap(c => c.channels || [])
                        .flatMap(ch => ch.subchannels || [])
                        .find(s => s.id === channelCtxMenu.chId)
                      setShowMediaGallery({
                        kind: 'channel',
                        key: `${selectedReelm.id}_${channelCtxMenu.chId}`,
                        name: `#${sub?.name || 'channel'}`
                      })
                      setChannelCtxMenu(null)
                    }}
                  >
                    <span className="ctx-item-icon">🖼️</span>
                    <span className="ctx-item-label">{t('channel_media') || 'Channel media'}</span>
                  </button>
                )}

                <div className="ctx-menu-divider" />
                <button
                  type="button"
                  className="reelm-name-menu-item reelm-name-menu-item--danger"
                  onClick={() => {
                    deleteSubchannel(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.parentChId, channelCtxMenu.chId)
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">🗑️</span>
                  <span className="ctx-item-label">{t('delete_channel') || 'Delete channel'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="reelm-name-menu-item"
                  onClick={() => {
                    setEditingChannelId(channelCtxMenu.chId)
                    setEditingChannelName(selectedReelm.categories.flatMap(c => c.channels).find(ch => ch.id === channelCtxMenu.chId)?.name || '')
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">✏️</span>
                  <span className="ctx-item-label">{t('edit_name') || 'Edit name'}</span>
                </button>

                <button
                  type="button"
                  className="reelm-name-menu-item"
                  onClick={() => {
                    const ch = selectedReelm?.categories?.flatMap(c => c.channels || []).find(c => c.id === channelCtxMenu.chId)
                    setChannelPermissionsTarget({
                      reelmId: selectedReelm.id,
                      catId: channelCtxMenu.catId,
                      chId: channelCtxMenu.chId,
                      targetName: ch?.name || 'channel',
                      isCategory: false
                    })
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">🛡️</span>
                  <span className="ctx-item-label">{t('edit_permissions') || 'Edit permissions'}</span>
                </button>

                <button
                  type="button"
                  className="reelm-name-menu-item"
                  onClick={() => {
                    createSubchannel(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId)
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">➕</span>
                  <span className="ctx-item-label">{t('create_subchannel') || 'Create subchannel'}</span>
                </button>

                {(channelCtxMenu.chType === 'text' || channelCtxMenu.chType === 'announcement' || !channelCtxMenu.chType) && (
                  <button
                    type="button"
                    className="reelm-name-menu-item"
                    onClick={() => {
                      const ch = selectedReelm?.categories?.flatMap(c => c.channels || []).find(c => c.id === channelCtxMenu.chId)
                      setShowMediaGallery({
                        kind: 'channel',
                        key: `${selectedReelm.id}_${channelCtxMenu.chId}`,
                        name: `#${ch?.name || 'channel'}`
                      })
                      setChannelCtxMenu(null)
                    }}
                  >
                    <span className="ctx-item-icon">🖼️</span>
                    <span className="ctx-item-label">{t('channel_media') || 'Channel media'}</span>
                  </button>
                )}

                {channelCtxMenu.chType === 'voice' && (() => {
                  const ctxCh = selectedReelm?.categories.flatMap(c => c.channels).find(c => c.id === channelCtxMenu.chId)
                  const currentCap = ctxCh?.capacity ?? 8
                  return (
                    <div className="reelm-channel-ctx-capacity">
                      <div className="reelm-channel-ctx-capacity-label">{t('capacity') || 'Capacity'}</div>
                      <div className="reelm-channel-ctx-capacity-grid">
                        {[2, 4, 8, 16].map(cap => (
                          <button
                            key={cap}
                            type="button"
                            className={`reelm-channel-ctx-cap-btn${currentCap === cap ? ' active' : ''}`}
                            onClick={() => saveChannelCapacity(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId, cap)}
                          >{cap}</button>
                        ))}
                        <button
                          type="button"
                          className={`reelm-channel-ctx-cap-btn reelm-channel-ctx-cap-unlimited${currentCap === 0 ? ' active' : ''}`}
                          onClick={() => saveChannelCapacity(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId, 0)}
                        >{t('unlimited') || 'Unlimited'}</button>
                      </div>
                    </div>
                  )
                })()}

                <div className="ctx-menu-divider" />
                <button
                  type="button"
                  className={`reelm-name-menu-item reelm-name-menu-item--danger${channelCtxMenu.catChannelCount <= 1 ? ' reelm-channel-ctx-disabled' : ''}`}
                  disabled={channelCtxMenu.catChannelCount <= 1}
                  onClick={() => {
                    if (channelCtxMenu.catChannelCount <= 1) return
                    deleteChannel(selectedReelm.id, channelCtxMenu.catId, channelCtxMenu.chId)
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">🗑️</span>
                  <span className="ctx-item-label">{t('delete_channel') || 'Delete channel'}</span>
                </button>
              </>
            )
          ) : (
            <>
              {(channelCtxMenu.chType === 'text' || channelCtxMenu.chType === 'announcement' || !channelCtxMenu.chType) && (
                <button
                  type="button"
                  className="reelm-name-menu-item"
                  onClick={() => {
                    const ch = (selectedReelm?.categories || []).flatMap(c => c.channels || []).find(c => c.id === channelCtxMenu.chId) ||
                               (selectedReelm?.categories || []).flatMap(c => c.channels || []).flatMap(c => c.subchannels || []).find(s => s.id === channelCtxMenu.chId)
                    setShowMediaGallery({
                      kind: 'channel',
                      key: `${selectedReelm.id}_${channelCtxMenu.chId}`,
                      name: `#${ch?.name || 'channel'}`
                    })
                    setChannelCtxMenu(null)
                  }}
                >
                  <span className="ctx-item-icon">🖼️</span>
                  <span className="ctx-item-label">{t('channel_media') || 'Channel media'}</span>
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}
      {chatCtxMenu && ReactDOM.createPortal(
        <div
          className="reelm-name-menu reelm-channel-ctx-menu chat-ctx-menu"
          style={{
            top: Math.max(8, Math.min(chatCtxMenu.y, window.innerHeight - 260)),
            left: Math.max(8, Math.min(chatCtxMenu.x, window.innerWidth - 190)),
            minWidth: 168
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            className="reelm-name-menu-item"
            onClick={() => {
              if (getChatUnreadCount(chatCtxMenu.chat) > 0) {
                clearUnread(chatCtxMenu.chat.id)
              } else {
                setUnreadCounts(prev => ({ ...prev, [chatCtxMenu.chat.id]: 1 }))
              }
              setChatCtxMenu(null)
            }}
          >
            <span className="ctx-item-icon">{getChatUnreadCount(chatCtxMenu.chat) > 0 ? '✓' : '●'}</span>
            <span className="ctx-item-label">{getChatUnreadCount(chatCtxMenu.chat) > 0 ? (t('mark_as_read') || 'Mark as read') : (t('mark_as_unread') || 'Mark as unread')}</span>
          </button>

          <button
            type="button"
            className="reelm-name-menu-item"
            onClick={() => {
              toggleMuteChat?.(chatCtxMenu.chat.id)
              setChatCtxMenu(null)
            }}
          >
            <span className="ctx-item-icon">🔔</span>
            <span className="ctx-item-label">
              {mutedChatIds.map(String).includes(String(chatCtxMenu.chat.id))
                ? (t('unmute_chat') || 'Unmute chat')
                : (t('mute_chat') || 'Mute chat')}
            </span>
          </button>

          {chatCtxMenu.chat.type === 'dm' && chatCtxMenu.chat.friendId && (
            <button
              type="button"
              className="reelm-name-menu-item"
              onClick={() => {
                const friend = friends.find(f => String(f.id) === String(chatCtxMenu.chat.friendId)) || { id: chatCtxMenu.chat.friendId, name: chatCtxMenu.chat.name, photo: chatCtxMenu.chat.photo }
                setFullProfileTarget({ isSelf: false, user: friend })
                setChatCtxMenu(null)
              }}
            >
              <span className="ctx-item-icon">👤</span>
              <span className="ctx-item-label">{t('see_full_profile') || 'View profile'}</span>
            </button>
          )}

          <button
            type="button"
            className="reelm-name-menu-item"
            onClick={() => {
              setShowMediaGallery({
                kind: chatCtxMenu.chat.type,
                key: chatCtxMenu.chat.id,
                name: getChatDisplayName(chatCtxMenu.chat)
              })
              setChatCtxMenu(null)
            }}
          >
            <span className="ctx-item-icon">🖼️</span>
            <span className="ctx-item-label">{t('media') || 'Media'}</span>
          </button>

          <div className="ctx-menu-divider" />

          {chatCtxMenu.chat.type === 'dm' && chatCtxMenu.chat.friendId && (
            <button
              type="button"
              className="reelm-name-menu-item reelm-name-menu-item--danger"
              onClick={() => {
                blockUserFn({ id: chatCtxMenu.chat.friendId, name: chatCtxMenu.chat.name })
                setChatCtxMenu(null)
              }}
            >
              <span className="ctx-item-icon">🚫</span>
              <span className="ctx-item-label">{t('block') || 'Block'}</span>
            </button>
          )}

          <button
            type="button"
            className="reelm-name-menu-item reelm-name-menu-item--danger"
            onClick={() => {
              deleteConversation(chatCtxMenu.chat.id)
              setChatCtxMenu(null)
            }}
          >
            <span className="ctx-item-icon">🗑️</span>
            <span className="ctx-item-label">{t('delete_conversation') || 'Delete conversation'}</span>
          </button>
        </div>,
        document.body
      )}
      {channelPermissionsTarget && selectedReelm && (
        <ChannelPermissionsModal
          reelm={selectedReelm}
          target={channelPermissionsTarget}
          onClose={() => setChannelPermissionsTarget(null)}
          onSave={(updated) => updateReelm(updated)}
        />
      )}
      {eventCtxMenu && ReactDOM.createPortal(
        <div
          className="reelm-name-menu reelm-channel-ctx-menu event-ctx-menu"
          style={{
            top: Math.max(8, Math.min(eventCtxMenu.y, window.innerHeight - 160)),
            left: Math.max(8, Math.min(eventCtxMenu.x, window.innerWidth - 190)),
            minWidth: 168
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {eventCtxMenu.isAuthorized && (
            <button
              type="button"
              className="reelm-name-menu-item"
              onClick={() => {
                setShowCreateEventModal(eventCtxMenu.reelmId)
                setEventCtxMenu(null)
              }}
            >
              <span className="ctx-item-icon">➕</span>
              <span className="ctx-item-label">{t('create_event') || 'Create event'}</span>
            </button>
          )}
          <button
            type="button"
            className="reelm-name-menu-item"
            onClick={() => {
              setShowAllEventsModal(eventCtxMenu.reelmId)
              setEventCtxMenu(null)
            }}
          >
            <span className="ctx-item-icon">📅</span>
            <span className="ctx-item-label">{t('view_all_events') || 'View all events'}</span>
          </button>
        </div>,
        document.body
      )}
      {showCreateEventModal && (() => {
        const targetReelm = reelms.find(r => r.id === showCreateEventModal) || selectedReelm
        return (
          <div className="invite-modal-overlay" onClick={() => setShowCreateEventModal(null)}>
            <div className="invite-modal reelm-event-modal" onClick={e => e.stopPropagation()}>
              <div className="invite-modal-title">{t('create_event') || 'Create Event'}</div>
              <div className="invite-modal-reelm-name">{targetReelm?.name || 'Reelm Event'}</div>
              <form onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.target)
                const title = fd.get('title')
                const description = fd.get('description')
                const start = fd.get('startTime')
                const location = fd.get('location')
                if (!title) return
                createReelmEvent(showCreateEventModal, {
                  title,
                  description,
                  startTime: start ? new Date(start).toISOString() : new Date(Date.now() + 86400000).toISOString(),
                  location
                })
              }}>
                <div className="invite-modal-code-label">{t('event_title') || 'Event Title'} *</div>
                <input name="title" className="invite-modal-search" placeholder="e.g. Community Game Night" required autoFocus style={{ marginBottom: 12 }} />

                <div className="invite-modal-code-label">{t('date_and_time') || 'Date & Time'} *</div>
                <input name="startTime" type="datetime-local" className="invite-modal-search" required defaultValue={new Date(Date.now() + 3600000).toISOString().slice(0, 16)} style={{ marginBottom: 12 }} />

                <div className="invite-modal-code-label">{t('location_or_room') || 'Location / Channel'}</div>
                <input name="location" className="invite-modal-search" placeholder="e.g. #general or Voice Room 1" style={{ marginBottom: 12 }} />

                <div className="invite-modal-code-label">{t('description') || 'Description'}</div>
                <textarea name="description" className="invite-modal-search" placeholder="What will happen in this event?" rows={3} style={{ resize: 'none', height: 70, marginBottom: 16 }} />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="invite-modal-copy-btn" onClick={() => setShowCreateEventModal(null)} style={{ background: 'rgba(var(--ta-rgb), 0.12)' }}>
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button type="submit" className="invite-modal-copy-btn">
                    {t('create') || 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
      {showAllEventsModal && (() => {
        const targetReelm = (selectedReelm && String(selectedReelm.id) === String(showAllEventsModal))
          ? selectedReelm
          : (reelms.find(r => String(r.id) === String(showAllEventsModal)) || selectedReelm)
        if (!targetReelm) return null
        const myMember = targetReelm.members?.find(m => m.userId === uid)
        const myRoles = (targetReelm.roles || []).filter(r => (myMember?.roleIds || []).includes(r.id))
        const isAuthorized = canManageReelmClient(targetReelm, uid) || myRoles.some(isManagerRoleClient)
        const events = Array.isArray(targetReelm.events) ? [...targetReelm.events] : []
        const sorted = events.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime())

        return (
          <div className="invite-modal-overlay" onClick={() => setShowAllEventsModal(null)}>
            <div className="invite-modal reelm-event-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div className="invite-modal-title">{t('reelm_events') || 'Reelm Events'}</div>
                {isAuthorized && (
                  <button
                    type="button"
                    className="invite-modal-copy-btn"
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    onClick={() => {
                      setShowAllEventsModal(null)
                      setShowCreateEventModal(targetReelm.id)
                    }}
                  >
                    + {t('create_event') || 'Create'}
                  </button>
                )}
              </div>
              <div className="invite-modal-reelm-name">{targetReelm.name}</div>

              <div className="reelm-events-modal-list" style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {sorted.length === 0 ? (
                  <div className="reelm-events-empty" style={{ padding: 24, textAlign: 'center' }}>
                    {t('no_upcoming_events') || 'No upcoming events for this Reelm.'}
                  </div>
                ) : (
                  sorted.map(ev => {
                    const isInterested = (ev.interestedUids || []).includes(uid)
                    const count = (ev.interestedUids || []).length
                    return (
                      <div key={ev.id} className="reelm-event-card" style={{ padding: 12 }}>
                        <div className="reelm-event-card-top">
                          <span className="reelm-event-date-badge">{formatEventTime(ev.startTime)}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              className={`reelm-event-rsvp-btn${isInterested ? ' reelm-event-rsvp-btn--active' : ''}`}
                              onClick={() => toggleEventInterest(targetReelm.id, ev.id)}
                            >
                              ★ {count > 0 ? `${count} Interested` : 'Interested'}
                            </button>
                            {isAuthorized && (
                              <button
                                type="button"
                                className="reelm-event-del-btn"
                                onClick={() => deleteReelmEvent(targetReelm.id, ev.id)}
                                title="Delete event"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="reelm-event-info" style={{ marginTop: 6 }}>
                          <span className="reelm-event-name" style={{ fontSize: '0.92rem' }}>{ev.title}</span>
                          {ev.location && <span className="reelm-event-location">📍 {ev.location}</span>}
                          {ev.description && <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.8 }}>{ev.description}</p>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" className="invite-modal-copy-btn" onClick={() => setShowAllEventsModal(null)}>
                  {t('close') || 'Close'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      {groupCropModal && (
        <ProfileMediaCropModal
          file={groupCropModal}
          kind="photo"
          onApply={async (croppedFile) => {
            setGroupCropModal(null)
            try {
              const photo = await uploadProfileImageFile(croppedFile, 'group-avatar')
              if (selectedChat?.id) {
                const updatedChats = chats.map(c => c.id === selectedChat.id ? { ...c, photo } : c)
                setChats(updatedChats)
                setSelectedChat(prev => prev ? { ...prev, photo } : null)
                appPutDoc('chats', updatedChats).catch(() => {})
              }
            } catch (err) {
              console.warn('Group photo upload failed:', err)
            }
          }}
          onCancel={() => setGroupCropModal(null)}
          onChangeFile={newFile => setGroupCropModal(newFile)}
        />
      )}
      {showBlockedModal && (
        <div className="invite-modal-overlay" onClick={() => setShowBlockedModal(false)}>
          <div className="invite-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="invite-modal-title">Blocked Users</div>
            <div className="invite-modal-reelm-name" style={{ marginBottom: 12 }}>Users you have blocked</div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(!blocked || blocked.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.6, fontSize: '0.85rem' }}>
                  No blocked users.
                </div>
              ) : (
                blocked.map(b => (
                  <div key={b.id || b.userId} className="friend-row" style={{ padding: '8px 12px' }}>
                    <div className="friend-avatar" style={{ width: 34, height: 34 }}>
                      {getPersonPhoto(b)
                        ? <img src={getPersonPhoto(b)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : (b.displayName || b.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-info" style={{ flex: 1, minWidth: 0 }}>
                      <span className="friend-name">{b.displayName || b.name || 'User'}</span>
                      {b.username && <span className="friend-meta">@{b.username}</span>}
                    </div>
                    <button
                      type="button"
                      className="friend-add-btn"
                      style={{ background: 'rgba(var(--ta-rgb), 0.15)', borderColor: 'rgba(var(--ta-rgb), 0.3)', color: 'var(--ta)' }}
                      onClick={() => unblockUserFn(b.id || b.userId)}
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="invite-modal-copy-btn" onClick={() => setShowBlockedModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showQuickSwitcher && (
        <QuickSwitcherModal
          isOpen={showQuickSwitcher}
          onClose={() => setShowQuickSwitcher(false)}
          reelms={reelms}
          chats={chats}
          friends={friends}
          onSelectChannel={(r, ch) => {
            setSelectedReelm(r)
            setSelectedChannel(ch)
            setSelectedChat(null)
            setShowDiscover(false)
            setShowFriendsPanel(false)
            setShowSettings(false)
          }}
          onSelectChat={(chat) => {
            setSelectedChat(chat)
            setSelectedReelm(null)
            setSelectedChannel(null)
            setShowDiscover(false)
            setShowFriendsPanel(false)
            setShowSettings(false)
          }}
          onJoinVoice={(reelmId, channelId, channelName) => {
            joinVoiceChannel(reelmId, channelId, channelName)
          }}
        />
      )}
      {shareTarget && (
        <ShareModal
          target={shareTarget}
          onClose={() => setShareTarget(null)}
          activeTheme={activeTheme}
        />
      )}
      {channelFullToast && (
        <div className="channel-full-toast">{getT(language)('channel_full')}</div>
      )}
      {activeNudge && (
        <div className="nudge-toast">
          <div className="nudge-toast-title">
            <span style={{ fontSize: 20 }}>👋</span> {activeNudge.name} {t('nudge_msg')}
          </div>
          <div className="nudge-toast-actions">
            <button className="nudge-toast-btn" onClick={() => {
              sendNudge(activeNudge.id, activeNudge.name);
              setActiveNudge(null);
            }}>{t('nudge_back')}</button>
            <button className="nudge-toast-btn nudge-toast-btn--primary" onClick={() => {
              setActiveNudge(null);
              const f = friends.find(fr => fr.id === activeNudge.id) || { id: activeNudge.id, name: activeNudge.name };
              startDM(f);
            }}>{t('send_message_btn')}</button>
          </div>
        </div>
      )}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxImg} alt="" className="lightbox-img" />
            <div className="lightbox-bar">
              <a href={lightboxImg} download onClick={e => e.stopPropagation()} className="lightbox-btn" title="Download">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span>Download</span>
              </a>
              <button type="button" onClick={() => setLightboxImg(null)} className="lightbox-btn lightbox-btn--close" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {spotifyConnected && (
        <SpotifyPlayer
          uid={uid}
          onNowPlayingChange={setSpotifyNowPlaying}
          onControlsReady={controls => { spotifyControlsRef.current = controls }}
          onPlayerStateChange={({ paused }) => setSpotifyInlinePaused(paused)}
        />
      )}
      {currentUser && uid !== 'guest' && Boolean(currentUser.needsUsername || !currentUser.username || currentUser.username.trim() === '') && (
        <UsernameOnboardingModal
          currentUser={currentUser}
          onComplete={async (chosenUsername) => {
            await updateUserData({ username: chosenUsername, needsUsername: false, usernameConfirmed: true })
          }}
        />
      )}
    </div>
  )
}

function UsernameOnboardingModal({ currentUser, onComplete }) {
  const t = useT()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceTimerRef = useRef(null)

  const handleInputChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24)
    setUsername(val)
    setErrorMsg('')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    if (!val) {
      setStatus('idle')
      return
    }

    if (val.length < 3) {
      setStatus('invalid')
      setErrorMsg('Kullanıcı adı en az 3 karakter olmalıdır.')
      return
    }

    setStatus('checking')
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await userCheckUsername(val)
        if (res?.available) {
          setStatus('available')
          setErrorMsg('')
        } else {
          setStatus('taken')
          setErrorMsg('Bu kullanıcı adı zaten kullanımda.')
        }
      } catch {
        setStatus('idle')
      }
    }, 350)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const clean = username.trim().toLowerCase()
    if (isSubmitting || status === 'taken' || status === 'invalid' || clean.length < 3) return
    setIsSubmitting(true)
    setErrorMsg('')
    try {
      const res = await userCheckUsername(clean)
      if (!res?.available) {
        setStatus('taken')
        setErrorMsg('Bu kullanıcı adı zaten kullanımda.')
        setIsSubmitting(false)
        return
      }
      await onComplete(clean)
    } catch (err) {
      setErrorMsg(err?.message || 'Kullanıcı adı kaydedilemedi. Lütfen tekrar deneyin.')
      setIsSubmitting(false)
    }
  }

  const photo = getPersonPhoto(currentUser)
  const displayName = currentUser?.name || currentUser?.displayName || 'User'

  return (
    <div className="onboarding-modal-overlay">
      <div className="onboarding-modal-card">
        <div className="onboarding-avatar-wrap">
          {photo ? (
            <img src={photo} alt="" className="onboarding-avatar-img" />
          ) : (
            <div className="onboarding-avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="onboarding-title">Reelms'e Hoş Geldin!</h2>
        <p className="onboarding-subtitle">
          Merhaba <strong>{displayName}</strong>, topluluğa katılmak için lütfen benzersiz bir kullanıcı adı belirle.
        </p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className={`onboarding-input-wrap${status === 'available' ? ' onboarding-input-wrap--valid' : status === 'taken' || status === 'invalid' ? ' onboarding-input-wrap--error' : ''}`}>
            <span className="onboarding-prefix">@</span>
            <input
              type="text"
              className="onboarding-input"
              placeholder="kullanici_adi"
              value={username}
              onChange={handleInputChange}
              autoFocus
              maxLength={24}
              disabled={isSubmitting}
            />
            {status === 'checking' && (
              <span className="onboarding-spinner" />
            )}
            {status === 'available' && (
              <span className="onboarding-check-icon">✓</span>
            )}
          </div>

          {errorMsg && <p className="onboarding-error-text">{errorMsg}</p>}
          {status === 'available' && <p className="onboarding-success-text">@{username} kullanılabilir!</p>}

          <button
            type="submit"
            className="onboarding-submit-btn"
            disabled={isSubmitting || username.length < 3 || status === 'taken' || status === 'invalid' || status === 'checking'}
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Devam Et'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SignUpScreen({ onSignUpComplete, onGoBack }) {
  const t = useT()
  const [step, setStep] = useState(1)
  const [exiting, setExiting] = useState(false)
  const [contactType] = useState('email')
  const [contact, setContact] = useState('')
  const [inputError, setInputError] = useState('')
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [name, setName] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [dateError, setDateError] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [legalModal, setLegalModal] = useState(null) // 'terms' | 'privacy' | null

  const isAtLeast14 = () => {
    if (!day || !month || !year) return false
    const birthDate = new Date(year, month - 1, day)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 14
    }
    return age >= 14
  }

  const handleGoogleSignUp = () => {
    if (isElectron) electronSignInWithGoogle()
    else webSignInWithGoogle()
  }

  const createAccount = async () => {
    if (isCreating) return

    if (!password.trim()) {
      setPasswordError('Please enter a password.')
      return
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }

    setIsCreating(true)
    setPasswordError('')

    try {
      const cred = isElectron
        ? await electronRegister(contact.trim(), password, { username: username.trim(), displayName: name.trim(), name: name.trim() })
        : await webRegister(contact.trim(), password, { username: username.trim(), displayName: name.trim(), name: name.trim() })

      if (cred.emailVerificationRequired) {
        setIsCreating(false)
        setSuccessMsg('Account created! Check your e-mail to verify before signing in.')
        setTimeout(() => onGoBack?.(), 2500)
        return
      }

      const userData = {
        ...(cred.profile || {}),
        id: cred.user.uid,
        uid: cred.user.uid,
        name: name.trim(),
        displayName: name.trim(),
        username: username.trim(),
        birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        contactType,
        contact: contact.trim(),
        createdAt: cred.profile?.createdAt || new Date().toISOString(),
        updatedAt: Date.now(),
        notifyNewDevice: cred.profile?.notifyNewDevice ?? true
      }

      await userProfilePut(userData)
      try {
        await recordUserSession(parseDeviceInfo, userData.notifyNewDevice)
      } catch { /* noop */ }

      setIsCreating(false)
      onSignUpComplete()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use' || err.code === 'auth/email-taken') {
        setPasswordError('This e-mail is already in use.')
      } else if (err.code === 'auth/username-taken') {
        setPasswordError('This username is already taken. Please go back and choose another username.')
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('Password must be at least 8 characters long.')
      } else if (err.code === 'auth/invalid-email') {
        setPasswordError('Please enter a valid e-mail address.')
      } else if (err.code === 'auth/invalid-username') {
        setPasswordError('Username must be 3-30 characters and use letters, numbers, dots, dashes or underscores.')
      } else {
        setPasswordError('Account creation failed. Please try again.')
      }
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    if (step === 1) { onGoBack?.(); return }
    setExiting(true)
    setTimeout(() => { setStep(s => s - 1); setExiting(false) }, 360)
  }

  const handleContinue = async () => {
    if (isChecking || exiting) return
    if (step <= 3) {
      if (step === 1) {
        if (!name.trim()) { setInputError('Please enter your name.'); return }
        if (!day || !month || !year) { setDateError('Please select your complete date of birth.'); return }
        if (!isAtLeast14()) { setDateError('You must be at least 14 years old to create an account.'); return }
      }
      if (step === 2) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) {
          setInputError('Please enter a valid e-mail address.')
          return
        }
        setIsChecking(true)
        try {
          const result = await userCheckEmail(contact.trim())
          if (result?.exists || result === false) { setInputError('This e-mail is already in use.'); setIsChecking(false); return }
        } catch { /* sunucuya ulaşılamazsa devam et */ }
        setIsChecking(false)
      }
      if (step === 3) {
        if (!username.trim()) { setUsernameError('Please choose a username.'); return }
        if (username.length < 3) { setUsernameError('Username must be at least 3 characters long.'); return }
        if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
          setUsernameError('Username can only contain letters, numbers, dashes, and underscores.')
          return
        }
        setIsChecking(true)
        try {
          const result = await userCheckUsername(username.trim())
          if (result?.exists || result === false) { setUsernameError('This username is already taken.'); setIsChecking(false); return }
        } catch { /* sunucuya ulaşılamazsa devam et */ }
        setIsChecking(false)
      }
      setInputError('')
      setDateError('')
      setUsernameError('')
      setExiting(true)
      setTimeout(() => { setStep(s => s + 1); setExiting(false) }, 360)
    }
  }


  const handleStepEnter = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (step === 4) createAccount()
    else handleContinue()
  }

  return (
    <div className='main-content'>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }} className='su-drop su-drop-1'>
        <button
          onClick={handleBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,152,135,0.7)', padding: '4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className='welcome-text' style={{ margin: 0 }}>Let's create your account.</h1>
      </div>
      <div className='signin-card-border su-drop su-drop-2'>
        <div className='signin-card'>
          {step === 1 && (
            <>
              <input
                type='text'
                className={`pill-input${exiting ? ' su-erase' : ''}`}
                placeholder='Your name'
                value={name}
                onChange={e => { setName(e.target.value); setInputError('') }}
                onKeyDown={handleStepEnter}
                autoFocus
              />
              {inputError && (
                <p className='su-fadein input-error' style={{ animationDelay: '40ms' }}>{inputError}</p>
              )}
              <p className={`signup-hint su-fadein${exiting ? ' su-erase' : ''}`} style={{ animationDelay: '80ms', marginTop: '16px' }}>
                When's your birthday?
              </p>
              <DatePicker
                day={day}
                month={month}
                year={year}
                onDayChange={(d) => { setDay(d); setDateError('') }}
                onMonthChange={(m) => { setMonth(m); setDateError('') }}
                onYearChange={(y) => { setYear(y); setDateError('') }}
                error={dateError}
                onKeyDown={handleStepEnter}
              />
            </>
          )}
          {step === 2 && (
            <>
              <input
                type='email'
                className={`pill-input su-fadein${exiting ? ' su-erase' : ''}`}
                placeholder='E-mail'
                value={contact}
                onChange={e => { setContact(e.target.value); setInputError('') }}
                onKeyDown={handleStepEnter}
                autoFocus
              />
              {inputError && (
                <p className='su-fadein input-error'>{inputError}</p>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <input
                type='text'
                className={`pill-input su-fadein${exiting ? ' su-erase' : ''}`}
                placeholder='Choose a username'
                value={username}
                onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                onKeyDown={handleStepEnter}
                autoFocus
              />
              {usernameError && (
                <p className='su-fadein input-error' style={{ animationDelay: '40ms' }}>{usernameError}</p>
              )}
              <p className={`signup-hint su-fadein${exiting ? ' su-erase' : ''}`} style={{ animationDelay: '80ms', marginTop: '12px' }}>
                3+ characters, letters, numbers, dashes, underscores only.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <div className='password-input-wrapper su-fadein'>
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  className='pill-input'
                  placeholder='Password'
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                  onKeyDown={handleStepEnter}
                  autoFocus
                  disabled={isCreating}
                />
                <button
                  className='eye-btn'
                  type='button'
                  onClick={() => setShowSignUpPassword(v => !v)}
                  tabIndex={-1}
                  disabled={isCreating}
                >
                  <EyeIcon open={showSignUpPassword} />
                </button>
              </div>
              {passwordError && (
                <p className='su-fadein input-error' style={{ animationDelay: '40ms' }}>{passwordError}</p>
              )}
              {successMsg && (
                <p className='su-fadein' style={{ animationDelay: '40ms', color: '#7ecb8f', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0' }}>{successMsg}</p>
              )}
              <p className='signup-hint su-fadein' style={{ animationDelay: '80ms' }}>
                Choose a strong password.
              </p>
            </>
          )}
          {step === 4 && (
            <p style={{ fontSize: '0.72rem', color: 'rgba(var(--ta-rgb), 0.45)', textAlign: 'center', margin: '12px 0 8px', lineHeight: 1.5 }}>
              {t('legal_consent_1')}
              <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(var(--ta-rgb), 0.7)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>{t('terms_of_service')}</button>
              {t('legal_consent_2')}
              <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(var(--ta-rgb), 0.7)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>{t('privacy_policy')}</button>
              {t('legal_consent_3')}
            </p>
          )}
          <button
            className='pill-btn-text'
            onClick={step === 4 ? createAccount : handleContinue}
            style={{ paddingTop: '4px', marginTop: step === 1 ? '24px' : '0', display: 'grid', placeItems: 'center' }}
            disabled={isCreating || isChecking}
          >
            {step === 4 ? (
              <>
                <span style={{ opacity: isCreating ? 0 : 1, gridArea: '1/1' }}>Create Account</span>
                {isCreating && (
                  <div style={{
                    gridArea: '1/1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={reelmsLogo}
                      alt="Creating account"
                      style={{
                        height: '20px',
                        animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
      <div className='social-login' style={{ marginTop: '28px' }}>
        <button className='social-btn social-btn-wide' onClick={handleGoogleSignUp} disabled={isCreating}><GoogleIcon /><span>Continue with Google</span></button>
      </div>
      <LegacyAuthDownloadCta compact />

      {legalModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={() => setLegalModal(null)}>
          <div style={{ background: 'var(--panel-bg, #1a1a2e)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '90%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                {legalModal === 'terms' ? t('terms_of_service') : t('privacy_policy')}
              </span>
              <button onClick={() => setLegalModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(var(--ta-rgb),0.5)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', color: 'rgba(var(--ta-rgb),0.7)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              {legalModal === 'terms' ? (
                <>
                  <p>{t('last_updated')}</p>
                  <p>{t('terms_intro')}</p>
                  <p><strong>{t('terms_s1_title')}</strong><br />{t('terms_s1_body')}</p>
                  <p><strong>{t('terms_s2_title')}</strong><br />{t('terms_s2_body')}</p>
                  <p><strong>{t('terms_s3_title')}</strong><br />{t('terms_s3_body')}</p>
                  <p><strong>{t('terms_s4_title')}</strong><br />{t('terms_s4_body')}</p>
                  <p>{t('legal_contact')}</p>
                </>
              ) : (
                <>
                  <p>{t('last_updated')}</p>
                  <p>{t('privacy_intro')}</p>
                  <p><strong>{t('privacy_s1_title')}</strong><br />{t('privacy_s1_body')}</p>
                  <p><strong>{t('privacy_s2_title')}</strong><br />{t('privacy_s2_body')}</p>
                  <p><strong>{t('privacy_s3_title')}</strong><br />{t('privacy_s3_body')}</p>
                  <p><strong>{t('privacy_s4_title')}</strong><br />{t('privacy_s4_body')}</p>
                  <p><strong>{t('privacy_s5_title')}</strong><br />{t('privacy_s5_body')}</p>
                  <p>{t('legal_contact')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const REPORT_REASONS = [
  'Spam',
  'Harassment or hate speech',
  'Inappropriate content',
  'Misinformation',
  'Violence or threats',
  'Other',
]

function DeepLinkRedirect({ type }) {
  const params = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const value = params.code || params.username || params.channelId || params.postId
    sessionStorage.setItem('reelms_pending_deeplink', JSON.stringify({ type, value }))
    const loggedIn = isElectron ? !!getElectronCurrentUser() : !!getWebCurrentUser()
    navigate(loggedIn ? '/dashboard' : '/signin', { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

// ─── Toast notification system ────────────────────────────────────────────────

function ToastPill({ toast, onDismiss, onNavigate }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (toast.persistent) return
    const t1 = setTimeout(() => setExiting(true), 4550)
    const t2 = setTimeout(() => onDismiss(), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id])

  const handleClick = () => {
    if (toast.action) { toast.action.fn(); onDismiss(); return }
    if (toast.link && onNavigate) onNavigate(toast.link)
    onDismiss()
  }

  return (
    <div
      className={`toast-pill toast-pill--clickable${exiting ? ' toast-pill--exiting' : ''}`}
      onClick={handleClick}
      role="button"
    >
      <span className="toast-pill-text">{toast.text}</span>
      {toast.action && (
        <button className="toast-pill-action" onClick={e => { e.stopPropagation(); toast.action.fn(); onDismiss() }}>
          {toast.action.label}
        </button>
      )}
      <button
        className="toast-pill-dismiss"
        onClick={e => { e.stopPropagation(); onDismiss() }}
        aria-label="Dismiss"
      >✕</button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss, onNavigate }) {
  const MAX = 8
  const visible = toasts.slice(0, MAX)
  const overflow = toasts.length - MAX
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {overflow > 0 && (
        <div className="toast-deck-extra">+{overflow} more</div>
      )}
      {visible.map(t => (
        <ToastPill key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function App() {
  const authSession = useCentralAuthSession()
  const [visible, setVisible] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    authSession.isAuthenticated || (isElectron ? !!getElectronCurrentUser() : !!getWebCurrentUser())
  )
  const [isShaking, setIsShaking] = useState(false)
  const [appToasts, setAppToasts] = useState([])
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const pushAppToast = useCallback(({ id, text, link = null, action = null, persistent = false }) => {
    const toastId = id || `at_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setAppToasts(prev => [{ id: toastId, text, link, action, persistent }, ...prev].slice(0, 8))
  }, [])

  const dismissAppToast = useCallback((id) => {
    setAppToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Version update check — runs at app start regardless of login state
  useEffect(() => {
    if (window.electronAPI) return
    let baseVersion = null
    let toastShown = false
    const check = async () => {
      try {
        const res = await fetch('/version.json?_=' + Date.now())
        if (!res.ok) return
        const data = await res.json()
        if (baseVersion === null) { baseVersion = data.v; return }
        if (data.v !== baseVersion && !toastShown) {
          toastShown = true
          setUpdateAvailable(true)
          pushAppToast({
            id: 'app-update',
            text: 'A new update is available',
            persistent: true,
            action: { label: 'Reload', fn: () => window.location.reload() },
          })
        }
      } catch { /* noop */ }
    }
    check()
    const id = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [pushAppToast])

  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem('reelms_lang')
    const defaultLanguage = 'en'

    if (!storedLanguage) {
      localStorage.setItem('reelms_lang', defaultLanguage)
      return defaultLanguage
    }

    return storedLanguage
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (authSession.status === 'authenticated') setIsLoggedIn(true)
    if (authSession.status === 'guest') setIsLoggedIn(false)
  }, [authSession.status])

  const updateLanguage = (code) => {
    setLanguage(code)
    localStorage.setItem('reelms_lang', code)
  }

  const t = getT(language)

  useEffect(() => {
    if (isElectron) document.body.classList.add('is-desktop-app')
    seedModerationAccount()
    return isElectron
      ? electronOnAuthStateChanged((u) => setIsLoggedIn(!!u))
      : webOnAuthStateChanged((u) => setIsLoggedIn(!!u))
  }, [])

  const navigateTo = (path) => {
    setVisible(false)
    setTimeout(() => {
      navigate(path)
      setVisible(true)
    }, 320)
  }

  const handleSignUpComplete = () => {
    authSession.refreshSession?.()
    setIsLoggedIn(true)
    navigate('/dashboard')
  }

  const handleSignInSuccess = () => {
    authSession.refreshSession?.()
    setIsLoggedIn(true)
    navigate('/dashboard')
  }

  const handleLogOut = async () => {
    await authSession.signOut()
    setIsLoggedIn(false)
    navigateTo('/signin')
  }

  const [showSplash, setShowSplash] = useState(true)
  const [splashFading, setSplashFading] = useState(false)

  useEffect(() => {
    if (!showSplash) return
    const fadeTimer = setTimeout(() => {
      setSplashFading(true)
    }, 1050)
    const hideTimer = setTimeout(() => {
      setShowSplash(false)
    }, 1550)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [showSplash])

  return (
    <div className={`app ${isShaking ? 'app-shake-active' : ''}`}>
      {showSplash && (
        <div className={`app-intro-splash${splashFading ? ' app-intro-splash--fade' : ''}`} aria-hidden="true">
          <div className="app-intro-splash-inner">
            <div className="app-intro-logo-glow" />
            <img src={reelmsLogo} alt="Reelms" className="app-intro-logo-img" />
          </div>
        </div>
      )}
      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0); opacity: 0; }
          80%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dropIn {
          0%   { transform: scale(0.72); opacity: 0; filter: blur(2px); }
          65%  { transform: scale(1.04); opacity: 1; filter: blur(0px); }
          100% { transform: scale(1);    opacity: 1; filter: blur(0px); }
        }
        .su-drop {
          animation: dropIn 0.55s cubic-bezier(0.34, 1.38, 0.64, 1) both;
        }
        .su-drop-1 { animation-delay: 0ms; }
        .su-drop-2 { animation-delay: 95ms; }
        .su-drop-3 { animation-delay: 180ms; }
        .su-drop-4 { animation-delay: 260ms; }
        @keyframes eraseOut {
          0%   { opacity: 1; filter: blur(0px); transform: scale(1); }
          35%  { opacity: 0.5; filter: blur(3px); }
          100% { opacity: 0; filter: blur(9px); transform: scale(0.94); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .su-erase { animation: eraseOut 0.36s ease forwards; pointer-events: none; }
        .su-fadein { animation: fadeIn 0.38s ease both; }
        .signup-hint { margin: 0; font-size: 0.8rem; color: rgba(185, 152, 135, 0.55); text-align: center; line-height: 1.4; }
        .toggle-contact { font-size: 0.8rem; color: rgba(185, 152, 135, 0.55); text-align: center; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .toggle-contact:hover { color: #b99887; }
        .input-error { margin: 0; font-size: 0.78rem; color: rgba(220, 90, 70, 0.9); text-align: center; }
        
        .date-picker-container {
          animation: fadeIn 0.38s ease both;
          animation-delay: 120ms;
        }
        .date-inputs-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          margin-bottom: 8px;
        }
        .date-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid rgba(185, 152, 135, 0.2);
          border-radius: 20px;
          background-color: rgba(24, 18, 32, 0.72);
          color: rgba(245, 226, 214, 0.92);
          font-size: 0.9rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }
        .date-input:hover {
          border-color: rgba(185, 152, 135, 0.35);
          background-color: rgba(38, 28, 50, 0.86);
        }
        .date-input:focus {
          border-color: #b99887;
          background-color: rgba(45, 32, 58, 0.96);
          box-shadow: 0 0 0 3px rgba(185, 152, 135, 0.1);
        }
        .date-input option {
          background-color: #15111f;
          color: rgba(245, 226, 214, 0.95);
          padding: 8px;
        }

      `}</style>
      <LanguageContext.Provider value={t}>
      <Routes>
        <Route path="/dashboard" element={isLoggedIn ? <DashboardScreen onLogOut={handleLogOut} onShake={setIsShaking} language={language} onLanguageChange={updateLanguage} updateAvailable={updateAvailable} pushToast={pushAppToast} /> : <Navigate to="/signin" replace />} />
        <Route path="/signin" element={
          isLoggedIn ? <Navigate to="/dashboard" replace /> : (
            <>
              <div className="auth-floating-logos" aria-hidden="true">
                <div className="auth-floating-logo auth-logo-1"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-2"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-3"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-4"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-5"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-6"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-7"><img src={reelmsLogo} alt="" /></div>
              </div>
              <header className="app-header">
                <div className="logo-area">
                  <img src={reelmsLogo} alt="Reelms Logo" className="logo" />
                </div>
              </header>
              <main className="app-main">
                <div style={{ width: '100%', maxWidth: '420px', opacity: visible ? 1 : 0, transition: 'opacity 0.32s ease' }}>
                  <SignInScreen onGoSignUp={() => navigateTo('/signup')} onSignInSuccess={handleSignInSuccess} />
                </div>
              </main>
              <AuthLanguagePicker language={language} onLanguageChange={updateLanguage} />
              <div style={{ position: 'absolute', bottom: '30px', right: '30px', opacity: 0.5, fontSize: '12px', pointerEvents: 'none', letterSpacing: '0.02em' }}>
                Reelms from Sun Intelligence
              </div>
            </>
          )
        } />
        <Route path="/signup" element={
          isLoggedIn ? <Navigate to="/dashboard" replace /> : (
            <>
              <div className="auth-floating-logos" aria-hidden="true">
                <div className="auth-floating-logo auth-logo-1"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-2"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-3"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-4"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-5"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-6"><img src={reelmsLogo} alt="" /></div>
                <div className="auth-floating-logo auth-logo-7"><img src={reelmsLogo} alt="" /></div>
              </div>
              <header className="app-header">
                <div className="logo-area">
                  <img src={reelmsLogo} alt="Reelms Logo" className="logo" />
                </div>
              </header>
              <main className="app-main">
                <div style={{ width: '100%', maxWidth: '420px', opacity: visible ? 1 : 0, transition: 'opacity 0.32s ease' }}>
                  <SignUpScreen onSignUpComplete={handleSignUpComplete} onGoBack={() => navigateTo('/signin')} />
                </div>
              </main>
              <AuthLanguagePicker language={language} onLanguageChange={updateLanguage} />
              <div style={{ position: 'absolute', bottom: '30px', right: '30px', opacity: 0.5, fontSize: '12px', pointerEvents: 'none', letterSpacing: '0.02em' }}>
                Reelms from Sun Intelligence
              </div>
            </>
          )
        } />
        <Route path="/r/:code" element={<DeepLinkRedirect type="reelm" />} />
        <Route path="/u/:username" element={<DeepLinkRedirect type="user" />} />
        <Route path="/c/:channelId" element={<DeepLinkRedirect type="channel" />} />
        <Route path="/p/:postId" element={<DeepLinkRedirect type="post" />} />
        <Route path="*" element={<Navigate to={isLoggedIn ? '/dashboard' : '/signin'} replace />} />
      </Routes>
      </LanguageContext.Provider>
      {appToasts.length > 0 && (
        <ToastStack toasts={appToasts} onDismiss={dismissAppToast} onNavigate={null} />
      )}
    </div>
  )
}
// ─── Share helpers ───────────────────────────────────────────────────────────

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateShareUrl(type, data) {
  switch (type) {
    case 'reelm':   return `${getPublicWebUrl()}/r/${data.code}`
    case 'user':    return `${getPublicWebUrl()}/u/${data.username}`
    case 'post':    return `${getPublicWebUrl()}/p/${generateRandomString(26)}`
    case 'article': return `${getPublicWebUrl()}/p/article/${generateRandomString(14)}`
    case 'topic':   return `${getPublicWebUrl()}/p/topic/${generateRandomString(14)}`
    case 'news':    return `${getPublicWebUrl()}/p/news/${generateRandomString(14)}`
    case 'group':   return `${getPublicWebUrl()}/r/${generateRandomString(6)}`
    default:        return `${getPublicWebUrl()}/p/${generateRandomString(26)}`
  }
}

function getShareLabel(type) {
  switch (type) {
    case 'reelm':
    case 'group':   return 'YOU ARE INVITED TO'
    case 'post':    return 'POST'
    case 'user':    return 'PROFILE'
    case 'article': return 'ARTICLE'
    case 'news':    return 'NEWS'
    case 'topic':   return 'FORUM TOPIC'
    default:        return 'POST'
  }
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y)
      line = words[n] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, y)
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

function ShareModal({ target, onClose, activeTheme }) {
  const [selectedThemeId, setSelectedThemeId] = useState(activeTheme.id)
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => generateShareUrl(target.type, target.data || {}), [target])
  const canvasRef = useRef(null)

  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const theme = selectedThemeId === 'blur-bg'
      ? { accent: '#b99887', base: '#1a1512' }
      : (THEMES.find(t => t.id === selectedThemeId) || THEMES[0])
    const W = 360, H = 430
    canvas.width = W * 2
    canvas.height = H * 2
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)

    // Wait for web fonts (Dela Gothic One etc.) to be ready before drawing
    await document.fonts.ready

    const isBlurBg = selectedThemeId === 'blur-bg'

    // Pre-load cover image
    let loadedImg = null
    if (target.image) {
      loadedImg = await new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = target.image
      })
    }

    const accent = theme.accent

    // Background
    if (isBlurBg && loadedImg) {
      const overflow = 44
      const sc = Math.max((W + overflow * 2) / loadedImg.width, (H + overflow * 2) / loadedImg.height)
      const bw = loadedImg.width * sc
      const bh = loadedImg.height * sc
      ctx.save()
      ctx.filter = 'blur(26px) brightness(0.4) saturate(1.4)'
      ctx.drawImage(loadedImg, (W - bw) / 2, (H - bh) / 2, bw, bh)
      ctx.restore()
      ctx.fillStyle = 'rgba(0,0,0,0.38)'
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.fillStyle = theme.base
      ctx.fillRect(0, 0, W, H)
      const g1 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.9)
      g1.addColorStop(0, accent + '2A')
      g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, W, H)
      const g2 = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.65)
      g2.addColorStop(0, accent + '18')
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, W, H)
    }

    // Header: logo (natural aspect ratio) + "Reelms" text
    let logoTextX = 62
    try {
      await new Promise((resolve) => {
        const logoImg = new Image()
        logoImg.onload = () => {
          const ar = logoImg.naturalWidth / logoImg.naturalHeight
          const lh = 36, lw = lh * ar
          ctx.drawImage(logoImg, 20, 14 + (36 - lh) / 2, lw, lh)
          logoTextX = 20 + lw + 8
          resolve()
        }
        logoImg.onerror = resolve
        logoImg.src = reelmsLogo
      })
    } catch { /* noop */ }

    ctx.font = '400 18px "Dela Gothic One", serif'
    ctx.fillStyle = '#b99887'
    ctx.textAlign = 'left'
    ctx.fillText('Reelms', logoTextX, 38)

    // Header separator
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, 60)
    ctx.lineTo(W - 20, 60)
    ctx.stroke()

    // Cover image
    const imgPad = 20
    const imgX = imgPad, imgY = 72, imgW = W - imgPad * 2, imgH = 154, imgR = 14

    ctx.save()
    drawRoundRect(ctx, imgX, imgY, imgW, imgH, imgR)
    ctx.clip()
    if (loadedImg) {
      const sc = Math.max(imgW / loadedImg.width, imgH / loadedImg.height)
      const sw = loadedImg.width * sc, sh = loadedImg.height * sc
      ctx.drawImage(loadedImg, imgX + (imgW - sw) / 2, imgY + (imgH - sh) / 2, sw, sh)
    } else {
      ctx.fillStyle = accent + '20'
      ctx.fillRect(imgX, imgY, imgW, imgH)
    }
    ctx.restore()

    // Title
    const contentY = imgY + imgH + 30
    ctx.font = '400 22px "Dela Gothic One", serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    wrapCanvasText(ctx, target.title || '', imgPad, contentY, W - imgPad * 2, 28)

    // "Join this Reelm" CTA (single, no subtitle duplication)
    ctx.font = '500 13px sans-serif'
    ctx.fillStyle = isBlurBg ? 'rgba(255,255,255,0.75)' : accent
    ctx.textAlign = 'left'
    ctx.fillText('Join this Reelm →', imgPad, contentY + 56)

    // Footer divider
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, H - 36)
    ctx.lineTo(W - 20, H - 36)
    ctx.stroke()

    // URL
    ctx.font = '11px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.textAlign = 'left'
    ctx.fillText(shareUrl, 20, H - 15)
  }, [selectedThemeId, target, shareUrl])

  useEffect(() => { drawCard() }, [drawCard])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'reelms-share.png'
    a.click()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="menu-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <span className="share-modal-title">Share</span>
          <button className="share-modal-close" onClick={onClose}>✕</button>
        </div>
        <canvas ref={canvasRef} className="share-canvas" />
        <div className="share-theme-row">
          <button
            className={`share-theme-dot share-theme-dot--photo${selectedThemeId === 'blur-bg' ? ' share-theme-dot--active' : ''}`}
            style={{ background: 'linear-gradient(135deg, #3a2a1e 0%, #8a6850 100%)' }}
            title="Photo"
            onClick={() => setSelectedThemeId('blur-bg')}
          />
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`share-theme-dot${selectedThemeId === t.id ? ' share-theme-dot--active' : ''}`}
              style={{ background: t.accent }}
              title={t.name}
              onClick={() => setSelectedThemeId(t.id)}
            />
          ))}
        </div>
        <div className="share-actions">
          <button className="share-copy-btn" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
          <button className="share-download-btn" onClick={handleDownload}>
            Download
          </button>
        </div>
        <div className="share-social-row">
          <button className="share-social-btn" style={{ background: '#25D366' }}
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent((target.title || '') + ' ' + shareUrl)}`, '_blank')}>
            WhatsApp
          </button>
          <button className="share-social-btn" style={{ background: '#FF4500' }}
            onClick={() => window.open(`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(target.title || '')}`, '_blank')}>
            Reddit
          </button>
          <button className="share-social-btn" style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
            onClick={handleDownload}>
            Instagram ↓
          </button>
          <button className="share-social-btn" style={{ background: '#010101', border: '1px solid rgba(255,255,255,0.15)' }}
            onClick={handleDownload}>
            TikTok ↓
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
