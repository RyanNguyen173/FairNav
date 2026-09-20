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
import { generatePreps } from '../wizard/aiEngine'
import type { Company } from '../wizard/types'
import { useActiveFair, useWizard } from '../wizard/WizardContext'

/** An element's true resting position, ignoring any in-flight animation transform (e.g. a FLIP still mid-flight). */
function naturalRect(el: HTMLElement): DOMRect {
  const saved = el.style.transform
  el.style.transform = ''
  const rect = el.getBoundingClientRect()
  el.style.transform = saved
  return rect
}

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
  const { state, dispatch } = useWizard()
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

  // Briefs are generated per-company, on demand, rather than all at once for
  // every selected company - a student may only want to spend the AI call on
  // the companies they're actually prioritizing.
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const handleGenerateBrief = async (company: Company) => {
    setGeneratingId(company.id)
    setGenerateError(null)
    try {
      const result = await generatePreps(state.profile, [company])
      dispatch({ type: 'PREP_GENERATED', prep: result })
    } catch (error) {
      console.error('Brief generation failed:', error)
      setGenerateError("Couldn't generate this brief - check your connection and try again.")
    } finally {
      setGeneratingId(null)
    }
  }

  // Drag-to-reorder for the queue below: a dedicated handle (not the whole
  // chip, which already selects the active company on click) drives it via
  // Pointer Events, so it works the same on touch and mouse without any new
  // dependency. The queue is a vertical list at every width (see the
  // container's className below), so this only ever needs to track the
  // vertical axis.
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const dragRef = useRef<{ id: string; start: number; lastClient: number; pointerId: number } | null>(null)
  const flipSnapshotRef = useRef<Map<string, DOMRect> | null>(null)

  // How much the dragged row has to overlap a neighbor - as a fraction of
  // that neighbor's own height - before they swap places. Higher than a
  // bare majority so a swap only fires once the dragged row is clearly
  // sitting on top of the other chip, not the instant their midpoints cross.
  const SWAP_OVERLAP_THRESHOLD = 0.7

  useLayoutEffect(() => {
    const snapshot = flipSnapshotRef.current
    if (!snapshot) return
    flipSnapshotRef.current = null
    const drag = dragRef.current

    snapshot.forEach((before, id) => {
      const el = rowRefs.current.get(id)
      if (!el) return

      // The dragged row itself reordering moves its own untransformed slot,
      // so its existing translateY(delta) - measured against the OLD slot -
      // would make it jump instead of keep tracking the pointer. Recompute
      // the transform against the row's new slot (rather than resetting it
      // to identity like the other, merely-displaced rows below), and
      // recalibrate `start` so the next raw pointermove delta stays
      // continuous with this corrected value.
      if (drag && id === drag.id) {
        el.style.transition = 'none'
        el.style.transform = ''
        const natural = el.getBoundingClientRect()
        const corrected = before.top - natural.top
        el.style.transform = `translateY(${corrected}px)`
        drag.start = drag.lastClient - corrected
        requestAnimationFrame(() => {
          el.style.transition = ''
        })
        return
      }

      const after = el.getBoundingClientRect()
      const dy = before.top - after.top
      if (dy === 0) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
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

  // Listeners live on window, not the handle button itself: a drag spans
  // several REORDER dispatches, each re-rendering the list, and a captured
  // pointer can silently lose capture across that (the browser fires
  // lostpointercapture, not pointerup) - leaving cleanup stuck forever and
  // the dragged row frozen mid-air with its transform never cleared. Window
  // listeners don't depend on any one row surviving the re-renders.
  const handlePointerDown = (id: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragRef.current) return
    const container = listRef.current
    if (!container) return
    const pointerId = event.pointerId
    dragRef.current = { id, start: event.clientY, lastClient: event.clientY, pointerId }
    const row = rowRefs.current.get(id)
    if (row) row.style.zIndex = '10'
    event.preventDefault()

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== moveEvent.pointerId) return
      const draggedRow = rowRefs.current.get(drag.id)
      if (!draggedRow || !container) return

      drag.lastClient = moveEvent.clientY
      const delta = moveEvent.clientY - drag.start
      const rows = Array.from(container.children) as HTMLDivElement[]

      // Clamp to the range the chips themselves occupy - the row's natural
      // (untransformed) top plus delta can't go above the first chip or
      // below the last one. This is deliberately the first/last ROW's own
      // bounds, not the list container's: on desktop the container is a
      // grid item next to the (often much taller) details panel, and grid
      // items stretch to fill their row's height by default, so the
      // container's own rect reaches well past the actual last chip.
      const natural = naturalRect(draggedRow)
      const topBound = naturalRect(rows[0]).top
      const bottomBound = naturalRect(rows[rows.length - 1]).bottom
      const desiredTop = natural.top + delta
      const clampedTop = Math.min(Math.max(desiredTop, topBound), bottomBound - natural.height)
      draggedRow.style.transform = `translateY(${clampedTop - natural.top}px)`

      const myRect = draggedRow.getBoundingClientRect()

      for (let i = 0; i < rows.length; i++) {
        const other = rows[i]
        if (other.dataset.companyId === drag.id) continue
        // A row mid-FLIP still carries its transient "make it look like the
        // old slot" transform until its own requestAnimationFrame clears it
        // - a pointermove landing before that frame would otherwise read its
        // stale visual offset as if it were the row's real slot, causing the
        // dragged row to swap back and forth on every step. Measure the
        // row's true resting position with any in-flight transform stripped.
        const rect = naturalRect(other)

        const overlapTop = Math.max(myRect.top, rect.top)
        const overlapBottom = Math.min(myRect.bottom, rect.bottom)
        const overlapRatio = rect.height > 0 ? Math.max(0, overlapBottom - overlapTop) / rect.height : 0
        if (overlapRatio < SWAP_OVERLAP_THRESHOLD) continue

        const before = new Map<string, DOMRect>()
        rows.forEach((el) => {
          const cid = el.dataset.companyId
          if (!cid) return
          before.set(cid, cid === drag.id ? el.getBoundingClientRect() : naturalRect(el))
        })
        flipSnapshotRef.current = before
        dispatch({ type: 'REORDER_SELECTED_COMPANY', id: drag.id, toIndex: i })
        break
      }
    }

    const onUp = (upEvent: PointerEvent) => {
      if (dragRef.current?.pointerId !== upEvent.pointerId) return
      const draggedRow = rowRefs.current.get(id)
      if (draggedRow) {
        draggedRow.style.transform = ''
        draggedRow.style.zIndex = ''
      }
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <>
      <Header title="Briefs" onBack={() => router.push('/matches')} />
      <FairSubNav fair={fair} />
      <StepShell
        footer={
          <Button fullWidth onClick={enterFairMode}>
            Enter Live Fair Mode
          </Button>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Generate a personalized brief and questions for each company before you walk the floor.
        </p>

        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
          <div ref={listRef} className="mb-5 flex flex-col gap-2 md:mb-0" role="tablist" aria-label="Selected companies">
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
                  className="flex w-full items-center gap-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveId(company.id)}
                    className={[
                      'min-h-9 w-full flex-1 cursor-pointer rounded-xl border px-4 text-left text-sm font-semibold transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        moveSelectedCompany(company.id, -1)
                      } else if (event.key === 'ArrowDown') {
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

          {activeCompany && (
            <div role="tabpanel">
              <div className="mb-5">
                <BoothNumbers boothNumbers={activeCompany.boothNumbers} />
                <h2 className="text-lg font-bold text-foreground">{activeCompany.companyName || 'Unlisted company'}</h2>
              </div>

              {!activePrep ? (
                <SectionCard>
                  <p className="mb-3 text-sm text-muted-foreground">
                    No brief generated yet for this company.
                  </p>
                  {generateError && <p className="mb-3 text-sm text-destructive">{generateError}</p>}
                  <Button
                    disabled={generatingId !== null}
                    loading={generatingId === activeCompany.id}
                    onClick={() => handleGenerateBrief(activeCompany)}
                  >
                    Generate brief
                  </Button>
                </SectionCard>
              ) : (
                <>
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
                          Why this company fits you
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
                </>
              )}
            </div>
          )}
        </div>
      </StepShell>
    </>
  )
}
