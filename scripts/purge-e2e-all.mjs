import fs from 'node:fs'
import path from 'node:path'

const p = path.resolve(process.cwd(), 'services/api/data/doc-store.json')
if (!fs.existsSync(p)) {
  console.log('doc-store.json not found')
  process.exit(1)
}

const content = JSON.parse(fs.readFileSync(p, 'utf-8'))
const e2eUids = new Set()

// 1. Identify all e2e UIDs
for (const k of Object.keys(content)) {
  if (k.startsWith('USER#') && k.endsWith('::profile')) {
    const u = content[k]?.data
    const un = String(u?.username || '').toLowerCase()
    const nm = String(u?.name || '').toLowerCase()
    const em = String(u?.email || '').toLowerCase()
    if (un.startsWith('e2e') || nm.startsWith('e2e') || em.startsWith('e2e')) {
      const uid = u.uid || u.id || k.split('::')[0].replace('USER#', '')
      if (uid) e2eUids.add(String(uid))
    }
  }
}

console.log('Found e2e user IDs to purge:', e2eUids.size)

// 2. Delete all doc keys for e2e users, reelms, usernames, emails, auths
let deletedKeys = 0
for (const k of Object.keys(content)) {
  const kl = k.toLowerCase()
  if (kl.startsWith('username#e2e') || kl.startsWith('email#e2e') || kl.startsWith('auth#e2e') || kl.startsWith('reelm#e2e-') || kl.startsWith('reelm_code#e2e')) {
    delete content[k]
    deletedKeys++
    continue
  }
  for (const uid of e2eUids) {
    if (k.startsWith('USER#' + uid) || k.startsWith('UID#' + uid)) {
      delete content[k]
      deletedKeys++
      break
    }
  }
}

// 3. Remove e2e users from ALL lists (members, join_requests, friends, bans, timeouts, channels, messages)
let removedMembers = 0
for (const k of Object.keys(content)) {
  if (k.endsWith('::members') && Array.isArray(content[k]?.data)) {
    const before = content[k].data.length
    content[k].data = content[k].data.filter(m => {
      const mid = String(m?.userId || m?.id || '')
      const un = String(m?.username || '').toLowerCase()
      const nm = String(m?.userName || m?.name || '').toLowerCase()
      return !e2eUids.has(mid) && !un.startsWith('e2e') && !nm.startsWith('e2e')
    })
    removedMembers += (before - content[k].data.length)
  }
  if (k.endsWith('::join_requests') && Array.isArray(content[k]?.data)) {
    content[k].data = content[k].data.filter(r => !e2eUids.has(String(r?.userId || r?.id || '')) && !String(r?.username || '').toLowerCase().startsWith('e2e'))
  }
  if (k.endsWith('::friends') && Array.isArray(content[k]?.data)) {
    content[k].data = content[k].data.filter(f => !e2eUids.has(String(f?.userId || f?.id || '')) && !String(f?.username || '').toLowerCase().startsWith('e2e'))
  }
  if (k.endsWith('::friend_requests') && Array.isArray(content[k]?.data)) {
    content[k].data = content[k].data.filter(f => !e2eUids.has(String(f?.userId || f?.id || '')) && !String(f?.username || '').toLowerCase().startsWith('e2e'))
  }
}

fs.writeFileSync(p, JSON.stringify(content, null, 2), 'utf-8')
console.log(`Successfully purged ${e2eUids.size} e2e users. Deleted ${deletedKeys} doc keys and removed ${removedMembers} memberships.`)
