'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { AuthProvider, useAuth } from '../src/auth/AuthContext'
import { AuthScreen } from '../src/auth/AuthScreen'
import { ThemeProvider } from '../src/theme/ThemeContext'
import { useWizard, WizardProvider } from '../src/wizard/WizardContext'
import type { WizardState } from '../src/wizard/types'

/**
 * Routes that render outside the auth gate entirely - no session, no
 * unlocked encryption key required. Right now just the email-confirmation
 * landing page: a visitor arriving there has a fresh Supabase session (from
 * clicking the link) but hasn't entered their password yet to derive an
 * encryption key, so `isUnlocked` is false and AuthGate would otherwise
 * show the sign-in screen instead of the confirmation page.
 */
const PUBLIC_ROUTES = ['/account-created']

/**
 * Sends a resume-less account straight to Account Settings, once, right as
 * they come in (fresh sign-in, a confirmed sign-up, or unlocking a
 * remembered session) - not a persistent guard, so navigating away from
 * Account Settings afterward without adding one doesn't bounce them back.
 * The empty dependency array is deliberate: this should read state exactly
 * once, at the moment this mounts (which only happens once per unlock,
 * since WizardProvider itself doesn't remount across client-side
 * navigations within the same sign-in session).
 */
function RequireResumeGate({ children }: { children: ReactNode }) {
  const { state } = useWizard()
  const router = useRouter()
  const pathname = usePathname()
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    if (!state.resume.fileName && pathname !== '/account') {
      router.replace('/account')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}

/** Shows the auth screen until signed in AND the encryption key is unlocked. */
function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isUnlocked, hydratedState } = useAuth()

  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>

  if (!isUnlocked) return <AuthScreen />

  return (
    <WizardProvider initialState={hydratedState as Partial<WizardState> | null}>
      <RequireResumeGate>{children}</RequireResumeGate>
    </WizardProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </ThemeProvider>
  )
}
