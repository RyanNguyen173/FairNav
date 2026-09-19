'use client'

import { useState } from 'react'
import { AccountMenu } from '../components/AccountMenu'
import { ThemeToggle } from '../components/ThemeToggle'
import { useWizard } from '../wizard/WizardContext'
import { FairBoard } from './FairBoard'
import { FairDay } from './FairDay'

type Tab = 'board' | 'day'

const TABS: { value: Tab; label: string }[] = [
  { value: 'board', label: 'Fair Board' },
  { value: 'day', label: 'Fair Day' },
]

/** Landing page after sign-in: account menu, and Fair Board / Fair Day tabs. */
export function HomePage() {
  const { state } = useWizard()
  // Land on Fair Day automatically if you're returning mid-fair.
  const [tab, setTab] = useState<Tab>(() => (state.fairProfiles.some((fair) => fair.fairMode.active) ? 'day' : 'board'))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4 md:max-w-5xl md:px-8">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            FairNav <span className="text-primary">•</span>
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>

        <div className="mx-auto max-w-md px-4 pb-3 md:max-w-5xl md:px-8">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Home sections">
            {TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={[
                  'min-h-9 cursor-pointer rounded-lg text-sm font-semibold transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tab === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'board' ? (
        <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5 md:max-w-5xl md:px-8">
          <FairBoard onEnterFairDay={() => setTab('day')} />
        </div>
      ) : (
        <FairDay />
      )}
    </div>
  )
}
