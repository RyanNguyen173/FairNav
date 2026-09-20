import { Briefcase, CaretLeft, ChatCircleDots, GraduationCap, Heart, Lightbulb, MapPin, Tag } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BoothNumbers } from '../components/BoothNumbers'
import { Button } from '../components/Button'
import { Header } from '../components/Header'
import { MatchBadge } from '../components/MatchBadge'
import { ResearchList } from '../components/ResearchList'
import { FieldLabel, SectionCard, StepShell } from '../components/StepShell'
import type { Company } from '../wizard/types'
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

/**
 * Walks one company at a time (Prev/Next) instead of a scrolling queue -
 * the company currently shown is persisted on the fair itself
 * (fairMode.currentCompanyId), so leaving and coming back resumes here
 * instead of restarting at the first company.
 */
export function Step6FairModeHUD() {
  const { dispatch } = useWizard()
  const router = useRouter()
  const fair = useActiveFair()
  const { name, companies, selectedCompanyIds, prep, fairMode } = fair
  const title = name || 'Untitled fair'

  const queue = selectedCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is Company => Boolean(c))
  const visitedCount = queue.filter((c) => fairMode.companyState[c.id]?.visited).length
  const elapsed = useElapsedTime(fairMode.startedAt)

  const persistedIndex = queue.findIndex((c) => c.id === fairMode.currentCompanyId)
  const index = persistedIndex === -1 ? 0 : persistedIndex
  const company = queue[index] ?? null
  const companyPrep = company ? prep[company.id] : undefined
  const isVisited = company ? Boolean(fairMode.companyState[company.id]?.visited) : false

  // Ends the live session (both exits below use this) and lands on the Fair
  // Day tab - the normal "I'm done for now" exit.
  const exitToFairDay = () => {
    dispatch({ type: 'EXIT_FAIR_MODE' })
    sessionStorage.setItem('fairnav-home-tab', 'day')
    sessionStorage.removeItem('fairnav-suppress-auto-fairday')
    router.push('/')
  }
  // Backing out before the first company means "let me reconfigure this
  // fair," not "show me every fair" - go straight to its own board (Details/
  // Matches/Briefs), not the shared Fair Board tab.
  const exitToThisFairsBoard = () => {
    dispatch({ type: 'EXIT_FAIR_MODE' })
    router.push('/fair')
  }

  const goPrev = () => {
    if (index === 0) return exitToThisFairsBoard()
    dispatch({ type: 'SET_FAIR_MODE_COMPANY', id: queue[index - 1].id })
  }
  const goNext = () => {
    if (index === queue.length - 1) return exitToFairDay()
    dispatch({ type: 'SET_FAIR_MODE_COMPANY', id: queue[index + 1].id })
  }
  const toggleVisited = () => {
    if (!company) return
    dispatch({ type: 'SET_VISITED', id: company.id, visited: !isVisited })
  }

  if (!company) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title={title} onBack={exitToFairDay} />
        <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-8 text-center md:max-w-2xl md:px-8">
          <p className="text-sm text-muted-foreground">No companies selected for this fair yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title={title} onBack={exitToFairDay} />

      <div className="border-b border-border bg-background px-4 py-3 md:px-8">
        <div className="mx-auto max-w-md md:max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-subtle">Fair mode · {elapsed}</p>
          <p className="text-sm font-semibold text-foreground">
            {visitedCount} of {queue.length} visited
          </p>
        </div>
      </div>

      <StepShell
        footer={
          <div className="flex flex-col gap-3">
            <Button variant="secondary" fullWidth onClick={toggleVisited}>
              {isVisited ? 'Unvisit' : 'Mark as Visited'}
            </Button>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                icon={<CaretLeft size={15} weight="bold" aria-hidden="true" />}
                onClick={goPrev}
              >
                {index === 0 ? 'Back to fair board' : 'Previous'}
              </Button>
              <Button onClick={goNext}>{index === queue.length - 1 ? 'Finish' : 'Next company'}</Button>
            </div>
          </div>
        }
      >
        <div className="mx-auto w-full max-w-2xl">
          <div className={['flex flex-col gap-5 transition-opacity duration-150', isVisited ? 'opacity-60' : ''].join(' ')}>
            <SectionCard>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <BoothNumbers boothNumbers={company.boothNumbers} />
                  <h2 className="text-lg font-bold text-foreground">{company.companyName || 'Unlisted company'}</h2>
                </div>
                <MatchBadge percent={company.matchScore} />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Company overview</h3>
              <p className="text-sm leading-relaxed text-card-foreground">
                {companyPrep?.overview || 'No brief generated yet for this company.'}
              </p>
            </SectionCard>

            {companyPrep && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <ResearchList icon={MapPin} label="Locations" items={companyPrep.locations} />
                  <ResearchList icon={Heart} label="Company values" items={companyPrep.values} />
                  <ResearchList icon={Tag} label="Industries" items={companyPrep.industries} />
                  <ResearchList icon={GraduationCap} label="Majors they hire" items={companyPrep.majors} />
                  <ResearchList icon={Briefcase} label="Possible positions" items={companyPrep.positions} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SectionCard>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb size={16} weight="fill" className="text-accent-ink" aria-hidden="true" />
                      Why this company fits you
                    </h3>
                    <p className="text-sm leading-relaxed text-card-foreground">{companyPrep.elevatorPitch}</p>
                  </SectionCard>
                  <SectionCard>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ChatCircleDots size={16} weight="fill" className="text-primary" aria-hidden="true" />
                      Strategic recruiter questions
                    </h3>
                    <ul className="space-y-2">
                      {companyPrep.questions.map((question, i) => (
                        <li key={i} className="text-sm leading-relaxed text-card-foreground">
                          {question}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </div>
              </>
            )}

            <SectionCard>
              <FieldLabel htmlFor="fm-notes">Your notes</FieldLabel>
              <textarea
                id="fm-notes"
                rows={3}
                value={fairMode.companyState[company.id]?.note ?? ''}
                onChange={(event) => dispatch({ type: 'SET_NOTE', id: company.id, note: event.target.value })}
                placeholder="Talking points, follow-ups, who you spoke with…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </SectionCard>
          </div>
        </div>
      </StepShell>
    </div>
  )
}
