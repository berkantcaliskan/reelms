import crypto from 'node:crypto'
import { env } from '../../config/env.js'

/**
 * Object storage boundary for avatars, attachments, media and desktop update files.
 * Production uses S3-compatible pre-signed PUT URLs so API instances never handle
 * large upload bodies and EC2/ECS disk remains stateless.
 */
export type StoredObject = {
  key: string
  url: string
  contentType?: string
  size?: number
}

export type PresignedUpload = StoredObject & {
  uploadUrl: string
  method: 'PUT'
  expiresAt: number
  headers: Record<string, string>
}

export interface ObjectStorage {
  createPresignedPut(input: { key: string; contentType?: string; expiresInSeconds?: number }): Promise<PresignedUpload>
  getPublicUrl(key: string): string
  deleteObject(key: string): Promise<void>
}

export class MissingObjectStorage implements ObjectStorage {
  async createPresignedPut(): Promise<PresignedUpload> {
    throw new Error('Object storage is not configured. Set S3_BUCKET, S3_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.')
  }

  getPublicUrl(key: string) { return key }
  async deleteObject() { throw new Error('Object storage is not configured.') }
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest()
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '')
}

function dateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function normalizeBaseUrl(url: string) {
  return String(url || '').replace(/\/+$/, '')
}

export function sanitizeObjectFileName(value: unknown) {
  const raw = String(value || 'file').trim() || 'file'
  const dot = raw.lastIndexOf('.')
  const ext = dot > -1 ? raw.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 16) : ''
  const name = (dot > -1 ? raw.slice(0, dot) : raw).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file'
  return `${name}${ext}`
}

export function objectStorageConfigured() {
  return Boolean(env.S3_BUCKET && env.S3_PUBLIC_BASE_URL && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)
}

export function buildUserUploadKey(uid: string, fileName: string) {
  const safePrefix = String(env.S3_UPLOAD_PREFIX || 'reelms-uploads').replace(/^\/+|\/+$/g, '')
  return `${safePrefix}/users/${encodeURIComponent(uid)}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${sanitizeObjectFileName(fileName)}`
}

export class S3PresignedObjectStorage implements ObjectStorage {
  getPublicUrl(key: string) {
    return `${normalizeBaseUrl(env.S3_PUBLIC_BASE_URL || '')}/${String(key).split('/').map(encodeRfc3986).join('/')}`
  }

  private signingKey(shortDate: string) {
    const kDate = hmac(`AWS4${env.S3_SECRET_ACCESS_KEY}`, shortDate)
    const kRegion = hmac(kDate, env.AWS_REGION)
    const kService = hmac(kRegion, 's3')
    return hmac(kService, 'aws4_request')
  }

  async createPresignedPut(input: { key: string; contentType?: string; expiresInSeconds?: number }): Promise<PresignedUpload> {
    if (!objectStorageConfigured()) throw new Error('object_storage_not_configured')
    const region = env.AWS_REGION
    const service = 's3'
    const now = new Date()
    const xAmzDate = amzDate(now)
    const shortDate = dateStamp(now)
    const expires = Math.max(60, Math.min(Number(input.expiresInSeconds || env.S3_PRESIGN_TTL_SECONDS), 3600))
    const host = `${env.S3_BUCKET}.s3.${region}.amazonaws.com`
    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`
    const credential = `${env.S3_ACCESS_KEY_ID}/${credentialScope}`
    const signedHeaders = 'content-type;host'
    const canonicalUri = `/${String(input.key).split('/').map(encodeRfc3986).join('/')}`
    const contentType = String(input.contentType || 'application/octet-stream')
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': xAmzDate,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': signedHeaders
    }
    const canonicalQuery = Object.entries(queryParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
      .join('&')
    const canonicalHeaders = `content-type:${contentType}
host:${host}
`
    const canonicalRequest = ['PUT', canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n')
    const stringToSign = ['AWS4-HMAC-SHA256', xAmzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
    const signature = crypto.createHmac('sha256', this.signingKey(shortDate)).update(stringToSign, 'utf8').digest('hex')
    const uploadUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
    return { key: input.key, url: this.getPublicUrl(input.key), uploadUrl, method: 'PUT', expiresAt: Date.now() + expires * 1000, headers: { 'Content-Type': contentType }, contentType }
  }

  async deleteObject(key: string) {
    if (!objectStorageConfigured()) throw new Error('object_storage_not_configured')
    const now = new Date()
    const xAmzDate = amzDate(now)
    const shortDate = dateStamp(now)
    const region = env.AWS_REGION
    const host = `${env.S3_BUCKET}.s3.${region}.amazonaws.com`
    const canonicalUri = `/${String(key).split('/').map(encodeRfc3986).join('/')}`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const payloadHash = 'UNSIGNED-PAYLOAD'
    const canonicalHeaders = `host:${host}
x-amz-content-sha256:${payloadHash}
x-amz-date:${xAmzDate}
`
    const canonicalRequest = ['DELETE', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
    const credentialScope = `${shortDate}/${region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', xAmzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
    const signature = crypto.createHmac('sha256', this.signingKey(shortDate)).update(stringToSign, 'utf8').digest('hex')
    const response = await fetch(`https://${host}${canonicalUri}`, {
      method: 'DELETE',
      headers: {
        Authorization: `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': xAmzDate
      }
    })
    if (!response.ok && response.status !== 404) throw new Error(`s3_delete_failed:${response.status}`)
  }
}

export function getObjectStorage(): ObjectStorage {
  return objectStorageConfigured() ? new S3PresignedObjectStorage() : new MissingObjectStorage()
}
