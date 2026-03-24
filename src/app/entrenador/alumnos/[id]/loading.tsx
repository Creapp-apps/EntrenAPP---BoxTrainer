export default function AlumnoDetailLoading() {
  return (
    <div className="space-y-6 max-w-4xl animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-muted rounded-xl shrink-0" />
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-muted shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-muted rounded-lg" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-16 bg-muted rounded-xl" />
          <div className="h-9 w-28 bg-muted rounded-xl" />
          <div className="h-9 w-20 bg-muted rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <div className="h-5 w-36 bg-muted rounded" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 bg-muted rounded shrink-0" />
                <div className="h-4 flex-1 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="h-5 w-48 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-4 h-4 bg-muted rounded shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-28 bg-muted rounded" />
                  </div>
                  <div className="h-5 w-14 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="h-5 w-24 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
