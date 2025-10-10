// server/handlers/admin/whoami.js
import { createClient } from '@supabase/supabase-js'

// Supabase chỉ để bạn lấy/khởi tạo user nếu thích. Không bắt buộc cho admin-check.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supa = (SUPABASE_URL && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null

function send(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function parseCookies(req) {
  const h = req.headers.cookie || ''
  return Object.fromEntries(
    h.split(/;\s*/).filter(Boolean).map(s => {
      const i = s.indexOf('=')
      return [decodeURIComponent(s.slice(0,i)), decodeURIComponent(s.slice(i+1))]
    })
  )
}

function getTelegramId(req) {
  const q = new URL(req.url, 'https://x').searchParams

  // Ưu tiên cookie do /api/tg/verify set (ổn định nhất)
  const fromCookie = parseCookies(req)['tg_id']
  if (fromCookie) return String(fromCookie)

  // Cho phép override bằng header hoặc query (dùng khi dev/test)
  const fromHeader = req.headers['x-telegram-id']
  if (fromHeader) return String(fromHeader)

  const fromQuery = q.get('tid')
  if (fromQuery) return String(fromQuery)

  return null
}

function getAdminSet() {
  // ADMIN_TG_IDS="123,456  789;999" => [ '123','456','789','999' ]
  return new Set(
    String(process.env.ADMIN_TG_IDS || '')
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
  )
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' })

    const tgId = getTelegramId(req)
    if (!tgId) return send(res, 401, { error: 'missing_user' })

    const admins = getAdminSet()
    const isAdmin = admins.has(String(tgId))

    // (Tuỳ chọn) đảm bảo có user trong DB để client lấy profile sau này
    if (isAdmin && supa) {
      try {
        const { data: u, error } = await supa
          .from('users')
          .select('id')
          .eq('telegram_id', tgId)
          .maybeSingle()
        if (error) throw error
        if (!u) {
          // tạo sơ bộ (không lỗi nếu bảng không có)
          await supa.from('users').insert({ telegram_id: tgId, htw_balance: 0 })
        }
      } catch (e) {
        // Không fatal cho whoami; chỉ log
        console.warn('whoami ensure user warn:', e?.message || e)
      }
    }

    return send(res, 200, {
      is_admin: isAdmin,
      telegram_id: tgId
    })
  } catch (e) {
    console.error('admin/whoami error:', e)
    return send(res, 500, { error: 'server_error' })
  }
}