import crypto from 'node:crypto'
import { supa } from '../_supa.js'   // <— dùng server client

const BOT_TOKEN = process.env.BOT_TOKEN

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
  try {
    const qs = req.url?.split('?')[1] || ''
    const initData = new URLSearchParams(qs)
    if (!isValid(initData)) return res.status(401).send('bad initData')

    const u = JSON.parse(initData.get('user') || '{}') || {}
    const ref = initData.get('start_param') || initData.get('startapp') || null
    const refId = ref && /^\d+$/.test(ref) ? Number(ref) : null

    const { error } = await supa.from('users').upsert({
      id: u.id,
      telegram_id: u.id,
      username: u.username || null,
      first_name: u.first_name || null,
      last_name:  u.last_name  || null,
      photo_url:  u.photo_url  || null,
      ...(refId && refId !== u.id ? { referrer_id: refId } : {})
    }, { onConflict: 'id' })
    if (error) {
      console.error('verify upsert error', error)
      return res.status(500).send('supabase error')
    }

    res.setHeader('Set-Cookie', `tg_uid=${u.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`)
    res.status(204).end()
  } catch (e) {
    console.error('verify exception', e)
    res.status(500).send('server error')
  }
}
