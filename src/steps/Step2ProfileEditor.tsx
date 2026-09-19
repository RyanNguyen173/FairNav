import { Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Header } from '../components/Header'
import { FieldLabel, SectionCard, StepShell, TextInput } from '../components/StepShell'
import { INTEREST_POOL, SKILL_POOL } from '../wizard/mockEngine'
import type { Education, WorkExperience } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

/** Chip list + free-text input with a type-ahead dropdown of matching options. */
function TagPicker({
  label,
  inputId,
  selected,
  options,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string
  inputId: string
  selected: string[]
  options: string[]
  placeholder: string
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const suggestions = query.trim()
    ? options
        .filter(
          (option) =>
            option.toLowerCase().includes(query.trim().toLowerCase()) &&
            !selected.some((value) => value.toLowerCase() === option.toLowerCase()),
        )
        .slice(0, 6)
    : []

  const commit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (!selected.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) onAdd(trimmed)
    setQuery('')
    setOpen(false)
  }

  return (
    <div>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="mb-3 flex flex-wrap gap-2">
        {selected.length === 0 && <p className="text-sm text-muted-foreground">None yet — add some below.</p>}
        {selected.map((value) => (
          <Chip key={value} label={value} onRemove={() => onRemove(value)} />
        ))}
      </div>
      <div className="relative">
        <TextInput
          id={inputId}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit(query)
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
            {suggestions.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    commit(option)
                  }}
                  className="block w-full cursor-pointer px-3.5 py-2 text-left text-[15px] text-card-foreground hover:bg-muted"
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EntryCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ExperienceEditor({ entries }: { entries: WorkExperience[] }) {
  const { dispatch } = useWizard()

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Work experience</h2>
        <Button variant="secondary" icon={<Plus size={16} weight="bold" aria-hidden="true" />} onClick={() => dispatch({ type: 'ADD_EXPERIENCE' })}>
          Add
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No experience added yet — add a role or upload a resume on the previous step.</p>
      )}

      {entries.map((entry, index) => (
        <EntryCard
          key={entry.id}
          title={entry.jobTitle || entry.company ? `${entry.jobTitle || 'Untitled role'}${entry.company ? ` · ${entry.company}` : ''}` : `Role ${index + 1}`}
          onRemove={() => dispatch({ type: 'REMOVE_EXPERIENCE', id: entry.id })}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`exp-title-${entry.id}`}>Job title</FieldLabel>
              <TextInput
                id={`exp-title-${entry.id}`}
                value={entry.jobTitle}
                placeholder="e.g. Software Engineering Intern"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { jobTitle: event.target.value } })
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor={`exp-company-${entry.id}`}>Company</FieldLabel>
              <TextInput
                id={`exp-company-${entry.id}`}
                value={entry.company}
                placeholder="e.g. Acme Corp"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { company: event.target.value } })
                }
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor={`exp-location-${entry.id}`}>Location</FieldLabel>
            <TextInput
              id={`exp-location-${entry.id}`}
              value={entry.location}
              placeholder="e.g. Seattle, WA"
              onChange={(event) =>
                dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { location: event.target.value } })
              }
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={entry.current}
              onChange={(event) =>
                dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { current: event.target.checked } })
              }
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            I currently work here
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`exp-start-${entry.id}`}>Start date</FieldLabel>
              <TextInput
                id={`exp-start-${entry.id}`}
                value={entry.startDate}
                placeholder="MM/YYYY"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { startDate: event.target.value } })
                }
              />
            </div>
            {!entry.current && (
              <div>
                <FieldLabel htmlFor={`exp-end-${entry.id}`}>End date</FieldLabel>
                <TextInput
                  id={`exp-end-${entry.id}`}
                  value={entry.endDate}
                  placeholder="MM/YYYY"
                  onChange={(event) =>
                    dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { endDate: event.target.value } })
                  }
                />
              </div>
            )}
          </div>

          <div>
            <FieldLabel htmlFor={`exp-desc-${entry.id}`}>Role description</FieldLabel>
            <textarea
              id={`exp-desc-${entry.id}`}
              rows={3}
              value={entry.description}
              placeholder="What did you work on?"
              onChange={(event) =>
                dispatch({ type: 'UPDATE_EXPERIENCE', id: entry.id, patch: { description: event.target.value } })
              }
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[15px] text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </EntryCard>
      ))}
    </SectionCard>
  )
}

