// /api/[...all].js

// ===== user handlers =====
import profile  from '../server/handlers/profile.js'
import checkin  from '../server/handlers/checkin.js'
import withdraw from '../server/handlers/withdraw.js'
import invite   from '../server/handlers/invite.js'


// ===== telegram verify =====
import tgVerify from '../server/handlers/tg/verify.js'

// ===== adsgram / tasks =====
import adsgramRewardUrl  from '../server/handlers/adsgram/reward-url.js'
import adsgramWebhook    from '../server/handlers/adsgram/reward-webhook.js'
import taskAdsgramReward from '../server/handlers/tasks/adsgram-reward.js'

// ===== others (mine/swap/wheel) =====
import mine      from '../server/handlers/mine.js'
import swap      from '../server/handlers/swap.js'
// ===== wheel =====
import wheelStatus from '../server/handlers/wheel.js'
import wheelSpin   from '../server/handlers/wheel/spin.js'

// ===== admin =====
import adminWhoami         from '../server/handlers/admin/whoami.js'
import adminWithdraws      from '../server/handlers/admin/withdraws.js'
import adminWithdrawAction from '../server/handlers/admin/withdraw_action.js'


// ===== route map =====
const routes = {
  // user
  'GET /api/profile'   : profile,
  'GET /api/checkin'   : checkin,
  'POST /api/checkin'  : checkin,
  'GET /api/withdraw'  : withdraw,
  'POST /api/withdraw' : withdraw,
  'GET /api/invite'    : invite,

  // telegram
  'GET /api/tg/verify' : tgVerify,

  // adsgram / tasks
  'GET /api/adsgram/reward-url'      : adsgramRewardUrl,
  'POST /api/adsgram/reward-webhook' : adsgramWebhook,
  'POST /api/tasks/adsgram-reward'   : taskAdsgramReward,

  // game
  'GET /api/mine'       : mine,
  'POST /api/mine'       : mine,
  'POST /api/swap'       : swap,
  // Wheel
  'GET /api/wheel'       : wheelStatus,
  'POST /api/wheel/spin' : wheelSpin,

  // admin
  'GET /api/admin/whoami'            : adminWhoami,
  'GET /api/admin/withdraws'         : adminWithdraws,
  'POST /api/admin/withdraw_action'  : adminWithdrawAction,
}

// ===== utils =====
function setCors(req, res) {
  const origin =
    req.headers?.origin ||
    req.headers?.referer ||
    '*'

  if (origin !== '*') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    // fallback
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id')
}

function sendJSON(res, code, data) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}
function normalizePathname(url) {
  const u = new URL(url, 'https://x')
  const p = u.pathname.replace(/\/+$/,'')
  return p || '/'
}

// ===== main handler =====
export default async function handler(req, res) {
  try {
    setCors(req, res) // <-- truyền đúng (req, res)

    if (req.method === 'OPTIONS' || req.method === 'HEAD') {
      res.statusCode = 204
      return res.end()
    }
    const key = `${req.method.toUpperCase()} ${normalizePathname(req.url)}`
    const fn = routes[key]
    if (!fn) return sendJSON(res, 404, { error: 'not_found', route: key })
    return await fn(req, res)
  } catch (e) {
    console.error('router error:', e)
    return sendJSON(res, 500, { error: 'server_error' })
  }
}

// Node serverless runtime (không dùng "nodejs20.x")
export const config = { runtime: 'nodejs' }
