// /api/invite.js
import { supa } from './_supa.js';

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).send('Unauthorized');
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');

    const botUser = (process.env.BOT_USERNAME || '').replace(/^@/, '');
    const share_link = botUser ? `https://t.me/${botUser}/app?startapp=${uid}` : '';

    // Lấy user_id từ telegram_id
    const { data: currentUser, error: userErr } = await supa
      .from('users')
      .select('id')
      .eq('telegram_id', uid)
      .single();

    if (userErr || !currentUser) {
      return res.status(404).send('User not found');
    }

    const userId = currentUser.id;

    // Lấy danh sách F1 và tổng hoa hồng song song
    const [{ data: list, error: e1 }, { data: commRows, error: e2 }] = await Promise.all([
      supa
        .from('users')
        .select('id, telegram_id, username, first_name, last_name, photo_url')
        .eq('referrer_id', userId) // Dùng users.id thay vì telegram_id
        .order('created_at', { ascending: false }),

      // ✅ THAY ĐỔI: Query từ bảng referral_earnings (không phải ref_commissions)
      supa
        .from('referral_earnings')
        .select('amount')
        .eq('referrer_id', userId) // Dùng users.id
    ]);

    if (e1) {
      console.error('invite list error', e1);
      return res.status(500).send('Supabase error');
    }
    if (e2) {
      console.error('invite commission error', e2);
    }

    // ✅ Tính tổng từ cột 'amount' (không phải 'amount_htw')
    const commission_total = Array.isArray(commRows)
      ? commRows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0;

    return res.status(200).json({
      uid,
      share_link,
      direct_count: list?.length || 0,
      referrals: list || [],
      commission_total, // Tổng hoa hồng HTW
    });
  } catch (e) {
    console.error('invite handler exception', e);
    res.status(500).send('Server error');
  }
}