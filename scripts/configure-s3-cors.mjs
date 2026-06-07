#!/usr/bin/env node
import fs from 'node:fs'
import crypto from 'node:crypto'

function parseArgs() {
  const out = {}
  for (const arg of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg)
    if (m) out[m[1]] = m[2]
  }
  return out
}

function loadEnvFile(path) {
  if (!path || !fs.existsSync(path)) return
  const text = fs.readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const idx = trimmed.indexOf('=')
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function hmac(key, value, enc) { return crypto.createHmac('sha256', key).update(value, 'utf8').digest(enc) }
function sha256Hex(value) { return crypto.createHash('sha256').update(value, 'utf8').digest('hex') }
function amzDate(date = new Date()) { return date.toISOString().replace(/[:-]|\.\d{3}/g, '') }
function dateStamp(date = new Date()) { return date.toISOString().slice(0, 10).replace(/-/g, '') }
function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function signingKey(secret, shortDate, region) {
  const kDate = hmac(`AWS4${secret}`, shortDate)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, 's3')
  return hmac(kService, 'aws4_request')
}

const args = parseArgs()
loadEnvFile(args.env)

const bucket = process.env.S3_BUCKET
const region = process.env.AWS_REGION || 'us-east-1'
const accessKey = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
const secretKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
const origins = String(process.env.S3_CORS_ORIGINS || `${process.env.PUBLIC_WEB_URL || 'https://app.reelms.io'},http://localhost:5173,http://localhost:4173`)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

if (!bucket || !accessKey || !secretKey) {
  console.error('Missing S3_BUCKET, S3_ACCESS_KEY_ID and/or S3_SECRET_ACCESS_KEY. Use --env=/path/to/reelms-api.env')
  process.exit(1)
}
if (!origins.length) {
  console.error('No origins configured. Set S3_CORS_ORIGINS or PUBLIC_WEB_URL.')
  process.exit(1)
}

const body = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
${origins.map(o => `    <AllowedOrigin>${xmlEscape(o)}</AllowedOrigin>`).join('\n')}
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`

const now = new Date()
const xAmzDate = amzDate(now)
const shortDate = dateStamp(now)
const host = `${bucket}.s3.${region}.amazonaws.com`
const payloadHash = sha256Hex(body)
const canonicalQuery = 'cors='
const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
const canonicalHeaders = `content-type:application/xml\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${xAmzDate}\n`
const canonicalRequest = ['PUT', '/', canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n')
const credentialScope = `${shortDate}/${region}/s3/aws4_request`
const stringToSign = ['AWS4-HMAC-SHA256', xAmzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
const signature = crypto.createHmac('sha256', signingKey(secretKey, shortDate, region)).update(stringToSign, 'utf8').digest('hex')
const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

const res = await fetch(`https://${host}/?cors`, {
  method: 'PUT',
  headers: {
    Authorization: authorization,
    'content-type': 'application/xml',
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': xAmzDate,
  },
  body,
})

if (!res.ok) {
  console.error(`S3 CORS update failed: ${res.status} ${res.statusText}`)
  console.error(await res.text().catch(() => ''))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, bucket, region, origins }, null, 2))
