import { X } from '@phosphor-icons/react'

interface ChipProps {
  label: string
  onRemove?: () => void
  selected?: boolean
  onClick?: () => void
}

export function Chip({ label, onRemove, selected, onClick }: ChipProps) {
  const isInteractive = Boolean(onClick)

  return (
    <span
      className={[
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium',
        'transition-colors duration-150',
        selected
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border bg-card text-card-foreground',
        isInteractive ? 'cursor-pointer hover:border-primary' : '',
      ].join(' ')}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${label}`}
          className="-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10"
        >
          <X size={12} weight="bold" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
