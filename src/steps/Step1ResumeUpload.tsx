import { Briefcase, GraduationCap, IdentificationCard } from '@phosphor-icons/react'
import { Button } from '../components/Button'
import { Header } from '../components/Header'
import { FieldLabel, SectionCard, StepShell } from '../components/StepShell'
import { UploadDropzone } from '../components/UploadDropzone'
import { parseResume } from '../wizard/aiEngine'
import type { TargetPosition } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

const POSITION_OPTIONS: { value: TargetPosition; label: string; icon: typeof GraduationCap }[] = [
  { value: 'internship', label: 'Internship', icon: GraduationCap },
  { value: 'fulltime', label: 'Full-Time', icon: Briefcase },
]

export function Step1ResumeUpload() {
  const { state, dispatch, goNext } = useWizard()
  const { resume } = state
  const isParsed = resume.status === 'done'

  const handleFile = async (file: File) => {
    dispatch({ type: 'RESUME_FILE_SELECTED', fileName: file.name })
    dispatch({ type: 'RESUME_PARSING' })
    const parsed = await parseResume(file)
    dispatch({
      type: 'RESUME_PARSED',
      contact: parsed.contact,
      major: parsed.major,
      gradYear: parsed.gradYear,
      skills: parsed.skills,
      interests: parsed.interests,
    })
  }

  return (
    <>
      <Header step={1} stepLabel="Resume &amp; target role" />
      <StepShell
        footer={
          <Button fullWidth disabled={!isParsed} onClick={goNext}>
            Parse Profile &amp; Continue
          </Button>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground md:max-w-lg">
          Upload your resume and we&apos;ll pull out your contact info, skills, and interests to
          match you with companies at the fair.
        </p>

        <div className="md:grid md:grid-cols-2 md:gap-8">
          <div>
            <div className="mb-6">
              <UploadDropzone
                label="Resume"
                helperText="PDF or DOCX, up to 10MB."
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                fileName={resume.fileName}
                status={resume.status === 'working' ? 'working' : 'idle'}
                workingText="Parsing your resume…"
                onFile={handleFile}
              />
            </div>

            <div>
              <FieldLabel htmlFor="target-position">Target position</FieldLabel>
              <div
                id="target-position"
                role="radiogroup"
                aria-label="Target position"
                className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"
              >
                {POSITION_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = resume.targetPosition === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => dispatch({ type: 'SET_TARGET_POSITION', position: value })}
                      className={[
                        'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold',
                        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      <Icon size={16} weight={selected ? 'fill' : 'regular'} aria-hidden="true" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-0">
            <SectionCard>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Extracted profile details</h2>
              {isParsed ? (
                <dl className="space-y-3">
                  {[
                    ['Full name', resume.contact.fullName],
                    ['Email', resume.contact.email],
                    ['Phone', resume.contact.phone],
                    ['University', resume.contact.university],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                      <dd className="text-[15px] text-card-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <IdentificationCard size={28} weight="regular" className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    Upload a resume to see your extracted details here.
                  </p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </StepShell>
    </>
  )
}
