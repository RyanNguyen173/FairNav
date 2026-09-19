'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { STEP_ROUTES } from '../src/wizard/types'
import { useWizard } from '../src/wizard/WizardContext'

/** No content of its own - resumes wherever the wizard was left off. */
export default function Home() {
  const { state } = useWizard()
  const router = useRouter()

  useEffect(() => {
    const target = state.fairMode.active ? STEP_ROUTES[6] : (STEP_ROUTES[state.step] ?? STEP_ROUTES[1])
    router.replace(target)
    // Intentionally one-time on mount - this redirects to wherever the user
    // left off, it shouldn't re-fire every time wizard state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
