// api/_supa.js  (Node runtime)
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
if (!SERVICE_ROLE_KEY) throw new Error('Missing SERVICE_ROLE_KEY')

export const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)