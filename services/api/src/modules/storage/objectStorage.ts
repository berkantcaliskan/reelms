/**
 * Object storage boundary for avatars, attachments, media and future desktop update files.
 *
 * The web beta can run without this module being used. Production should bind it to S3
 * and expose signed upload/download flows rather than saving files on EC2 disk.
 */
export type StoredObject = {
  key: string
  url: string
  contentType?: string
  size?: number
}

export interface ObjectStorage {
  putObject(input: { key: string; body: Buffer | Uint8Array; contentType?: string }): Promise<StoredObject>
  getPublicUrl(key: string): string
  deleteObject(key: string): Promise<void>
}

export class MissingObjectStorage implements ObjectStorage {
  async putObject(): Promise<StoredObject> {
    throw new Error('Object storage is not configured. Set S3_BUCKET/S3_PUBLIC_BASE_URL and bind an S3 adapter.')
  }

  getPublicUrl(key: string) {
    return key
  }

  async deleteObject() {
    throw new Error('Object storage is not configured.')
  }
}
