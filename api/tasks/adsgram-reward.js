// /api/tasks/adsgram-reward.js
import { supa } from '../_supa.js'

const REWARD = Number(process.env.ADSGRAM_REWARD_HTW || 0)
const COOLDOWN_SEC = 45

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')
    const uid = getUid(req)
    if (!uid) return res.status(401).send('Unauthorized')
    if (REWARD <= 0) return res.status(200).json({ ok: true, add: 0 })

    // Gọi RPC atomic để tránh cộng trùng
    const { data, error } = await supa.rpc('task_adsgram_claim', {
      p_uid: uid,
      p_reward: REWARD,
      p_cooldown_secs: COOLDOWN_SEC
    })
    if (error) {
      console.error('task_adsgram_claim error', error)
      return res.status(500).send('Supabase error')
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.ok) return res.status(429).send('Too frequent')

    return res.status(200).json({
      ok: true,
      add: REWARD,
      balance: Number(row.new_htw)
    })
  } catch (e) {
    console.error('adsgram-reward error', e)
    res.status(500).send('Server error')
  }
}
