import { CheckCircle, SignOut } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { RouteMap } from '../components/RouteMap'
import { SectionCard } from '../components/StepShell'
import { ThemeToggle } from '../components/ThemeToggle'
import { STEP_ROUTES, type Company } from '../wizard/types'
import { useActiveFair, useWizard } from '../wizard/WizardContext'

function useElapsedTime(startedAt: number | null) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const tick = () => setElapsedMs(Date.now() - startedAt)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function QueueCard({
  company,
  position,
  visited,
  note,
  onOpenDetails,
  onMarkVisited,
  onNoteChange,
}: {
  company: Company
  position: number | null
  visited: boolean
  note: string
  onOpenDetails: () => void
  onMarkVisited: () => void
  onNoteChange: (value: string) => void
}) {
  return (
    <SectionCard className={visited ? 'opacity-70' : ''}>
      <button type="button" onClick={onOpenDetails} className="flex w-full cursor-pointer items-start gap-3 text-left">
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            visited ? 'bg-muted text-muted-foreground' : 'bg-primary text-on-primary',
          ].join(' ')}
        >
          {visited ? <CheckCircle size={16} weight="fill" aria-hidden="true" /> : position}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-card-foreground">{company.companyName}</span>
          <span className="block text-xs text-muted-foreground">
            Booth {company.boothNumber} · {company.matchScore}% match
          </span>
        </span>
      </button>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Quick notes</span>
        <textarea
          rows={2}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Jot down what you talked about…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {!visited && (
        <Button variant="secondary" fullWidth className="mt-3" onClick={onMarkVisited}>
          Mark as Visited
        </Button>
      )}
    </SectionCard>
  )
}

function PitchDetails({ company, pitch }: { company: Company; pitch: { elevatorPitch: string; questions: string[] } }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Booth {company.boothNumber}</p>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Elevator pitch</h3>
        <p className="text-sm leading-relaxed text-card-foreground">{pitch.elevatorPitch}</p>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Questions to ask</h3>
        <ul className="space-y-2">
          {pitch.questions.map((question, index) => (
            <li key={index} className="text-sm leading-relaxed text-card-foreground">
              {question}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Step6FairModeHUD() {
  const { dispatch } = useWizard()
  const router = useRouter()
  const { companies, selectedCompanyIds, prep, fairMode } = useActiveFair()
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const exitFairMode = () => {
    dispatch({ type: 'EXIT_FAIR_MODE' })
    router.push(STEP_ROUTES[5])
  }

  const queue = companies.filter((c) => selectedCompanyIds.includes(c.id))
  const unvisitedQueue = queue.filter((c) => !fairMode.companyState[c.id]?.visited)
  const visitedCount = queue.length - unvisitedQueue.length
  const elapsed = useElapsedTime(fairMode.startedAt)
  // Mobile bottom sheet only opens on an explicit tap.
  const detailsCompany = queue.find((c) => c.id === detailsId) ?? null
  const detailsPrep = detailsCompany ? prep[detailsCompany.id] : undefined
  // Desktop side panel always shows something - defaults to the first booth
  // in the queue until the visitor picks a different one.
  const activeCompany = queue.find((c) => c.id === detailsId) ?? queue[0] ?? null
  const activePrep = activeCompany ? prep[activeCompany.id] : undefined

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 md:max-w-5xl">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Fair Mode · {elapsed}</p>
            <p className="text-sm font-bold text-foreground">
              {visitedCount} of {queue.length} Visited
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={exitFairMode}
              aria-label="Exit Fair Mode"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SignOut size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-4 md:max-w-5xl md:px-8">
        <div className="md:grid md:grid-cols-[1fr_340px] md:items-start md:gap-6">
          <div>
            <div className="mb-5 h-56">
              <RouteMap
                allCompanies={companies}
                queue={queue}
                visitedIds={new Set(queue.filter((c) => fairMode.companyState[c.id]?.visited).map((c) => c.id))}
              />
            </div>

            <h2 className="mb-3 text-sm font-semibold text-foreground">Your route</h2>
            <div className="space-y-3">
              {queue.map((company) => {
                const companyState = fairMode.companyState[company.id]
                const visited = Boolean(companyState?.visited)
                const position = visited ? null : unvisitedQueue.findIndex((c) => c.id === company.id) + 1
                return (
                  <QueueCard
                    key={company.id}
                    company={company}
                    position={position}
                    visited={visited}
                    note={companyState?.note ?? ''}
                    onOpenDetails={() => setDetailsId(company.id)}
                    onMarkVisited={() => dispatch({ type: 'MARK_VISITED', id: company.id })}
                    onNoteChange={(value) => dispatch({ type: 'SET_NOTE', id: company.id, note: value })}
                  />
                )
              })}
            </div>
          </div>

          <div className="sticky top-24 mt-6 hidden rounded-2xl border border-border bg-card p-4 md:mt-0 md:block">
            {activeCompany && activePrep ? (
              <>
                <h2 className="mb-3 text-sm font-bold text-foreground">{activeCompany.companyName}</h2>
                <PitchDetails company={activeCompany} pitch={activePrep} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a booth to see its pitch script and questions.</p>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <BottomSheet open={Boolean(detailsCompany)} title={detailsCompany?.companyName ?? ''} onClose={() => setDetailsId(null)}>
          {detailsCompany && detailsPrep && <PitchDetails company={detailsCompany} pitch={detailsPrep} />}
        </BottomSheet>
      </div>
    </div>
  )
}
