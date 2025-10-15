// /api/wheel/spin.js
import { supa } from '../_supa.js'

const COOLDOWN  = Number(process.env.WHEEL_COOLDOWN_SEC || process.env.ADSGRAM_WHEEL_REWARD_COOLDOWN || 1200)
const DAY_LIMIT = Number(process.env.WHEEL_DAILY_LIMIT || 30)

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  try {
    const tgUid = getUid(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // Gọi RPC atomic: wheel_spin_with_limit
    const { data, error } = await supa.rpc('wheel_spin_with_limit', {
      p_uid: tgUid,
      p_cooldown_secs: COOLDOWN,
      p_day_limit: DAY_LIMIT,
    })
    if (error) {
      console.error('RPC wheel_spin_with_limit error:', error)
      return res.status(500).json({ ok: false, error: 'Spin failed' })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return res.status(500).json({ ok:false, error:'No result from RPC' })

    // row: { ok, index, add, new_balance, remaining, today_count, error }
    if (row.ok !== true) {
      // cooldown hoặc đạt limit
      if (row.remaining > 0) res.setHeader('Retry-After', String(row.remaining))
      return res.status(200).json({
        ok: false,
        remaining: Math.max(0, Number(row.remaining ?? 0)),
        today_count: Number(row.today_count ?? 0),
        error: row.error || 'Cooldown or daily limit',
      })
    }

    // thành công
    return res.status(200).json({
      ok: true,
      index: Number(row.index ?? 0),
      add: Number(row.add ?? 0),
      htw_balance: Number(row.new_balance ?? 0),
      remaining: COOLDOWN,
      today_count: Number(row.today_count ?? 1),
    })
  } catch (e) {
    console.error('wheel/spin error', e)
    return res.status(500).json({ ok:false, error:'Server error' })
  }
}
