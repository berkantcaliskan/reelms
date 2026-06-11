import nacl from 'tweetnacl'

const DB_NAME = 'reelms_e2ee'
const STORE = 'keys'
const KEY_ID = 'identity'

type StoredKeyPair = { publicKey: string; secretKey: string }

function b64encode(buf: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
  return btoa(binary)
}

function b64decode(str: string): Uint8Array {
  const binary = atob(str)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(db: IDBDatabase, key: string): Promise<StoredKeyPair | null> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(db: IDBDatabase, key: string, value: StoredKeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

let cache: StoredKeyPair | null = null

export async function getOrCreateKeyPair(): Promise<StoredKeyPair> {
  if (cache) return cache
  const db = await openDb()
  const stored = await idbGet(db, KEY_ID)
  if (stored?.publicKey && stored?.secretKey) {
    cache = stored
    return stored
  }
  const kp = nacl.box.keyPair()
  const pair: StoredKeyPair = { publicKey: b64encode(kp.publicKey), secretKey: b64encode(kp.secretKey) }
  await idbPut(db, KEY_ID, pair)
  cache = pair
  return pair
}

export async function getKeyPair(): Promise<StoredKeyPair | null> {
  if (cache) return cache
  try {
    const db = await openDb()
    const stored = await idbGet(db, KEY_ID)
    if (stored) cache = stored
    return stored
  } catch {
    return null
  }
}

export function encryptForRecipient(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderSecretKeyB64: string,
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const msg = new TextEncoder().encode(plaintext)
  const ciphertext = nacl.box(msg, nonce, b64decode(recipientPublicKeyB64), b64decode(senderSecretKeyB64))
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce)
  combined.set(ciphertext, nonce.length)
  return b64encode(combined)
}

export function decryptFromSender(
  encryptedB64: string,
  senderPublicKeyB64: string,
  recipientSecretKeyB64: string,
): string | null {
  try {
    const combined = b64decode(encryptedB64)
    const nonce = combined.slice(0, nacl.box.nonceLength)
    const ciphertext = combined.slice(nacl.box.nonceLength)
    const plaintext = nacl.box.open(ciphertext, nonce, b64decode(senderPublicKeyB64), b64decode(recipientSecretKeyB64))
    if (!plaintext) return null
    return new TextDecoder().decode(plaintext)
  } catch {
    return null
  }
}
