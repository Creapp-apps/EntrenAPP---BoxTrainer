export default function AlumnoHomeLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-7 w-48 bg-muted rounded-xl" />
        <div className="h-4 w-32 bg-muted rounded-lg" />
      </div>

      {/* Active cycle card */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-8 bg-muted rounded-lg" />
          ))}
        </div>
      </div>

      {/* Today's session */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <div className="h-5 w-40 bg-muted rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="w-8 h-8 bg-muted rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-14 bg-muted rounded-full" />
          </div>
        ))}
        <div className="h-10 w-full bg-muted rounded-xl mt-2" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-7 w-12 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
