import { CheckCircle, LockKey } from '@phosphor-icons/react'
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

export function AuthScreen() {
  const { session, isUnlocked, authenticating, loading, error, clearError, signUp, signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  if (loading || (session && !isUnlocked && authenticating)) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (session && !isUnlocked) {
    return <UnlockPrompt />
  }

  const confirmMismatch = mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit =
    mode === 'signin'
      ? email.length > 3 && password.length > 0
      : email.length > 3 && isPasswordValid(password) && password === confirmPassword

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    clearError()
    setInfoMessage(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const { needsEmailConfirmation } = await signUp(email, password, remember)
        if (needsEmailConfirmation) {
          setInfoMessage('Check your email to confirm your account, then sign in.')
        }
      } else {
        await signIn(email, password, remember)
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
                    setInfoMessage(null)
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
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <TextInput
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
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
            {infoMessage && <p className="mb-4 text-sm text-success">{infoMessage}</p>}

            <Button fullWidth disabled={!canSubmit || submitting} loading={submitting} onClick={handleSubmit}>
              Unlock FairNav Engine
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
