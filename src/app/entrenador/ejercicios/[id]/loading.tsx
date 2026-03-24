export default function EjercicioDetailLoading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-muted rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-48 bg-muted rounded-xl" />
          <div className="h-5 w-20 bg-muted rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-muted rounded-xl" />
          <div className="h-9 w-24 bg-muted rounded-xl" />
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div className="h-5 w-32 bg-muted rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted rounded shrink-0" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* History / 1RM card */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <div className="h-5 w-40 bg-muted rounded" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
