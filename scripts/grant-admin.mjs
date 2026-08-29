import fs from 'node:fs'
import path from 'node:path'

const filePath = path.resolve(process.cwd(), 'services/api/data/doc-store.json')
if (fs.existsSync(filePath)) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  let modified = false

  const membersKey = 'REELM#reelms-community::members'
  if (content[membersKey] && Array.isArray(content[membersKey].data)) {
    content[membersKey].data = content[membersKey].data.map(m => {
      if (m.username === 'berkannt' || m.username === 'berkant') {
        const roles = Array.from(new Set([...(m.roleIds || []), 'role-admin-rc']))
        console.log('Granted role-admin-rc to:', m.username, 'userId:', m.userId)
        modified = true
        return { ...m, roleIds: roles }
      }
      return m
    })
  }

  // Also check if any profile exists with username berkannt
  Object.keys(content).forEach(k => {
    if (k.startsWith('USER#') && k.endsWith('::profile')) {
      const p = content[k]?.data
      if (p && (p.username === 'berkannt' || p.username === 'berkant')) {
        console.log('Found user profile for berkannt:', p.uid, p.username)
        p.isModerator = true
        p.isCommunityAdmin = true
        modified = true
      }
    }
  })

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
    console.log('doc-store.json updated successfully.')
  } else {
    console.log('No existing berkannt profile found in doc-store yet, will be automatically assigned Community Admin on login/sync.')
  }
} else {
  console.log('doc-store.json not found.')
}
