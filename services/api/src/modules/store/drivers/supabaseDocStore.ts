import type { DocStoreDriver, QueryResult, StoreItem } from '../types.js'

const TABLE = 'reelms_docs'

type SupabaseRow<T = unknown> = {
  pk: string
  sk: string
  data: T
  updated_at: number
}

function assertConfigured(url: string, serviceRoleKey: string) {
  if (!url || !serviceRoleKey) {
    throw new Error('SupabaseDocStore requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
}

export class SupabaseDocStore implements DocStoreDriver {
  readonly name = 'supabase'
  private readonly restUrl: string
  private readonly headers: Record<string, string>

  constructor(url: string, serviceRoleKey: string) {
    assertConfigured(url, serviceRoleKey)
    this.restUrl = `${url.replace(/\/$/, '')}/rest/v1/${TABLE}`
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...(init.headers || {})
      }
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Supabase request failed ${response.status}: ${text || response.statusText}`)
    }

    if (response.status === 204) return null as T
    return response.json() as Promise<T>
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

    const text = await response.text().catch(() => '')
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
    const url = `${this.restUrl}?select=pk,sk,data,updated_at&pk=like.${encodeURIComponent(`${prefix}%`)}&order=pk.asc,sk.asc`
    const rows = await this.request<Array<SupabaseRow<T>>>(url)
    return rows.map((row) => ({ pk: row.pk, sk: row.sk, data: row.data, updatedAt: Number(row.updated_at) }))
  }
}
