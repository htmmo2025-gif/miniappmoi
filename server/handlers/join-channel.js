// /api/join-channel.js
import { supa } from './_supa.js'

// ĐỌC THEO VERCEL: BOT_TOKEN, JOIN_CHAT_ID
// (fallback các tên cũ để không vỡ local)
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TG_BOT_TOKEN || ''
const CHAT_ID   = process.env.JOIN_CHAT_ID || process.env.TG_JOIN_CHAT_ID || '' // ví dụ: '@HTW_Announcements' hoặc '-100123...'

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

const joinedStatuses = new Set(['member', 'administrator', 'creator'])

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok:false, error:'Missing bot config' })
    }

    const tgUid = getUid(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // Lấy user
    const { data: user, error: eUser } = await supa
      .from('users').select('id, telegram_id, htw_balance')
      .eq('telegram_id', tgUid).single()
    if (eUser || !user) return res.status(500).json({ ok:false, error:'User not found' })

    // Gọi Telegram API kiểm tra đã join
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(CHAT_ID)}&user_id=${user.telegram_id}`
    const tgr = await fetch(url).then(r => r.json()).catch(() => null)

    if (!tgr?.ok || !joinedStatuses.has(tgr?.result?.status)) {
      return res.status(200).json({ ok:false, error:'Bạn chưa tham gia kênh.', joined:false })
    }

    // Claim +1 HTW (idempotent)
    const blockId = `join:${CHAT_ID}`
    const { data, error } = await supa.rpc('task_join_channel_claim', {
      p_user_id : user.id,
      p_block_id: blockId,
      p_reward  : 1
    })
    if (error) {
      console.error('task_join_channel_claim error:', error)
      return res.status(500).json({ ok:false, error:'Claim failed' })
    }
    const result = Array.isArray(data) ? data[0] : data

    return res.status(200).json({
      ok         : true,
      joined     : true,
      already    : !!result?.already,
      new_balance: Number(result?.new_balance ?? user.htw_balance),
    })
  } catch (e) {
    console.error('join-channel error:', e)
    return res.status(500).json({ ok:false, error:'Server error' })
  }
}
