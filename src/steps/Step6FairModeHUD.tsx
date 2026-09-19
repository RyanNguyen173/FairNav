import { CheckCircle, SignOut } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { RouteMap } from '../components/RouteMap'
import { SectionCard } from '../components/StepShell'
import { ThemeToggle } from '../components/ThemeToggle'
import type { Company } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

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
          <span className="block truncate text-[15px] font-bold text-card-foreground">{company.name}</span>
          <span className="block text-xs text-muted-foreground">
            Booth {company.boothNumber} · {company.matchPercent}% match
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

export function Step6FairModeHUD() {
  const { state, dispatch } = useWizard()
  const { companies, selectedCompanyIds, prep, fairMode } = state
  const [detailsId, setDetailsId] = useState<string | null>(null)

  const queue = companies.filter((c) => selectedCompanyIds.includes(c.id))
  const unvisitedQueue = queue.filter((c) => !fairMode.companyState[c.id]?.visited)
  const visitedCount = queue.length - unvisitedQueue.length
  const elapsed = useElapsedTime(fairMode.startedAt)
  const detailsCompany = queue.find((c) => c.id === detailsId) ?? null
  const detailsPrep = detailsCompany ? prep[detailsCompany.id] : undefined

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
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
              onClick={() => dispatch({ type: 'EXIT_FAIR_MODE' })}
              aria-label="Exit Fair Mode"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SignOut size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-4">
        <div className="mb-5 h-56">
          <RouteMap allCompanies={companies} queue={queue} visitedIds={new Set(queue.filter((c) => fairMode.companyState[c.id]?.visited).map((c) => c.id))} />
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

      <BottomSheet open={Boolean(detailsCompany)} title={detailsCompany?.name ?? ''} onClose={() => setDetailsId(null)}>
        {detailsCompany && detailsPrep && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Booth {detailsCompany.boothNumber}</p>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Elevator pitch</h3>
              <ul className="space-y-2">
                {detailsPrep.talkingPoints.map((point, index) => (
                  <li key={index} className="text-sm leading-relaxed text-card-foreground">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Questions to ask</h3>
              <ul className="space-y-2">
                {detailsPrep.questions.map((question, index) => (
                  <li key={index} className="text-sm leading-relaxed text-card-foreground">
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
