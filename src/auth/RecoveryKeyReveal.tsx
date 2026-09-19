import { CheckCircle, Copy, ShieldWarning } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { useAuth } from './AuthContext'

/**
 * Forces the user to save their recovery key before continuing - it's
 * generated client-side and never stored anywhere in plaintext, so this is
 * the only time it will ever be shown. Losing both this and their password
 * means their data is unrecoverable, by design (see src/lib/crypto.ts).
 */
export function RecoveryKeyReveal({ recoveryKey }: { recoveryKey: string }) {
  const { acknowledgeRecoveryKey, pendingRecoveryKeyIsFreshReset } = useAuth()
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied/unavailable - the key is still visible to copy by hand.
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <ShieldWarning size={28} weight="fill" className="mb-3 text-primary" aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold text-foreground">Save your recovery key</h1>
          <p className="text-sm text-muted-foreground">
            {pendingRecoveryKeyIsFreshReset
              ? "Your old data couldn't be recovered, but this key will let you reset your password without losing data again."
              : "If you ever forget your password, this is the only way back into your encrypted data. We can't recover it for you - we never see your password or this key."}
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-muted p-4">
          <p className="break-all text-center font-mono text-base font-bold tracking-wide text-foreground">
            {recoveryKey}
          </p>
        </div>

        <Button
          fullWidth
          variant="secondary"
          icon={
            copied ? (
              <CheckCircle size={16} weight="bold" aria-hidden="true" />
            ) : (
              <Copy size={16} weight="bold" aria-hidden="true" />
            )
          }
          onClick={handleCopy}
          className="mb-5"
        >
          {copied ? 'Copied' : 'Copy to clipboard'}
        </Button>

        <label className="mb-5 flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
          />
          I&apos;ve saved this recovery key somewhere safe, outside FairNav.
        </label>

        <Button fullWidth disabled={!confirmed} onClick={acknowledgeRecoveryKey}>
          Continue
        </Button>
      </div>
    </div>
  )
}
