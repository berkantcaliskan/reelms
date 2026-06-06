import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env dosyasını oku (services/api/.env önce, sonra kök .env)
function loadEnv() {
  const candidates = [
    join(__dirname, '../services/api/.env'),
    join(__dirname, '../.env'),
  ]
  for (const p of candidates) {
    try {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
      }
    } catch {}
  }
}
loadEnv()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Hata: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchAll(table, order = 'id') {
  const all = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(order)
      .range(from, from + PAGE - 1)
    if (error) { console.error(`[${table}] fetch hatası:`, error.message); break }
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

function fmt(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

async function main() {
  console.log('Supabase\'den veriler çekiliyor...')

  const [accounts, events] = await Promise.all([
    fetchAll('tracked_accounts', 'registered_at'),
    fetchAll('tracked_events', 'occurred_at'),
  ])

  console.log(`  Hesap: ${accounts.length}  |  Etkinlik: ${events.length}`)

  // ── Sayfa 1: Hesaplar ──────────────────────────────────────────────────────
  const sheet1 = accounts.map(a => ({
    'UID':           a.uid,
    'E-posta':       a.email,
    'Kullanıcı Adı': a.username    ?? '',
    'Görünen Ad':    a.display_name ?? '',
    'Platform':      a.platform    ?? '',
    'Kayıt Tarihi':  fmt(a.registered_at),
    'Şifre':         '***gizli***',
  }))

  // ── Sayfa 2: Tüm Etkinlikler ───────────────────────────────────────────────
  const sheet2 = events.map(e => ({
    'Tarih/Saat':  fmt(e.occurred_at),
    'UID':         e.uid       ?? 'anonim',
    'Oturum ID':   e.session_id ?? '',
    'Etkinlik':    e.event_type,
    'Kategori':    e.category  ?? '',
    'Sayfa':       e.page      ?? '',
    'Element':     e.element   ?? '',
    'IP':          e.ip        ?? '',
    'Tarayıcı':    (e.user_agent ?? '').slice(0, 80),
    'Detay':       e.metadata  ? JSON.stringify(e.metadata) : '',
  }))

  // ── Sayfa 3: Kullanıcı Özeti ───────────────────────────────────────────────
  const stats = {}
  for (const e of events) {
    const uid = e.uid || '__anon__'
    if (!stats[uid]) {
      const acc = accounts.find(a => a.uid === uid)
      stats[uid] = {
        uid,
        email:       acc?.email        ?? 'anonim',
        username:    acc?.username      ?? '',
        registered:  acc?.registered_at ?? null,
        totalEvents: 0,
        clicks:      0,
        pageViews:   0,
        pages:       new Set(),
        firstSeen:   null,
        lastSeen:    null,
      }
    }
    const s = stats[uid]
    s.totalEvents++
    if (e.event_type === 'click')     s.clicks++
    if (e.event_type === 'page_view') s.pageViews++
    if (e.page) s.pages.add(e.page)
    if (e.occurred_at) {
      if (!s.firstSeen || e.occurred_at < s.firstSeen) s.firstSeen = e.occurred_at
      if (!s.lastSeen  || e.occurred_at > s.lastSeen)  s.lastSeen  = e.occurred_at
    }
  }

  const sheet3 = Object.values(stats).map(s => ({
    'UID':                    s.uid,
    'E-posta':                s.email,
    'Kullanıcı Adı':          s.username,
    'Kayıt Tarihi':           fmt(s.registered),
    'Toplam Etkinlik':        s.totalEvents,
    'Tıklama Sayısı':         s.clicks,
    'Sayfa Görüntüleme':      s.pageViews,
    'Farklı Sayfa Sayısı':    s.pages.size,
    'İlk Etkinlik':           fmt(s.firstSeen),
    'Son Etkinlik':           fmt(s.lastSeen),
  }))

  // ── Excel oluştur ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'Hesaplar')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), 'Tüm Etkinlikler')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet3), 'Kullanıcı Özeti')

  const outDir = join(__dirname, '../exports')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'reelms-tracking.xlsx')
  XLSX.writeFile(wb, outPath)

  console.log(`Kaydedildi: ${outPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })
