import { CaretLeft } from '@phosphor-icons/react'
import { AccountMenu } from './AccountMenu'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  title: string
  onBack?: () => void
}

export function Header({ title, onBack }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4 md:max-w-5xl md:px-8">
        <div className="flex min-w-0 items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Home"
              className="-ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
          )}
          <img src="/logo-cat.png" alt="" className="h-6 w-6 shrink-0 object-contain" />
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground">FairNav</h1>
          <span className="hidden truncate text-sm text-muted-foreground md:ml-3 md:inline">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
      <p className="px-4 pb-3 text-xs font-medium text-muted-foreground md:hidden">{title}</p>
    </header>
  )
}
