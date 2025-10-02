// /api/mine.js
import { supa } from './_supa.js'

const REWARD = 20; // HTW mỗi lần
const COOLDOWN = 1800; // 30 phút = 1800 giây

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    const uid = getUidFromCookie(req);
    if (!uid) return res.status(401).send('Unauthorized');

    const { data: u, error: e1 } = await supa
      .from('users').select('htw_balance').eq('id', uid).single();
    if (e1) return res.status(500).send('Supabase error');

    // ===== GET: Lấy trạng thái =====
    if (req.method === 'GET') {
      const { data: lastRows } = await supa
        .from('adsgram_claims')
        .select('claimed_at')
        .eq('user_id', uid)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let remaining = 0;
      if (lastRows?.claimed_at) {
        const elapsed = (Date.now() - new Date(lastRows.claimed_at).getTime()) / 1000;
        remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed));
      }

      return res.status(200).json({
        reward: REWARD,
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(u.htw_balance ?? 0),
      });
    }

    // ===== POST: Claim =====
    if (req.method === 'POST') {
      // 1) Lấy lần claim gần nhất
      const { data: lastClaim } = await supa
        .from('adsgram_claims')
        .select('claimed_at')
        .eq('user_id', uid)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2) Kiểm tra cooldown
      if (lastClaim?.claimed_at) {
        const elapsed = (Date.now() - new Date(lastClaim.claimed_at).getTime()) / 1000;
        const remain = COOLDOWN - elapsed;
        if (remain > 0) {
          return res.status(200).json({
            ok: false,
            remaining: Math.ceil(remain),
            htw_balance: Number(u.htw_balance ?? 0),
          });
        }
      }

      // 3) Cộng HTW + ghi log claim
      const newBal = Number(u.htw_balance ?? 0) + REWARD;
      
      // Transaction: cập nhật balance + insert claim record
      const { error: e2 } = await supa
        .from('users')
        .update({ htw_balance: newBal })
        .eq('id', uid);
      
      if (e2) return res.status(500).send('Update balance failed');

      await supa.from('adsgram_claims').insert({
        user_id: uid,
        reward: REWARD,
        claimed_at: new Date().toISOString(),
      });

      return res.status(200).json({
        ok: true,
        htw_balance: newBal,
        remaining: COOLDOWN,
      });
    }

    return res.status(405).send('Method not allowed');
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
}