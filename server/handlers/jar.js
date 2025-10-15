// /api/jar.js
import { supa } from './_supa.js'

const COOLDOWN = Number(process.env.JAR_COOLDOWN_SEC ?? 1800) // 30 phút
const MIN_R = Number(process.env.JAR_MIN_REWARD ?? 1)
const MAX_R = Number(process.env.JAR_MAX_REWARD ?? 5)
const FEATURE_START_AT =
  process.env.JAR_FEATURE_START_AT || new Date('2025-01-01T00:00:00Z').toISOString()

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}
const rint = (a,b)=>Math.floor(Math.random()*(b-a+1))+a

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const tgUid = getUidFromCookie(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // Lấy user (THÊM jar_ref_reset_at)
    const { data: user, error: uerr } = await supa
      .from('users')
      .select('id, htw_balance, last_jar_open, jar_ref_reset_at')
      .eq('telegram_id', tgUid)
      .single()
    if (uerr || !user) return res.status(500).send('User not found')

    // mốc tính lượt = reset_at hoặc FEATURE_START_AT
    const cutoffIso = (user.jar_ref_reset_at ?? FEATURE_START_AT)

    // helpers
    const now = Date.now()
    const computeRemaining = async () => {
      let lastTs = user.last_jar_open ? new Date(user.last_jar_open).getTime() : null
      if (!lastTs) {
        const { data: lastOpen } = await supa
          .from('jar_claims')
          .select('opened_at')
          .eq('user_id', user.id)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastOpen?.opened_at) lastTs = new Date(lastOpen.opened_at).getTime()
      }
      if (!lastTs) return 0
      const elapsed = (now - lastTs) / 1000
      return Math.max(0, Math.ceil(COOLDOWN - elapsed))
    }
    const countOpensSince = async (iso) => {
      const { count } = await supa
        .from('jar_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('opened_at', iso)
      return Number(count || 0)
    }
    const countNewRefsSince = async (iso) => {
      const { count } = await supa
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .gte('created_at', iso)
      return Number(count || 0)
    }

    // -------- GET: status ----------
    if (req.method === 'GET') {
      const remaining = await computeRemaining()
      const [newRefs, opensSinceCutoff, opensToday] = await Promise.all([
        countNewRefsSince(cutoffIso),
        countOpensSince(cutoffIso),
        countOpensSince(new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z').toISOString())
      ])
      const opens_left = Math.max(0, newRefs - opensSinceCutoff)
      return res.status(200).json({
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(user.htw_balance ?? 0),
        opens_left,
        used_today: opensToday
      })
    }

    // -------- POST: open jar ----------
    if (req.method === 'POST') {
      const remaining = await computeRemaining()
      if (remaining > 0) {
        res.setHeader('Retry-After', String(remaining))
        return res.status(200).json({ ok:false, error:'Cooldown', remaining })
      }

      const [newRefs, opensSinceCutoff] = await Promise.all([
        countNewRefsSince(cutoffIso),
        countOpensSince(cutoffIso)
      ])
      const opens_left = Math.max(0, newRefs - opensSinceCutoff)
      if (opens_left <= 0) {
        return res.status(200).json({ ok:false, error:'Hết lượt mở', remaining:0, opens_left:0 })
      }

      const reward = rint(MIN_R, MAX_R)
      const { data, error } = await supa.rpc('jar_open_random', {
        p_user_id: user.id,
        p_reward: reward,
        p_cooldown_secs: COOLDOWN,
        // TRUYỀN MỐC XUỐNG RPC (function sẽ ưu tiên jar_ref_reset_at nếu có)
        p_feature_start: cutoffIso,
      })
      if (error) {
        console.error('RPC jar_open_random error:', error)
        return res.status(500).json({ ok:false, error:'Open jar failed' })
      }
      const result = Array.isArray(data) ? data[0] : data
      if (!result || result.ok !== true) {
        const wait = Math.max(0, Number(result?.remaining ?? COOLDOWN))
        if (wait > 0) res.setHeader('Retry-After', String(wait))
        return res.status(200).json({ ok:false, error: result?.error || 'Not allowed', remaining: wait })
      }

      return res.status(200).json({
        ok: true,
        reward,
        htw_balance: Number(result.new_balance ?? 0),
        opens_left: Math.max(0, opens_left - 1),
        used_today: Number(result.used_today ?? 0),
        cooldown: COOLDOWN,
        remaining: COOLDOWN
      })
    }

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('jar.js error:', e)
    res.status(500).json({ ok:false, error:'Server error' })
  }
}
