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

  private connect() {
    if (!this.creds) throw new Error('Kimlik bilgisi yok')

    this.socket = io(config.API_URL, {
      auth: { token: this.creds.token, clientId: this.clientId },
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: Infinity
    })

    this.socket.on('connect', () => {
      console.log('[ReelmRadio] Socket bağlandı')
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

  joinChannel(msgKey: string) {
    this.socket?.emit('joinChannel', msgKey)
    console.log(`[ReelmRadio] Kanala katıldı: ${msgKey}`)
  }

  leaveChannel(msgKey: string) {
    this.socket?.emit('leaveChannel', msgKey)
  }

  private async onMessage({ msgKey, message }: { msgKey: string; message: any }) {
    // Kendi mesajlarını yoksay
    if (message?.userId === this.creds?.uid || message?.sender?.id === this.creds?.uid) return

    const text: string = message?.text ?? ''
    const parsed = parse(text)
    if (!parsed) return

    const senderName: string = message?.sender?.name ?? message?.sender?.username ?? 'Kullanıcı'
    const senderId: string = message?.userId ?? message?.sender?.id ?? ''

    const response = await dispatch({
      command: parsed.command,
      args: parsed.args,
      msgKey,
      senderName,
      senderId
    })

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
            sender: {
              id: this.creds.uid,
              name: this.creds.name,
              username: this.creds.username,
              photo: null
            }
          }
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[ReelmRadio] Mesaj gönderilemedi:', err)
      }
    } catch (err) {
      console.error('[ReelmRadio] sendMessage hatası:', err)
    }
  }
}
