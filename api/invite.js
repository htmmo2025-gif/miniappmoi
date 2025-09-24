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

    const botUser = (process.env.BOT_USERNAME || '').replace(/^@/, '')
    const share_link = botUser ? `https://t.me/${botUser}/app?startapp=${uid}` : ''

    // danh sách F1
    const { data: list, error } = await supa
      .from('users')
      .select('id, username, first_name, last_name, photo_url,commission_total')
      .eq('referrer_id', uid)
      .order('id', { ascending: false });

    if (error) {
      console.error('invite list error', error);
      return res.status(500).send('Supabase error');
    }

    return res.status(200).json({
      uid,
      share_link,
      direct_count: list?.length || 0,
      referrals: list || [],
    });
  } catch (e) {
    console.error('invite handler exception', e);
    res.status(500).send('Server error');
  }
}
