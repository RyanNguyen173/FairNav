import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Buildings,
  ChatCircleDots,
  Check,
  Copy,
  GraduationCap,
  Heart,
  Lightbulb,
  MapPin,
  Tag,
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
    router.push('/')
  }
  const selectedCompanies = selectedCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is (typeof companies)[number] => Boolean(c))
  const [activeId, setActiveId] = useState(selectedCompanies[0]?.id)
  const activeCompany = selectedCompanies.find((c) => c.id === activeId) ?? selectedCompanies[0]
  const activePrep = activeCompany ? prep[activeCompany.id] : undefined

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
            className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mb-0 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0"
            role="tablist"
            aria-label="Selected companies"
          >
            {selectedCompanies.map((company, index) => {
              const selected = company.id === activeCompany?.id
              return (
                <div key={company.id} className="flex shrink-0 items-center gap-1.5 md:w-full">
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
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      aria-label={`Move ${company.companyName || 'company'} up`}
                      disabled={index === 0}
                      onClick={() => dispatch({ type: 'MOVE_SELECTED_COMPANY', id: company.id, direction: 'up' })}
                      className="flex h-4 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowUp size={12} weight="bold" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${company.companyName || 'company'} down`}
                      disabled={index === selectedCompanies.length - 1}
                      onClick={() => dispatch({ type: 'MOVE_SELECTED_COMPANY', id: company.id, direction: 'down' })}
                      className="flex h-4 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowDown size={12} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
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
