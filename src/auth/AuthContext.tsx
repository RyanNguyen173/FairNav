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
import {
  decryptJSON,
  deriveEncryptionKey,
  encryptJSON,
  generateDataKey,
  generateRecoveryKey,
  generateSaltBase64,
  normalizeRecoveryKey,
  unwrapKey,
  wrapKey,
  type EncryptedPayload,
} from '../lib/crypto'
import { isSupabaseConfigured, setRememberMe, supabase } from '../lib/supabaseClient'

interface ProfileRow {
  user_id: string
  ciphertext: string
  iv: string
  /** Legacy pre-DEK key salt - present only on a row not yet migrated. */
  salt: string | null
  password_salt: string | null
  dek_wrapped_password: string | null
  dek_wrapped_password_iv: string | null
  recovery_salt: string | null
  dek_wrapped_recovery: string | null
  dek_wrapped_recovery_iv: string | null
}

const PROFILE_COLUMNS =
  'user_id, ciphertext, iv, salt, password_salt, dek_wrapped_password, dek_wrapped_password_iv, recovery_salt, dek_wrapped_recovery, dek_wrapped_recovery_iv'

interface UnlockResult {
  key: CryptoKey
  wizardState: unknown
  /** Non-null exactly when a recovery code was just (re)generated - the caller must force the user to save it. */
  recoveryKey: string | null
}

/** Thrown by unwrapViaRecoveryKey when the row predates the recovery-key model entirely. */
class NoRecoveryKeyOnFileError extends Error {}

/** Thrown by completePasswordResetImpl when the entered recovery key doesn't unwrap the DEK. */
class IncorrectRecoveryKeyError extends Error {}

async function fetchProfileRow(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>()
  return data
}

async function wrapDekForPassword(dek: CryptoKey, password: string) {
  const passwordSalt = generateSaltBase64()
  const passwordWrapKey = await deriveEncryptionKey(password, passwordSalt)
  const wrapped = await wrapKey(passwordWrapKey, dek)
  return { passwordSalt, wrapped }
}

async function wrapDekForRecovery(dek: CryptoKey, recoveryKey: string) {
  const recoverySalt = generateSaltBase64()
  const recoveryWrapKey = await deriveEncryptionKey(recoveryKey, recoverySalt)
  const wrapped = await wrapKey(recoveryWrapKey, dek)
  return { recoverySalt, wrapped }
}

/** Generates a fresh DEK + recovery key and builds the full set of row fields to persist for them. */
async function buildProfileFields(password: string, wizardState: unknown) {
  const dek = await generateDataKey()
  const recoveryKey = generateRecoveryKey()
  const { passwordSalt, wrapped: passwordWrapped } = await wrapDekForPassword(dek, password)
  const { recoverySalt, wrapped: recoveryWrapped } = await wrapDekForRecovery(dek, recoveryKey)
  const { ciphertext, iv } = await encryptJSON(dek, wizardState)

  return {
    dek,
    recoveryKey,
    fields: {
      ciphertext,
      iv,
      salt: null,
      password_salt: passwordSalt,
      dek_wrapped_password: passwordWrapped.ciphertext,
      dek_wrapped_password_iv: passwordWrapped.iv,
      recovery_salt: recoverySalt,
      dek_wrapped_recovery: recoveryWrapped.ciphertext,
      dek_wrapped_recovery_iv: recoveryWrapped.iv,
    },
  }
}

/** Brand-new user: generate a DEK + recovery key, wrap the DEK both ways, store everything. */
async function createProfile(userId: string, password: string): Promise<UnlockResult> {
  const { dek, recoveryKey, fields } = await buildProfileFields(password, null)
  const { error } = await supabase.from('profiles').insert({ user_id: userId, ...fields })
  if (error) throw error
  return { key: dek, wizardState: null, recoveryKey }
}

/**
 * A row saved before the DEK model existed: its `ciphertext` was encrypted
 * directly by a password-derived key (`salt`), with no recovery path. Decrypts
 * with that legacy key, then upgrades the row in place to the DEK model -
 * generating a recovery key for the first time - without losing the data.
 */
async function migrateLegacyProfile(userId: string, password: string, row: ProfileRow): Promise<UnlockResult> {
  const legacyKey = await deriveEncryptionKey(password, row.salt as string)
  const wizardState = await decryptJSON(legacyKey, { ciphertext: row.ciphertext, iv: row.iv })

  const { dek, recoveryKey, fields } = await buildProfileFields(password, wizardState)
  const { error } = await supabase.from('profiles').update(fields).eq('user_id', userId)
  if (error) throw error
  return { key: dek, wizardState, recoveryKey }
}

