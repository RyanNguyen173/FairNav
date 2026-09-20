import { useState } from 'react'
import { Button } from '../components/Button'
import { PasswordChecklist } from '../components/PasswordChecklist'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from './AuthContext'
import { isPasswordValid } from './passwordRules'

type Mode = 'signin' | 'signup'

const STEPS = [
  { n: '01', title: 'Add the fair', body: 'Name, date, venue, and whether you are after an internship or full-time.' },
  {
    n: '02',
    title: 'Drop the directory',
    body: 'Upload the exhibitor list or paste it in. We pull out every company and booth number.',
  },
  {
    n: '03',
    title: 'Read your matches',
    body: 'Every booth scored against your resume, skills and target role. You pick who makes the list.',
  },
  {
    n: '04',
    title: 'Work the floor',
    body: 'A pitch and overview per company, a booth-by-booth list, and notes as you go.',
  },
]

const PURPOSE = [
  {
    icon: '/icon-tent.png',
    title: 'One profile, every fair',
    body: 'Your resume, skills and experience live at the account level. Each fair keeps its own directory, matches, and fair prep on top of them.',
  },
  {
    icon: '/icon-plane.png',
    title: 'A pitch per company',
    body: 'An elevator pitch and useful information for each company you select, written against what that company actually recruits for.',
  },
  {
    icon: '/logo-cat.png',
    title: 'Fair day, tracked',
    body: 'Mark booths visited, keep a note on each conversation, and see what is left before the hall closes.',
  },
]

const FAQS = [
  {
    q: 'Do I need an account?',
    a: 'Yes. The account is what holds your encrypted profile and your fairs, so your matches and pitches are still there the next time you sign in. Signing up takes an email and a password.',
  },
  {
    q: 'What can I upload?',
    a: "Your resume as a file, and the fair's exhibitor directory either as a file or as pasted text. Keep uploads under a few megabytes; larger files can time out on the way to the parser.",
  },
  {
    q: 'Is this information reliable?',
    a: "The site is powered by Google's Gemini 3.5 Flash Lite with advanced configurations, parameters, and filters.",
  },
  {
    q: 'Can I access this on mobile?',
    a: 'Yes, this website is completely adaptable to mobile devices with UI scaling down to smaller screens.',
  },
]

const NAV_LINKS: { id: string; label: string }[] = [
  { id: 'how', label: 'How it works' },
  { id: 'purpose', label: 'Purpose' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'questions', label: 'Questions' },
]

