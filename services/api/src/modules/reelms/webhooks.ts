import crypto from 'node:crypto'
import { getDoc, putDoc, reelmPk } from '../store/docStore.js'
import { recordReelmAuditLog } from './auditLog.js'

export interface ReelmWebhook {
  id: string
  reelmId: string
  channelId: string
  name: string
  avatar?: string | null
  token: string
  createdBy: string
  createdAt: number
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  timestamp?: string
  color?: number | string
  footer?: { text: string; icon_url?: string }
  image?: { url: string }
  thumbnail?: { url: string }
  author?: { name: string; url?: string; icon_url?: string }
  fields?: DiscordEmbedField[]
}

export interface DiscordWebhookPayload {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: DiscordEmbed[]
}

const WEBHOOKS_DOC_NAME = 'webhooks'

export async function getReelmWebhooks(reelmId: string): Promise<ReelmWebhook[]> {
  const pk = reelmPk(reelmId)
  const list = await getDoc<ReelmWebhook[]>(pk, WEBHOOKS_DOC_NAME)
  return Array.isArray(list) ? list : []
}

export async function getWebhooksForChannel(reelmId: string, channelId: string): Promise<ReelmWebhook[]> {
  const list = await getReelmWebhooks(reelmId)
  return list.filter(w => String(w.channelId) === String(channelId))
}

export async function findWebhookByIdAndToken(webhookId: string, token: string): Promise<{ webhook: ReelmWebhook; reelmId: string } | null> {
  const item = await getDoc<ReelmWebhook>('webhook_index', webhookId)
  if (item && item.token === token) {
    return { webhook: item, reelmId: item.reelmId }
  }
  return null
}

export async function createReelmWebhook(
  reelmId: string,
  channelId: string,
  data: { name: string; avatar?: string | null; createdBy: string; actorName?: string }
): Promise<ReelmWebhook> {
  const pk = reelmPk(reelmId)
  const current = await getReelmWebhooks(reelmId)
  const webhookId = `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const token = crypto.randomBytes(24).toString('hex')

  const newWebhook: ReelmWebhook = {
    id: webhookId,
    reelmId,
    channelId,
    name: data.name.trim() || 'Webhook Bot',
    avatar: data.avatar || null,
    token,
    createdBy: data.createdBy,
    createdAt: Date.now()
  }

  const nextList = [newWebhook, ...current]
  await putDoc(pk, WEBHOOKS_DOC_NAME, nextList)
  await putDoc('webhook_index', webhookId, newWebhook)

  await recordReelmAuditLog(reelmId, {
    action: 'REELM_UPDATE',
    actor: { id: data.createdBy, name: data.actorName || 'User' },
    target: { id: webhookId, name: newWebhook.name, type: 'integration' },
    details: { summary: `Created webhook "${newWebhook.name}" for channel ${channelId}` }
  }).catch(() => {})

  return newWebhook
}

export async function deleteReelmWebhook(
  reelmId: string,
  webhookId: string,
  actor?: { id: string; name: string }
): Promise<boolean> {
  const pk = reelmPk(reelmId)
  const current = await getReelmWebhooks(reelmId)
  const found = current.find(w => w.id === webhookId)
  if (!found) return false

  const nextList = current.filter(w => w.id !== webhookId)
  await putDoc(pk, WEBHOOKS_DOC_NAME, nextList)
  await putDoc('webhook_index', webhookId, null as any)

  if (actor) {
    await recordReelmAuditLog(reelmId, {
      action: 'REELM_UPDATE',
      actor,
      target: { id: webhookId, name: found.name, type: 'integration' },
      details: { summary: `Deleted webhook "${found.name}"` }
    }).catch(() => {})
  }

  return true
}

export function parseGitHubWebhookEvent(event: string, payload: any): DiscordWebhookPayload {
  const sender = payload?.sender?.login || 'GitHub'
  const senderAvatar = payload?.sender?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
  const repoName = payload?.repository?.full_name || 'Repository'
  const repoUrl = payload?.repository?.html_url || ''

  if (event === 'push') {
    const branch = (payload?.ref || '').replace('refs/heads/', '')
    const commits = Array.isArray(payload?.commits) ? payload.commits : []
    const commitCount = commits.length
    const title = `[${repoName}:${branch}] ${commitCount} new commit${commitCount === 1 ? '' : 's'}`
    const desc = commits.slice(0, 5).map((c: any) => {
      const hash = (c.id || '').slice(0, 7)
      const msg = (c.message || '').split('\n')[0]
      const author = c.author?.name || c.author?.username || 'Unknown'
      return `[\`${hash}\`](${c.url}) ${msg} — *${author}*`
    }).join('\n')

    return {
      username: 'GitHub',
      avatar_url: senderAvatar,
      embeds: [
        {
          title,
          url: payload?.compare || repoUrl,
          description: desc,
          color: 0x24292e,
          footer: { text: repoName, icon_url: senderAvatar }
        }
      ]
    }
  }

  if (event === 'pull_request') {
    const action = payload?.action || 'opened'
    const pr = payload?.pull_request || {}
    return {
      username: 'GitHub',
      avatar_url: senderAvatar,
      embeds: [
        {
          title: `[${repoName}] Pull request ${action}: #${pr.number} ${pr.title}`,
          url: pr.html_url || repoUrl,
          description: pr.body ? pr.body.slice(0, 200) : undefined,
          color: action === 'opened' ? 0x2cbe4e : 0xcb2431,
          footer: { text: `By ${sender} • ${repoName}` }
        }
      ]
    }
  }

  if (event === 'issues') {
    const action = payload?.action || 'opened'
    const issue = payload?.issue || {}
    return {
      username: 'GitHub',
      avatar_url: senderAvatar,
      embeds: [
        {
          title: `[${repoName}] Issue ${action}: #${issue.number} ${issue.title}`,
          url: issue.html_url || repoUrl,
          description: issue.body ? issue.body.slice(0, 200) : undefined,
          color: 0xe36209,
          footer: { text: `By ${sender} • ${repoName}` }
        }
      ]
    }
  }

  return {
    username: 'GitHub',
    avatar_url: senderAvatar,
    content: `GitHub event \`${event}\` received for ${repoName}`
  }
}
