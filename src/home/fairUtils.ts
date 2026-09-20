import type { FairProfile, FairStatus } from '../wizard/types'

export const TAG_CLASS =
  'inline-flex shrink-0 items-center rounded-[4px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em]'

/** In progress from the moment a fair is created; completed once every selected company has been visited. */
export function computeFairStatus(fair: FairProfile): FairStatus {
  const visitedAll =
    fair.selectedCompanyIds.length > 0 &&
    fair.selectedCompanyIds.every((id) => fair.fairMode.companyState[id]?.visited)
  return visitedAll ? 'completed' : 'in-progress'
}

export function formatFairDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Whole days between an ISO date and today, ignoring time of day. Negative means the date has passed. */
export function dayDelta(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - todayMidnight) / 86_400_000)
}
