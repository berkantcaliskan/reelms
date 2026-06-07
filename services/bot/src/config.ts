import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  API_URL: z.string().url().default('http://127.0.0.1:5000'),
  BOT_SECRET: z.string().min(8).default('dev-only-bot-secret-change-me')
})

export const config = schema.parse(process.env)
