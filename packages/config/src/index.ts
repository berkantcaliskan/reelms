import { z } from 'zod'

export const publicClientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://127.0.0.1:5000'),
  VITE_WINDOWS_DOWNLOAD_URL: z.string().default('')
})

export type PublicClientEnv = z.infer<typeof publicClientEnvSchema>
