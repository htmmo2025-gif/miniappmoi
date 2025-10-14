// /api/mine.js
import { supa } from './_supa.js'

const REWARD     = Number(process.env.MINING_REWARD_HTW   ?? 5)      // HTW / claim
const COOLDOWN   = Number(process.env.MINING_COOLDOWN_SEC ?? 1200)   // 20 phút
const DAY_LIMIT  = Number(process.env.MINING_DAILY_LIMIT  ?? 50)     // 50 lần/ngày

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const tgUid = getUidFromCookie(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // ===== GET: Trạng thái mining =====
    if (req.method === 'GET') {
      const { data: user, error: e1 } = await supa
        .from('users')
        .select('id, htw_balance, last_mining_claim')
        .eq('telegram_id', tgUid)
        .single()

      if (e1 || !user) {
        console.error('GET user error:', e1)
        return res.status(500).send('User not found')
      }

      // Cooldown
      let remaining = 0
      if (user.last_mining_claim) {
        const elapsed = (Date.now() - new Date(user.last_mining_claim).getTime()) / 1000
        remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
      } else {
        const { data: lastClaim } = await supa
          .from('mining_claims')
          .select('claimed_at')
          .eq('user_id', user.id)
          .order('claimed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastClaim?.claimed_at) {
          const elapsed = (Date.now() - new Date(lastClaim.claimed_at).getTime()) / 1000
          remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
        }
      }

      // Đếm hôm nay để show x/50
      const today0 = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z').toISOString()
      const { count: todayCount = 0 } = await supa
        .from('mining_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('claimed_at', today0)

      return res.status(200).json({
        reward: REWARD,
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(user.htw_balance ?? 0),
        today: Number(todayCount || 0),   // NEW
        daily_limit: DAY_LIMIT,           // NEW
      })
    }

    // ===== POST: Claim (có giới hạn/ngày) =====
    if (req.method === 'POST') {
      const { data, error } = await supa.rpc('mining_claim_with_limit', {
        p_uid: tgUid,                   // Telegram ID
        p_reward: REWARD,
        p_cooldown_secs: COOLDOWN,
        p_day_limit: DAY_LIMIT,
      })

      if (error) {
        console.error('RPC mining_claim_with_limit error:', error)
        return res.status(500).json({ ok: false, error: 'Claim failed' })
      }

      const result = Array.isArray(data) ? data[0] : data
      if (!result) {
        console.error('No result from mining_claim_with_limit')
        return res.status(500).json({ ok: false, error: 'No result from procedure' })
      }

      // Hỗ trợ cả trường hợp function cũ trả success thay vì ok
      const ok = (result.ok ?? result.success) === true

      if (!ok) {
        const wait = Math.max(0, Number(result.remaining ?? COOLDOWN))
        if (wait > 0) res.setHeader('Retry-After', String(wait))
        return res.status(200).json({
          ok: false,
          remaining: wait,
          htw_balance: Number(result.new_balance ?? 0),
          today_count: Number(result.today_count ?? 0), // NEW
        })
      }

      return res.status(200).json({
        ok: true,
        htw_balance: Number(result.new_balance ?? 0),
        remaining: COOLDOWN,
        today_count: Number(result.today_count ?? 0),   // NEW
      })
    }

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('mine.js error:', e)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
}
