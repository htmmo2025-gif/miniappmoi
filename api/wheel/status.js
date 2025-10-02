// /api/wheel/status.js
import { supa } from '../_supa.js'
const COOLDOWN = Number(process.env.ADSGRAM_WHEEL_REWARD_COOLDOWN || 600)
const getUid = (req) => (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)?.[1]

export default async (req, res) => {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed')
    const tg = Number(getUid(req)); if (!tg) return res.status(401).send('Unauthorized')

    const { data: u } = await supa.from('users')
      .select('id, htw_balance, wheel_spins, last_wheel_reward')
      .eq('telegram_id', tg).single()

    let left = 0
    if (u?.last_wheel_reward) {
      const el = (Date.now() - new Date(u.last_wheel_reward).getTime())/1000
      left = Math.max(0, Math.ceil(COOLDOWN - el))
    }
    res.status(200).json({
      spins: u?.wheel_spins || 0,
      balance: Number(u?.htw_balance || 0),
      ad_wait: left
    })
  } catch (e) {
    res.status(500).json({ ok:false, error:'Server error' })
  }
}
