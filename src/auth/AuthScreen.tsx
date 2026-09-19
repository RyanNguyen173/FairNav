import { CheckCircle, DeviceMobile, LockKey } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { PasswordChecklist } from '../components/PasswordChecklist'
import { FieldLabel, TextInput } from '../components/StepShell'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from './AuthContext'
import { isPasswordValid } from './passwordRules'

type Mode = 'signin' | 'signup'

const FEATURES = [
  'Upload your resume and get instantly matched to companies',
  'AI-generated elevator pitches, tailored per company',
  'A live booth-by-booth route for the day of the fair',
]

// E.164: a leading "+", then 8-15 digits total, first digit non-zero.
// Supabase's phone auth requires this format for both signup and OTP verification.
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/

function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.trim())
}

function UnlockPrompt() {
  const { unlockWithPassword, error, clearError, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    clearError()
    setSubmitting(true)
    try {
      await unlockWithPassword(password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LockKey size={28} weight="fill" className="mb-3 text-primary" aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold text-foreground">Unlock your data</h1>
          <p className="text-sm text-muted-foreground">
            Enter your password to decrypt your profile - we never store it ourselves, so this
            step can&apos;t be skipped even on a remembered device.
          </p>
        </div>

        <div className="mb-4">
          <FieldLabel htmlFor="unlock-password">Password</FieldLabel>
          <TextInput
            id="unlock-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && password) handleSubmit()
            }}
          />
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <Button fullWidth disabled={!password || submitting} loading={submitting} onClick={handleSubmit}>
          Unlock FairNav Engine
        </Button>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 w-full cursor-pointer text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}

/** Shown right after signup (or a signin attempt on a never-verified account) until the SMS code is confirmed. */
function PhoneVerificationForm() {
  const { pendingPhoneVerification, verifyPhoneCode, resendVerificationCode, cancelPhoneVerification, error, clearError } =
    useAuth()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim() || submitting) return
    clearError()
    setSubmitting(true)
    try {
      await verifyPhoneCode(code.trim())
    } catch {
      // verifyPhoneCode already sets a user-facing error message.
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    clearError()
    setResending(true)
    try {
      await resendVerificationCode()
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch {
      // resendVerificationCode already sets a user-facing error message.
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <DeviceMobile size={28} weight="fill" className="mb-3 text-primary" aria-hidden="true" />
        <h1 className="mb-1 text-lg font-bold text-foreground">Verify your phone</h1>
        <p className="text-sm text-muted-foreground">
          We texted a 6-digit code to {pendingPhoneVerification}. Enter it below to finish creating your account.
        </p>
      </div>

      <div className="mb-4">
        <FieldLabel htmlFor="otp-code">Verification code</FieldLabel>
        <TextInput
          id="otp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && code.trim()) handleSubmit()
          }}
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {resent && <p className="mb-4 text-sm text-success">Code resent.</p>}

      <Button fullWidth disabled={!code.trim() || submitting} loading={submitting} onClick={handleSubmit}>
        Verify &amp; Continue
      </Button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="cursor-pointer font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resend code
        </button>
        <button
          type="button"
          onClick={cancelPhoneVerification}
          className="cursor-pointer font-medium text-muted-foreground hover:text-foreground"
        >
          Use a different number
        </button>
      </div>
    </div>
  )
}

export function AuthScreen() {
  const { session, isUnlocked, authenticating, loading, error, clearError, signUp, signIn, pendingPhoneVerification } =
    useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  if (loading || (session && !isUnlocked && authenticating)) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (pendingPhoneVerification) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <PhoneVerificationForm />
      </div>
    )
  }

  if (session && !isUnlocked) {
    return <UnlockPrompt />
  }

  const confirmMismatch = mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit =
    mode === 'signin'
      ? isValidPhone(phone) && password.length > 0
      : isValidPhone(phone) && isPasswordValid(password) && password === confirmPassword

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    clearError()
    setSubmitting(true)
    try {
      const normalizedPhone = phone.trim()
      if (mode === 'signup') {
        await signUp(normalizedPhone, password, remember)
      } else {
        await signIn(normalizedPhone, password, remember)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          FairNav <span className="text-primary">•</span>
        </h1>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 flex-col md:grid md:grid-cols-2">
        <div className="hidden flex-col justify-center bg-muted px-12 md:flex">
          <h2 className="mb-4 text-3xl font-bold leading-tight text-foreground">
            Your AI copilot for the career fair floor.
          </h2>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(['signin', 'signup'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value)
                    clearError()
                  }}
                  className={[
                    'min-h-9 cursor-pointer rounded-lg text-sm font-semibold transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    mode === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {value === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <FieldLabel htmlFor="phone">Phone number</FieldLabel>
              <TextInput
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Include your country code (e.g. +1 for the US) - we&apos;ll text you a verification code.
              </p>
            </div>

            <div className="mb-4">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <TextInput
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === 'signup' && password.length > 0 && <PasswordChecklist password={password} />}
            </div>

            {mode === 'signup' && (
              <div className="mb-4">
                <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                <TextInput
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {confirmMismatch && <p className="mt-1 text-xs text-destructive">Passwords don&apos;t match.</p>}
              </div>
            )}

            <label className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              Remember me on this device
            </label>

            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

            <Button fullWidth disabled={!canSubmit || submitting} loading={submitting} onClick={handleSubmit}>
              Unlock FairNav Engine
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
