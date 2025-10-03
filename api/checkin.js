// /api/checkin.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

const REWARDS = [1, 2, 3, 4, 5, 6, 7]

function json(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function secsToNextMidnight(now = new Date()) {
  const tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1)
  tmr.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((tmr - now) / 1000))
}

function parseCookies(req) {
  const h = req.headers.cookie || ''
  return Object.fromEntries(h.split(/;\s*/).filter(Boolean).map(s => {
    const i = s.indexOf('=')
    return [decodeURIComponent(s.slice(0, i)), decodeURIComponent(s.slice(i + 1))]
  }))
}

// Chấp nhận nhiều nguồn lấy telegram_id: query ?tid=..., header, cookie
async function resolveUser(req) {
  const q = new URL(req.url, 'https://x').searchParams
  const tid =
    q.get('tid') ||
    req.headers['x-telegram-id'] ||
    parseCookies(req)['tg_id'] ||
    null

  if (!tid) return null

  // tìm user theo telegram_id
  const { data: u1, error: e1 } = await supa
    .from('users')
    .select('*')
    .eq('telegram_id', tid)
    .maybeSingle()
  if (e1) throw e1

  if (u1) return u1

  // chưa có thì tạo mới (dự phòng)
  const { data: u2, error: e2 } = await supa
    .from('users')
    .insert({ telegram_id: tid, htw_balance: 0 })
    .select('*')
    .single()
  if (e2) throw e2
  return u2
}

// Tính day & remaining từ bản ghi daily_checkins
function calcProgress(row) {
  // default: ngày 1, có thể điểm danh ngay
  if (!row) return { day: 1, remaining: 0 }

  const last = row.last_checkin ? new Date(row.last_checkin) : null
  if (!last) return { day: Math.max(1, row.streak_day || 1), remaining: 0 }

  const last00 = new Date(last)
  last00.setHours(0, 0, 0, 0)

  const today00 = startOfToday()
  const diffDays = Math.floor((today00 - last00) / 86400000)

  if (diffDays <= 0) {
    // đã điểm danh hôm nay
    return { day: Math.max(1, row.streak_day || 1), remaining: secsToNextMidnight() }
  }
  if (diffDays === 1) {
    // sang ngày kế tiếp
    const next = Math.min((row.streak_day || 1) + 1, 7)
    return { day: next, remaining: 0 }
  }
  // bỏ lỡ >= 1 ngày => về ngày 1
  return { day: 1, remaining: 0 }
}

export default async function handler(req, res) {
  try {
    const user = await resolveUser(req)
    if (!user) return json(res, 400, { error: 'missing_user' })

    // lấy bản ghi checkin
    const { data: rec, error: e0 } = await supa
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (e0) throw e0

    if (req.method === 'GET') {
      const p = calcProgress(rec)
      return json(res, 200, {
        day: p.day,
        remaining: p.remaining,
        balance: Number(user.htw_balance || 0),
      })
    }

    if (req.method !== 'POST')
      return json(res, 405, { error: 'method_not_allowed' })

    // kiểm tra cooldown (đã điểm danh hôm nay?)
    const p = calcProgress(rec)
    if (p.remaining > 0) {
      return json(res, 200, { ok: false, remaining: p.remaining })
    }

    const reward = REWARDS[p.day - 1] || 1
    const now = new Date().toISOString()
    const nextDay = p.day === 7 ? 1 : p.day + 1

    // Cập nhật số dư (users)
    const { data: u2, error: e1 } = await supa
      .from('users')
      .update({ htw_balance: (Number(user.htw_balance || 0) + reward) })
      .eq('id', user.id)
      .select('htw_balance')
      .single()
    if (e1) throw e1

    // Upsert daily_checkins
    const upsert = {
      user_id: user.id,
      streak_day: nextDay,
      last_checkin: now,
      updated_at: now,
    }
    const { error: e2 } = await supa
      .from('daily_checkins')
      .upsert(upsert, { onConflict: 'user_id' })
    if (e2) throw e2

    // (tuỳ chọn) Ghi log
    await supa.from('task_claims').insert({
      user_id: user.id,
      claimed_at: now,
      reward,
      source: 'daily_checkin',
    }).catch(() => {})

    return json(res, 200, {
      ok: true,
      add: reward,
      balance: Number(u2.htw_balance || 0),
      day: nextDay,
      remaining: secsToNextMidnight(),
    })
  } catch (err) {
    console.error('checkin error', err)
    return json(res, 500, { error: 'server_error' })
  }
}
