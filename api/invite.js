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

    // Lấy danh sách F1 và tổng hoa hồng song song
    const [{ data: list, error: e1 }, { data: commRows, error: e2 }] = await Promise.all([
      supa
        .from('users')
        .select('id, username, first_name, last_name, photo_url')
        .eq('referrer_id', uid)
        .order('id', { ascending: false }),

      // Tổng hoa hồng HTW của bạn (referrer_id = uid)
      // Nếu bảng lớn có thể chuyển sang aggregate SQL hoặc RPC, tạm thời reduce phía server là đủ.
      supa
        .from('ref_commissions')
        .select('amount_htw')
        .eq('referrer_id', uid)
    ]);

    if (e1) {
      console.error('invite list error', e1);
      return res.status(500).send('Supabase error');
    }
    if (e2) {
      console.error('invite commission error', e2);
      // Không chặn response – cứ trả commission_total = 0 để UI vẫn chạy
    }

    const commission_total = Array.isArray(commRows)
      ? commRows.reduce((sum, r) => sum + Number(r.amount_htw || 0), 0)
      : 0;

    return res.status(200).json({
      uid,
      share_link,
      direct_count: list?.length || 0,
      referrals: list || [],
      commission_total,
    });
  } catch (e) {
    console.error('invite handler exception', e);
    res.status(500).send('Server error');
  }
}
