import { ChatCircleDots, Check, Copy, Lightbulb } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../components/Button'
import { FairSubNav } from '../components/FairSubNav'
import { Header } from '../components/Header'
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
  const selectedCompanies = companies.filter((c) => selectedCompanyIds.includes(c.id))
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
            {selectedCompanies.map((company) => {
              const selected = company.id === activeCompany?.id
              return (
                <button
                  key={company.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveId(company.id)}
                  className={[
                    'min-h-9 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'md:w-full md:text-left md:rounded-xl',
                    selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card text-card-foreground',
                  ].join(' ')}
                >
                  {company.companyName}
                </button>
              )
            })}
          </div>

          {activeCompany && activePrep && (
            <div role="tabpanel">
              <div className="mb-5">
                <p className="text-xs font-medium text-muted-foreground">Booth {activeCompany.boothNumber}</p>
                <h2 className="text-lg font-bold text-foreground">{activeCompany.companyName}</h2>
              </div>

              <div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
                <SectionCard>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb size={16} weight="fill" className="text-accent" aria-hidden="true" />
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
