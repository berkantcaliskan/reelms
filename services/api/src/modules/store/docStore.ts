import path from 'node:path'
import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'
import type { DocStoreDriver } from './types.js'
import { JsonDocStore } from './drivers/jsonDocStore.js'
import { PostgresDocStore } from './drivers/postgresDocStore.js'
import { SupabaseDocStore, isRetryableSupabaseError } from './drivers/supabaseDocStore.js'

export const APP_PK = 'APP#GLOBAL'

type StoreStatus = {
  configured: boolean
  ready: boolean
  driver: string | null
  initializing: boolean
  lastError: string | null
  lastReadyAt: string | null
  lastFailureAt: string | null
}

let driver: DocStoreDriver | null = null
let ready = false
let initializing: Promise<void> | null = null
let retryTimer: NodeJS.Timeout | null = null
let lastError: string | null = null
let lastReadyAt: string | null = null
let lastFailureAt: string | null = null
const readyHandlers = new Set<() => void | Promise<void>>()

function createDriver() {
  if (env.REELMS_STORAGE_DRIVER === 'postgres') {
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required when REELMS_STORAGE_DRIVER=postgres')
    return new PostgresDocStore(env.DATABASE_URL)
  }

  if (env.REELMS_STORAGE_DRIVER === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when REELMS_STORAGE_DRIVER=supabase')
    }
    return new SupabaseDocStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  }

  const filePath = path.resolve(process.cwd(), env.REELMS_DATA_DIR, 'doc-store.json')
  return new JsonDocStore(filePath)
}

function describeError(err: unknown) {
  return err instanceof Error ? err.message : String(err || 'unknown error')
}

function isRetryableInitError(err: unknown) {
  if (env.REELMS_STORAGE_DRIVER === 'supabase') return isRetryableSupabaseError(err)
  const message = describeError(err)
  return /timeout|timed out|abort|aborted|fetch failed|network|econnreset|etimedout|enotfound|eai_again/i.test(message)
}

function fireReadyHandlers() {
  for (const handler of readyHandlers) {
    Promise.resolve()
      .then(handler)
      .catch((err) => logger.error('doc store ready handler failed', err))
  }
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void initDocStore()
  }, Number(process.env.REELMS_DOCSTORE_RETRY_MS || 10_000))
  retryTimer.unref?.()
}

export async function initDocStore() {
  if (!driver) driver = createDriver()
  if (ready) return
  if (initializing) return initializing

  initializing = (async () => {
    try {
      await driver?.init?.()
      ready = true
      lastError = null
      lastReadyAt = new Date().toISOString()
      logger.info(`doc store ready driver=${driver?.name}`)
      fireReadyHandlers()
    } catch (err) {
      ready = false
      lastError = describeError(err)
      lastFailureAt = new Date().toISOString()

      if (!isRetryableInitError(err)) {
        logger.error(`doc store init failed driver=${driver?.name}`, err)
        throw err
      }

      logger.warn(`doc store temporarily unavailable driver=${driver?.name}; retry scheduled`, lastError)
      scheduleRetry()
    } finally {
      initializing = null
    }
  })()

  return initializing
}

function getDriver() {
  if (!driver) driver = createDriver()
  return driver
}

export function isDocStoreReady() {
  return ready
}

export function getDocStoreStatus(): StoreStatus {
  return {
    configured: Boolean(driver) || Boolean(env.REELMS_STORAGE_DRIVER),
    ready,
    driver: driver?.name ?? env.REELMS_STORAGE_DRIVER ?? null,
    initializing: Boolean(initializing),
    lastError,
    lastReadyAt,
    lastFailureAt
  }
}

export function onDocStoreReady(handler: () => void | Promise<void>) {
  readyHandlers.add(handler)
  if (ready) {
    Promise.resolve()
      .then(handler)
      .catch((err) => logger.error('doc store ready handler failed', err))
  }
  return () => readyHandlers.delete(handler)
}

export async function closeDocStore() {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
  await driver?.close?.()
}

export async function getDoc<T = unknown>(pk: string, sk: string): Promise<T | null> {
  return getDriver().getDoc<T>(pk, sk)
}

export async function putDoc<T = unknown>(pk: string, sk: string, data: T): Promise<void> {
  return getDriver().putDoc<T>(pk, sk, data)
}

export async function putDocIfAbsent<T = unknown>(pk: string, sk: string, data: T): Promise<boolean> {
  const activeDriver = getDriver()
  if (activeDriver.putDocIfAbsent) return activeDriver.putDocIfAbsent<T>(pk, sk, data)

  const existing = await activeDriver.getDoc<T>(pk, sk)
  if (existing !== null) return false
  await activeDriver.putDoc<T>(pk, sk, data)
  return true
}

export async function deleteDoc(pk: string, sk: string): Promise<void> {
  return getDriver().deleteDoc(pk, sk)
}

export async function queryDocs<T = unknown>(pk: string, skPrefix?: string) {
  return getDriver().queryDocs<T>(pk, skPrefix)
}

export async function scanByPkPrefix<T = unknown>(prefix: string) {
  return getDriver().scanByPkPrefix<T>(prefix)
}

export async function scanByPkPrefixAndSk<T = unknown>(prefix: string, sk: string, limit = 1000) {
  const activeDriver = getDriver()
  if (activeDriver.scanByPkPrefixAndSk) return activeDriver.scanByPkPrefixAndSk<T>(prefix, sk, limit)
  const rows = await activeDriver.scanByPkPrefix<T>(prefix)
  return rows.filter((row) => row.sk === sk).slice(0, limit)
}

export const userPk = (uid: string) => `USER#${uid}`
export const reelmPk = (reelmId: string) => `REELM#${reelmId}`
export const chanPk = (channelKey: string) => `CHAN#${channelKey}`
export const msgPk = (messageKey: string) => `MSG#${messageKey}`
