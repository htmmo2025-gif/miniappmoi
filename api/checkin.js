// /api/checkin.js
import { supa } from './_supa.js';

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

function secondsToTomorrowVN() {
  // chỉ dùng khi GET tính còn lại sơ bộ
  const now = new Date();
  const tzOffset = 7 * 60; // Asia/Ho_Chi_Minh UTC+7
  const local = new Date(now.getTime() + (tzOffset - now.getTimezoneOffset()) * 60000);
  const startNext = new Date(local);
  startNext.setHours(24, 0, 0, 0);
  return Math.max(0, Math.ceil((startNext - local) / 1000));
}

export default async function handler(req, res) {
  try {
    const tgUid = getUid(req);
    if (!tgUid) return res.status(401).send('Unauthorized');

    // ===== GET: trạng thái điểm danh hôm nay =====
    if (req.method === 'GET') {
      const { data: user, error: e1 } = await supa
        .from('users')
        .select('id, htw_balance')
        .eq('telegram_id', tgUid)
        .single();
      if (e1 || !user) return res.status(500).json({ ok: false, error: 'User not found' });

      // Hôm nay đã claim chưa?
      const { data: today, error: e2 } = await supa
        .from('checkin_claims')
        .select('id, day_index, claimed_at')
        .eq('user_id', user.id)
        .gte('claimed_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
        .limit(1);
      const claimed = (today?.length ?? 0) > 0;

      // Lấy progress (nếu cần hiển thị đang ở ngày nào)
      const { data: prog } = await supa
        .from('checkin_progress')
        .select('day_index, last_checkin')
        .eq('user_id', user.id)
        .maybeSingle();

      return res.status(200).json({
        ok: true,
        claimed_today: claimed,
        day_index: Number(prog?.day_index ?? 0),
        remaining: claimed ? secondsToTomorrowVN() : 0,
        htw_balance: Number(user.htw_balance ?? 0),
      });
    }

    // ===== POST: xem quảng cáo (ở client) xong thì claim =====
    if (req.method === 'POST') {
      const { data, error } = await supa.rpc('daily_checkin_claim', { p_uid: tgUid });
      if (error) {
        console.error('RPC daily_checkin_claim error:', error);
        return res.status(500).json({ ok: false, error: 'Supabase error', details: error.message });
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.ok) {
        return res.status(200).json({
          ok: false,
          remaining: Number(row?.remaining ?? secondsToTomorrowVN()),
        });
      }
      return res.status(200).json({
        ok: true,
        add: Number(row.add ?? 0),
        day: Number(row.day ?? 1),
        remaining: Number(row.remaining ?? secondsToTomorrowVN()),
        htw_balance: Number(row.new_balance ?? 0),
      });
    }

    return res.status(405).send('Method not allowed');
  } catch (e) {
    console.error('checkin api error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
}
