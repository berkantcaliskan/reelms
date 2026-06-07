import { ReelmRadioBot } from './ReelmRadioBot.js'

const bot = new ReelmRadioBot()

bot.start().catch((err) => {
  console.error('[ReelmRadio] Başlatma hatası:', err)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('[ReelmRadio] Kapatılıyor...')
  process.exit(0)
})
