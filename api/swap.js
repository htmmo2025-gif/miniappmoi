import { supa } from './_supa.js'

async function readJson(req) {
  let body = ''
  for await (const c of req) body += c
  return body ? JSON.parse(body) : {}
}

export default async (req, res) => {
  const uid = Number((req.headers.cookie || '').match(/tg_uid=(\d+)/)?.[1])
  if (!uid) return res.status(401).send('no uid')
  if (req.method !== 'POST') return res.status(405).send('method not allowed')

  try {
    const { amount_htw, rate } = await readJson(req)
    const amt = Number(amount_htw)
    const r   = Number(rate ?? 36)
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).send('bad amount')
    if (amt < 0.001) return res.status(400).send('min 0.001 HTW')

    const { data, error } = await supa.rpc('swap_htw_to_vnd', {
      p_user_id: uid,
      p_amount: amt,
      p_rate: r
    })
    if (error) {
      const msg = String(error.message || error).toLowerCase()
      if (msg.includes('insufficient')) return res.status(409).send('insufficient')
      return res.status(500).send('swap error')
    }
    res.json({ ok: true, user: data })
  } catch (e) {
    console.error('swap error', e)
    res.status(500).send('server error')
  }
}
