// /api/admin/withdraws.js
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
    const tid = getTid(req)
    if (!isAdmin(tid)) return json(res, 403, { error: 'forbidden' })

    // filter theo ?status=pending|completed|rejected (optional)
    const q = new URL(req.url, 'https://x').searchParams
    const status = q.get('status')

    let sel = supa
      .from('withdrawals')
      .select('id,user_id,amount_vnd,channel,dest,bank_name,account_name,status,created_at,processed_at,processed_by,note')
      .order('created_at', { ascending: false })
      .limit(200)

    if (status) sel = sel.eq('status', status)

    const { data: list, error } = await sel
    if (error) throw error

    // nạp info user
    const ids = [...new Set(list.map(x => x.user_id))]
    let umap = {}
    if (ids.length) {
      const { data: users } = await supa
        .from('users')
        .select('id,telegram_id,username,first_name,last_name')
        .in('id', ids)
      umap = Object.fromEntries(users.map(u => [u.id, u]))
    }

    const combined = list.map(w => ({ ...w, user: umap[w.user_id] || null }))
    return json(res, 200, combined)
  } catch (e) {
    console.error('admin list error:', e)
    return json(res, 500, { error: 'server_error' })
  }
}
