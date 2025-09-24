// /api/swap.js
import { supa } from './_supa.js'   // server client dùng SERVICE_ROLE_KEY

const RATE = 3; // 1 HTW = 3 VND (cứng ở server, không tin dữ liệu client)

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    const uid = getUidFromCookie(req);
    if (!uid) return res.status(401).send('Unauthorized');

    const { amount_htw } = (typeof req.body === 'object' && req.body) || {};
    const amt = Number(amount_htw);

    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).send('Invalid amount');
    }

    // Giới hạn 3 chữ số thập phân cho HTW để “đẹp” & tránh precision noise
    const amt3 = Math.floor(amt * 1000) / 1000;

    // Gọi RPC atomic
    const { data, error } = await supa.rpc('swap_htw_vnd', {
      p_uid: uid,
      p_amt: amt3,
      p_rate: RATE
    });

    if (error) {
      console.error('swap rpc error', error);
      return res.status(500).send('Supabase error');
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row || row.ok !== true) {
      // Không đủ số dư hoặc user không tồn tại
      return res.status(400).send('Insufficient HTW balance');
    }

    // Trả về số dư mới để frontend refresh
    return res.status(200).json({
      ok: true,
      rate: RATE,
      htw_balance: row.new_htw,
      vnd_balance: row.new_vnd
    });
  } catch (e) {
    console.error('swap exception', e);
    return res.status(500).send('Server error');
  }
}
