import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'sua-url-aqui'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-key-aqui'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
