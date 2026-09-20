import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '../components/Button'
import type { FairProfile } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'
import { computeFairStatus, dayDelta, TAG_CLASS } from './fairUtils'

/** Has a queue to walk, isn't already live. Briefs are optional (generated on demand), so this only needs a selection, not generated prep. */
function readyFairs(fairProfiles: FairProfile[]): FairProfile[] {
  return fairProfiles.filter((fair) => fair.selectedCompanyIds.length > 0 && !fair.fairMode.active)
}

function startFairMode(
  dispatch: ReturnType<typeof useWizard>['dispatch'],
  router: ReturnType<typeof useRouter>,
  fair: FairProfile,
) {
  dispatch({ type: 'SET_ACTIVE_FAIR', id: fair.id })
  dispatch({ type: 'ENTER_FAIR_MODE' })
  sessionStorage.removeItem('fairnav-suppress-auto-fairday')
  router.push('/fair-day')
}

function DayCardMeta({ fair }: { fair: FairProfile }) {
  const count = fair.selectedCompanyIds.length
  return (
    <>
      <div className="text-sm leading-relaxed text-muted-foreground">{fair.location || 'Location not set'}</div>
      <div className="text-xs text-muted-foreground">
        {count} compan{count === 1 ? 'y' : 'ies'} to visit
      </div>
    </>
  )
}

function LiveCard({ fair }: { fair: FairProfile }) {
  const { dispatch } = useWizard()
  const router = useRouter()
  return (
    <div className="fn-card flex flex-col gap-2.5 rounded-2xl bg-card p-6 shadow-hairline">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[19px] font-semibold leading-[1.25] tracking-[-0.03em] text-card-foreground">
          {fair.name || 'Untitled fair'}
        </div>
        <span className={[TAG_CLASS, 'gap-1.5 bg-destructive/10 text-destructive'].join(' ')}>
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
          Live
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        <DayCardMeta fair={fair} />
        <Button fullWidth onClick={() => startFairMode(dispatch, router, fair)}>
          Continue fair mode
        </Button>
      </div>
    </div>
  )
}

function UpcomingCard({ fair }: { fair: FairProfile }) {
  const { dispatch } = useWizard()
  const router = useRouter()
  const delta = fair.date ? dayDelta(fair.date) : null
  const countdown = delta === null ? '' : delta > 0 ? `In ${delta} days` : delta === 0 ? 'Today' : `${Math.abs(delta)} days ago`
  return (
    <div className="fn-card flex h-full flex-col gap-2.5 rounded-2xl bg-card p-6 shadow-hairline">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[19px] font-semibold leading-[1.25] tracking-[-0.03em] text-card-foreground">
          {fair.name || 'Untitled fair'}
        </div>
        {countdown && <span className={[TAG_CLASS, 'bg-surface text-muted-foreground shadow-hairline'].join(' ')}>{countdown}</span>}
      </div>
      <DayCardMeta fair={fair} />
      <Button variant="accent" fullWidth className="mt-1" onClick={() => startFairMode(dispatch, router, fair)}>
        Start fair mode
      </Button>
    </div>
  )
}

function CompletedCard({ fair }: { fair: FairProfile }) {
  const { dispatch } = useWizard()
  const router = useRouter()
  return (
    <div className="fn-card flex flex-col gap-2.5 rounded-2xl bg-card p-6 shadow-hairline">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[19px] font-semibold leading-[1.25] tracking-[-0.03em] text-ink-subtle">
          {fair.name || 'Untitled fair'}
        </div>
        <span className={[TAG_CLASS, 'bg-success text-on-success'].join(' ')}>Completed</span>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        <DayCardMeta fair={fair} />
        <Button variant="secondary" fullWidth onClick={() => startFairMode(dispatch, router, fair)}>
          Start fair mode
        </Button>
      </div>
    </div>
  )
}

/**
 * Home's "Fair day" tab - a Live now / Upcoming / Completed board, or the
 * empty prompt when nothing is live. The live HUD itself lives at
 * /fair-day (its own page, like Details/Matches/Briefs), so a fair that's
 * already active just bounces there instead of rendering inline.
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
  const upcoming = ready.filter((fair) => computeFairStatus(fair) !== 'completed')
  const completed = ready.filter((fair) => computeFairStatus(fair) === 'completed')

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5 md:max-w-5xl md:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">Live now</div>
          {liveFair ? (
            <div className="fn-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <LiveCard fair={liveFair} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-16 text-center shadow-hairline">
              <img src="/logo-cat.png" alt="" className="h-14 w-14 object-contain" />
              <p className="text-lg font-medium tracking-[-0.02em] text-foreground">Nothing live right now</p>
              <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
                Fair day opens once a fair you have prepared reaches its date - or start one early below.
              </p>
            </div>
          )}
        </div>

        {upcoming.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">Upcoming</div>
            <div className="fn-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((fair) => (
                <UpcomingCard key={fair.id} fair={fair} />
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">Completed</div>
            <div className="fn-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((fair) => (
                <CompletedCard key={fair.id} fair={fair} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
