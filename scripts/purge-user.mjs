import fs from 'node:fs'
import path from 'node:path'

const filePath = path.resolve(process.cwd(), 'services/api/data/doc-store.json')

if (!fs.existsSync(filePath)) {
  console.log('doc-store.json not found.')
  process.exit(1)
}

const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
let foundUid = null
let foundEmail = null

// 1. Look for USERNAME#berkant
if (content['USERNAME#berkant::id'] || content['USERNAME#berkant::uid']) {
  foundUid = content['USERNAME#berkant::id']?.data || content['USERNAME#berkant::uid']?.data
  console.log('Found UID from USERNAME#berkant:', foundUid)
}

// 2. Scan all USER#...::profile
for (const key of Object.keys(content)) {
  if (key.startsWith('USER#') && key.endsWith('::profile')) {
    const profile = content[key]?.data
    if (profile && String(profile.username).toLowerCase() === 'berkant') {
      foundUid = profile.uid || profile.id || key.split('::')[0].replace('USER#', '')
      foundEmail = profile.email || profile.contact
      console.log('Found profile with username "berkant":', { uid: foundUid, email: foundEmail, name: profile.name })
      break
    }
  }
}

// 3. Scan member lists for username === 'berkant'
if (!foundUid) {
  for (const key of Object.keys(content)) {
    if (key.endsWith('::members') && Array.isArray(content[key]?.data)) {
      const m = content[key].data.find(member => String(member?.username).toLowerCase() === 'berkant')
      if (m?.userId) {
        foundUid = m.userId
        console.log('Found UID from members list:', foundUid)
        break
      }
    }
  }
}

console.log('Target UID to purge:', foundUid)

if (foundUid) {
  let deletedKeys = 0

  // Delete all keys belonging to this user
  for (const key of Object.keys(content)) {
    if (key.startsWith(`USER#${foundUid}::`) || key === `USER#${foundUid}` || key === `UID#${foundUid}`) {
      delete content[key]
      deletedKeys++
    }
  }

  // Delete USERNAME#berkant
  for (const key of Object.keys(content)) {
    if (key.startsWith('USERNAME#berkant') || key.startsWith('USERNAME#@berkant')) {
      delete content[key]
      deletedKeys++
    }
  }

  // Delete EMAIL#... if found
  if (foundEmail) {
    for (const key of Object.keys(content)) {
      if (key.startsWith(`EMAIL#${foundEmail.toLowerCase()}`) || key.startsWith(`AUTH#${foundEmail.toLowerCase()}`)) {
        delete content[key]
        deletedKeys++
      }
    }
  }

  // Remove from all Reelm member lists and join requests
  for (const key of Object.keys(content)) {
    if (key.endsWith('::members') && Array.isArray(content[key]?.data)) {
      const before = content[key].data.length
      content[key].data = content[key].data.filter(m => String(m?.userId) !== String(foundUid) && String(m?.username).toLowerCase() !== 'berkant')
      if (content[key].data.length !== before) {
        console.log(`Removed user from ${key} (${before} -> ${content[key].data.length})`)
      }
    }
    if (key.endsWith('::join_requests') && Array.isArray(content[key]?.data)) {
      content[key].data = content[key].data.filter(r => String(r?.userId) !== String(foundUid) && String(r?.username).toLowerCase() !== 'berkant')
    }
    if (key.endsWith('::friends') && Array.isArray(content[key]?.data)) {
      content[key].data = content[key].data.filter(f => String(f?.id || f?.userId) !== String(foundUid) && String(f?.username).toLowerCase() !== 'berkant')
    }
    if (key.endsWith('::friend_requests') && Array.isArray(content[key]?.data)) {
      content[key].data = content[key].data.filter(f => String(f?.id || f?.userId) !== String(foundUid) && String(f?.username).toLowerCase() !== 'berkant')
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
  console.log(`Successfully purged user with username "berkant" (UID: ${foundUid}). Deleted ${deletedKeys} doc keys.`)
} else {
  // Even if not found in doc-store, clean any username reservation
  let cleaned = 0
  for (const key of Object.keys(content)) {
    if (key.toLowerCase().includes('berkant') && !key.toLowerCase().includes('berkannt')) {
      delete content[key]
      cleaned++
    }
  }
  if (cleaned > 0) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
    console.log(`Cleaned ${cleaned} keys matching "berkant".`)
  } else {
    console.log('No user records found with username "berkant" in doc-store.')
  }
}
