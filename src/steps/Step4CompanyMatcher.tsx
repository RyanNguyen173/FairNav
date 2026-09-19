import { CheckCircle, MapPin } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '../components/Button'
import { FairSubNav } from '../components/FairSubNav'
import { Header } from '../components/Header'
import { StepShell } from '../components/StepShell'
import { generatePreps } from '../wizard/aiEngine'
import type { Company } from '../wizard/types'
import { useActiveFair, useWizard } from '../wizard/WizardContext'

function MatchBadge({ percent }: { percent: number }) {
  const tone =
    percent >= 80 ? 'bg-primary text-on-primary' : percent >= 60 ? 'bg-secondary text-on-secondary' : 'bg-muted text-muted-foreground'
  return (
    <span className={['shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', tone].join(' ')}>{percent}% match</span>
  )
}

function CompanyCard({
  company,
  selected,
  onToggle,
}: {
  company: Company
  selected: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={[
        'flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors duration-150',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-primary"
        aria-label={`Select ${company.companyName} to visit`}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-bold text-card-foreground">{company.companyName}</h3>
          <MatchBadge percent={company.matchScore} />
        </div>
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={13} weight="fill" aria-hidden="true" />
          Booth {company.boothNumber}
        </p>
        <p className="mb-2.5 text-sm text-muted-foreground">{company.summary}</p>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {company.openRoles.map((role) => (
            <span
              key={role}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </label>
  )
}

export function Step4CompanyMatcher() {
  const { state, dispatch } = useWizard()
  const router = useRouter()
  const { profile } = state
  const fair = useActiveFair()
  const { companies, selectedCompanyIds } = fair
  const selectedCount = selectedCompanyIds.length
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const selectedCompanies = selectedCompanyIds
        .map((id) => companies.find((c) => c.id === id))
        .filter((company): company is Company => Boolean(company))

      const prep = await generatePreps(profile, selectedCompanies)

      dispatch({ type: 'PREP_GENERATED', prep })
      router.push('/briefs')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedCompanies = selectedCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((company): company is Company => Boolean(company))

  const generateButton = (
    <Button fullWidth disabled={selectedCount === 0 || isGenerating} loading={isGenerating} onClick={handleGenerate}>
      Generate Preparation &amp; Checklist
    </Button>
  )

  return (
    <>
      <Header title="Ranked companies" onBack={() => router.push('/fair')} />
      <FairSubNav fair={fair} />
      <StepShell
        footer={
          <div className="flex items-center gap-3 md:hidden">
            <span className="text-sm font-semibold text-foreground">{selectedCount} Selected</span>
            {generateButton}
          </div>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Ranked from most to least relevant to your profile. Select who you want to visit.
        </p>

        <div className="md:grid md:grid-cols-[1fr_300px] md:items-start md:gap-6">
          <div className="grid gap-3 md:grid-cols-2">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                selected={selectedCompanyIds.includes(company.id)}
                onToggle={() => dispatch({ type: 'TOGGLE_COMPANY_SELECTION', id: company.id })}
              />
            ))}
          </div>

          <div className="sticky top-24 mt-6 hidden rounded-2xl border border-border bg-card p-4 md:mt-0 md:block">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Target sequence ({selectedCount})
            </h2>
            {selectedCompanies.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Select companies from the grid to build your visit queue.
              </p>
            ) : (
              <ul className="mb-4 space-y-2">
                {selectedCompanies.map((company) => (
                  <li key={company.id} className="flex items-center gap-2 text-sm text-card-foreground">
                    <CheckCircle size={15} weight="fill" className="shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{company.companyName}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">Booth {company.boothNumber}</span>
                  </li>
                ))}
              </ul>
            )}
            {generateButton}
          </div>
        </div>
      </StepShell>
    </>
  )
}
