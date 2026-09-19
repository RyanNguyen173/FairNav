import { LockKey } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { PasswordChecklist } from '../components/PasswordChecklist'
import { FieldLabel, TextInput } from '../components/StepShell'
import { useAuth } from './AuthContext'
import { isPasswordValid } from './passwordRules'

/**
 * Shown once a Supabase password-recovery link lands (see AuthContext's
 * passwordRecoveryPending). Recovers the still-unchanged DEK via the
 * recovery key shown at signup, then re-wraps it under the new password -
 * existing data survives the reset. If this account never had a recovery
 * key on file, completePasswordReset falls back to starting fresh and says
 * so via the RecoveryKeyReveal screen shown right after.
 */
export function ResetPasswordScreen() {
  const { completePasswordReset, error, clearError } = useAuth()
  const [recoveryKey, setRecoveryKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit = recoveryKey.trim().length > 0 && isPasswordValid(newPassword) && newPassword === confirmPassword

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    clearError()
    setSubmitting(true)
    try {
      await completePasswordReset(recoveryKey, newPassword)
    } catch {
      // completePasswordReset already sets a user-facing error message.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LockKey size={28} weight="fill" className="mb-3 text-primary" aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold text-foreground">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the recovery key you saved at signup, then choose a new password. Your existing data stays intact.
          </p>
        </div>

        <div className="mb-4">
          <FieldLabel htmlFor="recovery-key">Recovery key</FieldLabel>
          <TextInput
            id="recovery-key"
            value={recoveryKey}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            onChange={(event) => setRecoveryKey(event.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Don&apos;t have it? You can still reset your password below, but your existing data can&apos;t be
            recovered without it.
          </p>
        </div>

        <div className="mb-4">
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <TextInput
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {newPassword.length > 0 && <PasswordChecklist password={newPassword} />}
        </div>

        <div className="mb-4">
          <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
          <TextInput
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canSubmit) handleSubmit()
            }}
          />
          {confirmMismatch && <p className="mt-1 text-xs text-destructive">Passwords don&apos;t match.</p>}
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <Button fullWidth disabled={!canSubmit || submitting} loading={submitting} onClick={handleSubmit}>
          Reset Password
        </Button>
      </div>
    </div>
  )
}
