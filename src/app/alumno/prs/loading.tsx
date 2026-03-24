export default function PRsLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-7 w-32 bg-muted rounded-xl" />
        <div className="h-4 w-48 bg-muted rounded-lg" />
      </div>

      {/* PR list */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-5 w-20 bg-muted rounded-lg" />
              <div className="h-3 w-14 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
