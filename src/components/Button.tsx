import { CircleNotch } from '@phosphor-icons/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:opacity-90 focus-visible:ring-ring disabled:opacity-50',
  // The Vesper hairline secondary: paper/white with a translucent edge, not a filled button.
  secondary:
    'bg-card text-foreground shadow-hairline hover:bg-muted focus-visible:ring-ring disabled:opacity-50',
  ghost:
    'bg-transparent text-foreground hover:bg-muted focus-visible:ring-ring disabled:opacity-50',
  destructive:
    'bg-destructive text-on-destructive hover:opacity-90 focus-visible:ring-ring disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5',
        'text-[15px] font-semibold transition-[transform,opacity,background-color,box-shadow] duration-150 ease-out active:scale-[0.97]',
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:active:scale-100',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <CircleNotch className="animate-spin" size={18} weight="bold" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
