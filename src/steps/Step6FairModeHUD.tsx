import {
  Briefcase,
  Buildings,
  CaretDown,
  CaretUp,
  ChatCircleDots,
  CheckCircle,
  GraduationCap,
  Heart,
  Lightbulb,
  MapPin,
  SignOut,
  Tag,
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { ResearchList } from '../components/ResearchList'
import { SectionCard } from '../components/StepShell'
import type { Company, CompanyPrep } from '../wizard/types'
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

/** The same research fields shown on the Briefs page, reused here so "See more" never drifts out of sync with it. */
function CompanyResearch({ prep }: { prep: CompanyPrep }) {
  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <SectionCard>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Buildings size={14} weight="fill" className="text-accent-ink" aria-hidden="true" />
          Company overview
        </h4>
        <p className="text-sm leading-relaxed text-card-foreground">{prep.overview || 'Not found.'}</p>
      </SectionCard>
      <ResearchList icon={MapPin} label="Locations" items={prep.locations} />
      <ResearchList icon={Heart} label="Company values" items={prep.values} />
      <ResearchList icon={Tag} label="Industries" items={prep.industries} />
      <ResearchList icon={GraduationCap} label="Majors they hire" items={prep.majors} />
      <ResearchList icon={Briefcase} label="Open positions" items={prep.positions} />
      <SectionCard>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Lightbulb size={14} weight="fill" className="text-accent-ink" aria-hidden="true" />
          Tailored elevator pitch
        </h4>
        <p className="text-sm leading-relaxed text-card-foreground">{prep.elevatorPitch}</p>
      </SectionCard>
      <SectionCard>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ChatCircleDots size={14} weight="fill" className="text-primary" aria-hidden="true" />
          Strategic recruiter questions
        </h4>
        <ul className="space-y-2">
          {prep.questions.map((question, index) => (
            <li key={index} className="text-sm leading-relaxed text-card-foreground">
              {question}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

function QueueCard({
  company,
  prep,
  position,
  visited,
  note,
  onOpenDetails,
  onMarkVisited,
  onUnvisit,
  onNoteChange,
}: {
  company: Company
  prep: CompanyPrep | undefined
  position: number | null
  visited: boolean
  note: string
  onOpenDetails: () => void
  onMarkVisited: () => void
  onUnvisit: () => void
  onNoteChange: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

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
            Booth {company.boothNumbers.join(', ')} · {company.matchScore}% match
          </span>
        </span>
      </button>

      {prep && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'See less' : 'See more'}
          {expanded ? (
            <CaretUp size={12} weight="bold" aria-hidden="true" />
          ) : (
            <CaretDown size={12} weight="bold" aria-hidden="true" />
          )}
        </button>
      )}
      {expanded && prep && <CompanyResearch prep={prep} />}

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

      {visited ? (
        <Button variant="secondary" fullWidth className="mt-3" onClick={onUnvisit}>
          Unvisit
        </Button>
      ) : (
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
      <p className="text-xs text-muted-foreground">Booth {company.boothNumbers.join(', ')}</p>
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
    router.push('/briefs')
  }

  const queue = selectedCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is Company => Boolean(c))
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
          <button
            type="button"
            onClick={exitFairMode}
            aria-label="Exit Fair Mode"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SignOut size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-4 md:max-w-5xl md:px-8">
        <div className="md:grid md:grid-cols-[1fr_340px] md:items-start md:gap-6">
          <div>
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
                    prep={prep[company.id]}
                    position={position}
                    visited={visited}
                    note={companyState?.note ?? ''}
                    onOpenDetails={() => setDetailsId(company.id)}
                    onMarkVisited={() => dispatch({ type: 'SET_VISITED', id: company.id, visited: true })}
                    onUnvisit={() => dispatch({ type: 'SET_VISITED', id: company.id, visited: false })}
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
