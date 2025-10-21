// /api/chest.js
import { supa } from './_supa.js'

const REWARD     = Number(process.env.CHEST_REWARD_HTW    ?? 7)      // HTW / mở rương
const COOLDOWN   = Number(process.env.CHEST_COOLDOWN_SEC  ?? 1200)   // 20 phút
const DAY_LIMIT  = Number(process.env.CHEST_DAILY_LIMIT   ?? 30)     // 30 lần/ngày

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const tgUid = getUidFromCookie(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // ===== GET: Trạng thái chest =====
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

      // Cooldown
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

      // Hôm nay đã mở bao nhiêu (để show x/50)
      const today0 = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z').toISOString()
      const { count: todayCount = 0 } = await supa
        .from('chest_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('opened_at', today0)

      return res.status(200).json({
        reward: REWARD,
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(user.htw_balance ?? 0),
        today: Number(todayCount || 0),   // NEW
        daily_limit: DAY_LIMIT,           // NEW
      })
    }

    // ===== POST: Mở rương (có giới hạn/ngày) =====
    if (req.method === 'POST') {
      const { data, error } = await supa.rpc('chest_open', {
        p_uid: tgUid,
        p_reward: REWARD,           // numeric
        p_cooldown_secs: COOLDOWN,  // integer
        p_day_limit: DAY_LIMIT,     // 40
      });

      if (error) {
        console.error('RPC chest_open error:', error);
        return res.status(500).json({ ok: false, error: 'Open chest failed' });
      }

      const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    console.error('No result from chest_open');
    return res.status(500).json({ ok: false, error: 'No result from procedure' });
  }

      // RPC có thể trả ok hoặc success
      const ok         = (result.ok ?? result.success) === true;
  const wait       = Math.max(0, Number(result.remaining ?? COOLDOWN));
  const newBalance = Number(result.new_htw ?? result.new_balance ?? 0);

  if (!ok) {
    if (wait > 0) res.setHeader('Retry-After', String(wait));
    return res.status(200).json({
      ok: false,
      remaining: wait,
      htw_balance: newBalance,
      today_count: Number(result.today_count ?? 0),
    });
  }

  return res.status(200).json({
    ok: true,
    htw_balance: newBalance,
    remaining: COOLDOWN,
    today_count: Number(result.today_count ?? 0),
  });
}

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('chest.js error:', e)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
}
