// api/checkin.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const REWARDS = [1,2,3,4,5,6,7]

function startOfTodayUTC() {
  const d = new Date()
  d.setUTCHours(0,0,0,0)
  return d
}
function secondsToTomorrowUTC() {
  const now = new Date()
  const tmr = new Date(now)
  tmr.setUTCDate(now.getUTCDate() + 1)
  tmr.setUTCHours(0,0,0,0)
  return Math.max(1, Math.floor((tmr - now)/1000))
}

function getTelegramIdFromCookie(req) {
  const c = req.headers.cookie || ''
  const m = c.match(/tg_user=([^;]+)/)
  if (!m) return null
  try {
    const j = JSON.parse(decodeURIComponent(m[1]))
    return Number(j?.id || j?.user?.id || j?.telegram_id || j?.data?.id)
  } catch { return null }
}

async function getUserByTelegramId(tgId) {
  const { data, error } = await supabase.from('users')
    .select('id, htw_balance')
    .eq('telegram_id', tgId)
    .single()
  if (error) throw error
  return data
}

async function getDailyRow(userId) {
  const { data, error } = await supabase.from('daily_checkins')
    .select('user_id, streak_day, last_checkin')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export default async function handler(req, res) {
  try {
    const tgId = getTelegramIdFromCookie(req)
    if (!tgId) return res.status(401).json({ ok:false, error:'missing_user' })

    const user = await getUserByTelegramId(tgId)
    if (!user) return res.status(404).json({ ok:false, error:'user_not_found' })

    if (req.method === 'GET') {
      const row = await getDailyRow(user.id)
      let day = row?.streak_day || 1
      let checkedToday = false
      if (row?.last_checkin) {
        checkedToday = (new Date(row.last_checkin) >= startOfTodayUTC())
        // nếu qua ngày mà chưa check -> tăng ngày hiển thị (để biết phần thưởng kế)
        if (!checkedToday) {
          day = Math.min((row.streak_day || 0) + 1, 7)
        }
      }
      return res.json({
        ok: true,
        balance: Number(user.htw_balance || 0),
        day,
        checkedToday,
        remainingSec: secondsToTomorrowUTC(),
      })
    }

    if (req.method === 'POST') {
      const now = new Date()
      const today0 = startOfTodayUTC()
      const row = await getDailyRow(user.id)

      // Đã checkin hôm nay?
      if (row?.last_checkin && new Date(row.last_checkin) >= today0) {
        return res.status(409).json({
          ok: false,
          reason: 'already_checked',
          remainingSec: secondsToTomorrowUTC(),
        })
      }

      // Tính lại day (reset nếu bỏ lỡ >=1 ngày)
      let newDay = 1
      if (row?.last_checkin) {
        const last = new Date(row.last_checkin)
        last.setUTCHours(0,0,0,0)
        const diffDays = Math.floor((today0 - last) / 86400000)
        newDay = diffDays >= 2 ? 1 : Math.min((row.streak_day || 0) + 1, 7)
      }

      const reward = REWARDS[newDay - 1]

      // Upsert daily_checkins
      const { error: upErr } = await supabase
        .from('daily_checkins')
        .upsert({
          user_id: user.id,
          streak_day: newDay,
          last_checkin: now,
          updated_at: now,
        }, { onConflict: 'user_id' })
      if (upErr) throw upErr

      // Cộng HTW
      const { data: updUser, error: uErr } = await supabase
        .from('users')
        .update({ htw_balance: (user.htw_balance || 0) + reward })
        .eq('id', user.id)
        .select('htw_balance')
        .single()
      if (uErr) throw uErr

      return res.json({
        ok: true,
        add: reward,
        day: newDay,
        balance: Number(updUser.htw_balance || 0),
        remainingSec: secondsToTomorrowUTC(),
      })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  } catch (e) {
    console.error('checkin error', e)
    return res.status(500).json({ ok:false, error:'server_error' })
  }
}
