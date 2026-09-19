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

/**
 * Guarded for `typeof window === 'undefined'` since Next.js also evaluates
 * this module (and Supabase's own client construction, which synchronously
 * probes storage) on the server during prerendering - there's no session to
 * persist there anyway in this client-only auth design.
 */
const dynamicStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return (rememberMe ? localStorage : sessionStorage).getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    ;(rememberMe ? localStorage : sessionStorage).setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    ;(rememberMe ? localStorage : sessionStorage).removeItem(key)
  },
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * The anon key is meant to ship in the client bundle - it's a public key
 * whose access is enforced by the database's Row Level Security policies
 * (see supabase/schema.sql), not by keeping the key secret.
 *
 * createClient() validates its URL eagerly and throws if given an empty
 * string - harmless in the old Vite CSR build (this module only ever ran in
 * the browser), but Next.js also evaluates this module on the server during
 * build-time prerendering, where env vars may genuinely be unset. Fall back
 * to a syntactically valid placeholder so construction never throws; nothing
 * in the app calls `supabase` methods unless isSupabaseConfigured is true.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      storage: dynamicStorage,
    },
  },
)
