export default function CycleDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-muted rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-52 bg-muted rounded-xl" />
          <div className="h-4 w-36 bg-muted rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-muted rounded-xl" />
          <div className="h-9 w-32 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-9 w-20 bg-muted rounded-xl" />
        ))}
        <div className="h-9 w-9 bg-muted rounded-xl" />
      </div>

      {/* Day blocks */}
      <div className="space-y-4">
        {[1, 2, 3].map(day => (
          <div key={day} className="bg-white rounded-2xl border border-border overflow-hidden">
            {/* Day header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="h-5 w-20 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            {/* Exercises */}
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(ex => (
                <div key={ex} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                  <div className="w-7 h-7 bg-muted rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-28 bg-muted rounded" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-6 w-14 bg-muted rounded-lg" />
                    <div className="h-6 w-14 bg-muted rounded-lg" />
                  </div>
                </div>
              ))}
              <div className="h-8 w-full bg-muted/40 rounded-xl mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
