// /api/adsgram/reward-url.js
import { supa } from '../_supa.js'

const SECRET   = process.env.ADSGRAM_WHEEL_REWARD_SECRET
const COOLDOWN = Number(process.env.ADSGRAM_WHEEL_REWARD_COOLDOWN || 600)

export default async function handler (req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed')
    if (!SECRET || req.query.secret !== SECRET) return res.status(401).send('Bad secret')

    const uid = Number(req.query.userid || req.query.userId || req.query.uid)
    if (!uid) return res.status(400).send('Missing userid')

    const blockId = String(req.query.block_id || req.query.block || '')

    // Tìm user theo telegram_id
    const { data: user, error } = await supa
      .from('users')
      .select('id, wheel_spins, last_wheel_reward')
      .eq('telegram_id', uid)
      .single()
    if (error || !user) return res.status(404).send('User not found')

    // Cooldown 10 phút
    let left = 0
    if (user.last_wheel_reward) {
      const elapsed = (Date.now() - new Date(user.last_wheel_reward).getTime()) / 1000
      left = Math.max(0, Math.ceil(COOLDOWN - elapsed))
    }
    if (left > 0) {
      return res.status(200).json({ ok: false, wait: left, reason: 'cooldown' })
    }

    // +1 lượt quay & chạm timestamp (idempotent)
    const { data: updated, error: uerr } = await supa
      .from('users')
      .update({
        wheel_spins: (user.wheel_spins ?? 0) + 1,
        last_wheel_reward: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('wheel_spins')
      .single()
    if (uerr) return res.status(500).json({ ok: false, error: uerr.message })

    // Log (tuỳ chọn)
    await supa.from('wheel_rewards').insert({
      user_id: user.id,
      block_id: blockId,
      source: 'reward'
    })

    return res.status(200).json({ ok: true, spins: updated.wheel_spins, wait: COOLDOWN })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}
