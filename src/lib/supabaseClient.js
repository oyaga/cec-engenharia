import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[SupabaseClient SDK] Injetando no browser:", {
  urlLength: supabaseUrl ? supabaseUrl.length : 0,
  urlStart: supabaseUrl ? supabaseUrl.substring(0, 15) + "..." : "null",
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  keyStart: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "null"
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL ou Anon Key não encontradas no .env. Por favor, configure as variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
