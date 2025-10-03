// /api/checkin.js
import { supa } from './_supa.js'

function uidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  const tgUid = uidFromCookie(req)
  if (!tgUid) return res.status(401).send('Unauthorized')

  if (req.method === 'GET') {
    // Lấy user + tính remaining dựa trên last_checkin (24h kể từ lần trước)
    const { data: user, error } = await supa
      .from('users')
      .select('id, htw_balance, checkin_day, last_checkin')
      .eq('telegram_id', tgUid)
      .single()

    if (error || !user) return res.status(500).send('User not found')

    let remaining = 0
    if (user.last_checkin) {
      const elapsed = (Date.now() - new Date(user.last_checkin).getTime()) / 1000
      remaining = Math.max(0, Math.ceil(86400 - elapsed))
    }

    return res.status(200).json({
      day: Number(user.checkin_day ?? 0),
      remaining,
      htw_balance: Number(user.htw_balance ?? 0),
    })
  }

  if (req.method === 'POST') {
    // p_base_reward = 1 → ngày N thưởng N HTW (1..7), bỏ lỡ 1 ngày quay lại ngày 1
    const { data, error } = await supa.rpc('daily_checkin', {
      p_uid: tgUid,
      p_base_reward: 1,
    })

    if (error) {
      console.error(error)
      return res.status(500).json({ ok: false, error: 'Supabase error' })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.ok) {
      return res.status(200).json({
        ok: false,
        remaining: Number(row?.remaining ?? 0),
      })
    }

    return res.status(200).json({
      ok: true,
      day: Number(row.day),
      add: Number(row.add),
      htw_balance: Number(row.new_balance),
      remaining: 86400,
    })
  }

  return res.status(405).send('Method not allowed')
}
