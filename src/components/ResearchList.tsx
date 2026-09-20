import type { Icon } from '@phosphor-icons/react'
import { SectionCard } from './StepShell'

/** A research field shown as a chip list, with a "not found" fallback for a legitimately empty result. */
export function ResearchList({ icon: Icon, label, items }: { icon: Icon; label: string; items: string[] }) {
  return (
    <SectionCard>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon size={16} weight="fill" className="text-accent-ink" aria-hidden="true" />
        {label}
      </h3>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not found.</p>
      )}
    </SectionCard>
  )
}
