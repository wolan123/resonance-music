export function SkeletonRows({ count = 8 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-white/8" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-white/8" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-white/8" />
          </div>
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/8" />
        </div>
      ))}
    </div>
  )
}
