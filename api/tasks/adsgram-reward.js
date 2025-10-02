// /api/tasks/adsgram-reward.js
import { supa } from '../_supa.js'

const REWARD = Number(process.env.ADSGRAM_REWARD_HTW || 10)
const COOLDOWN_SEC = Number(process.env.ADSGRAM_COOLDOWN_SEC || 45)

function getUid(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)tg_uid=(\d+)/)
  return m ? Number(m[1]) : null
}

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')
    
    const uid = getUid(req)
    console.log('🔑 UID from cookie:', uid)
    
    if (!uid) return res.status(401).send('Unauthorized')
    if (REWARD <= 0) return res.status(200).json({ ok: true, add: 0 })

    console.log('📞 Calling RPC with:', { uid, REWARD, COOLDOWN_SEC })

    // Gọi RPC function với transaction lock
    const { data, error } = await supa.rpc('task_adsgram_claim', {
      p_uid: uid,
      p_reward: REWARD,
      p_cooldown_secs: COOLDOWN_SEC
    })

    console.log('📦 RPC response:', { data, error })

    if (error) {
      console.error('❌ RPC error:', error)
      return res.status(500).json({ 
        ok: false, 
        error: 'Supabase error',
        details: error.message 
      })
    }

    const row = Array.isArray(data) ? data[0] : data
    console.log('✅ Parsed row:', row)

    // Cooldown check
    if (!row?.ok) {
      const wait = Math.max(0, Number(row?.wait ?? COOLDOWN_SEC))
      console.log('⏳ Cooldown active, wait:', wait)
      
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Retry-After', String(wait))
      return res.status(429).json({ ok: false, wait })
    }

    // Success
    console.log('💰 Reward granted:', { uid, amount: REWARD, newBalance: row.new_htw })
    return res.status(200).json({ 
      ok: true, 
      add: REWARD, 
      balance: Number(row.new_htw) 
    })

  } catch (e) {
    console.error('💥 Server error:', e)
    res.status(500).json({ ok: false, error: 'Server error', message: e.message })
  }
}