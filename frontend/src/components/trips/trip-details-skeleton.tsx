export function TripDetailsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-pulse p-4">
      {/* Header Skeleton */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="h-8 w-48 rounded bg-border" />
          <div className="mt-2 h-4 w-64 rounded bg-border/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-border" />
          <div className="h-6 w-36 rounded-full bg-border" />
        </div>
      </div>

      {/* Card 1: Route Detail Skeleton */}
      <div className="bg-surface border-border flex flex-col gap-6 rounded-lg border p-6">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded bg-border" />
          <div className="h-5 w-20 rounded bg-border" />
        </div>

        {/* Timeline dots & texts */}
        <div className="flex flex-col gap-8 pl-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="size-4 rounded-full bg-border" />
                {i < 3 && <div className="h-12 w-0.5 border-l-2 border-dashed border-border" />}
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-border" />
                <div className="h-5 w-48 rounded bg-border" />
                {i < 3 && <div className="h-4 w-24 rounded bg-border/60" />}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom grid elements */}
        <div className="border-border grid grid-cols-3 gap-4 border-t pt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-border/60" />
              <div className="h-5 w-24 rounded bg-border" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: Map Skeleton */}
      <div className="bg-surface border-border flex flex-col gap-4 rounded-lg border p-6">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded bg-border" />
          <div className="h-5 w-16 rounded bg-border" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-full bg-border" />
          <div className="h-8 w-28 rounded-full bg-border" />
        </div>
        <div className="h-[400px] w-full rounded-lg bg-border/40 flex items-center justify-center">
          <div className="size-8 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      </div>
    </div>
  );
}
