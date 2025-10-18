// server/handlers/track-ip.js
import { supa } from './_supa.js'

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')

    // 1) Lấy uid: cookie -> header -> body -> query
    let uid = getUidFromCookie(req)
    if (!uid) {
      const hTid = req.headers['x-telegram-id']
      if (hTid) uid = Number(hTid)
    }
    if (!uid) {
      // body/json
      try {
        const chunks = []
        for await (const c of req) chunks.push(c)
        const bodyRaw = Buffer.concat(chunks).toString('utf8') || '{}'
        const body = JSON.parse(bodyRaw)
        if (body?.tid) uid = Number(body.tid)
      } catch {}
    }
    if (!uid) {
      const u = new URL(req.url, 'https://x')
      const qtid = u.searchParams.get('tid')
      if (qtid) uid = Number(qtid)
    }
    if (!uid) return res.status(401).json({ ok:false, error:'Unauthorized' })

    // 2) Lấy IP & UA
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      ''
    const ua = req.headers['user-agent'] || ''

    // 3) Cập nhật bảng users theo telegram_id
    const nowIso = new Date().toISOString()
    const up = await supa
      .from('users')
      .update({ last_ip: String(ip), user_agent: String(ua), last_seen_at: nowIso })
      .eq('telegram_id', uid)
      .select('id')
      .maybeSingle()

    if (up.error) {
      console.error('track-ip update error:', up.error)
      return res.status(500).json({ ok:false, error:'DB update failed' })
    }

    return res.status(200).json({ ok:true, ip, ua, at: nowIso })
  } catch (e) {
    console.error('track-ip error:', e)
    return res.status(500).json({ ok:false, error:'Server error' })
  }
}
