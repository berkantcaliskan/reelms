import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  API_URL: z.string().url().default('http://127.0.0.1:5000'),
  BOT_SECRET: z.string().min(8).default('dev-only-bot-secret-change-me'),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('nvidia/nemotron-3.5-lightning:free'),
  OPENROUTER_SUMMARIZE_MODEL: z.string().default('nvidia/nemotron-3.5-lightning:free'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_SUMMARIZE_MODEL: z.string().default('gpt-4o-mini'),
  MAX_HISTORY_TURNS: z.coerce.number().default(10),
  DAILY_DIGEST_HOUR: z.coerce.number().min(0).max(23).default(9)
})

export const config = schema.parse(process.env)
