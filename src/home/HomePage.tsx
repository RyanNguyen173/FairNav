'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { AccountMenu } from '../components/AccountMenu'
import { ThemeToggle } from '../components/ThemeToggle'
import { useWizard } from '../wizard/WizardContext'
import { FairBoard } from './FairBoard'
import { FairDay } from './FairDay'

type Tab = 'board' | 'day'

const TABS: { value: Tab; label: string }[] = [
  { value: 'board', label: 'Fair board' },
  { value: 'day', label: 'Fair day' },
]

/** Landing page after sign-in: account menu, and Fair Board / Fair Day tabs. */
export function HomePage() {
  const { state } = useWizard()
  // Land on Fair Day automatically if you're returning mid-fair.
  const [tab, setTab] = useState<Tab>(() => (state.fairProfiles.some((fair) => fair.fairMode.active) ? 'day' : 'board'))
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({})
  const [indicator, setIndicator] = useState({ x: 0, width: 0 })

  const syncIndicator = () => {
    const el = tabRefs.current[tab]
    if (!el) return
    setIndicator({ x: el.offsetLeft, width: el.offsetWidth })
  }

  // Layout effect (not a regular effect) so the indicator lands in the right
  // place before paint - no visible jump on first mount or tab switch.
  useLayoutEffect(() => {
    syncIndicator()
    window.addEventListener('resize', syncIndicator)
    return () => window.removeEventListener('resize', syncIndicator)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 border-b border-border px-4 py-4 md:max-w-5xl md:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo-cat.png" alt="" className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" />
            <h1 className="text-[17px] font-semibold tracking-tight text-foreground md:text-lg">FairNav</h1>
            <span className="hidden text-sm text-muted-foreground md:ml-2 md:inline">Home</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>

        <div
          className="relative mx-auto flex max-w-md gap-6 border-b border-border px-4 md:max-w-5xl md:px-8"
          role="tablist"
          aria-label="Home sections"
        >
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              ref={(el) => {
                if (el) tabRefs.current[value] = el
              }}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={[
                'cursor-pointer bg-transparent py-3.5 text-[15px] transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab === value ? 'font-medium text-foreground' : 'font-normal text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
          <span
            aria-hidden="true"
            className="absolute bottom-0 h-0.5 bg-primary transition-[transform,width] duration-200 ease-[cubic-bezier(0.77,0,0.175,1)]"
            style={{ transform: `translateX(${indicator.x}px)`, width: `${indicator.width}px` }}
          />
        </div>
      </header>

      {tab === 'board' ? (
        <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5 md:max-w-5xl md:px-8">
          <FairBoard />
        </div>
      ) : (
        <FairDay />
      )}
    </div>
  )
}
