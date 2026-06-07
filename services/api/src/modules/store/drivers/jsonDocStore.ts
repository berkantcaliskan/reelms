import fs from 'node:fs/promises'
import path from 'node:path'
import type { DocStoreDriver, QueryResult, StoreItem } from '../types.js'

type StoreShape = Record<string, StoreItem>

function key(pk: string, sk: string) {
  return `${pk}::${sk}`
}

export class JsonDocStore implements DocStoreDriver {
  readonly name = 'json'
  private loaded = false
  private store: StoreShape = {}
  private writeQueue = Promise.resolve()

  constructor(private readonly filePath: string) {}

  async init() {
    await this.ensureLoaded()
  }

  private async ensureLoaded() {
    if (this.loaded) return
    this.loaded = true
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      this.store = JSON.parse(raw) as StoreShape
    } catch {
      this.store = {}
    }
  }

  private async persist() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const snapshot = JSON.stringify(this.store, null, 2)
    this.writeQueue = this.writeQueue
      .then(() => fs.writeFile(this.filePath, snapshot, 'utf8'))
      .catch(() => fs.writeFile(this.filePath, snapshot, 'utf8'))
    await this.writeQueue
  }

  async getDoc<T = unknown>(pk: string, sk: string): Promise<T | null> {
    await this.ensureLoaded()
    const item = this.store[key(pk, sk)]
    return item ? (item.data as T) : null
  }

  async putDoc<T = unknown>(pk: string, sk: string, data: T) {
    await this.ensureLoaded()
    this.store[key(pk, sk)] = { pk, sk, data, updatedAt: Date.now() }
    await this.persist()
  }

  async putDocIfAbsent<T = unknown>(pk: string, sk: string, data: T) {
    await this.ensureLoaded()
    const storeKey = key(pk, sk)
    if (this.store[storeKey]) return false
    this.store[storeKey] = { pk, sk, data, updatedAt: Date.now() }
    await this.persist()
    return true
  }

  async deleteDoc(pk: string, sk: string) {
    await this.ensureLoaded()
    delete this.store[key(pk, sk)]
    await this.persist()
  }

  async queryDocs<T = unknown>(pk: string, skPrefix?: string): Promise<QueryResult<T>> {
    await this.ensureLoaded()
    return Object.values(this.store)
      .filter((item) => item.pk === pk && (!skPrefix || item.sk.startsWith(skPrefix)))
      .map((item) => ({ sk: item.sk, data: item.data as T, updatedAt: item.updatedAt }))
      .sort((a, b) => a.sk.localeCompare(b.sk))
  }

  async scanByPkPrefix<T = unknown>(prefix: string): Promise<Array<StoreItem<T>>> {
    await this.ensureLoaded()
    return Object.values(this.store)
      .filter((item) => item.pk.startsWith(prefix))
      .map((item) => ({ ...item, data: item.data as T }))
  }

  async scanByPkPrefixAndSk<T = unknown>(prefix: string, sk: string, limit = 1000): Promise<Array<StoreItem<T>>> {
    await this.ensureLoaded()
    return Object.values(this.store)
      .filter((item) => item.pk.startsWith(prefix) && item.sk === sk)
      .slice(0, limit)
      .map((item) => ({ ...item, data: item.data as T }))
  }
}