/** A row already on the DEK model: unwrap the DEK with the password, then decrypt the data with it. */
async function unlockCurrentProfile(password: string, row: ProfileRow): Promise<UnlockResult> {
  const passwordWrapKey = await deriveEncryptionKey(password, row.password_salt as string)
  const dek = await unwrapKey(passwordWrapKey, {
    ciphertext: row.dek_wrapped_password as string,
    iv: row.dek_wrapped_password_iv as string,
  })
  const wizardState = await decryptJSON(dek, { ciphertext: row.ciphertext, iv: row.iv })
  return { key: dek, wizardState, recoveryKey: null }
}

/**
 * Finds this user's encrypted row, or creates one (with a fresh DEK +
 * recovery key) if this is their first time. A legacy pre-DEK row is
 * upgraded in place on this call. Either way returns the DEK ready to use,
 * whatever wizard state was already saved, and a recovery key IF one was
 * just (re)generated - callers must show that once so it isn't lost.
 *
 * A wrong password against an existing row surfaces here too: deriving the
 * wrong key makes AES-GCM's auth tag check fail, so unwrapKey/decryptJSON
 * throws. That's what the "enter your password to unlock" step relies on
 * for validation, when a remembered session is restored on a new page load
 * (see unlockWithPassword below) without a password on hand yet.
 */
async function unlockOrInitProfile(userId: string, password: string): Promise<UnlockResult> {
  const existing = await fetchProfileRow(userId)

  if (!existing) return createProfile(userId, password)
  if (!existing.password_salt) return migrateLegacyProfile(userId, password, existing)
  return unlockCurrentProfile(password, existing)
}

async function unwrapViaRecoveryKey(
  row: ProfileRow,
  recoveryKeyInput: string,
): Promise<{ dek: CryptoKey; wizardState: unknown }> {
  if (!row.dek_wrapped_recovery || !row.dek_wrapped_recovery_iv || !row.recovery_salt) {
    throw new NoRecoveryKeyOnFileError('No recovery key on file for this account')
  }

  const recoveryWrapKey = await deriveEncryptionKey(normalizeRecoveryKey(recoveryKeyInput), row.recovery_salt)
  const wrapped: EncryptedPayload = { ciphertext: row.dek_wrapped_recovery, iv: row.dek_wrapped_recovery_iv }
  const dek = await unwrapKey(recoveryWrapKey, wrapped)
  const wizardState = await decryptJSON(dek, { ciphertext: row.ciphertext, iv: row.iv })
  return { dek, wizardState }
}

/**
 * Completes a password reset. Unwraps the still-unchanged DEK with the
 * recovery key, sets the new Supabase Auth password, then re-wraps that
 * same DEK under the new password - the data itself is never re-encrypted,
 * so existing data survives the reset.
 *
 * If this row predates the recovery-key model (no dek_wrapped_recovery
 * exists), there is genuinely no way back into the old data - it only ever
 * had a password-derived key, which the reset just replaced. That account
 * starts over with a fresh DEK (and gets a recovery key for the first time,
 * so this can't happen to it again).
 */
