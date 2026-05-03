import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  accent?: "default" | "critical" | "warning" | "safe";
  subtitle?: string;
}

const ACCENT_COLORS = {
  default: "hsl(var(--primary))",
  critical: "hsl(0 72% 51%)",
  warning: "hsl(38 92% 50%)",
  safe: "hsl(142 71% 45%)",
};

export default function StatCard({ title, value, icon, trend, trendValue, accent = "default", subtitle }: StatCardProps) {
  const accentColor = ACCENT_COLORS[accent];

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          {title}
        </span>
        {icon && (
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${accentColor}20` }}>
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{value}</div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-1">
          {trend && (
            <span style={{ color: trend === "up" ? "hsl(142 71% 45%)" : trend === "down" ? "hsl(0 72% 51%)" : "hsl(var(--muted-foreground))" }}>
              {trend === "up" ? <TrendingUp size={12} /> : trend === "down" ? <TrendingDown size={12} /> : <Minus size={12} />}
            </span>
          )}
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {trendValue ?? subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
