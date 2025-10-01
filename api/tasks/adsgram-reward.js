// /api/tasks/adsgram-reward.js
import { supa } from '../_supa.js'

const REWARD = Number(process.env.ADSGRAM_REWARD_HTW || 0)
// chống spam: 1 lần / 45s
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

    // kiểm tra cooldown
    const { data: last } = await supa
      .from('adsgram_rewards')
      .select('created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (last) {
      const dt = (Date.now() - new Date(last.created_at).getTime()) / 1000
      if (dt < COOLDOWN_SEC) {
        return res.status(429).send('Too frequent')
      }
    }

    // cộng htw_balance
    const { data: user, error: e1 } = await supa
      .from('users')
      .select('htw_balance, referrer_id')
      .eq('id', uid)
      .single()
    if (e1) return res.status(500).send('Supabase error')

    const newBal = Number(user?.htw_balance || 0) + REWARD
    const { error: e2 } = await supa.from('users').update({ htw_balance: newBal }).eq('id', uid)
    if (e2) return res.status(500).send('Update failed')

    // log
    await supa.from('adsgram_rewards').insert({
      user_id: uid,
      amount_htw: REWARD
    })

    return res.status(200).json({ ok: true, add: REWARD, balance: newBal })
  } catch (e) {
    console.error('adsgram-reward error', e)
    res.status(500).send('Server error')
  }
}
