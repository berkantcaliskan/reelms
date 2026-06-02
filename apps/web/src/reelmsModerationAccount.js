// Firebase/Firestore removed — seeding is a no-op until auth is re-implemented.

export const MODERATION_ACCOUNT_ID =
  import.meta.env.VITE_MODERATION_UID || '1cRIGeZIX3OhpoAKYgPvJFFAY3y1'

export const MODERATION_ACCOUNT = {
  id: MODERATION_ACCOUNT_ID,
  name: 'Reelms Moderation',
  username: '11111',
  contact: 'admin@reelms.io',
  contactType: 'email',
  isSystem: true,
  isModerator: true,
  accountPermanent: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

export function isModerationSystemUser(userOrUid) {
  if (!userOrUid) return false
  const id = typeof userOrUid === 'string' ? userOrUid : userOrUid.id
  return String(id) === String(MODERATION_ACCOUNT_ID)
}

export async function seedModerationAccount() {}
