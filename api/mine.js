// /api/mine.js
import { supa } from './_supa.js'

const REWARD = 20; // HTW mỗi lần claim
const COOLDOWN = 1800; // 30 phút = 1800 giây

function getUidFromCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    const tgUid = getUidFromCookie(req);
    if (!tgUid) return res.status(401).send('Unauthorized');

    // ===== GET: Lấy trạng thái mining =====
    if (req.method === 'GET') {
      // Lấy user info
      const { data: user, error: e1 } = await supa
        .from('users')
        .select('id, htw_balance')
        .eq('telegram_id', tgUid)
        .single();
      
      if (e1 || !user) {
        console.error('GET user error:', e1);
        return res.status(500).send('User not found');
      }

      // Lấy lần claim cuối từ adsgram_claims
      const { data: lastClaim } = await supa
        .from('adsgram_claims')
        .select('claimed_at')
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let remaining = 0;
      if (lastClaim?.claimed_at) {
        const elapsed = (Date.now() - new Date(lastClaim.claimed_at).getTime()) / 1000;
        remaining = Math.max(0, Math.ceil(COOLDOWN - elapsed));
      }

      return res.status(200).json({
        reward: REWARD,
        cooldown: COOLDOWN,
        remaining,
        htw_balance: Number(user.htw_balance ?? 0),
      });
    }

    // ===== POST: Claim mining reward =====
    if (req.method === 'POST') {
      // Gọi stored procedure claim_mining_reward
      // Function sẽ tự động:
      // - Kiểm tra cooldown
      // - Cộng HTW cho user
      // - Cộng 10% hoa hồng cho referrer
      // - Lưu vào adsgram_claims
      // - Lưu lịch sử vào referral_earnings
      const { data, error } = await supa.rpc('claim_mining_reward', {
        p_uid: tgUid,
        p_reward: REWARD,
        p_cooldown_secs: COOLDOWN
      });

      if (error) {
        console.error('RPC claim_mining_reward error:', error);
        return res.status(500).json({ 
          ok: false, 
          error: 'Claim failed' 
        });
      }

      // data là array, lấy phần tử đầu tiên
      const result = data?.[0];
      
      if (!result) {
        console.error('No result from claim_mining_reward');
        return res.status(500).json({ 
          ok: false, 
          error: 'No result from procedure' 
        });
      }

      // result có dạng: { success: boolean, remaining: int, new_balance: numeric }
      if (!result.success) {
        // Chưa hết cooldown hoặc bị chặn
        return res.status(200).json({
          ok: false,
          remaining: result.remaining || 0,
          htw_balance: result.new_balance || 0,
        });
      }

      // Claim thành công
      return res.status(200).json({
        ok: true,
        htw_balance: Number(result.new_balance ?? 0),
        remaining: COOLDOWN,
      });
    }

    // Method không được hỗ trợ
    return res.status(405).send('Method not allowed');
    
  } catch (e) {
    console.error('mine.js error:', e);
    res.status(500).json({ 
      ok: false, 
      error: 'Server error' 
    });
  }
}