export default function HistorialLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-7 w-28 bg-muted rounded-xl" />
        <div className="h-4 w-44 bg-muted rounded-lg" />
      </div>

      {/* Month groups */}
      {[1, 2].map(group => (
        <div key={group} className="space-y-2">
          <div className="h-4 w-24 bg-muted rounded-lg" />
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded" />
              </div>
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
