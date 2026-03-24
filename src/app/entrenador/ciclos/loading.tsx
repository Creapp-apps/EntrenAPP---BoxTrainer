export default function CiclosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 bg-muted rounded-xl" />
          <div className="h-4 w-44 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-xl" />
      </div>
      {/* Tabs */}
      <div className="h-10 w-56 bg-muted rounded-xl" />
      {/* Cards */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-border space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-5 w-20 bg-muted rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
