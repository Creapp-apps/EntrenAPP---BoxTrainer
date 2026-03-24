export default function AlumnoPagosLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-24">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-7 w-20 bg-muted rounded-xl" />
        <div className="h-4 w-44 bg-muted rounded-lg" />
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <div className="h-5 w-36 bg-muted rounded" />
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="h-8 w-28 bg-muted rounded-lg" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </div>

      {/* Payment history */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-muted rounded" />
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 w-16 bg-muted rounded-lg" />
              <div className="h-5 w-14 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
