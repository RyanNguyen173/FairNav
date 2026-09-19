'use client'

import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../src/auth/AuthContext'
import { AuthScreen } from '../src/auth/AuthScreen'
import { RecoveryKeyReveal } from '../src/auth/RecoveryKeyReveal'
import { ResetPasswordScreen } from '../src/auth/ResetPasswordScreen'
import { ThemeProvider } from '../src/theme/ThemeContext'
import { WizardProvider } from '../src/wizard/WizardContext'
import type { WizardState } from '../src/wizard/types'

/**
 * Gates every route behind, in order: a pending password-reset link (takes
 * over regardless of route - see AuthContext's passwordRecoveryPending),
 * then sign-in/unlock, then a one-time forced recovery-key save, then the
 * app itself.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const { isUnlocked, hydratedState, passwordRecoveryPending, pendingRecoveryKey } = useAuth()

  if (passwordRecoveryPending) return <ResetPasswordScreen />
  if (!isUnlocked) return <AuthScreen />
  if (pendingRecoveryKey) return <RecoveryKeyReveal recoveryKey={pendingRecoveryKey} />

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
