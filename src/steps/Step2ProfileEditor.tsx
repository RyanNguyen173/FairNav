import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Header } from '../components/Header'
import { FieldLabel, SectionCard, StepShell, TextInput } from '../components/StepShell'
import { suggestedInterests } from '../wizard/mockEngine'
import type { ExperienceLevel } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'no-experience', label: 'No experience yet' },
  { value: 'some-experience', label: 'Some experience' },
  { value: 'experienced', label: 'Experienced' },
]

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
          Confirm your details and skills so FairNav can rank the right companies for you.
        </p>

        <SectionCard className="mb-6 space-y-4">
          <div>
            <FieldLabel htmlFor="major">Major</FieldLabel>
            <TextInput
              id="major"
              value={profile.major}
              placeholder="e.g. Computer Science"
              onChange={(event) =>
                dispatch({ type: 'SET_PROFILE_FIELD', field: 'major', value: event.target.value })
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="gradYear">Graduation year</FieldLabel>
            <TextInput
              id="gradYear"
              inputMode="numeric"
              value={profile.gradYear}
              placeholder="e.g. 2027"
              onChange={(event) =>
                dispatch({ type: 'SET_PROFILE_FIELD', field: 'gradYear', value: event.target.value })
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="experience">Experience level</FieldLabel>
            <select
              id="experience"
              value={profile.experienceLevel}
              onChange={(event) =>
                dispatch({ type: 'SET_EXPERIENCE_LEVEL', value: event.target.value as ExperienceLevel })
              }
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-[15px] text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>

        <div className="mb-6">
          <FieldLabel htmlFor="skills-input">Skills</FieldLabel>
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
        </div>

        <div>
          <FieldLabel htmlFor="interests">Interests</FieldLabel>
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
        </div>
      </StepShell>
    </>
  )
}
