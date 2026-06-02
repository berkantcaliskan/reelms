import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DocStoreDriver, QueryResult, StoreItem } from '../types.js'

const TABLE = 'reelms_docs'

export class SupabaseDocStore implements DocStoreDriver {
  readonly name = 'supabase'
  private readonly client: SupabaseClient

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false }
    })
  }

  async init() {
    // Table must exist in Supabase — create via SQL editor:
    // create table if not exists reelms_docs (
    //   pk text not null, sk text not null,
    //   data jsonb not null, updated_at bigint not null,
    //   primary key (pk, sk)
    // );
    // create index if not exists reelms_docs_pk_prefix_idx on reelms_docs (pk text_pattern_ops);
    const { error } = await this.client.from(TABLE).select('pk').limit(1)
    if (error) throw new Error(`Supabase reelms_docs table not found: ${error.message}`)
  }

  async getDoc<T = unknown>(pk: string, sk: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('data')
      .eq('pk', pk)
      .eq('sk', sk)
      .maybeSingle()
    if (error) throw error
    return (data?.data as T) ?? null
  }

  async putDoc<T = unknown>(pk: string, sk: string, value: T): Promise<void> {
    const { error } = await this.client.from(TABLE).upsert(
      { pk, sk, data: value, updated_at: Date.now() },
      { onConflict: 'pk,sk' }
    )
    if (error) throw error
  }

  async deleteDoc(pk: string, sk: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('pk', pk).eq('sk', sk)
    if (error) throw error
  }

  async queryDocs<T = unknown>(pk: string, skPrefix?: string): Promise<QueryResult<T>> {
    let query = this.client.from(TABLE).select('sk, data, updated_at').eq('pk', pk)
    if (skPrefix) query = query.like('sk', `${skPrefix}%`)
    const { data, error } = await query.order('sk')
    if (error) throw error
    return (data ?? []).map((row) => ({ sk: row.sk, data: row.data as T, updatedAt: Number(row.updated_at) }))
  }

  async scanByPkPrefix<T = unknown>(prefix: string): Promise<Array<StoreItem<T>>> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('pk, sk, data, updated_at')
      .like('pk', `${prefix}%`)
      .order('pk')
      .order('sk')
    if (error) throw error
    return (data ?? []).map((row) => ({ pk: row.pk, sk: row.sk, data: row.data as T, updatedAt: Number(row.updated_at) }))
  }
}
