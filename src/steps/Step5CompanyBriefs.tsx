import { ChatCircleDots, Lightbulb } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Header } from '../components/Header'
import { SectionCard, StepShell } from '../components/StepShell'
import { useWizard } from '../wizard/WizardContext'

export function Step5CompanyBriefs() {
  const { state, dispatch, goBack } = useWizard()
  const { companies, selectedCompanyIds, prep } = state
  const selectedCompanies = companies.filter((c) => selectedCompanyIds.includes(c.id))
  const [activeId, setActiveId] = useState(selectedCompanies[0]?.id)
  const activeCompany = selectedCompanies.find((c) => c.id === activeId) ?? selectedCompanies[0]
  const activePrep = activeCompany ? prep[activeCompany.id] : undefined

  return (
    <>
      <Header step={5} stepLabel="Briefs &amp; pitch prep" onBack={goBack} />
      <StepShell
        footer={
          <Button fullWidth onClick={() => dispatch({ type: 'ENTER_FAIR_MODE' })}>
            Enter Live Fair Mode
          </Button>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Review your personalized pitch and questions for each company before you walk the floor.
        </p>

        <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Selected companies">
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
                  selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card text-card-foreground',
                ].join(' ')}
              >
                {company.name}
              </button>
            )
          })}
        </div>

        {activeCompany && activePrep && (
          <div className="space-y-5" role="tabpanel">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Booth {activeCompany.boothNumber}</p>
              <h2 className="text-lg font-bold text-foreground">{activeCompany.name}</h2>
            </div>

            <SectionCard>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lightbulb size={16} weight="fill" className="text-accent" aria-hidden="true" />
                Elevator pitch
              </h3>
              <ul className="space-y-2.5">
                {activePrep.talkingPoints.map((point, index) => (
                  <li key={index} className="text-sm leading-relaxed text-card-foreground">
                    {point}
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ChatCircleDots size={16} weight="fill" className="text-primary" aria-hidden="true" />
                Questions to ask
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
        )}
      </StepShell>
    </>
  )
}
