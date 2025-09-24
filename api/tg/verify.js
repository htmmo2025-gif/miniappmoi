// api/tg/verify.js
import crypto from 'node:crypto'
import { supa } from '../_supa.js'

const BOT_TOKEN = process.env.BOT_TOKEN

function isValid (initData) {
  const hash = initData.get('hash')
  if (!hash) return false
  initData.delete('hash')
  const str = [...initData.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const hmac   = crypto.createHmac('sha256', secret).update(str).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash))
}

export default async (req, res) => {
  try {
    const url = new URL(req.url, 'https://x')

    // gọi từ vercel screenshot hoặc mở ngoài Telegram -> không có hash thì bỏ qua
    if (!url.searchParams.has('hash')) {
      return res.status(204).end()
    }

    const initData = new URLSearchParams(url.searchParams)
    if (!isValid(initData)) return res.status(401).send('bad initData')

    const u = JSON.parse(initData.get('user') || '{}') || {}
    const ref = initData.get('start_param') || initData.get('startapp') || null
    const refId = ref && /^\d+$/.test(ref) ? Number(ref) : null

    // Lấy referrer hiện tại (nếu có)
    const { data: exist, error: selErr } = await supa
      .from('users')
      .select('referrer_id')
      .eq('id', u.id)
      .maybeSingle()

    if (selErr) {
      console.error('verify select error', selErr)
      return res.status(500).send('supabase error')
    }

    // Payload cập nhật thông tin cơ bản
    const payload = {
      id: u.id,
      telegram_id: u.id,
      username: u.username || null,
      first_name: u.first_name || null,
      last_name:  u.last_name  || null,
      photo_url:  u.photo_url  || null,
    }

    // CHỈ set referrer_id nếu chưa có & ref hợp lệ & không tự giới thiệu
    if (!exist?.referrer_id && refId && refId !== u.id) {
      payload.referrer_id = refId
    }

    const { error } = await supa
      .from('users')
      .upsert(payload, { onConflict: 'id' }) // không truyền referrer_id => sẽ không ghi đè
    if (error) {
      console.error('verify upsert error', error)
      return res.status(500).send('supabase error')
    }

    // set cookie nhận diện uid cho các API khác
    res.setHeader(
      'Set-Cookie',
      `tg_uid=${u.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
    )
    res.status(204).end()
  } catch (e) {
    console.error('verify exception', e)
    res.status(500).send('server error')
  }
}
