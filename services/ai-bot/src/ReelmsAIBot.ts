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
  name?: string
}

interface BotReelm {
  id: string
  name: string
  channels: ChannelRef[]
}

export class ReelmsAIBot {
  private socket: Socket | null = null
  private creds: BotCredentials | null = null
  private clientId = 'reelms-ai-bot-client'
  private reelms = new Map<string, BotReelm>()
  private digestTimers = new Map<string, NodeJS.Timeout>()

  async start() {
    console.log('[Reelms Intelligence] Başlatılıyor...')
    this.creds = await this.authenticate()
    console.log(`[Reelms Intelligence] Auth tamam — UID: ${this.creds.uid}`)
    this.connect()
  }

  private async authenticate(): Promise<BotCredentials> {
    const res = await fetch(`${config.API_URL}/internal/ai-bot-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: config.BOT_SECRET })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as any
      throw new Error(`AI bot auth başarısız: ${res.status} — ${body?.error || ''}`)
    }
    return res.json() as Promise<BotCredentials>
  }

  private async fetchBotReelms(): Promise<BotReelm[]> {
    try {
      const res = await fetch(`${config.API_URL}/internal/ai-bot/reelms`, {
        headers: { 'x-bot-secret': config.BOT_SECRET }
      })
      if (!res.ok) return []
      const data = await res.json() as { reelms: BotReelm[] }
      return data.reelms ?? []
    } catch {
      return []
    }
  }

  private async fetchMessages(msgKey: string, limit: number): Promise<any[]> {
    try {
      const res = await fetch(
        `${config.API_URL}/internal/ai-bot/messages/${encodeURIComponent(msgKey)}?limit=${limit}`,
        { headers: { 'x-bot-secret': config.BOT_SECRET } }
      )
      if (!res.ok) return []
      const data = await res.json() as { messages: any[] }
      return data.messages ?? []
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
      console.log('[ReelmsAI] Socket bağlandı')
      const reelms = await this.fetchBotReelms()
      for (const reelm of reelms) {
        this.trackReelm(reelm)
        this.joinChannels(reelm.channels)
      }
      console.log(`[Reelms Intelligence] ${reelms.length} reelm'e katıldı`)
    })

    this.socket.on('ai-bot:join-reelm', ({ reelmId, reelmName, channels }: { reelmId: string; reelmName: string; channels: ChannelRef[] }) => {
      const reelm: BotReelm = { id: reelmId, name: reelmName, channels }
      this.trackReelm(reelm)
      this.joinChannels(channels)
      console.log(`[Reelms Intelligence] Yeni reelm'e eklendi: ${reelmName}`)
    })

    this.socket.on('disconnect', (reason: string) => {
      console.warn(`[Reelms Intelligence] Bağlantı kesildi: ${reason}`)
    })

    this.socket.on('connect_error', (err: Error) => {
      console.error(`[Reelms Intelligence] Bağlantı hatası: ${err.message}`)
    })

    this.socket.on('reelms:message', (payload: { msgKey: string; message: any }) => {
      this.onMessage(payload).catch(console.error)
    })
  }

  private trackReelm(reelm: BotReelm) {
    this.reelms.set(reelm.id, reelm)
    this.scheduleDigest(reelm)
  }

  private joinChannels(channels: ChannelRef[]) {
    for (const ch of channels) {
      this.socket?.emit('joinChannel', ch.msgKey)
    }
  }

  private scheduleDigest(reelm: BotReelm) {
    const existing = this.digestTimers.get(reelm.id)
    if (existing) clearTimeout(existing)

    const msUntilNextDigest = this.msUntilHour(config.DAILY_DIGEST_HOUR)
    const timer = setTimeout(() => {
      this.postDailyDigest(reelm).catch(console.error)
    }, msUntilNextDigest)
    this.digestTimers.set(reelm.id, timer)
  }

  private msUntilHour(hour: number): number {
    const now = new Date()
    const target = new Date()
    target.setHours(hour, 0, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    return target.getTime() - now.getTime()
  }

  private async postDailyDigest(reelm: BotReelm) {
    if (!reelm.channels.length) return

    const firstChannel = reelm.channels[0]
    const { dispatch: dispatchCmd } = await import('./commands/index.js')
    const ctx = { command: 'digest', args: '', msgKey: firstChannel.msgKey, senderName: 'System', senderId: '', reelmId: reelm.id }
    const result = await dispatchCmd(ctx, this.fetchMessages.bind(this), reelm.channels)
    if (result) await this.sendMessage(firstChannel.msgKey, result)

    // Reschedule for next day
    this.scheduleDigest(reelm)
  }

  private findChannelRefsForMsgKey(msgKey: string): ChannelRef[] {
    for (const reelm of this.reelms.values()) {
      if (reelm.channels.some((ch) => ch.msgKey === msgKey)) {
        return reelm.channels
      }
    }
    return []
  }

  private async onMessage({ msgKey, message }: { msgKey: string; message: any }) {
    if (message?.userId === this.creds?.uid || message?.sender?.id === this.creds?.uid) return

    const text: string = message?.text ?? ''
    const parsed = parse(text)
    if (!parsed) return

    const senderName: string = message?.sender?.name ?? message?.sender?.username ?? 'Kullanıcı'
    const senderId: string = message?.userId ?? message?.sender?.id ?? ''
    const channelRefs = this.findChannelRefsForMsgKey(msgKey)

    const response = await dispatch(
      { command: parsed.command, args: parsed.args, msgKey, senderName, senderId },
      this.fetchMessages.bind(this),
      channelRefs
    )
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
      if (!res.ok) console.error('[ReelmsAI] Mesaj gönderilemedi:', await res.json().catch(() => ({})))
    } catch (err) {
      console.error('[ReelmsAI] sendMessage hatası:', err)
    }
  }

  stop() {
    for (const timer of this.digestTimers.values()) clearTimeout(timer)
    this.digestTimers.clear()
    this.socket?.disconnect()
  }
}
