// /api/wheel/spin.js
import { supa } from '../_supa.js'
function uid(req){ const m=(req.headers.cookie||'').match(/(?:^|;\s*)tg_uid=(\d+)/); return m?Number(m[1]):null }

export default async (req,res)=>{
  try{
    if(req.method!=='POST') return res.status(405).send('Method not allowed')
    const tgUid = uid(req); if(!tgUid) return res.status(401).send('Unauthorized')

    // 6 ô trên vòng quay
    const { data, error } = await supa.rpc('wheel_spin', { p_uid: tgUid, p_segments: 6 })
    if(error) return res.status(500).json({ ok:false, error:'Supabase error' })
    const row = Array.isArray(data)? data[0] : data

    if(!row?.ok){
      return res.status(200).json({ ok:false, reason:'no_spins' })
    }
    return res.status(200).json({
      ok:true,
      index: Number(row.index||0),
      add: Number(row.add||0),
      balance: Number(row.balance||0),
      spins: Number(row.spins||0)
    })
  }catch(e){ res.status(500).json({ ok:false, error:'Server error' }) }
}
