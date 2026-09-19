import { Buildings, CalendarBlank, CaretRight, Copy, MapPin, Plus, Trash } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { FieldLabel, TextInput } from '../components/StepShell'
import type { FairProfile, FairStatus, TargetPosition } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

const STATUS_LABEL: Record<FairStatus, string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
}

const STATUS_CLASS: Record<FairStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-secondary text-on-secondary',
  completed: 'bg-success text-on-success',
}

/** Where "Resume / Enter Fair" should take you, based on how far this fair has gotten. `null` means it's live - switch to the Fair Day tab instead of navigating. */
function resumeRouteFor(fair: FairProfile): string | null {
  if (fair.fairMode.active) return null
  if (fair.companies.length === 0) return '/fair'
  if (Object.keys(fair.prep).length === 0) return '/matches'
  return '/briefs'
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
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [targetPosition, setTargetPosition] = useState<TargetPosition>(defaultTargetPosition)

  const canSave = name.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    dispatch({ type: 'ADD_FAIR_PROFILE', name: name.trim(), date, location, targetPosition })
    setName('')
    setDate('')
    setLocation('')
    onClose()
    router.push('/fair')
  }

  return (
    <Modal open={open} title="Create new fair" onClose={onClose}>
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
          <FieldLabel htmlFor="new-fair-date">Date</FieldLabel>
          <TextInput id="new-fair-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="new-fair-location">Location / venue</FieldLabel>
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
                  targetPosition === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {value === 'internship' ? 'Internship' : 'Full-Time'}
              </button>
            ))}
          </div>
        </div>
        <Button fullWidth disabled={!canSave} onClick={handleSave}>
          Save &amp; Proceed to Directory Ingestion
        </Button>
      </div>
    </Modal>
  )
}

function FairCard({ fair, onEnterFairDay }: { fair: FairProfile; onEnterFairDay: () => void }) {
  const { dispatch } = useWizard()
  const router = useRouter()

  const handleResume = () => {
    dispatch({ type: 'SET_ACTIVE_FAIR', id: fair.id })
    const route = resumeRouteFor(fair)
    if (route) {
      router.push(route)
    } else {
      onEnterFairDay()
    }
  }
  const handleDuplicate = () => dispatch({ type: 'DUPLICATE_FAIR_PROFILE', id: fair.id })
  const handleDelete = () => {
    if (window.confirm(`Delete "${fair.name || 'this fair'}"? This removes its matched companies and pitch prep.`)) {
      dispatch({ type: 'REMOVE_FAIR_PROFILE', id: fair.id })
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold text-card-foreground">{fair.name || 'Untitled fair'}</h3>
        <span className={['shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', STATUS_CLASS[fair.status]].join(' ')}>
          {STATUS_LABEL[fair.status]}
        </span>
      </div>

      {(fair.date || fair.location) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {fair.date && (
            <span className="flex items-center gap-1">
              <CalendarBlank size={13} weight="fill" aria-hidden="true" />
              {fair.date}
            </span>
          )}
          {fair.location && (
            <span className="flex items-center gap-1">
              <MapPin size={13} weight="fill" aria-hidden="true" />
              {fair.location}
            </span>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
          {fair.targetPosition === 'internship' ? 'Internship' : 'Full-Time'}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Buildings size={13} weight="fill" aria-hidden="true" />
          {fair.companies.length} target {fair.companies.length === 1 ? 'booth' : 'booths'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          icon={<CaretRight size={15} weight="bold" aria-hidden="true" />}
          onClick={handleResume}
        >
          {fair.fairMode.active ? 'Go to Fair Day' : fair.status === 'draft' && fair.companies.length === 0 ? 'Start' : 'Resume'}
        </Button>
        <button
          type="button"
          onClick={handleDuplicate}
          aria-label={`Duplicate ${fair.name || 'this fair'}`}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Copy size={16} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete ${fair.name || 'this fair'}`}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** The "all your fairs" hub - Home's default tab. */
export function FairBoard({ onEnterFairDay }: { onEnterFairDay: () => void }) {
  const { state } = useWizard()
  const [modalOpen, setModalOpen] = useState(false)
  const { resume, fairProfiles } = state

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Each fair keeps its own matched companies, pitches, and progress.</p>
        <Button icon={<Plus size={16} weight="bold" aria-hidden="true" />} onClick={() => setModalOpen(true)}>
          Create New Fair
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fairProfiles.map((fair) => (
          <FairCard key={fair.id} fair={fair} onEnterFairDay={onEnterFairDay} />
        ))}
      </div>

      <CreateFairModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTargetPosition={resume.targetPosition} />
    </>
  )
}
