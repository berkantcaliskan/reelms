export type StoreItem<T = unknown> = {
  pk: string
  sk: string
  data: T
  updatedAt: number
}

export type QueryResult<T = unknown> = Array<{ sk: string; data: T; updatedAt: number }>

export interface DocStoreDriver {
  readonly name: string
  init?(): Promise<void>
  getDoc<T = unknown>(pk: string, sk: string): Promise<T | null>
  putDoc<T = unknown>(pk: string, sk: string, data: T): Promise<void>
  putDocIfAbsent?<T = unknown>(pk: string, sk: string, data: T): Promise<boolean>
  deleteDoc(pk: string, sk: string): Promise<void>
  queryDocs<T = unknown>(pk: string, skPrefix?: string): Promise<QueryResult<T>>
  scanByPkPrefix<T = unknown>(prefix: string): Promise<Array<StoreItem<T>>>
  close?(): Promise<void>
}
