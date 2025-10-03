// /api/checkin.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
const REWARDS = [1, 2, 3, 4, 5, 6, 7]

const j = (res, code, data) => {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

/* ===== UTC helpers (khớp timestamptz) ===== */
const today0UTC = () => { const d = new Date(); d.setUTCHours(0,0,0,0); return d }
const secsToTomorrowUTC = () => {
  const now = new Date()
  const tmr = new Date(now); tmr.setUTCDate(now.getUTCDate() + 1); tmr.setUTCHours(0,0,0,0)
  return Math.max(1, Math.floor((tmr - now) / 1000))
}

/* ===== cookies / telegram id ===== */
function parseCookies(req) {
  const h = req.headers.cookie || ''
  return Object.fromEntries(
    h.split(/;\s*/).filter(Boolean).map(s => {
      const i = s.indexOf('=')
      return [decodeURIComponent(s.slice(0,i)), decodeURIComponent(s.slice(i+1))]
    })
  )
}

async function resolveUser(req) {
  const q = new URL(req.url, 'https://x').searchParams
  const cookies = parseCookies(req)
  let tid = q.get('tid') || req.headers['x-telegram-id'] || cookies['tg_id'] || null
  if (!tid && cookies['tg_user']) {
    try { tid = JSON.parse(decodeURIComponent(cookies['tg_user']))?.id } catch {}
  }
  if (!tid) return null

  // tìm user
  const { data: u1, error: e1 } = await supa
    .from('users')
    .select('id, htw_balance, telegram_id')
    .eq('telegram_id', String(tid))
    .maybeSingle()
  if (e1) throw e1
  if (u1) return u1

  // dự phòng: tạo mới
  const { data: u2, error: e2 } = await supa
    .from('users')
    .insert({ telegram_id: String(tid), htw_balance: 0 })
    .select('id, htw_balance, telegram_id')
    .single()
  if (e2) throw e2
  return u2
}

/* ===== tính tiến trình (UTC) ===== */
function calcProgress(row) {
  if (!row) return { day: 1, remaining: 0 }

  const last = row.last_checkin ? new Date(row.last_checkin) : null
  if (!last) return { day: Math.max(1, row.streak_day || 1), remaining: 0 }

  const last0 = new Date(last); last0.setUTCHours(0,0,0,0)
  const t0 = today0UTC()
  const diffDays = Math.floor((t0 - last0) / 86400000)

  if (diffDays <= 0) {
    // đã điểm danh hôm nay
    return { day: Math.max(1, row.streak_day || 1), remaining: secsToTomorrowUTC() }
  }
  if (diffDays === 1) {
    // sang ngày kế tiếp
    return { day: Math.min((row.streak_day || 1) + 1, 7), remaining: 0 }
  }
  // bỏ lỡ >= 1 ngày → về ngày 1
  return { day: 1, remaining: 0 }
}

/* ===== handler ===== */
export default async function handler(req, res) {
  try {
    const user = await resolveUser(req)
    if (!user) return j(res, 401, { ok:false, error:'missing_user' })

    const { data: rec, error: e0 } = await supa
      .from('daily_checkins')
      .select('user_id, streak_day, last_checkin')
      .eq('user_id', user.id)
      .maybeSingle()
    if (e0) throw e0

    if (req.method === 'GET') {
      const p = calcProgress(rec)
      return j(res, 200, {
        ok: true,
        day: p.day,
        remaining: p.remaining,
        balance: Number(user.htw_balance || 0),
      })
    }

    if (req.method !== 'POST') return j(res, 405, { ok:false, error:'method_not_allowed' })

    const p = calcProgress(rec)
    if (p.remaining > 0) {
      // ĐÃ ĐIỂM DANH HÔM NAY → KHÔNG cộng nữa
      return j(res, 409, { ok:false, reason:'already_checked', remaining: p.remaining })
    }

    const reward = REWARDS[p.day - 1] || 1
    const nowISO = new Date().toISOString()

    // 1) upsert daily_checkins với NGÀY ĐANG NHẬN
    const { error: e1 } = await supa
      .from('daily_checkins')
      .upsert({
        user_id: user.id,
        streak_day: p.day,
        last_checkin: nowISO,
        updated_at: nowISO,
      }, { onConflict: 'user_id' })
    if (e1) throw e1

    // 2) cộng HTW
    const { data: u2, error: e2 } = await supa
      .from('users')
      .update({ htw_balance: (Number(user.htw_balance || 0) + reward) })
      .eq('id', user.id)
      .select('htw_balance')
      .single()
    if (e2) throw e2

    const nextDay = p.day === 7 ? 1 : p.day + 1

    return j(res, 200, {
      ok: true,
      add: reward,
      balance: Number(u2?.htw_balance || 0),
      day: nextDay,                      // ngày sẽ hiển thị tiếp theo
      remaining: secsToTomorrowUTC(),
    })
  } catch (err) {
    console.error('checkin error', err)
    return j(res, 500, { ok:false, error:'server_error' })
  }
}
