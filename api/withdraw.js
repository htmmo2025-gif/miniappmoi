// /api/withdraw.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY   = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

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

async function resolveUser(req) {
  const q = new URL(req.url, 'https://x').searchParams
  const tid = q.get('tid') || req.headers['x-telegram-id'] || parseCookies(req)['tg_id'] || null
  if (!tid) return null

  const { data: u, error } = await supa
    .from('users')
    .select('*')
    .eq('telegram_id', tid)
    .maybeSingle()
  if (error) throw error
  return u
}

export default async function handler(req, res) {
  try {
    const user = await resolveUser(req)
    if (!user) return json(res, 401, { error: 'missing_user' })

    if (req.method === 'GET') {
      const { data, error } = await supa
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return json(res, 200, data || [])
    }

    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse(await getRawBody(req)) } catch {}
      const amount_vnd   = Number(body.amount_vnd || 0)
      const channel      = String(body.channel || 'bank')
      const dest         = String(body.dest || '')
      const bank_name    = String(body.bank_name || '')
      const account_name = String(body.account_name || '')

      // Validate nhanh ở API
      if (!Number.isFinite(amount_vnd) || amount_vnd < 2000)
        return json(res, 400, { error: 'min_withdraw', message: 'Tối thiểu 2.000 VND' })
      if (!dest || !bank_name || !account_name)
        return json(res, 400, { error: 'missing_fields' })

      // Gọi RPC (atomic)
      const { data, error } = await supa.rpc('withdraw_create', {
        p_user_id: user.id,
        p_amount_vnd: amount_vnd,
        p_channel: channel,
        p_dest: dest,
        p_bank_name: bank_name,
        p_account_name: account_name,
      })

      if (error) {
        const m = String(error.message || '').toLowerCase()
        if (m.includes('daily_limit'))   return json(res, 429, { error: 'daily_limit', message: 'Mỗi ngày chỉ rút 1 lần' })
        if (m.includes('min_withdraw'))  return json(res, 400, { error: 'min_withdraw', message: 'Tối thiểu 2.000 VND' })
        if (m.includes('insufficient'))  return json(res, 400, { error: 'insufficient', message: 'Số dư không đủ' })
        if (m.includes('no_user'))       return json(res, 400, { error: 'missing_user' })
        throw error
      }

      // data: ok, id, balance, status, created_at
      return json(res, 200, {
        ok: true,
        id: data?.id,
        balance: data?.balance,
        status: data?.status,
        created_at: data?.created_at
      })
    }

    return json(res, 405, { error: 'method_not_allowed' })
  } catch (e) {
    console.error('withdraw api error:', e)
    return json(res, 500, { error: 'server_error' })
  }
}

// Helper: đọc raw body cho Vercel/Node
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
