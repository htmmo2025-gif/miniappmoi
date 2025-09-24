import { supa } from './_supa.js'

async function readJson(req){ let b=''; for await (const c of req) b+=c; return b?JSON.parse(b):{} }

export default async (req, res) => {
  const uid = Number((req.headers.cookie || '').match(/tg_uid=(\d+)/)?.[1])
  if (!uid) return res.status(401).send('no uid')

  if (req.method === 'GET') {
    // list đơn rút của user
    const { data, error } = await supa.from('withdrawals')
      .select('*').eq('user_id', uid).order('id', { ascending: false }).limit(50)
    if (error) return res.status(500).send('list error')
    return res.json(data)
  }

  if (req.method === 'POST') {
    try {
      const { amount_vnd, channel, dest } = await readJson(req)
      const amt = Number(amount_vnd)
      if (!Number.isFinite(amt) || amt <= 0) return res.status(400).send('bad amount')
      if (amt < 1000) return res.status(400).send('min 1,000 VND')  // tuỳ bạn
      if (!channel || !dest) return res.status(400).send('missing channel/dest')

      const { data, error } = await supa.rpc('request_withdrawal', {
        p_user_id: uid, p_amount: amt, p_channel: String(channel), p_dest: String(dest)
      })
      if (error) {
        const msg = String(error.message || error).toLowerCase()
        if (msg.includes('insufficient')) return res.status(409).send('insufficient')
        return res.status(500).send('withdraw error')
      }
      return res.json({ ok: true, withdrawal: data })
    } catch (e) {
      console.error('withdraw error', e)
      return res.status(500).send('server error')
    }
  }

  res.status(405).send('method not allowed')
}
