import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supa = createClient(url, key, { auth: { persistSession: false } })

function json(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function parseCookies(req) {
  const h = req.headers.cookie || ''
  return Object.fromEntries(
    h.split(/;\s*/).filter(Boolean).map(s => {
      const i = s.indexOf('=')
      return [decodeURIComponent(s.slice(0, i)), decodeURIComponent(s.slice(i + 1))]
    })
  )
}

function getTid(req) {
  const q = new URL(req.url, 'https://x').searchParams
  return (
    q.get('tid') ||
    req.headers['x-telegram-id'] ||
    parseCookies(req)['tg_id'] ||
    null
  )
}

function isAdmin(tid) {
  const raw = process.env.ADMIN_TG_IDS || ''
  const set = new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  )
  return tid && set.has(String(tid))
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' })

    const tid = getTid(req)
    if (!isAdmin(tid)) return json(res, 403, { error: 'forbidden' })

    // Lấy tất cả giao dịch có status = 'completed' (đã duyệt thành công)
    const { data: doneRows, error } = await supa
      .from('withdrawals')
      .select('amount_vnd, created_at')
      .eq('status', 'completed')

    if (error) throw error

    // Tính tổng tiền
    const total_vnd_done = (doneRows || []).reduce((s, r) => s + Number(r.amount_vnd || 0), 0)

    // Gộp theo ngày (UTC) để đếm số ngày có rút tiền
    const map = new Map()
    for (const r of (doneRows || [])) {
      const day = new Date(r.created_at).toISOString().slice(0, 10) // YYYY-MM-DD
      map.set(day, (map.get(day) || 0) + Number(r.amount_vnd || 0))
    }
    const by_day = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, vnd]) => ({ day, vnd }))

    return json(res, 200, { total_vnd_done, by_day })
  } catch (e) {
    console.error('admin summary error:', e)
    return json(res, 500, { error: 'server_error' })
  }
}