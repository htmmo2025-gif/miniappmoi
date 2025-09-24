// /api/adsgram/webhook.js
import { supa } from '../_supa.js'
const REWARD = Number(process.env.ADSGRAM_REWARD_HTW || 1)
const COOLDOWN_SEC = 45

export default async (req, res) => {
  try {
    const url = new URL(req.url, 'https://x')
    const uid = Number(url.searchParams.get('userid'))
    if (!uid) return res.status(400).send('bad userid')

    const { data: last } = await supa
      .from('adsgram_rewards')
      .select('created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (last && (Date.now() - new Date(last.created_at).getTime())/1000 < COOLDOWN_SEC){
      return res.status(200).json({ ok: true, throttled: true })
    }

    const { data: user, error: e1 } = await supa
      .from('users').select('htw_balance').eq('id', uid).single()
    if (e1 || !user) return res.status(404).send('user not found')

    const newBal = Number(user.htw_balance || 0) + REWARD
    const { error: e2 } = await supa.from('users').update({ htw_balance: newBal }).eq('id', uid)
    if (e2) return res.status(500).send('update fail')

    await supa.from('adsgram_rewards').insert({ user_id: uid, amount_htw: REWARD })

    res.status(200).json({ ok: true, add: REWARD, balance: newBal })
  } catch (e) {
    console.error('adsgram webhook error', e)
    res.status(500).send('server error')
  }
}
