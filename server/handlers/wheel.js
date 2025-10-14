// /api/wheel.js
import { supa } from './_supa.js'

const COOLDOWN  = Number(process.env.WHEEL_COOLDOWN_SEC || process.env.ADSGRAM_WHEEL_REWARD_COOLDOWN || 1200)
const DAY_LIMIT = Number(process.env.WHEEL_DAILY_LIMIT || 50)

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed')
    const uid = getUid(req)
    if (!uid) return res.status(401).send('Unauthorized')

    const { data: user, error: e1 } = await supa
      .from('users').select('id, htw_balance').eq('telegram_id', uid).single()
    if (e1 || !user) return res.status(500).send('User not found')

    // cooldown từ lần quay gần nhất
    const { data: last } = await supa
      .from('wheel_spins').select('spun_at')
      .eq('user_id', user.id).order('spun_at', { ascending: false })
      .limit(1).maybeSingle()

    let remaining = 0
    if (last?.spun_at) {
      const elapsed = (Date.now() - new Date(last.spun_at).getTime()) / 1000
      remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
    }

    // đếm hôm nay
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
  } catch (e) {
    console.error('wheel status error:', e)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}