function jumpTo(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function UnlockPrompt() {
  const { session, unlockWithPassword, error, clearError, signOut } = useAuth()
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
          <img src="/logo-cat.png" alt="" className="mb-3 h-10 w-10 object-contain" />
          <h1 className="mb-1 text-lg font-bold text-foreground">Unlock your data</h1>
          {session?.user?.email && (
            <p className="mb-2 inline-flex items-center rounded-full bg-accent-wash px-3 py-1 font-mono text-xs text-accent-ink">
              {session.user.email}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Enter your password to decrypt your profile - we never store it ourselves, so this
            step can&apos;t be skipped even on a remembered device.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="unlock-password" className="mb-1.5 block text-sm font-semibold text-foreground">
            Password
          </label>
          <input
            id="unlock-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && password) handleSubmit()
            }}
            className="min-h-11 w-full rounded-lg border border-control-line bg-surface px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string
  a: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-t border-line-strong">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-5 text-left text-[17px] font-medium text-foreground transition-colors duration-150 hover:bg-muted"
      >
        <span>{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <p className="m-0 max-w-[62ch] px-2 pb-5 text-[15px] leading-relaxed text-muted-foreground">{a}</p>
        </div>
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
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  if (loading || (session && !isUnlocked && authenticating)) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (session && !isUnlocked) {
    return <UnlockPrompt />
  }

  const isSignUp = mode === 'signup'
  const confirmMismatch = isSignUp && confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit = isSignUp
    ? email.length > 3 && isPasswordValid(password) && password === confirmPassword
    : email.length > 3 && password.length > 0

  const switchMode = (next: Mode) => {
    setMode(next)
    clearError()
    setInfoMessage(null)
    jumpTo('auth')
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    clearError()
    setInfoMessage(null)
    setSubmitting(true)
    try {
      if (isSignUp) {
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

  const navButtonClass =
    'cursor-pointer rounded-lg bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground'
  const tabButtonClass = (active: boolean) =>
    [
      'relative z-10 cursor-pointer rounded-md bg-transparent py-2.5 text-sm font-medium transition-colors duration-150',
      active ? 'text-foreground' : 'text-muted-foreground',
    ].join(' ')

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
        <div className="flex items-center gap-2.5">
          <img src="/logo-cat.png" alt="FairNav" className="h-[30px] w-[30px] object-contain" />
          <span className="text-[19px] font-semibold tracking-tight">FairNav</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {NAV_LINKS.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => jumpTo(id)} className={navButtonClass}>
              {label}
            </button>
          ))}
          <ThemeToggle />
          <button type="button" onClick={() => switchMode('signin')} className={navButtonClass}>
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-transform duration-150 active:scale-[0.97]"
          >
            Create account
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1120px] grid-cols-1 items-start gap-16 px-4 py-12 md:grid-cols-[1fr_1fr] md:px-8 md:py-16">
        <div className="fn-in flex flex-col gap-6 pt-6">
          <div className="font-mono text-xs uppercase tracking-[0.06em] text-accent-ink">Career fair copilot</div>
          <h1 className="m-0 text-[40px] font-medium leading-[1.05] tracking-[-0.04em] text-balance md:text-[52px]">
            Know who to talk to before you walk in.
          </h1>
          <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            Upload your resume and the fair&apos;s exhibitor list. FairNav ranks the booths worth your time, writes a
            pitch for each one, and guides you booth to booth on the day.
          </p>
          <div className="flex flex-wrap gap-6 pt-2">
            {[
              ['4 steps', 'Resume to route'],
              ['Research', 'AI driven insights'],
              ['One fair or ten', 'One profile behind them'],
            ].map(([stat, label]) => (
              <div key={stat} className="flex flex-col gap-1">
                <div className="text-2xl font-semibold tracking-[-0.03em]">{stat}</div>
                <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="auth" className="fn-in fn-d1 flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-soft">
          <div className="relative grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-card shadow-hairline transition-transform duration-200 ease-[cubic-bezier(0.77,0,0.175,1)]"
              style={{ transform: isSignUp ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button type="button" onClick={() => switchMode('signin')} className={tabButtonClass(!isSignUp)}>
              Sign in
            </button>
            <button type="button" onClick={() => switchMode('signup')} className={tabButtonClass(isSignUp)}>
              Create account
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              placeholder="you@university.edu"
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 rounded-lg border border-control-line bg-surface px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-11 rounded-lg border border-control-line bg-surface px-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {isSignUp && password.length > 0 && <PasswordChecklist password={password} />}
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={[
                  'min-h-11 rounded-lg border bg-surface px-3 text-[15px] text-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
                  confirmMismatch ? 'border-destructive' : 'border-control-line',
                ].join(' ')}
              />
              {confirmMismatch && <p className="text-[13px] text-destructive">Passwords do not match.</p>}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            Remember me on this device
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {infoMessage && <p className="text-sm text-success">{infoMessage}</p>}

          <Button fullWidth disabled={!canSubmit || submitting} loading={submitting} onClick={handleSubmit}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>

          <p className="m-0 text-[13px] leading-relaxed text-ink-subtle">
            Your password also derives the key that decrypts your profile. We never see it, so it cannot be reset
            for you.
          </p>
        </div>
      </section>

      <section id="how" className="bg-accent-wash px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-12">
          <div className="flex max-w-[56ch] flex-col gap-3">
            <div className="font-mono text-xs uppercase tracking-[0.06em] text-accent-ink">How it works</div>
            <h2 className="m-0 text-3xl font-medium leading-tight tracking-[-0.03em] md:text-4xl">
              Four steps, from resume to route
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.n} className="flex flex-col gap-2.5 rounded-2xl bg-card p-6">
                <div className="font-mono text-xs tracking-[0.06em] text-accent-ink">{step.n}</div>
                <div className="text-lg font-semibold tracking-[-0.02em]">{step.title}</div>
                <div className="text-sm leading-relaxed text-muted-foreground">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="purpose" className="px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-12">
          <div className="flex max-w-[56ch] flex-col gap-3">
            <div className="font-mono text-xs uppercase tracking-[0.06em] text-accent-ink">Purpose</div>
            <h2 className="m-0 text-balance text-3xl font-medium leading-tight tracking-[-0.03em] md:text-4xl">
              Built for students who get lost at career fairs.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {PURPOSE.map((item) => (
              <div key={item.title} className="flex flex-col gap-3">
                <img src={item.icon} alt="" className="h-9 w-9 object-contain opacity-85" />
                <div className="text-xl font-semibold tracking-[-0.03em]">{item.title}</div>
                <div className="text-[15px] leading-relaxed text-muted-foreground">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="bg-inverse px-4 py-16 text-on-inverse md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-start gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs uppercase tracking-[0.06em] text-accent">Privacy</div>
            <h2 className="m-0 text-balance text-3xl font-medium leading-tight tracking-[-0.03em] md:text-4xl">
              Your resume never leaves your device unencrypted.
            </h2>
          </div>
          <div className="flex flex-col gap-5 text-base leading-relaxed">
            <p className="m-0">
              Your profile, matches, pitches and fair-day notes are encrypted in the browser with AES-256-GCM, using
              a key derived from your password. The database only ever holds ciphertext.
            </p>
            <p className="m-0">
              The key lives in memory and nowhere else. That is why a remembered device still asks for your
              password: a restored session alone can never decrypt anything.
            </p>
          </div>
        </div>
      </section>

      <section id="questions" className="px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto flex max-w-[760px] flex-col gap-8">
          <h2 className="m-0 text-[32px] font-medium tracking-[-0.03em]">Questions</h2>
          <div className="flex flex-col">
            {FAQS.map((faq, index) => (
              <FaqItem
                key={faq.q}
                q={faq.q}
                a={faq.a}
                open={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
            <div className="border-t border-line-strong" />
          </div>
        </div>
      </section>

      <section className="bg-surface px-4 py-20 md:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-5 text-center">
          <img src="/logo-cat.png" alt="" className="h-16 w-16 object-contain" />
          <h2 className="m-0 max-w-[20ch] text-[32px] font-medium tracking-[-0.03em]">
            Your next fair starts with one upload.
          </h2>
          <Button onClick={() => switchMode('signup')}>Create your account</Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-8">
        <div className="flex items-center gap-2">
          <img src="/logo-cat.png" alt="" className="h-5 w-5 object-contain" />
          <span className="text-sm font-medium">FairNav</span>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-subtle">
          Built for SASEhack 2026 · Social impact and design
        </div>
      </footer>
    </div>
  )
}
