import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { decryptJSON, deriveEncryptionKey, encryptJSON, generateSaltBase64 } from '../lib/crypto'
import { isSupabaseConfigured, setRememberMe, supabase } from '../lib/supabaseClient'

interface ProfileRow {
  user_id: string
  ciphertext: string
  iv: string
  salt: string
}

/**
 * Finds this user's encrypted row, or creates one (with a fresh salt) if
 * this is their first time. Either way returns the derived key ready to
 * use, plus whatever wizard state was already saved (null for a new user).
 *
 * A wrong password against an EXISTING row surfaces here too: deriving the
 * wrong key makes AES-GCM's auth tag check fail, so decryptJSON throws.
 * That's what the "enter your password to unlock" step relies on for
 * validation, when a remembered session is restored on a new page load
 * (see unlockWithPassword below) without a password on hand yet.
 */
async function unlockOrInitProfile(
  userId: string,
  password: string,
): Promise<{ key: CryptoKey; wizardState: unknown }> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id, ciphertext, iv, salt')
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>()

  if (existing) {
    const key = await deriveEncryptionKey(password, existing.salt)
    const wizardState = await decryptJSON(key, { ciphertext: existing.ciphertext, iv: existing.iv })
    return { key, wizardState }
  }

  const salt = generateSaltBase64()
  const key = await deriveEncryptionKey(password, salt)
  const { ciphertext, iv } = await encryptJSON(key, null)
  const { error } = await supabase.from('profiles').insert({ user_id: userId, ciphertext, iv, salt })
  if (error) throw error
  return { key, wizardState: null }
}

interface AuthContextValue {
  session: Session | null
  encryptionKey: CryptoKey | null
  /** Signed in AND the encryption key has been derived - data can be read/written. */
  isUnlocked: boolean
  /**
   * True for the brief window during signIn/signUp between Supabase
   * establishing the session (which flips `session` truthy via
   * onAuthStateChange) and the encryption key finishing derivation. Lets
   * the UI avoid flashing the "enter your password to unlock" prompt for a
   * password the user just submitted seconds ago.
   */
  authenticating: boolean
  /**
   * The decrypted wizard state from the moment of unlock (null for a
   * brand-new account with nothing saved yet). Read once, at the point the
   * wizard mounts, to seed its initial state - see WizardProvider's
   * `initialState` prop.
   */
  hydratedState: unknown
  loading: boolean
  error: string | null
  clearError: () => void
  /** Returns whether this project requires confirming the email before a session exists. */
  signUp: (email: string, password: string, remember: boolean) => Promise<{ needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  /** For a restored session (page reload) that has no password on hand yet. */
  unlockWithPassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [hydratedState, setHydratedState] = useState<unknown>(null)
  const [authenticating, setAuthenticating] = useState(false)
  // No Supabase project configured - nothing to wait on, so start "not
  // loading" directly rather than flipping it inside the effect below.
  // AuthGate treats isUnlocked as permanently true in this case (see below).
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setEncryptionKey(null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const signUp = useCallback(async (email: string, password: string, remember: boolean) => {
    setRememberMe(remember)
    setError(null)
    setAuthenticating(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        // Where the confirmation email's link sends the browser after
        // Supabase verifies it - must also be added to this project's
        // Redirect URLs allow-list in the Supabase dashboard, or Supabase
        // silently ignores it and falls back to the project's Site URL.
        options: { emailRedirectTo: `${window.location.origin}/account-created` },
      })
      if (signUpError) {
        setError(signUpError.message)
        return { needsEmailConfirmation: false }
      }
      if (data.session && data.user) {
        const { key } = await unlockOrInitProfile(data.user.id, password)
        setEncryptionKey(key)
        setHydratedState(null)
        return { needsEmailConfirmation: false }
      }
      // This project requires email confirmation - no session yet. The
      // profile row gets created on first signIn() after they confirm.
      return { needsEmailConfirmation: true }
    } finally {
      setAuthenticating(false)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    setRememberMe(remember)
    setError(null)
    setAuthenticating(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        return
      }
      try {
        const { key, wizardState } = await unlockOrInitProfile(data.user.id, password)
        setEncryptionKey(key)
        setHydratedState(wizardState)
      } catch {
        setError('Could not unlock your data with that password.')
      }
    } finally {
      setAuthenticating(false)
    }
  }, [])

  const unlockWithPassword = useCallback(
    async (password: string) => {
      if (!session?.user) throw new Error('No active session to unlock')
      setError(null)
      try {
        const { key, wizardState } = await unlockOrInitProfile(session.user.id, password)
        setEncryptionKey(key)
        setHydratedState(wizardState)
      } catch {
        setError('Incorrect password.')
        throw new Error('Incorrect password')
      }
    },
    [session],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setEncryptionKey(null)
    setHydratedState(null)
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      encryptionKey,
      isUnlocked: !isSupabaseConfigured || Boolean(session && encryptionKey),
      authenticating,
      hydratedState,
      loading,
      error,
      clearError,
      signUp,
      signIn,
      unlockWithPassword,
      signOut,
    }),
    [
      session,
      encryptionKey,
      authenticating,
      hydratedState,
      loading,
      error,
      clearError,
      signUp,
      signIn,
      unlockWithPassword,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
