// Skeleton screen for LiveDashboard loading state
export default function SkeletonDashboard() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl overflow-hidden border-l-4 border-l-muted bg-card/50">
          {/* Competition header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-black/5 dark:bg-white/5">
            <div className="w-5 h-5 rounded bg-muted" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
          {/* Match cards */}
          <div className="px-3 py-2 space-y-2">
            {[1, 2].map(j => (
              <div key={j} className="bg-card rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between gap-2">
                  {/* Home team */}
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="h-2.5 w-16 bg-muted rounded" />
                  </div>
                  {/* Score */}
                  <div className="flex flex-col items-center gap-1 min-w-[80px]">
                    <div className="h-7 w-16 bg-muted rounded" />
                    <div className="h-2 w-8 bg-muted rounded" />
                  </div>
                  {/* Away team */}
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="h-2.5 w-16 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}