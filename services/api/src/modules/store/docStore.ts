import path from 'node:path'
import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'
import type { DocStoreDriver } from './types.js'
import { JsonDocStore } from './drivers/jsonDocStore.js'
import { PostgresDocStore } from './drivers/postgresDocStore.js'
import { SupabaseDocStore } from './drivers/supabaseDocStore.js'

export const APP_PK = 'APP#GLOBAL'

let driver: DocStoreDriver | null = null

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

export async function initDocStore() {
  if (!driver) driver = createDriver()
  await driver.init?.()
  logger.info(`doc store ready driver=${driver.name}`)
}

function getDriver() {
  if (!driver) driver = createDriver()
  return driver
}

export async function closeDocStore() {
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

export const userPk = (uid: string) => `USER#${uid}`
export const reelmPk = (reelmId: string) => `REELM#${reelmId}`
export const chanPk = (channelKey: string) => `CHAN#${channelKey}`
export const msgPk = (messageKey: string) => `MSG#${messageKey}`