function EducationEditor({ entries }: { entries: Education[] }) {
  const { dispatch } = useWizard()

  return (
    <SectionCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Education</h2>
        <Button variant="secondary" icon={<Plus size={16} weight="bold" aria-hidden="true" />} onClick={() => dispatch({ type: 'ADD_EDUCATION' })}>
          Add
        </Button>
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No education added yet — add a program or upload a resume on the previous step.</p>
      )}

      {entries.map((entry, index) => (
        <EntryCard
          key={entry.id}
          title={entry.university || `School ${index + 1}`}
          onRemove={() => dispatch({ type: 'REMOVE_EDUCATION', id: entry.id })}
        >
          <div>
            <FieldLabel htmlFor={`edu-university-${entry.id}`}>University</FieldLabel>
            <TextInput
              id={`edu-university-${entry.id}`}
              value={entry.university}
              placeholder="e.g. University of Washington"
              onChange={(event) =>
                dispatch({ type: 'UPDATE_EDUCATION', id: entry.id, patch: { university: event.target.value } })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`edu-degree-${entry.id}`}>Degree</FieldLabel>
              <TextInput
                id={`edu-degree-${entry.id}`}
                value={entry.degree}
                placeholder="e.g. Bachelor of Science"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EDUCATION', id: entry.id, patch: { degree: event.target.value } })
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor={`edu-field-${entry.id}`}>Field of study</FieldLabel>
              <TextInput
                id={`edu-field-${entry.id}`}
                value={entry.fieldOfStudy}
                placeholder="e.g. Computer Science"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EDUCATION', id: entry.id, patch: { fieldOfStudy: event.target.value } })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`edu-gpa-${entry.id}`}>GPA</FieldLabel>
              <TextInput
                id={`edu-gpa-${entry.id}`}
                value={entry.gpa}
                placeholder="e.g. 3.80"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EDUCATION', id: entry.id, patch: { gpa: event.target.value } })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`edu-start-${entry.id}`}>Start date</FieldLabel>
              <TextInput
                id={`edu-start-${entry.id}`}
                value={entry.startDate}
                placeholder="MM/YYYY"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EDUCATION', id: entry.id, patch: { startDate: event.target.value } })
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor={`edu-grad-${entry.id}`}>Expected graduation</FieldLabel>
              <TextInput
                id={`edu-grad-${entry.id}`}
                value={entry.expectedGradDate}
                placeholder="MM/YYYY"
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_EDUCATION', id: entry.id, patch: { expectedGradDate: event.target.value } })
                }
              />
            </div>
          </div>
        </EntryCard>
      ))}
    </SectionCard>
  )
}

export function Step2ProfileEditor() {
  const { state, dispatch, goNext, goBack } = useWizard()
  const { profile } = state

  return (
    <>
      <Header step={2} stepLabel="Profile &amp; skills" onBack={goBack} />
      <StepShell
        footer={
          <Button fullWidth onClick={goNext}>
            Save Profile &amp; Proceed
          </Button>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Confirm your details, experience, and education so FairNav can rank the right companies for you.
        </p>

        <div className="md:grid md:grid-cols-2 md:items-start md:gap-8">
          <SectionCard className="mb-6 md:mb-0">
            <TagPicker
              label="Extracted skills"
              inputId="skills-input"
              selected={profile.skills}
              options={SKILL_POOL}
              placeholder="Add a skill"
              onAdd={(skill) => dispatch({ type: 'ADD_SKILL', skill })}
              onRemove={(skill) => dispatch({ type: 'REMOVE_SKILL', skill })}
            />
          </SectionCard>

          <SectionCard>
            <TagPicker
              label="Focus & industry interests"
              inputId="interests-input"
              selected={profile.interests}
              options={INTEREST_POOL}
              placeholder="Add an interest"
              onAdd={(interest) => dispatch({ type: 'ADD_INTEREST', interest })}
              onRemove={(interest) => dispatch({ type: 'REMOVE_INTEREST', interest })}
            />
          </SectionCard>
        </div>

        <div className="mt-6 space-y-6">
          <ExperienceEditor entries={profile.experience} />
          <EducationEditor entries={profile.education} />
        </div>
      </StepShell>
    </>
  )
}