async function completePasswordResetImpl(
  userId: string,
  recoveryKeyInput: string,
  newPassword: string,
): Promise<UnlockResult & { startedFresh: boolean }> {
  const row = await fetchProfileRow(userId)
  if (!row) throw new Error('Profile not found')

  let unwrapped: { dek: CryptoKey; wizardState: unknown } | null = null
  try {
    unwrapped = await unwrapViaRecoveryKey(row, recoveryKeyInput)
  } catch (unwrapError) {
    if (!(unwrapError instanceof NoRecoveryKeyOnFileError)) {
      throw new IncorrectRecoveryKeyError('Incorrect recovery key.')
    }
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
  if (passwordError) throw passwordError

  if (unwrapped) {
    const { passwordSalt, wrapped } = await wrapDekForPassword(unwrapped.dek, newPassword)
    const { error } = await supabase
      .from('profiles')
      .update({
        password_salt: passwordSalt,
        dek_wrapped_password: wrapped.ciphertext,
        dek_wrapped_password_iv: wrapped.iv,
      })
      .eq('user_id', userId)
    if (error) throw error
    return { key: unwrapped.dek, wizardState: unwrapped.wizardState, recoveryKey: null, startedFresh: false }
  }

  const { dek, recoveryKey, fields } = await buildProfileFields(newPassword, null)
  const { error } = await supabase.from('profiles').update(fields).eq('user_id', userId)
  if (error) throw error
  return { key: dek, wizardState: null, recoveryKey, startedFresh: true }
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
   * Non-null exactly once, right after a recovery code is (re)generated
   * (signup, a legacy-account migration, or a "no recovery key on file"
   * reset). The UI must force the user to save it before continuing - it is
   * never shown or retrievable again.
   */
  pendingRecoveryKey: string | null
  /** True when pendingRecoveryKey came from the "no recovery key on file" reset fallback, not a normal signup. */
  pendingRecoveryKeyIsFreshReset: boolean
  acknowledgeRecoveryKey: () => void
  /** True from the moment a password-recovery email link lands until completePasswordReset succeeds. */
  passwordRecoveryPending: boolean
  /** Returns whether this project requires confirming the email before a session exists. */
  signUp: (email: string, password: string, remember: boolean) => Promise<{ needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  /** For a restored session (page reload) that has no password on hand yet. */
  unlockWithPassword: (password: string) => Promise<void>
  /** Sends the "reset your password" email via Supabase Auth. */
  requestPasswordReset: (email: string) => Promise<void>
  /** Call once a password-recovery session is active (passwordRecoveryPending). */
  completePasswordReset: (recoveryKey: string, newPassword: string) => Promise<{ startedFresh: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [hydratedState, setHydratedState] = useState<unknown>(null)
  const [authenticating, setAuthenticating] = useState(false)
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(null)
  const [pendingRecoveryKeyIsFreshReset, setPendingRecoveryKeyIsFreshReset] = useState(false)
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false)
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

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setEncryptionKey(null)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryPending(true)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const acknowledgeRecoveryKey = useCallback(() => {
    setPendingRecoveryKey(null)
    setPendingRecoveryKeyIsFreshReset(false)
  }, [])

  const signUp = useCallback(async (email: string, password: string, remember: boolean) => {
    setRememberMe(remember)
    setError(null)
    setAuthenticating(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(signUpError.message)
        return { needsEmailConfirmation: false }
      }
      if (data.session && data.user) {
        const { key, recoveryKey } = await unlockOrInitProfile(data.user.id, password)
        setEncryptionKey(key)
        setHydratedState(null)
        setPendingRecoveryKey(recoveryKey)
        setPendingRecoveryKeyIsFreshReset(false)
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
        const { key, wizardState, recoveryKey } = await unlockOrInitProfile(data.user.id, password)
        setEncryptionKey(key)
        setHydratedState(wizardState)
        setPendingRecoveryKey(recoveryKey)
        setPendingRecoveryKeyIsFreshReset(false)
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
        const { key, wizardState, recoveryKey } = await unlockOrInitProfile(session.user.id, password)
        setEncryptionKey(key)
        setHydratedState(wizardState)
        setPendingRecoveryKey(recoveryKey)
        setPendingRecoveryKeyIsFreshReset(false)
      } catch {
        setError('Incorrect password.')
        throw new Error('Incorrect password')
      }
    },
    [session],
  )

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) {
      setError(resetError.message)
      throw resetError
    }
  }, [])

  const completePasswordReset = useCallback(
    async (recoveryKey: string, newPassword: string) => {
      if (!session?.user) throw new Error('No active session to reset')
      setError(null)
      try {
        const result = await completePasswordResetImpl(session.user.id, recoveryKey, newPassword)
        setEncryptionKey(result.key)
        setHydratedState(result.wizardState)
        setPendingRecoveryKey(result.recoveryKey)
        setPendingRecoveryKeyIsFreshReset(result.startedFresh)
        setPasswordRecoveryPending(false)
        return { startedFresh: result.startedFresh }
      } catch (resetError) {
        setError(
          resetError instanceof IncorrectRecoveryKeyError
            ? resetError.message
            : 'Could not reset your password. Please try again.',
        )
        throw resetError
      }
    },
    [session],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setEncryptionKey(null)
    setHydratedState(null)
    setSession(null)
    setPendingRecoveryKey(null)
    setPendingRecoveryKeyIsFreshReset(false)
    setPasswordRecoveryPending(false)
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
      pendingRecoveryKey,
      pendingRecoveryKeyIsFreshReset,
      acknowledgeRecoveryKey,
      passwordRecoveryPending,
      signUp,
      signIn,
      unlockWithPassword,
      requestPasswordReset,
      completePasswordReset,
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
      pendingRecoveryKey,
      pendingRecoveryKeyIsFreshReset,
      acknowledgeRecoveryKey,
      passwordRecoveryPending,
      signUp,
      signIn,
      unlockWithPassword,
      requestPasswordReset,
      completePasswordReset,
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
