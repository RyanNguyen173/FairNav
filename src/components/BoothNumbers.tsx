import { MapPin } from '@phosphor-icons/react'
import { useState } from 'react'

/** How many booth numbers to show before collapsing the rest behind "+N more". */
const VISIBLE_BOOTH_COUNT = 2

/**
 * "Booth 12, 14 +2 more" - a company can hold several booths, so every
 * place that lists them stays readable instead of dumping the whole array
 * inline. `compact` drops the icon/paragraph spacing for a single-line row
 * (e.g. a sidebar list item) rather than a standalone card line.
 */
export function BoothNumbers({ boothNumbers, compact = false }: { boothNumbers: string[]; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const Tag = compact ? 'span' : 'p'
  const wrapperClass = compact
    ? [
        'flex items-center gap-1 text-xs text-muted-foreground',
        // Collapsed: sits flush-right next to the name on the same line. A
        // fully expanded list can be long, so it drops to its own full-width
        // line instead of colliding with the name (shrink-0 wouldn't budge).
        expanded ? 'w-full basis-full flex-wrap' : 'ml-auto shrink-0 flex-wrap justify-end',
      ].join(' ')
    : 'mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground'

  if (boothNumbers.length === 0) {
    return (
      <Tag className={wrapperClass}>
        {!compact && <MapPin size={13} weight="fill" aria-hidden="true" />}
        {compact ? '—' : 'No booth listed'}
      </Tag>
    )
  }

  const hiddenCount = boothNumbers.length - VISIBLE_BOOTH_COUNT
  const shown = expanded ? boothNumbers : boothNumbers.slice(0, VISIBLE_BOOTH_COUNT)

  return (
    <Tag className={wrapperClass}>
      {!compact && <MapPin size={13} weight="fill" className="shrink-0" aria-hidden="true" />}
      Booth {shown.join(', ')}
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setExpanded(true)
          }}
          className="cursor-pointer font-semibold text-accent-ink underline underline-offset-2"
        >
          +{hiddenCount} more
        </button>
      )}
    </Tag>
  )
}
