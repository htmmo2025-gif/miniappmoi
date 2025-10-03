// api/checkin.js
import { createClient } from '@supabase/supabase-js'

const supa = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const REWARDS = [1,2,3,4,5,6,7]

function startOfTodayUTC(d = new Date()) {
  const x = new Date(d)
  x.setUTCHours(0,0,0,0)
  return x
}
function secsToTomorrowUTC() {
  const now = new Date()
  const tmr = startOfTodayUTC(new Date(now.getTime() + 86400000))
  return Math.max(0, Math.floor((tmr - now) / 1000))
}

// Lấy Telegram user id theo hệ thống của bạn
function getUserId(req) {
  // TODO: đổi cho đúng nguồn bạn đang lưu (cookie, header, query,…)
  return (
    req.headers['x-telegram-id'] ||
    req.cookies?.tg_id ||
    req.query?.user_id ||
    req.body?.user_id ||
    null
  )
}

export default async function handler(req, res) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ ok:false, message:'Missing user' })
      return
    }

    if (req.method === 'GET') {
      // lấy users & checkins
      const [{ data: u }, { data: c }] = await Promise.all([
        supa.from('users').select('id, htw_balance, telegram_id').eq('id', userId).single(),
        supa.from('daily_checkins').select('*').eq('user_id', userId).maybeSingle()
      ])

      let dayIndex = 1
      let checkedToday = false

      if (c) {
        // c.streak_day là "ngày sẽ claim kế" (1..7)
        dayIndex = Number(c.streak_day || 1)
        if (c.last_checkin) {
          const last = new Date(c.last_checkin)
          const lastUTC0 = startOfTodayUTC(last).getTime()
          const todayUTC0  = startOfTodayUTC().getTime()
          const diffDays = Math.floor((todayUTC0 - lastUTC0)/86400000)
          if (diffDays <= 0) checkedToday = true
          else if (diffDays >= 2) dayIndex = 1 // bỏ lỡ >=1 ngày
        }
      }

      res.json({
        ok: true,
        day_index: dayIndex,
        checked_today: checkedToday,
        remaining: checkedToday ? secsToTomorrowUTC() : 0,
        htw_balance: Number(u?.htw_balance || 0),
        telegram_id: u?.telegram_id || String(userId)
      })
      return
    }

    if (req.method === 'POST') {
      // đọc hàng checkins hiện tại
      const { data: row } = await supa.from('daily_checkins').select('*').eq('user_id', userId).maybeSingle()

      // tính day claim hiện tại
      let dayIndex = Number(row?.streak_day || 1)
      let checkedToday = false
      if (row?.last_checkin) {
        const last = new Date(row.last_checkin)
        const lastUTC0 = startOfTodayUTC(last).getTime()
        const todayUTC0 = startOfTodayUTC().getTime()
        const diffDays = Math.floor((todayUTC0 - lastUTC0)/86400000)
        if (diffDays <= 0) checkedToday = true
        else if (diffDays >= 2) dayIndex = 1
      }

      if (checkedToday) {
        res.status(200).json({
          ok: false,
          message: 'Đã điểm danh hôm nay',
          day_index: dayIndex,
          remaining: secsToTomorrowUTC()
        })
        return
      }

      const add = REWARDS[Math.max(0, dayIndex - 1)] || 1
      const now = new Date().toISOString()
      const nextDay = dayIndex === 7 ? 1 : dayIndex + 1

      // 1) cập nhật / upsert daily_checkins
      await supa.from('daily_checkins').upsert({
        user_id: userId,
        streak_day: nextDay,     // lần tới sẽ claim ngày kế
        last_checkin: now,
        updated_at: now
      }, { onConflict: 'user_id' })

      // 2) cộng số dư (đơn giản, đủ dùng; nếu muốn an toàn tuyệt đối dùng RPC)
      const { data: u0 } = await supa.from('users').select('htw_balance').eq('id', userId).single()
      const newBal = Number(u0?.htw_balance || 0) + add
      await supa.from('users').update({ htw_balance: newBal }).eq('id', userId)

      res.json({
        ok: true,
        add,
        day_index: nextDay,
        remaining: secsToTomorrowUTC(),
        htw_balance: newBal
      })
      return
    }

    res.status(405).json({ ok:false, message:'Method not allowed' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ ok:false, message:'Server error' })
  }
}
