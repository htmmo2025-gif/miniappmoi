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

    const q = new URL(req.url, 'https://x').searchParams
    const tg_id = q.get('tg_id')?.trim()
    
    if (!tg_id) return json(res, 400, { error: 'tg_id required' })

    // Lấy user
    const { data: user, error: uErr } = await supa
      .from('users')
      .select('*')
      .eq('telegram_id', tg_id)
      .single()

    if (uErr || !user) return json(res, 404, { error: 'Không tìm thấy user' })

    // Lấy lịch sử rút tiền
    const { data: wRows } = await supa
      .from('withdrawals')
      .select('id,amount_vnd,status,created_at,bank_name,account_name,dest,channel')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const withdrawn_vnd = (wRows || [])
      .filter(r => r.status === 'done')
      .reduce((s, r) => s + Number(r.amount_vnd || 0), 0)
    
    const last_withdraw = (wRows || [])[0] || null
    const recent_withdraws = (wRows || []).slice(0, 10)

    // Lấy dữ liệu kiếm tiền
    const [mining, chest, task, wheel, refs, refUsers] = await Promise.all([
      supa.from('mining_claims').select('reward').eq('user_id', user.id),
      supa.from('chest_claims').select('reward').eq('user_id', user.id),
      supa.from('task_claims').select('reward').eq('user_id', user.id),
      supa.from('wheel_spins').select('prize_amount').eq('user_id', user.id),
      supa.from('referral_earnings').select('amount').eq('referrer_id', user.id),
      supa.from('users').select('id').eq('referrer_id', user.id),
    ])

    const sumArr = r => (r?.data || []).reduce((s, x) => 
      s + Number(x.reward ?? x.prize_amount ?? x.amount ?? 0), 0)
    
    const earned_htw_total = sumArr(mining) + sumArr(chest) + sumArr(task) + sumArr(wheel) + sumArr(refs)
    const ref_count = refUsers?.data?.length || 0

    return json(res, 200, {
      user,
      withdrawn_vnd,
      last_withdraw,
      recent_withdraws,
      earned_htw_total,
      ref_count
    })

  } catch (e) {
    console.error('user lookup error:', e)
    return json(res, 500, { error: 'server_error' })
  }
}