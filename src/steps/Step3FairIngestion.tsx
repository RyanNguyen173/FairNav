import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../components/Button'
import { FairSubNav } from '../components/FairSubNav'
import { Header } from '../components/Header'
import { FieldLabel, SectionCard, StepShell, TextInput } from '../components/StepShell'
import { UploadDropzone } from '../components/UploadDropzone'
import { analyzeFair } from '../wizard/aiEngine'
import { useActiveFair, useWizard } from '../wizard/WizardContext'

export function Step3FairIngestion() {
  const { state, dispatch } = useWizard()
  const router = useRouter()
  const { profile } = state
  const fair = useActiveFair()
  const [directoryMode, setDirectoryMode] = useState<'paste' | 'upload'>('paste')
  const [companyListFile, setCompanyListFile] = useState<File | null>(null)

  const canAnalyze = fair.name.trim().length > 0 && fair.ingestStatus !== 'working'

  const handleAnalyze = async () => {
    dispatch({ type: 'FAIR_ANALYZING' })
    const companies = await analyzeFair(fair.companyDirectoryText, companyListFile, profile)
    dispatch({ type: 'COMPANIES_MATCHED', companies })
    router.push('/matches')
  }

  return (
    <>
      <Header title="Fair details &amp; map" onBack={() => router.push('/')} />
      <FairSubNav fair={fair} />
      <StepShell
        footer={
          <Button fullWidth disabled={!canAnalyze} loading={fair.ingestStatus === 'working'} onClick={handleAnalyze}>
            Analyze Fair &amp; Match Companies
          </Button>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Tell us about the fair so we can rank attending companies against your profile.
        </p>

        <div className="md:grid md:grid-cols-2 md:items-start md:gap-8">
          <div>
            <SectionCard className="mb-6 space-y-4">
              <div>
                <FieldLabel htmlFor="eventName">Event name</FieldLabel>
                <TextInput
                  id="eventName"
                  value={fair.name}
                  placeholder="e.g. STEM Connect Career Fair"
                  onChange={(event) => dispatch({ type: 'SET_FAIR_FIELD', field: 'name', value: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="date">Date</FieldLabel>
                <TextInput
                  id="date"
                  type="date"
                  value={fair.date}
                  onChange={(event) => dispatch({ type: 'SET_FAIR_FIELD', field: 'date', value: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="location">Location</FieldLabel>
                <TextInput
                  id="location"
                  value={fair.location}
                  placeholder="e.g. Seattle Convention Center"
                  onChange={(event) => dispatch({ type: 'SET_FAIR_FIELD', field: 'location', value: event.target.value })}
                />
              </div>
            </SectionCard>

            <UploadDropzone
              label="Booth map"
              helperText="Upload the fair's physical layout as an image or PDF."
              accept="image/*,.pdf"
              fileName={fair.mapFileName}
              onFile={(file) => dispatch({ type: 'SET_MAP_FILE', fileName: file.name })}
            />
          </div>

          <div className="mt-6 md:mt-0">
            <FieldLabel htmlFor="directory">Company directory</FieldLabel>
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              {(['paste', 'upload'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDirectoryMode(mode)}
                  className={[
                    'min-h-9 cursor-pointer rounded-lg text-sm font-semibold transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    directoryMode === mode ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {mode === 'paste' ? 'Paste text' : 'Upload file'}
                </button>
              ))}
            </div>

            {directoryMode === 'paste' ? (
              <textarea
                id="directory"
                rows={5}
                value={fair.companyDirectoryText}
                placeholder={'One company per line, e.g.\nNorthwind Analytics\nBrightloop\nVerdant Finance'}
                onChange={(event) =>
                  dispatch({ type: 'SET_COMPANY_DIRECTORY_TEXT', value: event.target.value })
                }
                className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <UploadDropzone
                label="Company list file"
                helperText="PDF or CSV listing attending companies."
                accept=".pdf,.csv"
                fileName={fair.companyListFileName}
                onFile={(file) => {
                  setCompanyListFile(file)
                  dispatch({ type: 'SET_COMPANY_LIST_FILE', fileName: file.name })
                }}
              />
            )}

            {fair.companies.length > 0 && (
              <SectionCard className="mt-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Extracted directory preview</h2>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {fair.companies.map((company) => (
                    <li key={company.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-card-foreground">{company.companyName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {company.boothNumber ? `Booth ${company.boothNumber}` : 'No booth listed'}
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        </div>
      </StepShell>
    </>
  )
}
