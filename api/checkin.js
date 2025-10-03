// /api/checkin.js
import { supa } from './_supa.js'

const MAX_DAY = 7

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}
function todayUTCStr() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function secsUntilNextUtcMidnight() {
  const now = new Date()
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, 0, 0, 0
  )
  return Math.max(0, Math.ceil((next - now.getTime()) / 1000))
}

function buildDays(doneCount) {
  const days = []
  for (let i = 1; i <= MAX_DAY; i++) {
    days.push({ day: i, reward: i, done: i <= Math.max(0, Math.min(doneCount, MAX_DAY)) })
  }
  return days
}

export default async function handler(req, res) {
  try {
    const tgUid = getUid(req)
    if (!tgUid) return res.status(401).send('Unauthorized')

    // Lấy user
    const { data: user, error: eUser } = await supa
      .from('users')
      .select('id, htw_balance, referrer_id')
      .eq('telegram_id', tgUid)
      .single()
    if (eUser || !user) return res.status(500).send('User not found')

    // Lấy streak hiện tại
    const { data: streakRow } = await supa
      .from('checkin_streaks')
      .select('streak, last_date')
      .eq('user_id', user.id)
      .maybeSingle()

    const today = todayUTCStr()
    const last = streakRow?.last_date || null
    const streak = Number(streakRow?.streak ?? 0)

    const lastMs = last ? Date.parse(last + 'T00:00:00Z') : null
    const todayMs = Date.parse(today + 'T00:00:00Z')
    const diffDays = lastMs == null ? null : Math.floor((todayMs - lastMs) / 86400000)

    const claimedToday = diffDays === 0
    const keepStreak = diffDays === 1         // hôm qua có điểm danh
    const missed = (diffDays == null) ? false : (diffDays > 1)  // bỏ lỡ ≥ 1 ngày

    // ==== GET: trạng thái
    if (req.method === 'GET') {
      let doneCount = 0
      if (claimedToday)       doneCount = Math.min(streak, MAX_DAY)
      else if (keepStreak)    doneCount = Math.min(streak, MAX_DAY)
      else                    doneCount = 0

      return res.status(200).json({
        can_claim: !claimedToday,
        remaining: claimedToday ? secsUntilNextUtcMidnight() : 0,
        current_streak: claimedToday ? Math.min(streak, MAX_DAY) : (keepStreak ? Math.min(streak, MAX_DAY) : 0),
        days: buildDays(doneCount),
        htw_balance: Number(user.htw_balance ?? 0),
      })
    }

    // ==== POST: điểm danh (sau khi xem quảng cáo trên client)
    if (req.method === 'POST') {
      if (claimedToday) {
        return res.status(200).json({
          ok: false,
          remaining: secsUntilNextUtcMidnight(),
        })
      }

      // Tính ngày kế tiếp trong chuỗi
      const nextStreak = keepStreak ? Math.min(streak + 1, MAX_DAY) : 1
      const reward = Math.min(nextStreak, MAX_DAY) * 1.0          // 1..7 HTW

      // Log điểm danh
      await supa.from('daily_checkins').insert({
        user_id: user.id,
        streak_day: nextStreak,
        reward,
        claimed_at: new Date().toISOString(),
      })

      // Cộng cho user
      const newBal = Number(user.htw_balance ?? 0) + reward
      const { error: eUp } = await supa.from('users')
        .update({ htw_balance: newBal })
        .eq('id', user.id)
      if (eUp) return res.status(500).json({ ok: false, error: 'Update balance failed' })

      // Upsert streak
      await supa.from('checkin_streaks')
        .upsert({ user_id: user.id, streak: nextStreak, last_date: today }, { onConflict: 'user_id' })

      // Hoa hồng 10%
      if (user.referrer_id) {
        const bonus = reward * 0.10
        await supa.rpc('inc_balance_and_touch', {
          p_user_id: user.referrer_id,
          p_amount: bonus
        }).catch(async () => {
          // fallback nếu không có RPC
          await supa.from('users').update({ htw_balance: supa.sql`htw_balance + ${bonus}` }).eq('id', user.referrer_id)
        })
        await supa.from('referral_earnings').insert({
          referrer_id: user.referrer_id,
          from_user_id: user.id,
          amount: bonus,
          source: 'checkin'
        })
      }

      return res.status(200).json({
        ok: true,
        add: reward,
        htw_balance: newBal,
        remaining: secsUntilNextUtcMidnight(),
        days: buildDays(nextStreak),
      })
    }

    return res.status(405).send('Method not allowed')
  } catch (e) {
    console.error('checkin error', e)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}
