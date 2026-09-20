export function MatchBadge({ percent }: { percent: number }) {
  const tone =
    percent >= 80 ? 'bg-primary text-on-primary' : percent >= 60 ? 'bg-secondary text-on-secondary' : 'bg-muted text-muted-foreground'
  return (
    <span className={['shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', tone].join(' ')}>{percent}% match</span>
  )
}
