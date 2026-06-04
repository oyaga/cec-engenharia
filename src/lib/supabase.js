import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'sua-url-aqui'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-key-aqui'

console.log("[Supabase SDK] Injetando no browser:", {
  urlLength: supabaseUrl ? supabaseUrl.length : 0,
  urlStart: supabaseUrl ? supabaseUrl.substring(0, 15) + "..." : "null",
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  keyStart: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "null"
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
