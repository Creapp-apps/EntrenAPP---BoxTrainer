export default function OneRMLoading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-muted rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-40 bg-muted rounded-lg" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-xl" />
      </div>

      {/* 1RM table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <div className="flex-1 h-4 w-28 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="w-8" />
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b border-border last:border-0"
          >
            <div className="flex-1 h-4 w-36 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded-full" />
            <div className="w-8 h-8 bg-muted rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
