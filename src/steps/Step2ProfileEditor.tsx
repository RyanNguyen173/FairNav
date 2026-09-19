import { Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Header } from '../components/Header'
import { FieldLabel, SectionCard, StepShell, TextInput } from '../components/StepShell'
import { suggestedInterests } from '../wizard/mockEngine'
import type { Education, ExperienceLevel, WorkExperience } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'no-experience', label: 'No experience yet' },
  { value: 'some-experience', label: 'Some experience' },
  { value: 'experienced', label: 'Experienced' },
]

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
  const [customTag, setCustomTag] = useState('')
  const [suggestedOptions] = useState(() => suggestedInterests())
  const interestOptions = Array.from(new Set([...suggestedOptions, ...profile.interests])).slice(0, 8)

  const addCustomSkill = () => {
    const trimmed = customTag.trim()
    if (!trimmed) return
    dispatch({ type: 'ADD_SKILL', skill: trimmed })
    setCustomTag('')
  }

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

        <SectionCard className="mb-6">
          <FieldLabel htmlFor="experienceLevel">Experience level</FieldLabel>
          <select
            id="experienceLevel"
            value={profile.experienceLevel}
            onChange={(event) => dispatch({ type: 'SET_EXPERIENCE_LEVEL', value: event.target.value as ExperienceLevel })}
            className="min-h-11 w-full max-w-sm rounded-xl border border-border bg-card px-3.5 text-[15px] text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SectionCard>

        <div className="md:grid md:grid-cols-2 md:items-start md:gap-8">
          <SectionCard className="mb-6 md:mb-0">
            <FieldLabel htmlFor="skills-input">Extracted skills</FieldLabel>
            <div className="mb-3 flex flex-wrap gap-2">
              {profile.skills.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills yet — add some below.</p>
              )}
              {profile.skills.map((skill) => (
                <Chip key={skill} label={skill} onRemove={() => dispatch({ type: 'REMOVE_SKILL', skill })} />
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput
                id="skills-input"
                value={customTag}
                placeholder="Add a custom skill"
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addCustomSkill()
                  }
                }}
              />
              <Button variant="secondary" icon={<Plus size={16} weight="bold" aria-hidden="true" />} onClick={addCustomSkill}>
                Add
              </Button>
            </div>
          </SectionCard>

          <SectionCard>
            <FieldLabel htmlFor="interests">Focus &amp; industry interests</FieldLabel>
            <div id="interests" className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => {
                const selected = profile.interests.includes(interest)
                return (
                  <Chip
                    key={interest}
                    label={interest}
                    selected={selected}
                    onClick={() =>
                      dispatch(
                        selected
                          ? { type: 'REMOVE_INTEREST', interest }
                          : { type: 'ADD_INTEREST', interest },
                      )
                    }
                  />
                )
              })}
            </div>
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
