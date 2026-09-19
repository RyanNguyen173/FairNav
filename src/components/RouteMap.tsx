import type { Company } from '../wizard/types'

interface RouteMapProps {
  allCompanies: Company[]
  queue: Company[]
  visitedIds: Set<string>
}

/** Numbered SVG route connecting the unvisited booths in queue order. */
export function RouteMap({ allCompanies, queue, visitedIds }: RouteMapProps) {
  const unvisitedQueue = queue.filter((company) => !visitedIds.has(company.id))
  const pathPoints = unvisitedQueue.map((company) => `${company.x},${company.y}`).join(' ')
  const contextCompanies = allCompanies.filter((company) => !queue.some((q) => q.id === company.id))

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Route map with ${unvisitedQueue.length} stops remaining`}
      className="h-full w-full rounded-2xl border border-border bg-card dark:bg-black"
    >
      {contextCompanies.map((company) => (
        <circle key={company.id} cx={company.x} cy={company.y} r={1.4} className="fill-muted-foreground/40" />
      ))}

      {unvisitedQueue.length > 1 && (
        <polyline
          points={pathPoints}
          fill="none"
          className="stroke-primary"
          strokeWidth={0.8}
          strokeDasharray="3 2"
          strokeLinecap="round"
        />
      )}

      {queue.map((company) => {
        const visited = visitedIds.has(company.id)
        const queueIndex = unvisitedQueue.findIndex((c) => c.id === company.id)
        return (
          <g key={company.id}>
            <circle
              cx={company.x}
              cy={company.y}
              r={3.4}
              className={visited ? 'fill-muted-foreground' : 'fill-primary'}
            />
            <text
              x={company.x}
              y={company.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-on-primary"
              style={{ fontSize: '3.2px', fontWeight: 700 }}
            >
              {visited ? '✓' : queueIndex + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
