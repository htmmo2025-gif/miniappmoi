// /api/chest.js
import { supa } from './_supa.js'

const REWARD   = Number(process.env.CHEST_REWARD_HTW   ?? 10)     // HTW / mở rương
const COOLDOWN = Number(process.env.CHEST_COOLDOWN_SEC ?? 1800)   // 30 phút

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const tgUid = getUidFromCookie(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // ===== GET: Trạng thái CHest (riêng mining) =====
    if (req.method === 'GET') {
      const { data: user, error: e1 } = await supa
        .from('users')
        .select('id, htw_balance, last_chest_open')
        .eq('telegram_id', tgUid)
        .single()

      if (e1 || !user) {
        console.error('GET user error:', e1)
        return res.status(500).send('User not found')
      }

      let remaining = 0
      if (user.last_chest_open) {
        const elapsed = (Date.now() - new Date(user.last_chest_open).getTime()) / 1000
        remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed))
      } else {
        // Fallback lần đầu: nhìn log chest_claims
        const { data: lastOpen } = await supa
          .from('chest_claims')
          .select('opened_at')
          .eq('user_id', user.id)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastOpen?.opened_at) {
          const elapsed = (Date.now() - new Date(lastOpen.opened_at).getTime()) / 1000
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

    // ===== POST: Mở rương (RPC riêng cho chest) =====
    if (req.method === 'POST') {
      const { data, error } = await supa.rpc('chest_open', {
        p_uid: tgUid,
        p_reward: REWARD,
        p_cooldown_secs: COOLDOWN,
      })

      if (error) {
        console.error('RPC chest_open error:', error)
        return res.status(500).json({ ok: false, error: 'Open chest failed' })
      }

      const result = Array.isArray(data) ? data[0] : data
      if (!result) {
        console.error('No result from chest_open')
        return res.status(500).json({ ok: false, error: 'No result from procedure' })
      }

      // RPC mình tạo trả { ok:boolean, remaining:int, new_htw:numeric }
      // Nhưng map linh hoạt để hợp với pattern cũ (success/new_balance):
      const ok          = (result.ok ?? result.success) === true
      const wait        = Math.max(0, Number(result.remaining ?? COOLDOWN))
      const newBalance  = Number(result.new_htw ?? result.new_balance ?? 0)

      if (!ok) {
        res.setHeader('Retry-After', String(wait))
        return res.status(200).json({
          ok: false,
          remaining: wait,
          htw_balance: newBalance,
        })
      }

      return res.status(200).json({
        ok: true,
        htw_balance: newBalance,
        remaining: COOLDOWN,
      })
    }

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('chest.js error:', e)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
}
