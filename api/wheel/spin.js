// /api/wheel/spin.js
import { supa } from '../_supa.js'

const COOLDOWN = Number(process.env.ADSGRAM_WHEEL_REWARD_COOLDOWN || 600)

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')
    const uid = getUid(req)
    if (!uid) return res.status(401).send('Unauthorized')

    // Gọi RPC để đảm bảo tính atomic
    const { data, error } = await supa.rpc('wheel_spin', {
      p_uid: uid,
      p_cooldown_secs: COOLDOWN,
    })

    if (error) {
      console.error('wheel_spin RPC error:', error)
      // Trả 200 + ok:false để FE xử lý thống nhất
      return res.status(200).json({ ok: false, remaining: COOLDOWN })
    }

    const row = Array.isArray(data) ? data[0] : data

    if (!row?.ok) {
      // Chưa hết cooldown / bị chặn tạm thời
      return res.status(200).json({
        ok: false,
        remaining: Math.max(0, Number(row?.remaining ?? COOLDOWN)),
      })
    }

    // Thành công
    return res.status(200).json({
      ok: true,
      index: Number(row.index ?? 0),
      add: Number(row.add ?? 0),
      htw_balance: Number(row.new_balance ?? 0),
      remaining: Number(row.remaining ?? COOLDOWN),
    })
  } catch (e) {
    console.error('wheel spin error:', e)
    return res.status(200).json({ ok: false, remaining: COOLDOWN })
  }
}
