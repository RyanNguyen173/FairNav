import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '../components/Button'
import type { FairProfile } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

/** Matched, has pitches ready, not already live - one tap away from Fair Mode. */
function readyFairs(fairProfiles: FairProfile[]): FairProfile[] {
  return fairProfiles.filter(
    (fair) => fair.companies.length > 0 && Object.keys(fair.prep).length > 0 && !fair.fairMode.active,
  )
}

/**
 * Home's "Fair day" tab - a prompt to start a fair, or the ready-to-start
 * list. The live HUD itself lives at /fair-day (its own page, like Details/
 * Matches/Briefs), so a fair that's already active just bounces there
 * instead of rendering inline.
 */
export function FairDay() {
  const { state, dispatch } = useWizard()
  const router = useRouter()
  const liveFair = state.fairProfiles.find((fair) => fair.fairMode.active)

  // Step6FairModeHUD reads the wizard's active fair, not a fair passed
  // directly to it - make sure they agree before sending the visitor there.
  useEffect(() => {
    if (!liveFair) return
    if (state.activeFairId !== liveFair.id) {
      dispatch({ type: 'SET_ACTIVE_FAIR', id: liveFair.id })
      return
    }
    router.push('/fair-day')
  }, [liveFair, state.activeFairId, dispatch, router])

  const ready = readyFairs(state.fairProfiles)

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5 md:max-w-5xl md:px-8">
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-16 text-center shadow-hairline">
        <img src="/logo-cat.png" alt="" className="h-14 w-14 object-contain" />
        <p className="text-lg font-medium tracking-[-0.02em] text-foreground">Nothing live right now</p>
        <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
          Fair day opens once a fair you have prepared reaches its date - or start one early from below.
        </p>
      </div>

      {ready.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Ready to start</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ready.map((fair) => (
              <div key={fair.id} className="rounded-2xl bg-card p-4 shadow-hairline">
                <p className="mb-3 text-[15px] font-semibold tracking-[-0.02em] text-card-foreground">
                  {fair.name || 'Untitled fair'}
                </p>
                <Button
                  fullWidth
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_FAIR', id: fair.id })
                    dispatch({ type: 'ENTER_FAIR_MODE' })
                    sessionStorage.removeItem('fairnav-suppress-auto-fairday')
                    router.push('/fair-day')
                  }}
                >
                  Start fair mode
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
