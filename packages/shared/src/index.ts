export const REELMS_PROTOCOL = 'reelms'
export const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:5000'
export const DEFAULT_REMOTE_API_URL = 'https://api.reelms.io'

export type HealthResponse = {
  ok: boolean
  service: 'api'
  environment: string
  version: string
  time: string
}

export type ID = string

export type UserProfile = {
  id: ID
  uid?: ID
  username?: string
  displayName?: string
  name?: string
  email?: string
  photoURL?: string | null
  photo?: string | null
  createdAt?: number
  updatedAt?: number
}

export type Reelm = {
  id: ID
  name: string
  code?: string
  ownerId?: ID | null
  isDefault?: boolean
  createdAt: number
}

export type ReelmChannel = {
  id: ID
  name: string
  type: 'text' | 'voice' | 'announcement' | 'forum' | 'feed' | 'article' | string
  capacity?: number
  current?: number
}

export type ReelmCategory = {
  id: ID
  name: string
  type?: string
  icon?: string
  collapsed?: boolean
  channels: ReelmChannel[]
}

export type ReelmStructure = {
  categories: ReelmCategory[]
}

export type Message = {
  id: ID
  text?: string
  body?: string
  userId?: ID
  authorId?: ID
  createdAt?: number
  time?: number
  attachments?: unknown[]
  enc?: boolean
}

export type ApiErrorBody = {
  error: string
  message?: string
  details?: unknown
  issues?: unknown[]
}

export const socketEvents = {
  userDoc: 'reelms:doc',
  message: 'reelms:message',
  messageDeleted: 'reelms:message-deleted',
  reaction: 'reelms:reaction',
  vcEvent: 'vc:event',
  vcCount: 'vc:count',
  vcCounts: 'vc:counts'
} as const

export type ReelmsDocEvent =
  | { scope: 'user'; sk: string }
  | { scope: 'reelm'; reelmId: string; sk: string }
  | { scope: 'app'; sk: string }

export type RealtimeClientToServerEvents = {
  joinReelm: (reelmId: string) => void
  leaveReelm: (reelmId: string) => void
  joinChannel: (messageKey: string) => void
  leaveChannel: (messageKey: string) => void
  'vc:join': (payload: { reelmId: string; channelId: string; userName?: string; userPhoto?: string | null }) => void
  'vc:leave': (payload: { reelmId: string; channelId: string }) => void
  'vc:counts': (payload: { reelmId: string }) => void
  'vc:signal': (payload: { to: string; payload: Record<string, unknown> }) => void
  'vc:broadcast': (payload: { reelmId: string; channelId: string; payload: Record<string, unknown> }) => void
}

export type RealtimeServerToClientEvents = {
  'reelms:doc': (payload: ReelmsDocEvent) => void
  'reelms:message': (payload: { msgKey: string; message: Message }) => void
  'reelms:message-deleted': (payload: { msgKey: string; id: string }) => void
  'reelms:reaction': (payload: { msgKey: string; id: string; reactions: Record<string, unknown> }) => void
  'vc:event': (payload: Record<string, unknown>) => void
  'vc:count': (payload: { channelId: string; count: number }) => void
  'vc:counts': (payload: { reelmId: string; counts: Record<string, number> }) => void
}
