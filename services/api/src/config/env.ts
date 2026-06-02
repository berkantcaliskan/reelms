import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  PUBLIC_API_URL: z.string().url().default('http://127.0.0.1:5000'),
  PUBLIC_WEB_URL: z.string().url().default('http://127.0.0.1:5174'),
  PUBLIC_DESKTOP_PROTOCOL: z.string().default('reelms'),
  CORS_ORIGINS: z.string().default('http://127.0.0.1:3105,http://127.0.0.1:5174'),
  JWT_SECRET: z.string().min(16).default('dev-only-change-this-secret'),
  JSON_BODY_LIMIT: z.string().default('10mb'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(30),
  RATE_LIMIT_API_MAX: z.coerce.number().default(240),

  REELMS_STORAGE_DRIVER: z.enum(['json', 'postgres', 'supabase']).default('json'),
  REELMS_DATA_DIR: z.string().default('./data'),
  REELMS_MODERATION_UID: z.string().default('reelms-moderation'),

  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),

  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.preprocess((v) => v === '' ? undefined : v, z.string().url().optional()),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  AWS_REGION: z.string().default('eu-central-1'),
  FEEDBACK_FROM_EMAIL: z.string().optional(),
  FEEDBACK_TO_EMAIL: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && value.JWT_SECRET === 'dev-only-change-this-secret') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'JWT_SECRET must be changed in production' })
  }

  if (value.REELMS_STORAGE_DRIVER === 'postgres' && !value.DATABASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_URL is required for postgres storage' })
  }

  if (value.REELMS_STORAGE_DRIVER === 'supabase' && (!value.SUPABASE_URL || !value.SUPABASE_SERVICE_ROLE_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SUPABASE_SERVICE_ROLE_KEY'], message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for supabase storage' })
  }
})

export const env = schema.parse(process.env)
export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
