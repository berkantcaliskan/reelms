import { Pool } from 'pg'
import type { DocStoreDriver, QueryResult, StoreItem } from '../types.js'

export class PostgresDocStore implements DocStoreDriver {
  readonly name = 'postgres'
  private readonly pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
  }

  async init() {
    await this.pool.query(`
      create table if not exists reelms_docs (
        pk text not null,
        sk text not null,
        data jsonb not null,
        updated_at bigint not null,
        primary key (pk, sk)
      );
      create index if not exists reelms_docs_pk_prefix_idx on reelms_docs (pk text_pattern_ops);
      create index if not exists reelms_docs_updated_at_idx on reelms_docs (updated_at desc);
    `)
  }

  async getDoc<T = unknown>(pk: string, sk: string): Promise<T | null> {
    const result = await this.pool.query('select data from reelms_docs where pk = $1 and sk = $2 limit 1', [pk, sk])
    return result.rows[0]?.data ?? null
  }

  async putDoc<T = unknown>(pk: string, sk: string, data: T) {
    await this.pool.query(
      `insert into reelms_docs (pk, sk, data, updated_at)
       values ($1, $2, $3::jsonb, $4)
       on conflict (pk, sk) do update set data = excluded.data, updated_at = excluded.updated_at`,
      [pk, sk, JSON.stringify(data), Date.now()]
    )
  }

  async putDocIfAbsent<T = unknown>(pk: string, sk: string, data: T) {
    const result = await this.pool.query(
      `insert into reelms_docs (pk, sk, data, updated_at)
       values ($1, $2, $3::jsonb, $4)
       on conflict (pk, sk) do nothing`,
      [pk, sk, JSON.stringify(data), Date.now()]
    )
    return (result.rowCount || 0) > 0
  }

  async deleteDoc(pk: string, sk: string) {
    await this.pool.query('delete from reelms_docs where pk = $1 and sk = $2', [pk, sk])
  }

  async queryDocs<T = unknown>(pk: string, skPrefix?: string): Promise<QueryResult<T>> {
    const result = skPrefix
      ? await this.pool.query('select sk, data, updated_at from reelms_docs where pk = $1 and sk like $2 order by sk asc', [pk, `${skPrefix}%`])
      : await this.pool.query('select sk, data, updated_at from reelms_docs where pk = $1 order by sk asc', [pk])
    return result.rows.map((row) => ({ sk: row.sk, data: row.data as T, updatedAt: Number(row.updated_at) }))
  }

  async scanByPkPrefix<T = unknown>(prefix: string): Promise<Array<StoreItem<T>>> {
    const result = await this.pool.query(
      'select pk, sk, data, updated_at from reelms_docs where pk like $1 order by pk asc, sk asc',
      [`${prefix}%`]
    )
    return result.rows.map((row) => ({ pk: row.pk, sk: row.sk, data: row.data as T, updatedAt: Number(row.updated_at) }))
  }

  async scanByPkPrefixAndSk<T = unknown>(prefix: string, sk: string, limit = 1000): Promise<Array<StoreItem<T>>> {
    const result = await this.pool.query(
      'select pk, sk, data, updated_at from reelms_docs where pk like $1 and sk = $2 order by updated_at desc limit $3',
      [`${prefix}%`, sk, Math.max(1, Math.min(Number(limit) || 1000, 5000))]
    )
    return result.rows.map((row) => ({ pk: row.pk, sk: row.sk, data: row.data as T, updatedAt: Number(row.updated_at) }))
  }

  async close() {
    await this.pool.end()
  }
}
