// /api/wheel.js
import { supa } from './_supa.js'

const COOLDOWN  = Number(process.env.WHEEL_COOLDOWN_SEC || process.env.ADSGRAM_WHEEL_REWARD_COOLDOWN || 1200)
const DAY_LIMIT = Number(process.env.WHEEL_DAILY_LIMIT || 10)

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const uid = getUid(req)
  if (!uid) return res.status(401).send('Unauthorized')

  try {
    // ====== GET: trạng thái vòng quay ======
    if (req.method === 'GET') {
      const { data: user, error: e1 } = await supa
        .from('users')
        .select('id, htw_balance')
        .eq('telegram_id', uid)
        .single()

      if (e1 || !user) return res.status(500).send('User not found')

      // lần quay gần nhất -> remaining
      const { data: last } = await supa
        .from('wheel_spins')
        .select('spun_at')
        .eq('user_id', user.id)
        .order('spun_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let remaining = 0
      if (last?.spun_at) {
        const elapsed = (Date.now() - new Date(last.spun_at).getTime()) / 1000
        remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
      }

      // hôm nay đã quay
      const today0Iso = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z').toISOString()
      const { count: today = 0 } = await supa
        .from('wheel_spins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('spun_at', today0Iso)

      return res.status(200).json({
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(user.htw_balance ?? 0),
        today: Number(today || 0),
        daily_limit: DAY_LIMIT,
      })
    }

    // ====== POST: quay vòng ======
    if (req.method === 'POST') {
      // gọi 1 hàm duy nhất đã gộp: wheel_spin
      const { data, error } = await supa.rpc('wheel_spin', {
        p_uid: uid,
        p_cooldown_secs: COOLDOWN,
        p_day_limit: DAY_LIMIT,
      })

      if (error) {
        console.error('RPC wheel_spin error:', error)
        return res.status(500).json({ ok: false, error: 'Spin failed' })
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        return res.status(500).json({ ok: false, error: 'No result from RPC' })
      }

      // row: { ok, index, add, new_balance, remaining, today_count, error }
      if (row.ok !== true) {
        const wait = Math.max(0, Number(row.remaining ?? 0))
        if (wait > 0) res.setHeader('Retry-After', String(wait))
        return res.status(200).json({
          ok: false,
          remaining: wait,
          today_count: Number(row.today_count ?? 0),
          error: row.error || 'Cooldown or daily limit',
        })
      }

      return res.status(200).json({
        ok: true,
        index: Number(row.index ?? 0),
        add: Number(row.add ?? 0),
        htw_balance: Number(row.new_balance ?? 0),
        remaining: COOLDOWN,
        today_count: Number(row.today_count ?? 1),
      })
    }

    // method khác
    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('wheel api error:', e)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}
