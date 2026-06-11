import { ReelmsAIBot } from './ReelmsAIBot.js'

const bot = new ReelmsAIBot()

bot.start().catch((err) => {
  console.error('[ReelmsAI] Başlatma hatası:', err)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('[ReelmsAI] Kapatılıyor...')
  bot.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  bot.stop()
  process.exit(0)
})
