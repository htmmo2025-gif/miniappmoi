import { supa } from './_supa.js'

// đọc tên mới, fallback tên cũ nếu còn sót
const REWARD   = Number(process.env.WATCH_ADSGRAM_REWARD_HTW ?? 2)
const COOLDOWN = Number(process.env.WATCH_ADSGRAM_COOLDOWN_SEC ?? 600)
const DAILY    = Number(process.env.WATCH_ADSGRAM_DAILY_LIMIT ?? 10)

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const tgUid = getUidFromCookie(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    if (req.method === 'GET') {
      const { data, error } = await supa.rpc('get_adsgram_status', {
        p_user_id: tgUid, p_cooldown_secs: COOLDOWN, p_daily_cap: DAILY
      })
      if (error) throw error
      const st = data?.[0] || {}
      return res.status(200).json({
        reward: REWARD, cooldown: COOLDOWN,
        remaining: st.remaining ?? 0, today: st.today ?? 0,
        daily_limit: st.daily_limit ?? DAILY,
      })
    }

    if (req.method === 'POST') {
      const body = await new Promise(r => {
        let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{ r(JSON.parse(b||'{}')) }catch{ r({}) } })
      })
      const session_key = body?.session_key || null

      const { data, error } = await supa.rpc('claim_adsgram_reward', {
        p_user_id: tgUid, p_amount: REWARD,
        p_cooldown_secs: COOLDOWN, p_daily_cap: DAILY,
        p_session_key: session_key,
      })
      if (error) throw error
      const result = data?.[0] || {}

      return res.status(200).json({
        ok: result.ok === true,
        remaining: result.wait ?? 0,
        new_balance: Number(result.new_balance ?? 0),
        today_count: result.today_count ?? 0,
      })
    }

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('watchadsgram error:', e)
    res.status(500).json({ ok:false, error: e.message || 'Server error' })
  }
}