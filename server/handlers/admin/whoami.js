// /api/admin/whoami.js
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
createClient(url, key) // chỉ để "đánh thức" env; không cần query DB ở đây

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

export default async function handler(req, res) {
  try {
    const tid = getTid(req)
    const raw = process.env.ADMIN_TG_IDS || '' // ví dụ: "7369581059,123456789"
    const set = new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
    const is_admin = tid && set.has(String(tid))
    return json(res, 200, { is_admin: !!is_admin, tid: tid || null })
  } catch (e) {
    return json(res, 500, { is_admin: false })
  }
}
