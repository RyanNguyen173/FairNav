'use client'

import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../src/auth/AuthContext'
import { AuthScreen } from '../src/auth/AuthScreen'
import { ThemeProvider } from '../src/theme/ThemeContext'
import { WizardProvider } from '../src/wizard/WizardContext'
import type { WizardState } from '../src/wizard/types'

/** Shows the auth screen until signed in AND the encryption key is unlocked. */
function AuthGate({ children }: { children: ReactNode }) {
  const { isUnlocked, hydratedState } = useAuth()

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
