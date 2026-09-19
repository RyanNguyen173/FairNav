import type { ReactNode } from 'react'

interface StepShellProps {
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared layout for every step: single column on mobile (<768px), a wider
 * canvas on desktop (>=768px) so each step's own 2-column split has room.
 */
export function StepShell({ children, footer }: StepShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-5xl">
      <div className="flex-1 px-4 pb-6 pt-5 md:px-8 md:pt-8">{children}</div>
      {footer && (
        <div className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto w-full md:max-w-5xl">{footer}</div>
        </div>
      )}
    </div>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-foreground">
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return (
    <input
      {...rest}
      className={[
        'min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-[15px] text-card-foreground',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      ].join(' ')}
    />
  )
}

export function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={['rounded-2xl border border-border bg-card p-4 text-card-foreground', className].join(' ')}>
      {children}
    </div>
  )
}
