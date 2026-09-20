'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../src/auth/AuthContext'
import { AuthScreen } from '../src/auth/AuthScreen'
import { ThemeProvider } from '../src/theme/ThemeContext'
import { WizardProvider } from '../src/wizard/WizardContext'
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

/** Shows the auth screen until signed in AND the encryption key is unlocked. */
function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isUnlocked, hydratedState } = useAuth()

  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>

  if (!isUnlocked) return <AuthScreen />

  return (
    <WizardProvider initialState={hydratedState as Partial<WizardState> | null}>{children}</WizardProvider>
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
