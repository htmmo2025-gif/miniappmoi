import { createClient } from '@supabase/supabase-js'
const supa = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY)

export default async (req, res) => {
  const uid = Number((req.headers.cookie || '').match(/tg_uid=(\d+)/)?.[1])
  if (!uid) return res.status(401).send('no uid')

  const { data } = await supa.from('users').select(
    'id, username, first_name, last_name, photo_url, htw_balance, vnd_balance, referrer_id'
  ).eq('id', uid).maybeSingle()

  // fallback nếu chưa có vnd_balance
  const vnd = data?.vnd_balance ?? Number(data?.htw_balance ?? 0) * 36
  res.json({ ...data, vnd_balance: vnd })
}
