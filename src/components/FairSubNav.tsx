'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { FairProfile } from '../wizard/types'
import { useWizard } from '../wizard/WizardContext'

interface FairTab {
  href: string
  label: string
  isReady: (fair: FairProfile) => boolean
}

const FAIR_TABS: FairTab[] = [
  { href: '/fair', label: 'Details', isReady: () => true },
  { href: '/matches', label: 'Matches', isReady: (fair) => fair.companies.length > 0 },
  { href: '/briefs', label: 'Briefs', isReady: (fair) => Object.keys(fair.prep).length > 0 },
]

/**
 * Persistent tab strip for jumping between one fair's own pages (details,
 * matches, briefs, fair day) without going back through Home each time.
 * Shown below Header on every per-fair page.
 */
export function FairSubNav({ fair }: { fair: FairProfile }) {
  const router = useRouter()
  const pathname = usePathname()
  const { dispatch } = useWizard()

  const fairDayReady = Object.keys(fair.prep).length > 0
  const fairDayEnabled = fair.fairMode.active || fairDayReady

  const handleFairDay = () => {
    if (!fairDayEnabled) return
    if (!fair.fairMode.active) dispatch({ type: 'ENTER_FAIR_MODE' })
    router.push('/')
  }

  const tabClass = (selected: boolean, enabled: boolean) =>
    [
      'min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      !enabled && 'cursor-not-allowed opacity-40',
      selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-card text-card-foreground hover:bg-muted',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div className="border-b border-border bg-background">
      <div
        className="mx-auto flex max-w-md gap-2 overflow-x-auto px-4 py-2.5 md:max-w-5xl md:px-8"
        role="tablist"
        aria-label="Fair sections"
      >
        {FAIR_TABS.map(({ href, label, isReady }) => {
          const enabled = isReady(fair)
          const selected = pathname === href
          return (
            <button
              key={href}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={!enabled}
              onClick={() => router.push(href)}
              className={tabClass(selected, enabled)}
            >
              {label}
            </button>
          )
        })}
        <button
          type="button"
          role="tab"
          aria-selected={false}
          disabled={!fairDayEnabled}
          onClick={handleFairDay}
          className={tabClass(false, fairDayEnabled)}
        >
          Fair Day
        </button>
      </div>
    </div>
  )
}
