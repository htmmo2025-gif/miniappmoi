// /api/mine.js
import { supa } from './_supa.js';

const COOLDOWN = 1800; // 30 phút (giây)
const REWARD = 20;     // 20 HTW mỗi lần

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    const uid = getUidFromCookie(req);
    if (!uid) return res.status(401).send('Unauthorized');

    if (req.method === 'GET') {
      // lấy số dư
      const { data: u, error: e1 } = await supa
        .from('users').select('htw_balance').eq('id', uid).single();
      if (e1) return res.status(500).send('Supabase error');

      // lấy lần claim gần nhất
      const { data: lastRows, error: e2 } = await supa
        .from('mining')
        .select('created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1);
      if (e2) return res.status(500).send('Supabase error');

      let remain = 0, lastAt = null;
      if (lastRows && lastRows.length) {
        lastAt = new Date(lastRows[0].created_at);
        const diff = Math.floor((Date.now() - lastAt.getTime()) / 1000);
        remain = Math.max(0, COOLDOWN - diff);
      }

      return res.status(200).json({
        reward: REWARD,
        cooldown: COOLDOWN,
        remaining: remain,
        last_claim_at: lastAt,
        htw_balance: Number(u?.htw_balance ?? 0)
      });
    }

    if (req.method === 'POST') {
      // Gọi RPC atomic
      const { data, error } = await supa.rpc('mining_claim', {
        p_uid: uid,
        p_reward: REWARD,
        p_cooldown_secs: COOLDOWN
      });
      if (error) {
        console.error('mining_claim error', error);
        return res.status(500).send('Supabase error');
      }
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return res.status(500).send('Unexpected');

      if (row.ok !== true) {
        return res.status(429).json({
          ok: false,
          remaining: row.remain ?? COOLDOWN
        });
      }

      return res.status(200).json({
        ok: true,
        reward: REWARD,
        next_at: row.next_at,
        remaining: COOLDOWN,
        htw_balance: Number(row.new_htw)
      });
    }

    return res.status(405).send('Method not allowed');
  } catch (e) {
    console.error('mine handler exception', e);
    return res.status(500).send('Server error');
  }
}
