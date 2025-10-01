// /api/adsgram/reward-webhook.js
import { supa } from '../_supa.js'

const REWARD = Number(process.env.REWARD_ADS_HTW ?? process.env.ADSGRAM_REWARD_HTW ?? 10)
const SECRET = process.env.ADSGRAM_WEBHOOK_KEY || ''
const BLOCK_ID = String(process.env.ADSGRAM_REWARD_BLOCK_ID || '')
const DEDUP = Number(process.env.ADSGRAM_WEBHOOK_DEDUP_SEC ?? 10)

export default async (req, res) => {
  try {
    const url = new URL(req.url, 'https://x')
    const uid = Number(url.searchParams.get('userid'))
    const key = url.searchParams.get('k') || ''
    const bid = (url.searchParams.get('block') || '').toString()

    if (!uid) return res.status(400).send('bad userid')
    if (SECRET && key !== SECRET) return res.status(401).send('bad secret')
    if (BLOCK_ID && bid && bid !== BLOCK_ID) return res.status(400).send('bad block')

    // dedup theo thời gian ngắn để tránh retry từ Adsgram
    const { data: last } = await supa
      .from('adsgram_rewards')
      .select('created_at')
      .eq('user_id', uid)
      .eq('source', 'reward')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (last && (Date.now() - new Date(last.created_at)) / 1000 < DEDUP) {
      return res.status(200).json({ ok: true, throttled: true })
    }

    const { data: user, error: e1 } = await supa
      .from('users').select('htw_balance').eq('id', uid).single()
    if (e1 || !user) return res.status(404).send('user not found')

    const newBal = Number(user.htw_balance || 0) + REWARD
    const { error: e2 } = await supa.from('users')
      .update({ htw_balance: newBal })
      .eq('id', uid)
    if (e2) return res.status(500).send('update fail')

    await supa.from('adsgram_rewards').insert({
      user_id: uid,
      amount_htw: REWARD,
      source: 'reward',
      block_id: bid || BLOCK_ID
    })

    res.status(200).json({ ok: true, add: REWARD, balance: newBal })
  } catch (e) {
    console.error('adsgram reward webhook error', e)
    res.status(500).send('server error')
  }
}
