export default function EjerciciosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-muted rounded-xl" />
          <div className="h-4 w-44 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-muted rounded-xl" />
      </div>
      <div className="h-12 w-full bg-white rounded-xl border border-border" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-border flex items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
