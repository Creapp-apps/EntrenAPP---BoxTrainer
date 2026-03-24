export default function PagosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-20 bg-muted rounded-xl" />
          <div className="h-4 w-44 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-xl" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-border space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-7 w-20 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-white rounded-xl border border-border" />
        <div className="h-10 w-32 bg-muted rounded-xl" />
      </div>

      {/* Payment rows */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
            <div className="h-8 w-8 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
