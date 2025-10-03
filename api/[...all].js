// /api/[...all].js

import profile   from '../server/handlers/profile.js'
import checkin   from '../server/handlers/checkin.js'
import withdraw  from '../server/handlers/withdraw.js'

// Telegram verify
import tgVerify  from '../tg/verify.js'                  // nếu bạn để trong server/handlers/tg/verify.js thì sửa lại đường dẫn

// Adsgram / Tasks
import adsgramRewardUrl   from '../adsgram/reward-url.js'
import adsgramWebhook     from '../adsgram/reward-webhook.js'
import taskAdsgramReward  from '../tasks/adsgram-reward.js'

// Admin endpoints
import adminWhoami         from '../server/handlers/admin/whoami.js'
import adminWithdraws      from '../server/handlers/admin/withdraws.js'
import adminWithdrawAction from '../server/handlers/admin/withdraw_action.js'
import mine            from '../server/handlers/mine.js'
import swap            from '../server/handlers/swap.js'
import wheelSpin       from '../server/handlers/wheel/spin.js'



const routes = {
  // ---- User ----
  'GET /api/profile'   : profile,

  'GET /api/checkin'   : checkin,
  'POST /api/checkin'  : checkin,

  'GET /api/withdraw'  : withdraw,
  'POST /api/withdraw' : withdraw,

  // ---- Telegram verify ----
  'GET /api/tg/verify' : tgVerify,

  // ---- Adsgram / reward ----
  'GET /api/adsgram/reward-url'   : adsgramRewardUrl,
  'POST /api/adsgram/reward-webhook' : adsgramWebhook,
  'POST /api/tasks/adsgram-reward'   : taskAdsgramReward,

  // ---- Admin ----
  'GET /api/admin/whoami'           : adminWhoami,
  'GET /api/admin/withdraws'        : adminWithdraws,
  'POST /api/admin/withdraw_action' : adminWithdrawAction,

  'POST /api/mine'                 : mine,
  'POST /api/swap'                 : swap,
  'POST /api/wheel/spin'           : wheelSpin,
}

//
// ====== UTILS ======
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id')
}

function sendJSON(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

// Chuẩn hoá đường dẫn: bỏ dấu "/" ở cuối để khớp key map
function normalizePathname(url) {
  const u = new URL(url, 'https://x')
  const p = u.pathname.replace(/\/+$/,'')
  return p || '/'
}

//
// ====== MAIN HANDLER ======
export default async function handler(req, res) {
  try {
    setCors(res)

    // Preflight / HEAD
    if (req.method === 'OPTIONS' || req.method === 'HEAD') {
      res.statusCode = 204
      return res.end()
    }

    const key = `${req.method.toUpperCase()} ${normalizePathname(req.url)}`
    const fn = routes[key]

    if (!fn) {
      return sendJSON(res, 404, { error: 'not_found', route: key })
    }

    // Chuyển tiếp cho handler thực thi
    return await fn(req, res)
  } catch (e) {
    console.error('router error:', e)
    return sendJSON(res, 500, { error: 'server_error' })
  }
}

// Ép runtime Node 20 để thống nhất log & env trên Vercel
export const config = { runtime: 'nodejs20.x' }
