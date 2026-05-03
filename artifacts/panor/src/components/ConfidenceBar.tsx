interface ConfidenceBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
}

export default function ConfidenceBar({ value, label = "AI Confidence", showPercent = true }: ConfidenceBarProps) {
  const pct = Math.round(value <= 1 ? value * 100 : value);
  const color = pct >= 80 ? "hsl(142 71% 45%)" : pct >= 60 ? "hsl(199 89% 48%)" : pct >= 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";

  return (
    <div className="space-y-1" data-testid="confidence-bar">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
        {showPercent && (
          <span className="text-xs font-mono font-medium" style={{ color }}>{pct}%</span>
        )}
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "hsl(var(--border))" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
