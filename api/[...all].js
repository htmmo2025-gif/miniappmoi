// /api/[...all].js
import profile             from '../server/handlers/profile.js'
import checkin             from '../server/handlers/checkin.js'
import withdraw            from '../server/handlers/withdraw.js'
import adminWhoami         from '../server/handlers/admin/whoami.js'
import adminWithdraws      from '../server/handlers/admin/withdraws.js'
import adminWithdrawAction from '../server/handlers/admin/withdraw_action.js'
import tgVerify            from '../server/handlers/tg/verify.js'
// import thêm các handler khác của bạn ở đây…

const routes = {
  'GET /api/profile'              : profile,
  'GET /api/checkin'              : checkin,
  'POST /api/checkin'             : checkin,
  'GET /api/withdraw'             : withdraw,
  'POST /api/withdraw'            : withdraw,
  'GET /api/admin/whoami'         : adminWhoami,
  'GET /api/admin/withdraws'      : adminWithdraws,
  'POST /api/admin/withdraw_action': adminWithdrawAction,
  'GET /api/tg/verify'            : tgVerify,
  // … thêm các route khác nếu có
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id')
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

  const key = `${req.method.toUpperCase()} ${new URL(req.url,'https://x').pathname}`
  const fn = routes[key]
  if (!fn) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'not_found' })) }

  try { return await fn(req, res) }
  catch (e) {
    console.error('router error:', e)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'server_error' }))
  }
}

// để log hết cảnh báo version
export const config = { runtime: 'nodejs20.x' }
