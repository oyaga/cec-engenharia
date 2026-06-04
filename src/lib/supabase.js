import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'sua-url-aqui'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-key-aqui'

const customStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    const localVal = window.localStorage.getItem(key);
    if (localVal) return localVal;
    return window.sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    const rememberMe = window.localStorage.getItem('cec_remember_me') === 'true';
    if (rememberMe) {
      window.localStorage.setItem(key, value);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

console.log("[Supabase SDK] Injetando no browser:", {
  urlLength: supabaseUrl ? supabaseUrl.length : 0,
  urlStart: supabaseUrl ? supabaseUrl.substring(0, 15) + "..." : "null",
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  keyStart: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "null"
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: customStorage
  }
})
