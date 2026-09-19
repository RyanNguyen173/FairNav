import { CaretLeft } from '@phosphor-icons/react'
import { TOTAL_STEPS } from '../wizard/types'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  step: number
  stepLabel: string
  onBack?: () => void
}

export function Header({ step, stepLabel, onBack }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pt-4 md:max-w-5xl md:px-8">
        <div className="flex min-w-0 items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back a step"
              className="-ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
          )}
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
            FairNav <span className="text-primary">•</span>
          </h1>
          <span className="hidden text-sm font-medium text-muted-foreground md:ml-3 md:inline">
            {stepLabel} · Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-md px-4 pb-3 pt-2.5 md:max-w-5xl md:px-8">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground md:hidden">
          <span>{stepLabel}</span>
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((segment) => (
            <span
              key={segment}
              className={[
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                segment <= step ? 'bg-primary' : 'bg-muted',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </header>
  )
}
