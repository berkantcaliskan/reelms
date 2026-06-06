import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env'), override: false })

import { z } from 'zod'

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}

const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional())
const optionalUrl = () => z.preprocess(emptyToUndefined, z.string().url().optional())
const booleanFromEnv = () => z.preprocess((value) => {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined || typeof normalized === 'boolean') return normalized
  if (typeof normalized === 'number') return normalized !== 0
  if (typeof normalized === 'string') {
    const text = normalized.trim().toLowerCase()
    if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true
    if (['false', '0', 'no', 'n', 'off'].includes(text)) return false
  }
  return normalized
}, z.boolean().optional())

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),
  PUBLIC_API_URL: z.string().url().default('http://127.0.0.1:5000'),
  PUBLIC_WEB_URL: z.string().url().default('http://127.0.0.1:5174'),
  PUBLIC_DESKTOP_PROTOCOL: z.string().default('reelms'),
  CORS_ORIGINS: z.string().default('http://127.0.0.1:3105,http://127.0.0.1:5174'),
  JWT_SECRET: z.string().min(16).default('dev-only-change-this-secret'),
  JSON_BODY_LIMIT: z.string().default('10mb'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(30),
  RATE_LIMIT_API_MAX: z.coerce.number().default(240),
  RATE_LIMIT_DISABLED: booleanFromEnv().default(false),

  // Storage layer. JSON is the local beta adapter; Postgres is the production target.
  REELMS_STORAGE_DRIVER: z.enum(['json', 'postgres', 'supabase']).default('json'),
  REELMS_DATA_DIR: z.string().default('./data'),
  REELMS_MODERATION_UID: z.string().default('reelms-moderation'),
  // Production beta should grant privileged admin rights by stable internal UID.
  // E-mail/username based admin grants are unsafe without e-mail verification, so
  // they are blocked in production unless explicitly acknowledged.
  REELMS_COMMUNITY_ADMIN_UIDS: z.string().default(''),
  REELMS_COMMUNITY_ADMIN_EMAILS: z.string().default(''),
  REELMS_COMMUNITY_ADMIN_USERNAMES: z.string().default(''),
  REELMS_ALLOW_UNVERIFIED_ADMIN_IDENTIFIERS: booleanFromEnv().default(false),

  DATABASE_URL: optionalString(),
  REDIS_URL: optionalString(),
  SUPABASE_URL: optionalUrl(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),

  S3_BUCKET: optionalString(),
  S3_PUBLIC_BASE_URL: optionalUrl(),
  S3_ACCESS_KEY_ID: optionalString(),
  S3_SECRET_ACCESS_KEY: optionalString(),
  S3_UPLOAD_PREFIX: z.string().default('reelms-uploads'),
  S3_MAX_UPLOAD_BYTES: z.coerce.number().default(25 * 1024 * 1024),
  S3_PRESIGN_TTL_SECONDS: z.coerce.number().default(900),

  REELMS_REQUIRE_EMAIL_VERIFICATION: booleanFromEnv().default(false),
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: optionalString(),
  MAIL_FROM_EMAIL: z.string().default('Reelms <noreply@reelms.local>'),
  AUTH_TOKEN_TTL_MS: z.coerce.number().default(24 * 60 * 60 * 1000),
  PASSWORD_RESET_TTL_MS: z.coerce.number().default(30 * 60 * 1000),

  STUN_URLS: z.string().default('stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun.cloudflare.com:3478'),
  TURN_URLS: z.string().default(''),
  TURN_USERNAME: optionalString(),
  TURN_CREDENTIAL: optionalString(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),

  GOOGLE_CLIENT_ID: optionalString(),
  GOOGLE_CLIENT_SECRET: optionalString(),
  GOOGLE_REDIRECT_URI: optionalString(),

  SPOTIFY_CLIENT_ID: optionalString(),
  SPOTIFY_CLIENT_SECRET: optionalString(),
  SPOTIFY_REDIRECT_URI: optionalString(),

  OPENAI_API_KEY: optionalString(),
  AWS_REGION: z.string().default('eu-central-1'),
  FEEDBACK_FROM_EMAIL: z.string().optional(),
  FEEDBACK_TO_EMAIL: z.string().optional(),
  SENTRY_DSN: optionalString()
}).superRefine((value, ctx) => {
  const isProduction = value.NODE_ENV === 'production'
  const hasLocalhostUrl = (raw: string) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(raw)
  const adminUids = value.REELMS_COMMUNITY_ADMIN_UIDS.split(',').map((item) => item.trim()).filter(Boolean)
  const adminEmails = value.REELMS_COMMUNITY_ADMIN_EMAILS.split(',').map((item) => item.trim()).filter(Boolean)
  const adminUsernames = value.REELMS_COMMUNITY_ADMIN_USERNAMES.split(',').map((item) => item.trim()).filter(Boolean)

  if (isProduction && (value.JWT_SECRET === 'dev-only-change-this-secret' || value.JWT_SECRET.length < 32)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'JWT_SECRET must be a unique 32+ character secret in production' })
  }

  if (isProduction && value.REELMS_STORAGE_DRIVER === 'json') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['REELMS_STORAGE_DRIVER'], message: 'JSON storage is local-only; use postgres or supabase in production' })
  }

  if (isProduction && value.RATE_LIMIT_DISABLED) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['RATE_LIMIT_DISABLED'], message: 'Rate limits must not be disabled in production' })
  }

  if (isProduction && hasLocalhostUrl(value.PUBLIC_API_URL)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PUBLIC_API_URL'], message: 'PUBLIC_API_URL must be the public HTTPS API URL in production' })
  }

  if (isProduction && hasLocalhostUrl(value.PUBLIC_WEB_URL)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PUBLIC_WEB_URL'], message: 'PUBLIC_WEB_URL must be the public HTTPS web URL in production' })
  }

  if (isProduction && value.CORS_ORIGINS.split(',').some((origin) => hasLocalhostUrl(origin.trim()))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['CORS_ORIGINS'], message: 'Remove localhost origins from CORS_ORIGINS in production' })
  }

  if (isProduction && !adminUids.length && (adminEmails.length || adminUsernames.length) && !value.REELMS_ALLOW_UNVERIFIED_ADMIN_IDENTIFIERS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['REELMS_COMMUNITY_ADMIN_UIDS'], message: 'Use REELMS_COMMUNITY_ADMIN_UIDS in production; e-mail/username admin grants are unsafe without e-mail verification' })
  }

  if (value.REELMS_STORAGE_DRIVER === 'postgres' && !value.DATABASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_URL is required for postgres storage' })
  }

  if (value.REELMS_STORAGE_DRIVER === 'supabase' && (!value.SUPABASE_URL || !value.SUPABASE_SERVICE_ROLE_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SUPABASE_URL'], message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for supabase storage' })
  }

  if (value.EMAIL_PROVIDER === 'resend' && !value.RESEND_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['RESEND_API_KEY'], message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend' })
  }

  if (isProduction && value.REELMS_REQUIRE_EMAIL_VERIFICATION && value.EMAIL_PROVIDER !== 'resend') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_PROVIDER'], message: 'Use EMAIL_PROVIDER=resend in production when e-mail verification is required' })
  }

  if (value.S3_BUCKET && (!value.S3_PUBLIC_BASE_URL || !value.S3_ACCESS_KEY_ID || !value.S3_SECRET_ACCESS_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['S3_BUCKET'], message: 'S3_BUCKET requires S3_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY' })
  }

  if (value.TURN_URLS && (!value.TURN_USERNAME || !value.TURN_CREDENTIAL)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TURN_URLS'], message: 'TURN_URLS requires TURN_USERNAME and TURN_CREDENTIAL' })
  }
})

export const env = schema.parse(process.env)
export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
