import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const BOT_TOKEN = process.env.BOT_TOKEN
const supa = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY)

function isValid(initData) {
  const hash = initData.get('hash')
  if (!hash) return false
  initData.delete('hash')

  const str = [...initData.entries()]
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`).join('\n')

  const secret = crypto.createHmac('sha256','WebAppData').update(BOT_TOKEN).digest()
  const hmac = crypto.createHmac('sha256', secret).update(str).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash))
}

export default async (req, res) => {
  const qs = req.url?.split('?')[1] || ''
  const initData = new URLSearchParams(qs)
  if (!isValid(initData)) return res.status(401).send('bad initData')

  const u = JSON.parse(initData.get('user') || '{}') || {}
  const ref = initData.get('start_param') || initData.get('startapp') || null
  const refId = ref && /^\d+$/.test(ref) ? Number(ref) : null

  // upsert user info vào bảng users
  await supa.from('users').upsert({
    id: u.id,                          // primary key
    telegram_id: u.id,
    username: u.username || null,
    first_name: u.first_name || null,
    last_name:  u.last_name  || null,
    photo_url:  u.photo_url  || null,
    // chỉ set referrer lần đầu, tránh overwrite
    referrer_id: (refId && refId !== u.id) ? refId : null
  }, { onConflict: 'id' })

  // nếu có referrer_id nhưng đã tồn tại giá trị thì không ghi đè
  if (refId && refId !== u.id) {
    await supa.rpc('set_referrer_once', { p_user_id: u.id, p_referrer_id: refId })
      .catch(()=>{}) // optional: tạo function ở dưới
  }

  // cookie phiên
  res.setHeader('Set-Cookie', `tg_uid=${u.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`)
  res.status(204).end()
}
