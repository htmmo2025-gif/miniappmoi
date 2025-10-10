// /api/mine.js
import { supa } from './_supa.js'

const REWARD   = Number(process.env.MINING_REWARD_HTW ?? 5)      // HTW / claim
const COOLDOWN = Number(process.env.MINING_COOLDOWN_SEC ?? 1200)  // 20 phút

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const tgUid = getUidFromCookie(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // ===== GET: Trạng thái mining (dựa vào users.last_mining_claim) =====
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

      let remaining = 0
      if (user.last_mining_claim) {
        const elapsed = (Date.now() - new Date(user.last_mining_claim).getTime()) / 1000
        remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
      } else {
        // (Fallback – phòng khi cột last_mining_claim chưa có dữ liệu lần đầu)
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

      return res.status(200).json({
        reward: REWARD,
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(user.htw_balance ?? 0),
      })
    }

    // ===== POST: Claim mining reward (RPC riêng cho mining) =====
    if (req.method === 'POST') {
      const { data, error } = await supa.rpc('claim_mining_reward', {
        p_uid: tgUid,
        p_reward: REWARD,
        p_cooldown_secs: COOLDOWN,
      })

      if (error) {
        console.error('RPC claim_mining_reward error:', error)
        return res.status(500).json({ ok: false, error: 'Claim failed' })
      }

      const result = Array.isArray(data) ? data[0] : data
      if (!result) {
        console.error('No result from claim_mining_reward')
        return res.status(500).json({ ok: false, error: 'No result from procedure' })
      }

      // result: { success:boolean, remaining:int, new_balance:numeric }
      if (!result.success) {
        const wait = Math.max(0, Number(result.remaining ?? COOLDOWN))
        res.setHeader('Retry-After', String(wait))
        return res.status(200).json({
          ok: false,
          remaining: wait,
          htw_balance: Number(result.new_balance ?? 0),
        })
      }

      return res.status(200).json({
        ok: true,
        htw_balance: Number(result.new_balance ?? 0),
        remaining: COOLDOWN,
      })
    }

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('mine.js error:', e)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
}
