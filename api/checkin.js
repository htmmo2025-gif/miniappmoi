// /api/checkin.js
import { supa } from './_supa.js'

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  const uid = getUid(req)
  if (!uid) return res.status(401).send('Unauthorized')

  try {
    if (req.method === 'GET') {
      const { data, error } = await supa.rpc('get_checkin_status', { p_uid: uid })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return res.status(200).json({
        day: row?.day ?? 0,
        today_claimed: !!row?.today_claimed,
        remaining: Number(row?.remaining ?? 0),
        htw_balance: Number(row?.htw_balance ?? 0),
      })
    }

    if (req.method === 'POST') {
      // điểm danh sau khi xem quảng cáo thành công
      const { data, error } = await supa.rpc('claim_checkin', { p_uid: uid })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.ok) {
        return res.status(200).json({
          ok: false,
          day: Number(row?.day ?? 0),
          remaining: Number(row?.next_remaining ?? 0),
          htw_balance: Number(row?.new_balance ?? 0),
        })
      }
      return res.status(200).json({
        ok: true,
        day: Number(row.day),
        add: Number(row.reward),
        remaining: Number(row.next_remaining),
        htw_balance: Number(row.new_balance),
      })
    }

    res.status(405).send('Method not allowed')
  } catch (e) {
    console.error(e)
    res.status(500).json({ ok: false, error: e.message })
  }
}
