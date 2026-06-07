import type { DocStoreDriver, QueryResult, StoreItem } from '../types.js'

async function readMaybeJson(res: Response): Promise<any | null> {
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

const TABLE = 'reelms_docs'
const DEFAULT_TIMEOUT_MS = Math.max(3_000, Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS || 12_000))
const MAX_ERROR_BODY_CHARS = 500

type SupabaseRow<T = unknown> = {
  pk: string
  sk: string
  data: T
  updated_at: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertConfigured(url: string, serviceRoleKey: string) {
  if (!url || !serviceRoleKey) {
    throw new Error('SupabaseDocStore requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
}

function compactBody(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_ERROR_BODY_CHARS)
}

export function isRetryableSupabaseError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err || '')
  return /\b(408|409|425|429|500|502|503|504|520|521|522|523|524)\b/i.test(message)
    || /timeout|timed out|abort|aborted|fetch failed|network|econnreset|etimedout|enotfound|eai_again/i.test(message)
}

export class SupabaseDocStore implements DocStoreDriver {
  readonly name = 'supabase'
  private readonly restUrl: string
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number

  constructor(url: string, serviceRoleKey: string) {
    assertConfigured(url, serviceRoleKey)
    this.restUrl = `${url.replace(/\/$/, '')}/rest/v1/${TABLE}`
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
    this.timeoutMs = DEFAULT_TIMEOUT_MS
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const method = String(init.method || 'GET').toUpperCase()
    const canRetry = ['GET', 'HEAD'].includes(method)
    const maxAttempts = canRetry ? 4 : 1
    let lastError: unknown = null

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        const response = await fetch(url, {
          ...init,
          signal: init.signal ?? controller.signal,
          headers: {
            ...this.headers,
            ...(init.headers || {})
          }
        })

        if (!response.ok) {
          const text = compactBody(await response.text().catch(() => ''))
          const retryableStatus = response.status === 408 || response.status === 429 || response.status >= 500
          const error = new Error(`Supabase request failed ${response.status}: ${text || response.statusText}`)
          if (canRetry && retryableStatus && attempt < maxAttempts - 1) {
            lastError = error
            await sleep(350 * (attempt + 1))
            continue
          }
          throw error
        }

        if (response.status === 204) return null as T
        return readMaybeJson(response) as Promise<T>
      } catch (err) {
        lastError = err
        if (!canRetry || attempt >= maxAttempts - 1) {
          if (err instanceof Error && err.name === 'AbortError') {
            throw new Error(`Supabase request timed out after ${this.timeoutMs}ms`)
          }
          throw err
        }
        await sleep(350 * (attempt + 1))
      } finally {
        clearTimeout(timeout)
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Supabase request failed')
  }

  async init() {
    // Table must exist in Supabase SQL editor:
    // create table if not exists reelms_docs (
    //   pk text not null,
    //   sk text not null,
    //   data jsonb not null,
    //   updated_at bigint not null,
    //   primary key (pk, sk)
    // );
    // create index if not exists reelms_docs_pk_prefix_idx on reelms_docs (pk text_pattern_ops);
    // create index if not exists reelms_docs_updated_at_idx on reelms_docs (updated_at desc);
    await this.request<Array<{ pk: string }>>(`${this.restUrl}?select=pk&limit=1`)
  }

  async getDoc<T = unknown>(pk: string, sk: string): Promise<T | null> {
    const url = `${this.restUrl}?select=data&pk=eq.${encodeURIComponent(pk)}&sk=eq.${encodeURIComponent(sk)}&limit=1`
    const rows = await this.request<Array<{ data: T }>>(url)
    return rows[0]?.data ?? null
  }

  async putDoc<T = unknown>(pk: string, sk: string, data: T): Promise<void> {
    await this.request(`${this.restUrl}?on_conflict=pk,sk`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ pk, sk, data, updated_at: Date.now() })
    })
  }

  async putDocIfAbsent<T = unknown>(pk: string, sk: string, data: T): Promise<boolean> {
    const response = await fetch(this.restUrl, {
      method: 'POST',
      headers: {
        ...this.headers,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ pk, sk, data, updated_at: Date.now() })
    })

    if (response.ok) return true
    if (response.status === 409) return false

    const text = compactBody(await response.text().catch(() => ''))
    throw new Error(`Supabase insert-if-absent failed ${response.status}: ${text || response.statusText}`)
  }

  async deleteDoc(pk: string, sk: string): Promise<void> {
    const url = `${this.restUrl}?pk=eq.${encodeURIComponent(pk)}&sk=eq.${encodeURIComponent(sk)}`
    await this.request(url, { method: 'DELETE' })
  }

  async queryDocs<T = unknown>(pk: string, skPrefix?: string): Promise<QueryResult<T>> {
    let url = `${this.restUrl}?select=sk,data,updated_at&pk=eq.${encodeURIComponent(pk)}&order=sk.asc`
    if (skPrefix) url += `&sk=like.${encodeURIComponent(`${skPrefix}%`)}`
    const rows = await this.request<Array<SupabaseRow<T>>>(url)
    return rows.map((row) => ({ sk: row.sk, data: row.data, updatedAt: Number(row.updated_at) }))
  }

  async scanByPkPrefix<T = unknown>(prefix: string): Promise<Array<StoreItem<T>>> {
    const pageSize = 1000
    const allRows: Array<SupabaseRow<T>> = []
    for (let offset = 0; offset < 20000; offset += pageSize) {
      const url = `${this.restUrl}?select=pk,sk,data,updated_at&pk=like.${encodeURIComponent(`${prefix}%`)}&order=pk.asc,sk.asc&limit=${pageSize}&offset=${offset}`
      const rows = await this.request<Array<SupabaseRow<T>>>(url)
      allRows.push(...rows)
      if (rows.length < pageSize) break
    }
    return allRows.map((row) => ({ pk: row.pk, sk: row.sk, data: row.data, updatedAt: Number(row.updated_at) }))
  }

  async scanByPkPrefixAndSk<T = unknown>(prefix: string, sk: string, limit = 1000): Promise<Array<StoreItem<T>>> {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 1000, 5000))
    const url = `${this.restUrl}?select=pk,sk,data,updated_at&pk=like.${encodeURIComponent(`${prefix}%`)}&sk=eq.${encodeURIComponent(sk)}&order=updated_at.desc&limit=${safeLimit}`
    const rows = await this.request<Array<SupabaseRow<T>>>(url)
    return rows.map((row) => ({ pk: row.pk, sk: row.sk, data: row.data, updatedAt: Number(row.updated_at) }))
  }
}
