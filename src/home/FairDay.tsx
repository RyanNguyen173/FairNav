import { CalendarBlank } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { Button } from '../components/Button'
import { Step6FairModeHUD } from '../steps/Step6FairModeHUD'
import type { FairProfile } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

/** Matched, has pitches ready, not already live - one tap away from Fair Mode. */
function readyFairs(fairProfiles: FairProfile[]): FairProfile[] {
  return fairProfiles.filter(
    (fair) => fair.companies.length > 0 && Object.keys(fair.prep).length > 0 && !fair.fairMode.active,
  )
}

/** Home's live "today" view - the actual Fair Mode HUD for whichever fair is active, or a prompt to start one. */
export function FairDay() {
  const { state, dispatch } = useWizard()
  const liveFair = state.fairProfiles.find((fair) => fair.fairMode.active)

  // Step6FairModeHUD reads the wizard's active fair, not a fair passed
  // directly to it - make sure they agree before it renders.
  useEffect(() => {
    if (liveFair && state.activeFairId !== liveFair.id) {
      dispatch({ type: 'SET_ACTIVE_FAIR', id: liveFair.id })
    }
  }, [liveFair, state.activeFairId, dispatch])

  if (liveFair && state.activeFairId === liveFair.id) {
    return <Step6FairModeHUD />
  }

  const ready = readyFairs(state.fairProfiles)

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5 md:max-w-5xl md:px-8">
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <CalendarBlank size={28} weight="regular" className="text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No fair is live right now</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Once a fair has matched companies and generated pitches, enter Fair Mode to see its live route and prep here.
        </p>
      </div>

      {ready.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Ready to start</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ready.map((fair) => (
              <div key={fair.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-[15px] font-bold text-card-foreground">{fair.name || 'Untitled fair'}</p>
                <Button
                  fullWidth
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_FAIR', id: fair.id })
                    dispatch({ type: 'ENTER_FAIR_MODE' })
                  }}
                >
                  Enter Fair Mode
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
