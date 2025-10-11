// /api/wheel/spin.js
import { supa } from '../_supa.js'

const COOLDOWN = Number(process.env.WHEEL_COOLDOWN_SEC || 1200)

// THỨ TỰ PHẢI TRÙNG UI: 0:+2, 1:+4, 2:+6, 3:+8, 4:miss, 5:+10
const PRIZE_MAP = [1, 2, 3, 4, 0, 5]

// (tuỳ chọn) trọng số rơi vào từng ô (cùng thứ tự)
const WEIGHTS = [25, 15, 15, 15, 20, 10] // tổng ~100 là ok

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

function pickIndexByWeight(ws) {
  const total = ws.reduce((a,b)=>a+b,0)
  let r = Math.random() * total
  for (let i=0;i<ws.length;i++){ if((r -= ws[i]) < 0) return i }
  return ws.length - 1
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  try {
    const tgUid = getUid(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // 1) user
    const { data: user, error: eUser } = await supa
      .from('users').select('id, htw_balance').eq('telegram_id', tgUid).single()
    if (eUser || !user) return res.status(500).json({ ok:false, error:'User not found' })

    // 2) cooldown từ wheel_spins
    const { data: last } = await supa
      .from('wheel_spins')
      .select('spun_at')
      .eq('user_id', user.id)
      .order('spun_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (last?.spun_at) {
      const elapsed = (Date.now() - new Date(last.spun_at).getTime())/1000
      const remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
      if (remaining > 0) return res.status(200).json({ ok:false, remaining })
    }

    // 3) chọn ô (0-based, TRÙNG UI)
    const index = pickIndexByWeight(WEIGHTS)
    const add = PRIZE_MAP[index] ?? 0

    // 4) cộng thưởng nếu >0
    let newBal = Number(user.htw_balance ?? 0)
    if (add > 0) {
      const { data: up, error: eUp } = await supa
        .from('users')
        .update({ htw_balance: newBal + add })
        .eq('id', user.id)
        .select('htw_balance')
        .single()
      if (eUp || !up) return res.status(500).json({ ok:false, error:'Update balance failed' })
      newBal = Number(up.htw_balance)
    }

    // 5) log spin (để theo dõi & cooldown)
    await supa.from('wheel_spins').insert({
      user_id: user.id,
      prize_index: index,
      prize_amount: add,
      spun_at: new Date().toISOString(),
    })

    // 6) trả về index (0-based) & add đúng đã credit
    return res.status(200).json({
      ok: true,
      index,
      add,
      htw_balance: newBal,
      remaining: COOLDOWN,
    })
  } catch (e) {
    console.error('wheel/spin error', e)
    return res.status(500).json({ ok:false, error:'Server error' })
  }
}
