import {
  Briefcase,
  Buildings,
  ChatCircleDots,
  Check,
  Copy,
  DotsSixVertical,
  GraduationCap,
  Heart,
  Lightbulb,
  MapPin,
  Tag,
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BoothNumbers } from '../components/BoothNumbers'
import { Button } from '../components/Button'
import { FairSubNav } from '../components/FairSubNav'
import { Header } from '../components/Header'
import { ResearchList } from '../components/ResearchList'
import { SectionCard, StepShell } from '../components/StepShell'
import { useActiveFair, useWizard } from '../wizard/WizardContext'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied (permissions, insecure context) -
      // silently no-op rather than showing an error for a non-critical action.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? (
        <Check size={13} weight="bold" aria-hidden="true" />
      ) : (
        <Copy size={13} weight="bold" aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function Step5CompanyBriefs() {
  const { dispatch } = useWizard()
  const router = useRouter()
  const fair = useActiveFair()
  const { companies, selectedCompanyIds, prep } = fair
  const enterFairMode = () => {
    dispatch({ type: 'ENTER_FAIR_MODE' })
    // A fresh entry into Fair Day restores Home's normal auto-jump-when-live
    // behavior, in case an earlier "Back to dashboard" had suppressed it.
    sessionStorage.removeItem('fairnav-suppress-auto-fairday')
    router.push('/fair-day')
  }
  const selectedCompanies = selectedCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is (typeof companies)[number] => Boolean(c))
  const [activeId, setActiveId] = useState(selectedCompanies[0]?.id)
  const activeCompany = selectedCompanies.find((c) => c.id === activeId) ?? selectedCompanies[0]
  const activePrep = activeCompany ? prep[activeCompany.id] : undefined

  // Drag-to-reorder for the queue below: a dedicated handle (not the whole
  // chip, which already selects the active company on click) drives it via
  // Pointer Events, so it works the same on touch and mouse without any new
  // dependency. The container is a horizontal scroller on mobile and a
  // vertical list on desktop (md:flex-col) - `axis` is read from the
  // container's actual computed flex-direction at drag start so the same
  // logic drives both.
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const dragRef = useRef<{ id: string; axis: 'x' | 'y'; start: number; pointerId: number } | null>(null)
  const flipSnapshotRef = useRef<Map<string, DOMRect> | null>(null)

  useLayoutEffect(() => {
    const snapshot = flipSnapshotRef.current
    if (!snapshot) return
    flipSnapshotRef.current = null
    snapshot.forEach((before, id) => {
      const el = rowRefs.current.get(id)
      if (!el) return
      const after = el.getBoundingClientRect()
      const dx = before.left - after.left
      const dy = before.top - after.top
      if (dx === 0 && dy === 0) return
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`
      requestAnimationFrame(() => {
        el.style.transition = ''
        el.style.transform = ''
      })
    })
  })

  const moveSelectedCompany = (id: string, delta: number) => {
    const from = selectedCompanyIds.indexOf(id)
    if (from === -1) return
    dispatch({ type: 'REORDER_SELECTED_COMPANY', id, toIndex: from + delta })
  }

  const handlePointerDown = (id: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const container = listRef.current
    if (!container) return
    const axis = getComputedStyle(container).flexDirection === 'column' ? 'y' : 'x'
    dragRef.current = { id, axis, start: axis === 'y' ? event.clientY : event.clientX, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
    const row = rowRefs.current.get(id)
    if (row) row.style.zIndex = '10'
    event.preventDefault()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const row = rowRefs.current.get(drag.id)
    const container = listRef.current
    if (!row || !container) return

    const client = drag.axis === 'y' ? event.clientY : event.clientX
    const delta = client - drag.start
    row.style.transform = drag.axis === 'y' ? `translateY(${delta}px)` : `translateX(${delta}px)`

    const rows = Array.from(container.children) as HTMLDivElement[]
    const myIndex = rows.findIndex((el) => el.dataset.companyId === drag.id)
    const myRect = row.getBoundingClientRect()
    const myMid = drag.axis === 'y' ? myRect.top + myRect.height / 2 : myRect.left + myRect.width / 2

    for (let i = 0; i < rows.length; i++) {
      const other = rows[i]
      if (other.dataset.companyId === drag.id) continue
      const rect = other.getBoundingClientRect()
      const mid = drag.axis === 'y' ? rect.top + rect.height / 2 : rect.left + rect.width / 2
      const crossed = (i < myIndex && myMid < mid) || (i > myIndex && myMid > mid)
      if (!crossed) continue

      const before = new Map<string, DOMRect>()
      rows.forEach((el) => {
        const cid = el.dataset.companyId
        if (cid && cid !== drag.id) before.set(cid, el.getBoundingClientRect())
      })
      flipSnapshotRef.current = before
      dispatch({ type: 'REORDER_SELECTED_COMPANY', id: drag.id, toIndex: i })
      break
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const row = rowRefs.current.get(drag.id)
    if (row) {
      row.style.transform = ''
      row.style.zIndex = ''
    }
    dragRef.current = null
  }

  return (
    <>
      <Header title="Briefs &amp; pitch prep" onBack={() => router.push('/matches')} />
      <FairSubNav fair={fair} />
      <StepShell
        footer={
          <Button fullWidth onClick={enterFairMode}>
            Enter Live Fair Mode
          </Button>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Review your personalized pitch and questions for each company before you walk the floor.
        </p>

        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
          <div
            ref={listRef}
            className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mb-0 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0"
            role="tablist"
            aria-label="Selected companies"
          >
            {selectedCompanies.map((company, index) => {
              const selected = company.id === activeCompany?.id
              return (
                <div
                  key={company.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(company.id, el)
                    else rowRefs.current.delete(company.id)
                  }}
                  data-company-id={company.id}
                  className="flex shrink-0 items-center gap-1 md:w-full"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveId(company.id)}
                    className={[
                      'min-h-9 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'md:w-full md:flex-1 md:text-left md:rounded-xl',
                      selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card text-card-foreground',
                    ].join(' ')}
                  >
                    <span className="mr-1.5 opacity-70">{index + 1}.</span>
                    {company.companyName || 'Unlisted company'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Reorder ${company.companyName || 'company'} - drag, or use arrow keys`}
                    onPointerDown={handlePointerDown(company.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                        event.preventDefault()
                        moveSelectedCompany(company.id, -1)
                      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                        event.preventDefault()
                        moveSelectedCompany(company.id, 1)
                      }
                    }}
                    style={{ touchAction: 'none' }}
                    className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <DotsSixVertical size={16} weight="bold" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>

          {activeCompany && activePrep && (
            <div role="tabpanel">
              <div className="mb-5">
                <BoothNumbers boothNumbers={activeCompany.boothNumbers} />
                <h2 className="text-lg font-bold text-foreground">{activeCompany.companyName || 'Unlisted company'}</h2>
              </div>

              <div className="mb-5">
                <SectionCard>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Buildings size={16} weight="fill" className="text-accent-ink" aria-hidden="true" />
                    Company overview
                  </h3>
                  <p className="text-sm leading-relaxed text-card-foreground">
                    {activePrep.overview || 'Not found.'}
                  </p>
                </SectionCard>
              </div>

              <div className="mb-5 grid gap-5 md:grid-cols-2">
                <ResearchList icon={MapPin} label="Locations" items={activePrep.locations} />
                <ResearchList icon={Heart} label="Company values" items={activePrep.values} />
                <ResearchList icon={Tag} label="Industries" items={activePrep.industries} />
                <ResearchList icon={GraduationCap} label="Majors they hire" items={activePrep.majors} />
                <ResearchList icon={Briefcase} label="Open positions" items={activePrep.positions} />
              </div>

              <div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
                <SectionCard>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb size={16} weight="fill" className="text-accent-ink" aria-hidden="true" />
                      Tailored elevator pitch
                    </h3>
                    <CopyButton text={activePrep.elevatorPitch} />
                  </div>
                  <p className="text-sm leading-relaxed text-card-foreground">{activePrep.elevatorPitch}</p>
                </SectionCard>

                <SectionCard>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ChatCircleDots size={16} weight="fill" className="text-primary" aria-hidden="true" />
                    Strategic recruiter questions
                  </h3>
                  <ul className="space-y-2.5">
                    {activePrep.questions.map((question, index) => (
                      <li key={index} className="text-sm leading-relaxed text-card-foreground">
                        {question}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </div>
            </div>
          )}
        </div>
      </StepShell>
    </>
  )
}
