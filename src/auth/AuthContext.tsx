import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  /**
   * The phone number awaiting an SMS code, set right after signUp() (or
   * after signIn() hits an unconfirmed account) and cleared once
   * verifyPhoneCode succeeds or verificationCancelled is called. Non-null
   * means the UI should show the code-entry screen instead of anything else.
   */
  pendingPhoneVerification: string | null
  /** Submits the 6-digit SMS code for pendingPhoneVerification and finishes unlocking. */
  verifyPhoneCode: (code: string) => Promise<void>
  /** Re-sends the SMS code to pendingPhoneVerification. */
  resendVerificationCode: () => Promise<void>
  /** Abandons phone verification and returns to the sign-up form. */
  cancelPhoneVerification: () => void
  /** Returns whether a verification code was just sent and must be entered before the account is usable. */
  signUp: (phone: string, password: string, remember: boolean) => Promise<{ needsVerification: boolean }>
  signIn: (phone: string, password: string, remember: boolean) => Promise<void>
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
  const [pendingPhoneVerification, setPendingPhoneVerification] = useState<string | null>(null)
  // No Supabase project configured - nothing to wait on, so start "not
  // loading" directly rather than flipping it inside the effect below.
  // AuthGate treats isUnlocked as permanently true in this case (see below).
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  // The password never gets persisted anywhere (by design - see crypto.ts),
  // but between signUp() sending the SMS and verifyPhoneCode() finishing,
  // we need the SAME password on hand to derive the encryption key right
  // after verification succeeds. Held only in memory, cleared as soon as
  // it's used or verification is cancelled.
  const pendingPasswordRef = useRef<string | null>(null)

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

  const signUp = useCallback(async (phone: string, password: string, remember: boolean) => {
    setRememberMe(remember)
    setError(null)
    setAuthenticating(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ phone, password })
      if (signUpError) {
        setError(signUpError.message)
        return { needsVerification: false }
      }
      if (data.session && data.user) {
        const { key } = await unlockOrInitProfile(data.user.id, password)
        setEncryptionKey(key)
        setHydratedState(null)
        return { needsVerification: false }
      }
      // Phone confirmation is required - no session yet. Hold the password
      // in memory so verifyPhoneCode can unlock immediately once the SMS
      // code is confirmed; the profile row gets created there.
      pendingPasswordRef.current = password
      setPendingPhoneVerification(phone)
      return { needsVerification: true }
    } finally {
      setAuthenticating(false)
    }
  }, [])

  const signIn = useCallback(async (phone: string, password: string, remember: boolean) => {
    setRememberMe(remember)
    setError(null)
    setAuthenticating(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ phone, password })
      if (signInError) {
        if (signInError.code === 'phone_not_confirmed') {
          // They started signing up before, never entered the code, and are
          // now back - resume verification instead of a dead-end error.
          pendingPasswordRef.current = password
          setPendingPhoneVerification(phone)
          await supabase.auth.resend({ type: 'sms', phone })
        } else {
          setError(signInError.message)
        }
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

  const verifyPhoneCode = useCallback(
    async (code: string) => {
      if (!pendingPhoneVerification) throw new Error('No phone verification in progress')
      const password = pendingPasswordRef.current
      if (!password) throw new Error('No password on hand to unlock with')

      setError(null)
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: pendingPhoneVerification,
        token: code,
        type: 'sms',
      })
      if (verifyError || !data.user) {
        setError(verifyError?.message ?? 'Could not verify that code. Please try again.')
        throw verifyError ?? new Error('Verification succeeded without a user')
      }

      try {
        const { key, wizardState } = await unlockOrInitProfile(data.user.id, password)
        setEncryptionKey(key)
        setHydratedState(wizardState)
        setPendingPhoneVerification(null)
        pendingPasswordRef.current = null
      } catch (err) {
        setError('Verified, but could not unlock your data. Please try signing in again.')
        throw err
      }
    },
    [pendingPhoneVerification],
  )

  const resendVerificationCode = useCallback(async () => {
    if (!pendingPhoneVerification) throw new Error('No phone verification in progress')
    setError(null)
    const { error: resendError } = await supabase.auth.resend({ type: 'sms', phone: pendingPhoneVerification })
    if (resendError) {
      setError(resendError.message)
      throw resendError
    }
  }, [pendingPhoneVerification])

  const cancelPhoneVerification = useCallback(() => {
    setPendingPhoneVerification(null)
    pendingPasswordRef.current = null
    setError(null)
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
    setPendingPhoneVerification(null)
    pendingPasswordRef.current = null
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
      pendingPhoneVerification,
      verifyPhoneCode,
      resendVerificationCode,
      cancelPhoneVerification,
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
      pendingPhoneVerification,
      verifyPhoneCode,
      resendVerificationCode,
      cancelPhoneVerification,
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
