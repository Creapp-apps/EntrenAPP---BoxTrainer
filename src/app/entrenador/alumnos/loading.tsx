export default function AlumnosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted rounded-xl" />
          <div className="h-4 w-40 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-xl" />
      </div>
      {/* Search bar */}
      <div className="h-12 w-full bg-white rounded-xl border border-border" />
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded-lg" />
                <div className="h-3 w-40 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded-full mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
