import { Buildings, Copy, DotsThree, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { FieldLabel, TextInput } from '../components/StepShell'
import type { FairProfile, FairStatus, TargetPosition } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

const STATUS_LABEL: Record<FairStatus, string> = {
  'in-progress': 'In progress',
  completed: 'Completed',
}

const STATUS_CLASS: Record<FairStatus, string> = {
  'in-progress': 'bg-surface text-muted-foreground shadow-hairline',
  completed: 'bg-success text-on-success',
}

/** In progress from the moment a fair is created; completed once every selected company has been visited. */
function computeFairStatus(fair: FairProfile): FairStatus {
  const visitedAll =
    fair.selectedCompanyIds.length > 0 &&
    fair.selectedCompanyIds.every((id) => fair.fairMode.companyState[id]?.visited)
  return visitedAll ? 'completed' : 'in-progress'
}

function formatFairDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Whole days between an ISO date and today, ignoring time of day. Negative means the date has passed. */
function dayDelta(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - todayMidnight) / 86_400_000)
}

const TAG_CLASS =
  'inline-flex shrink-0 items-center rounded-[4px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em]'

function DateBadges({ date }: { date: string }) {
  const delta = dayDelta(date)
  if (delta === 0) {
    return <span className={[TAG_CLASS, 'bg-accent text-on-accent'].join(' ')}>Today</span>
  }
  return (
    <span className={[TAG_CLASS, 'bg-surface text-muted-foreground shadow-hairline'].join(' ')}>
      {delta > 0 ? `In ${delta} days` : `${Math.abs(delta)} days ago`}
    </span>
  )
}

function CreateFairModal({
  open,
  onClose,
  defaultTargetPosition,
}: {
  open: boolean
  onClose: () => void
  defaultTargetPosition: TargetPosition
}) {
  const { dispatch } = useWizard()
  const router = useRouter()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [targetPosition, setTargetPosition] = useState<TargetPosition>(defaultTargetPosition)

  const canSave = name.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    dispatch({ type: 'ADD_FAIR_PROFILE', name: name.trim(), date: '', location, targetPosition })
    setName('')
    setLocation('')
    onClose()
    router.push('/fair')
  }

  return (
    <Modal open={open} title="Create a fair" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="new-fair-name">Career fair name</FieldLabel>
          <TextInput
            id="new-fair-name"
            value={name}
            placeholder="e.g. Spring STEM Expo"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="new-fair-location">Location or venue</FieldLabel>
          <TextInput
            id="new-fair-location"
            value={location}
            placeholder="e.g. Student Union Ballroom"
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="new-fair-target">Target position</FieldLabel>
          <div
            id="new-fair-target"
            role="radiogroup"
            aria-label="Target position"
            className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"
          >
            {(['internship', 'fulltime'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={targetPosition === value}
                onClick={() => setTargetPosition(value)}
                className={[
                  'min-h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  targetPosition === value ? 'bg-card text-primary shadow-hairline' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {value === 'internship' ? 'Internship' : 'Full-Time'}
              </button>
            ))}
          </div>
        </div>
        <Button fullWidth disabled={!canSave} onClick={handleSave}>
          Save and add a directory
        </Button>
      </div>
    </Modal>
  )
}

/** Top-right "..." menu on a fair card: Duplicate + Delete, same open/close pattern as AccountMenu. */
function FairCardMenu({ label, onDuplicate, onDelete }: { label: string; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${label}`}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DotsThree size={18} weight="bold" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-soft"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDuplicate()
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm text-card-foreground hover:bg-muted"
          >
            <Copy size={15} weight="bold" aria-hidden="true" />
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-sm text-destructive hover:bg-muted"
          >
            <Trash size={15} weight="bold" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function FairCard({ fair }: { fair: FairProfile }) {
  const { dispatch } = useWizard()
  const router = useRouter()

  const handleEdit = () => {
    dispatch({ type: 'SET_ACTIVE_FAIR', id: fair.id })
    router.push('/fair')
  }
  const handleDuplicate = () => dispatch({ type: 'DUPLICATE_FAIR_PROFILE', id: fair.id })
  const handleDelete = () => {
    if (window.confirm(`Delete "${fair.name || 'this fair'}"? This removes its matched companies and pitch prep.`)) {
      dispatch({ type: 'REMOVE_FAIR_PROFILE', id: fair.id })
    }
  }

  const status = computeFairStatus(fair)
  const boothCount = fair.companies.reduce((sum, company) => sum + company.boothNumbers.length, 0)
  const boothLabel = `${boothCount} target ${boothCount === 1 ? 'booth' : 'booths'}${
    status === 'completed' ? ' · all visited' : ''
  }`

  return (
    <div className="fn-card flex flex-col gap-3.5 rounded-2xl bg-card p-6 shadow-hairline">
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            'text-[19px] font-semibold leading-[1.25] tracking-[-0.03em]',
            fair.name ? 'text-card-foreground' : 'text-ink-subtle',
          ].join(' ')}
        >
          {fair.name || 'Untitled fair'}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={[TAG_CLASS, STATUS_CLASS[status]].join(' ')}>{STATUS_LABEL[status]}</span>
          <FairCardMenu label={fair.name || 'this fair'} onDuplicate={handleDuplicate} onDelete={handleDelete} />
        </div>
      </div>

      {fair.date ? (
        <div className="flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>{formatFairDate(fair.date)}</span>
            <DateBadges date={fair.date} />
          </div>
          {fair.location && <div>{fair.location}</div>}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-ink-subtle">
          No date or venue yet. Open it to add the details and upload the exhibitor directory.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <span className={[TAG_CLASS, 'bg-accent-wash text-accent-ink'].join(' ')}>
          {fair.targetPosition === 'internship' ? 'Internship' : 'Full-Time'}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Buildings size={13} weight="fill" aria-hidden="true" />
          {boothLabel}
        </span>
      </div>

      <div className="mt-0.5">
        <Button variant="secondary" fullWidth icon={<PencilSimple size={15} weight="bold" aria-hidden="true" />} onClick={handleEdit}>
          Edit
        </Button>
      </div>
    </div>
  )
}

/**
 * The "all your fairs" hub - Home's default tab. Deliberately offers no way
 * into Fair Day from here: Edit is the only action on a card, and it always
 * lands on that fair's Details page. Entering Fair Mode only ever happens
 * from the Fair Day tab itself (see FairDay.tsx) or that fair's own Briefs
 * page - never from the board.
 */
export function FairBoard() {
  const { state } = useWizard()
  const [modalOpen, setModalOpen] = useState(false)
  const { resume, fairProfiles } = state

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Each fair keeps its own matched companies, pitches and progress.</p>
        <Button icon={<Plus size={16} weight="bold" aria-hidden="true" />} onClick={() => setModalOpen(true)}>
          Create a fair
        </Button>
      </div>

      <div className="fn-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fairProfiles.map((fair) => (
          <FairCard key={fair.id} fair={fair} />
        ))}
      </div>

      <CreateFairModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTargetPosition={resume.targetPosition} />
    </>
  )
}
