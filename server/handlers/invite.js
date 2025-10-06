// /api/invite.js
import { supa } from './_supa.js';

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');

    const uid = getUid(req);
    if (!uid) return res.status(401).send('Unauthorized');

    const botUser = (process.env.BOT_USERNAME || '').replace(/^@/, '');
    const share_link = botUser ? `https://t.me/${botUser}/app?startapp=${uid}` : '';

    // users.id từ telegram_id
    const { data: me, error: eMe } = await supa
      .from('users')
      .select('id')
      .eq('telegram_id', uid)
      .single();

    if (eMe || !me) return res.status(404).send('User not found');

    // Danh sách F1 (KHÔNG tính tổng hoa hồng)
    const { data: refs, error: eRefs } = await supa
      .from('users')
      .select('id, telegram_id, username, first_name, last_name, photo_url, created_at')
      .eq('referrer_id', me.id)
      .order('created_at', { ascending: false });

    if (eRefs) {
      console.error('invite list error', eRefs);
      return res.status(500).send('Supabase error');
    }

    return res.status(200).json({
      uid,
      share_link,
      direct_count: refs?.length || 0,
      referrals: refs || [],
      // Không trả commission_total nữa
    });
  } catch (e) {
    console.error('invite handler exception', e);
    res.status(500).send('Server error');
  }
}
