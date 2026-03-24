export default function ConfiguracionLoading() {
  return (
    <div className="max-w-2xl space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted rounded-xl" />
        <div className="h-8 w-40 bg-muted rounded-xl" />
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 w-14 bg-muted rounded-lg" />
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 h-11 bg-muted rounded-xl" />
          <div className="h-11 w-28 bg-muted rounded-xl" />
        </div>

        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
