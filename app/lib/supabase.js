import { createClient } from '@supabase/supabase-js'

// Gunakan process.env, bukan import.meta.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validasi sederhana agar tidak bingung jika env lupa diisi
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Env Variables: Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah ada di .env")
}

export const supabase = createClient(supabaseUrl, supabaseKey)