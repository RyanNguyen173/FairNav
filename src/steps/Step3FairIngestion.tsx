import { Briefcase, GraduationCap, Stack } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../components/Button'
import { FairSubNav } from '../components/FairSubNav'
import { Header } from '../components/Header'
import { FieldLabel, SectionCard, StepShell, TextInput } from '../components/StepShell'
import { UploadDropzone } from '../components/UploadDropzone'
import { analyzeFair } from '../wizard/aiEngine'
import type { TargetPosition } from '../wizard/types'
import { useActiveFair, useWizard } from '../wizard/WizardContext'

const POSITION_OPTIONS: { value: TargetPosition; label: string; icon: typeof GraduationCap }[] = [
  { value: 'internship', label: 'Internship', icon: GraduationCap },
  { value: 'fulltime', label: 'Full-Time', icon: Briefcase },
  { value: 'both', label: 'Both', icon: Stack },
]

/** Identifies exactly what was last sent to the AI, so re-uploading/re-clicking the same input skips a redundant call. */
function fileSignature(file: File): string {
  return `file:${file.name}:${file.size}:${file.lastModified}`
}
function textSignature(text: string): string {
  return `text:${text.trim()}`
}

export function Step3FairIngestion() {
  const { state, dispatch } = useWizard()
  const router = useRouter()
  const { profile } = state
  const fair = useActiveFair()
  const [directoryMode, setDirectoryMode] = useState<'paste' | 'upload'>('upload')
  const [companyListFile, setCompanyListFile] = useState<File | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  // Best-effort: if this fair already has matched companies on mount, assume
  // they came from the current pasted text (a real File object can't be
  // restored across a reload, so upload mode always re-analyzes on its next
  // drop regardless).
  const [analyzedSignature, setAnalyzedSignature] = useState<string | null>(() =>
    fair.companies.length > 0 ? textSignature(fair.companyDirectoryText) : null,
  )

  // The AI needs real exhibitor data - never let it run against a blank
  // directory.
  const hasDirectoryInput = Boolean(companyListFile) || fair.companyDirectoryText.trim().length > 0
  const hasResults = fair.companies.length > 0
  // Matches analyzeFair's own precedence (a file, when present, always wins
  // over pasted text) - so "already analyzed" reflects whichever one it
  // would actually use right now, regardless of which tab is showing.
  const currentSignature = companyListFile
    ? fileSignature(companyListFile)
    : textSignature(fair.companyDirectoryText)
  const isCurrentAnalyzed = hasResults && analyzedSignature === currentSignature
  // Once a directory has already been analyzed, continuing onward shouldn't
  // require re-supplying the input - a reload can't restore the uploaded
  // File object even though the fair's matched companies (and thus
  // isCurrentAnalyzed) survive it just fine.
  const canAnalyze = fair.name.trim().length > 0 && (hasDirectoryInput || isCurrentAnalyzed) && fair.ingestStatus !== 'working'

  /** Returns whether the given input now has valid, analyzed results behind it. */
  const runAnalysis = async (file: File | null, text: string): Promise<boolean> => {
    const signature = file ? fileSignature(file) : textSignature(text)
    if (signature === analyzedSignature && hasResults) return true
    setAnalysisError(null)
    setAnalyzedSignature(signature)
    dispatch({ type: 'FAIR_ANALYZING' })
    try {
      const companies = await analyzeFair(text, file, profile, fair.targetPosition)
      dispatch({ type: 'COMPANIES_MATCHED', companies })
      return true
    } catch (error) {
      console.error('Fair analysis failed:', error)
      setAnalyzedSignature(null)
      dispatch({ type: 'FAIR_ANALYSIS_FAILED' })
      setAnalysisError(
        error instanceof Error && error.message ? error.message : "Couldn't analyze the directory - check your connection and try again.",
      )
      return false
    }
  }

  const handleAnalyzeClick = async () => {
    const ready = isCurrentAnalyzed || (await runAnalysis(companyListFile, fair.companyDirectoryText))
    if (ready) router.push('/matches')
  }

  const handleFileUpload = (file: File) => {
    setCompanyListFile(file)
    dispatch({ type: 'SET_COMPANY_LIST_FILE', fileName: file.name })
    // The moment a directory file lands, analysis starts - no separate click needed.
    void runAnalysis(file, fair.companyDirectoryText)
  }

  const handleFileRemove = () => {
    setCompanyListFile(null)
    setAnalyzedSignature(null)
    setAnalysisError(null)
    dispatch({ type: 'REMOVE_COMPANY_LIST_FILE' })
  }

  return (
    <>
      <Header title={fair.name || 'Untitled fair'} onBack={() => router.push('/')} />
      <FairSubNav fair={fair} />
      <StepShell
        footer={
          <Button fullWidth disabled={!canAnalyze} loading={fair.ingestStatus === 'working'} onClick={handleAnalyzeClick}>
            {isCurrentAnalyzed ? 'Continue to Matches' : 'Analyze Fair & Match Companies'}
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
              <div>
                <FieldLabel htmlFor="target-position">Target position</FieldLabel>
                <div
                  id="target-position"
                  role="radiogroup"
                  aria-label="Target position"
                  className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1"
                >
                  {POSITION_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const selected = fair.targetPosition === value
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => dispatch({ type: 'SET_FAIR_TARGET_POSITION', position: value })}
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
                <p className="mt-1.5 text-xs text-muted-foreground">Used to rank companies and roles that fit what you're looking for.</p>
              </div>
            </SectionCard>
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
                status={fair.ingestStatus === 'working' ? 'working' : 'idle'}
                workingText="Analyzing companies…"
                onFile={handleFileUpload}
                onRemove={handleFileRemove}
              />
            )}

            {analysisError && <p className="mt-2 text-sm text-destructive">{analysisError}</p>}

            {!hasDirectoryInput && (
              <p className="mt-2 text-xs text-muted-foreground">
                Add a company directory above before continuing - the AI needs real exhibitor data to work from.
              </p>
            )}

            {fair.companies.length > 0 && (
              <SectionCard className="mt-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Extracted directory preview</h2>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {fair.companies.map((company) => (
                    <li key={company.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-card-foreground">{company.companyName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {company.boothNumbers.length > 0 ? `Booth ${company.boothNumbers.join(', ')}` : 'No booth listed'}
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
