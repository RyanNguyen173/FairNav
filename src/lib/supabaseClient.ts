import { createClient } from '@supabase/supabase-js'

/**
 * "Remember me" toggles which storage backs the session: localStorage
 * (survives closing the browser) vs sessionStorage (cleared when the tab
 * closes). Set this *before* signing in/up - Supabase reads from storage
 * lazily on each call, so flipping it earlier is enough; no client restart
 * needed.
 */
let rememberMe = true

export function setRememberMe(value: boolean) {
  rememberMe = value
}

const dynamicStorage = {
  getItem: (key: string) => (rememberMe ? localStorage : sessionStorage).getItem(key),
  setItem: (key: string, value: string) => (rememberMe ? localStorage : sessionStorage).setItem(key, value),
  removeItem: (key: string) => (rememberMe ? localStorage : sessionStorage).removeItem(key),
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * The anon key is meant to ship in the client bundle - it's a public key
 * whose access is enforced by the database's Row Level Security policies
 * (see supabase/schema.sql), not by keeping the key secret.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    storage: dynamicStorage,
  },
})
