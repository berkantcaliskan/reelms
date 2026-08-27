import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@reelms/config': path.resolve(dirname, '../../packages/config/src/index.ts'),
      '@reelms/shared': path.resolve(dirname, '../../packages/shared/src/index.ts')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 3105,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
