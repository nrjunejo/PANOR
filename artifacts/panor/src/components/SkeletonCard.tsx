export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="rounded-lg p-4 space-y-3 animate-pulse"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <div className="h-3 rounded w-1/3" style={{ background: "hsl(var(--muted))" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-2 rounded" style={{ background: "hsl(var(--muted))", width: `${60 + (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 rounded-full" style={{ background: "hsl(var(--muted))" }} />
      <div className="flex-1 space-y-1">
        <div className="h-2.5 rounded w-1/3" style={{ background: "hsl(var(--muted))" }} />
        <div className="h-2 rounded w-1/2" style={{ background: "hsl(var(--muted))" }} />
      </div>
    </div>
  );
}
