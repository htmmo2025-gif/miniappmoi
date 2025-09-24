import { supa } from './_supa.js'

const COOLDOWN_MS = 30 * 60 * 1000

async function ensure(uid) {
  await supa.from('users').upsert({ id: uid, telegram_id: uid }, { onConflict: 'id' })
  await supa.from('mining').upsert({ user_id: uid }, { onConflict: 'user_id' })
}

async function getState(uid) {
  const { data: m } = await supa.from('mining')
    .select('last_mining').eq('user_id', uid).maybeSingle()
  const { data: u } = await supa.from('users')
    .select('htw_balance').eq('id', uid).maybeSingle()

  const now  = Date.now()
  const last = m?.last_mining ? new Date(m.last_mining).getTime() : 0
  const canMine  = !last || now - last >= COOLDOWN_MS
  const timeLeft = canMine ? 0 : Math.ceil((COOLDOWN_MS - (now - last))/1000)

  return { balance: Number(u?.htw_balance ?? 0), canMine, timeLeft }
}

export default async (req, res) => {
  const uid = Number((req.headers.cookie || '').match(/tg_uid=(\d+)/)?.[1])
  if (!uid) return res.status(401).send('no uid')

  await ensure(uid)

  if (req.method === 'GET') {
    return res.json(await getState(uid))
  }

  if (req.method === 'POST') {
    const st = await getState(uid)
    if (!st.canMine) return res.json(st)

    // Tăng 1 HTW (dùng RPC nếu có)
    let newBal = st.balance + 1
    try {
      const { data, error } = await supa.rpc('inc_balance_and_touch', { p_user_id: uid, p_amount: 1 })
      if (!error && data) newBal = Number(data.htw_balance ?? newBal)
    } catch {}

    // Fallback nếu chưa tạo RPC
    if (newBal === st.balance + 1) {
      await supa.from('users')
        .update({ htw_balance: newBal, vnd_balance: newBal * 36 })
        .eq('id', uid)
    }

    await supa.from('mining')
      .update({ last_mining: new Date().toISOString() })
      .eq('user_id', uid)

    return res.json({ balance: newBal, canMine: true, timeLeft: 0 })
  }

  res.status(405).send('method not allowed')
}
