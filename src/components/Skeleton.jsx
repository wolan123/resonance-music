export function SkeletonCard() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="aspect-square animate-pulse rounded-2xl bg-ink-800" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-ink-800" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-ink-800" />
    </div>
  )
}

export function SkeletonRows({ count = 8 }) {
  return (
    <div className="mt-8 space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-ink-850 p-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-ink-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-ink-800" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-ink-800" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-ink-800" />
        </div>
      ))}
    </div>
  )
}
