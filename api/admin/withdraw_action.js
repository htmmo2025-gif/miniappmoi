// /api/admin/withdraw_action.js
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

function rawBody(req) {
  return new Promise((resolve, reject) => {
    let d = ''
    req.on('data', c => (d += c))
    req.on('end', () => resolve(d))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  try {
    const tid = getTid(req)
    if (!isAdmin(tid)) return json(res, 403, { error: 'forbidden' })
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

    let body = {}
    try { body = JSON.parse(await rawBody(req)) } catch {}
    const id = Number(body.id)
    const action = String(body.action || '')
    const reason = body.reason ? String(body.reason) : null

    if (!Number.isFinite(id) || !['complete','reject'].includes(action)) {
      return json(res, 400, { error: 'bad_request' })
    }

    const { data, error } = await supa.rpc('withdraw_admin_action', {
      p_admin_tid: String(tid),
      p_withdraw_id: id,
      p_action: action,
      p_reason: reason
    })
    if (error) {
      const m = (error.message || '').toLowerCase()
      if (m.includes('already_processed')) return json(res, 409, { error: 'already_processed' })
      if (m.includes('not_found')) return json(res, 404, { error: 'not_found' })
      if (m.includes('bad_action')) return json(res, 400, { error: 'bad_action' })
      throw error
    }
    return json(res, 200, { ok: true, result: data })
  } catch (e) {
    console.error('admin action error:', e)
    return json(res, 500, { error: 'server_error' })
  }
}
