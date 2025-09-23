import { createClient } from '@supabase/supabase-js'
const COOLDOWN_MS = 30 * 60 * 1000
const supa = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY)

async function getState(uid){
  const { data: m } = await supa.from('mining').select('*').eq('user_id', uid).maybeSingle()
  const now = Date.now()
  const last = m?.last_mining ? new Date(m.last_mining).getTime() : 0
  const canMine = !last || now - last >= COOLDOWN_MS
  const timeLeft = canMine ? 0 : Math.ceil((COOLDOWN_MS - (now - last))/1000)

  const { data: u } = await supa.from('users').select('htw_balance').eq('id', uid).maybeSingle()
  return { balance: Number(u?.htw_balance ?? 0), canMine, timeLeft }
}

export default async (req, res) => {
  const uid = Number((req.headers.cookie || '').match(/tg_uid=(\d+)/)?.[1])
  if (!uid) return res.status(401).send('no uid')

  await supa.from('users').upsert({ id: uid }).select()
  await supa.from('mining').insert({ user_id: uid }).onConflict('user_id').ignore()

  if (req.method === 'GET') return res.json(await getState(uid))

  if (req.method === 'POST') {
    const st = await getState(uid)
    if (!st.canMine) return res.json(st)

    // tăng 1 HTW, vnd = 36 * htw (ví dụ)
    const { data: upd } = await supa.rpc('inc_balance_and_touch', { p_user_id: uid, p_amount: 1 })
    // fallback nếu chưa tạo rpc:
    // await supa.from('users').update({ htw_balance: st.balance + 1, vnd_balance: (st.balance + 1)*36 }).eq('id', uid)
    await supa.from('mining').upsert({ user_id: uid, last_mining: new Date().toISOString() })

    const newBal = upd?.htw_balance ?? st.balance + 1
    return res.json({ balance: newBal, canMine: true, timeLeft: 0 })
  }

  res.status(405).send('method not allowed')
}
