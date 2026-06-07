import { io, type Socket } from 'socket.io-client'
import { config } from './config.js'
import { parse } from './parser.js'
import { dispatch } from './commands/index.js'

interface BotCredentials {
  token: string
  uid: string
  name: string
  username: string
}

interface ChannelRef {
  channelId: string
  msgKey: string
}

interface BotReelm {
  id: string
  name: string
  channels: ChannelRef[]
}

export class ReelmRadioBot {
  private socket: Socket | null = null
  private creds: BotCredentials | null = null
  private clientId = 'reelm-radio-bot-client'

  async start() {
    console.log('[ReelmRadio] Başlatılıyor...')
    this.creds = await this.authenticate()
    console.log(`[ReelmRadio] Auth tamam — UID: ${this.creds.uid}`)
    this.connect()
  }

  private async authenticate(): Promise<BotCredentials> {
    const res = await fetch(`${config.API_URL}/internal/bot-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: config.BOT_SECRET })
    })
    if (!res.ok) throw new Error(`Bot auth başarısız: ${res.status}`)
    return res.json() as Promise<BotCredentials>
  }

  private async fetchBotReelms(): Promise<BotReelm[]> {
    try {
      const res = await fetch(`${config.API_URL}/internal/bot/reelms`, {
        headers: { 'x-bot-secret': config.BOT_SECRET }
      })
      if (!res.ok) return []
      const data = await res.json() as { reelms: BotReelm[] }
      return data.reelms ?? []
    } catch {
      return []
    }
  }

  private connect() {
    if (!this.creds) throw new Error('Kimlik bilgisi yok')

    this.socket = io(config.API_URL, {
      auth: { token: this.creds.token, clientId: this.clientId },
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: Infinity
    })

    this.socket.on('connect', async () => {
      console.log('[ReelmRadio] Socket bağlandı')
      const reelms = await this.fetchBotReelms()
      for (const reelm of reelms) {
        this.joinReelmChannels(reelm.id, reelm.channels)
      }
      console.log(`[ReelmRadio] ${reelms.length} reelm'e katıldı`)
    })

    this.socket.on('bot:join-reelm', ({ reelmId, reelmName, channels }: { reelmId: string; reelmName: string; channels: ChannelRef[] }) => {
      this.joinReelmChannels(reelmId, channels)
      console.log(`[ReelmRadio] Yeni reelm'e eklendi: ${reelmName} (${channels.length} kanal)`)
    })

    this.socket.on('disconnect', (reason) => {
      console.warn(`[ReelmRadio] Bağlantı kesildi: ${reason}`)
    })

    this.socket.on('connect_error', (err) => {
      console.error(`[ReelmRadio] Bağlantı hatası: ${err.message}`)
    })

    this.socket.on('reelms:message', (payload: { msgKey: string; message: any }) => {
      this.onMessage(payload).catch(console.error)
    })
  }

  private joinReelmChannels(reelmId: string, channels: ChannelRef[]) {
    for (const ch of channels) {
      this.socket?.emit('joinChannel', ch.msgKey)
    }
    console.log(`[ReelmRadio] ${reelmId}: ${channels.length} kanal dinleniyor`)
  }

  private async onMessage({ msgKey, message }: { msgKey: string; message: any }) {
    if (message?.userId === this.creds?.uid || message?.sender?.id === this.creds?.uid) return

    const text: string = message?.text ?? ''
    const parsed = parse(text)
    if (!parsed) return

    const senderName: string = message?.sender?.name ?? message?.sender?.username ?? 'Kullanıcı'
    const senderId: string = message?.userId ?? message?.sender?.id ?? ''

    const response = await dispatch({ command: parsed.command, args: parsed.args, msgKey, senderName, senderId })
    if (response) await this.sendMessage(msgKey, response)
  }

  private async sendMessage(msgKey: string, text: string) {
    if (!this.creds) return
    try {
      const res = await fetch(`${config.API_URL}/api/v1/messages/${encodeURIComponent(msgKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.creds.token}`
        },
        body: JSON.stringify({
          message: {
            text,
            sender: { id: this.creds.uid, name: this.creds.name, username: this.creds.username, photo: null }
          }
        })
      })
      if (!res.ok) console.error('[ReelmRadio] Mesaj gönderilemedi:', await res.json().catch(() => ({})))
    } catch (err) {
      console.error('[ReelmRadio] sendMessage hatası:', err)
    }
  }
}
