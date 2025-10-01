// /api/tasks/adsgram-reward.js
import { supa } from '../_supa.js'

const CREDIT = Number(process.env.VITE_ADSGRAM_REWARD_HTW ?? process.env.ADSGRAM_REWARD_HTW ?? 10)
const DEDUP_SEC = Number(process.env.ADSGRAM_TASK_DEDUP_SEC ?? 10)

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')
    const uid = getUid(req)
    if (!uid) return res.status(401).send('unauthorized')

    // de-dup trong vài giây để chống bấm/trigger 2 lần
    const { data: last } = await supa
      .from('adsgram_rewards')
      .select('created_at')
      .eq('user_id', uid)
      .eq('source', 'task')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (last && (Date.now() - new Date(last.created_at).getTime())/1000 < DEDUP_SEC) {
      return res.status(200).json({ ok: true, throttled: true })
    }

    // cộng điểm
    const { data: user, error: e1 } = await supa
      .from('users').select('htw_balance').eq('id', uid).single()
    if (e1 || !user) return res.status(404).send('user not found')

    const newBal = Number(user.htw_balance || 0) + CREDIT
    const { error: e2 } = await supa.from('users').update({ htw_balance: newBal }).eq('id', uid)
    if (e2) return res.status(500).send('update fail')

    await supa.from('adsgram_rewards').insert({ user_id: uid, amount_htw: CREDIT, source: 'task' })

    res.status(200).json({ ok: true, add: CREDIT, balance: newBal })
  } catch (e) {
    console.error('tasks/adsgram-reward error', e)
    res.status(500).send('server error')
  }
}
