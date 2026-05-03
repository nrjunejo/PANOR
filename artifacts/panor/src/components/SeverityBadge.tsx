import { cn } from "@/lib/utils";

type Severity = "info" | "warning" | "critical" | "safe" | "low" | "moderate" | "high" | string;

const CONFIGS: Record<string, { bg: string; text: string; dot: string; label?: string }> = {
  info: { bg: "hsl(199 89% 48% / 0.12)", text: "hsl(199 89% 48%)", dot: "hsl(199 89% 48%)" },
  warning: { bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 50%)", dot: "hsl(38 92% 50%)" },
  critical: { bg: "hsl(0 72% 51% / 0.12)", text: "hsl(0 72% 51%)", dot: "hsl(0 72% 51%)" },
  safe: { bg: "hsl(142 71% 45% / 0.12)", text: "hsl(142 71% 45%)", dot: "hsl(142 71% 45%)" },
  low: { bg: "hsl(142 71% 45% / 0.12)", text: "hsl(142 71% 45%)", dot: "hsl(142 71% 45%)" },
  moderate: { bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 50%)", dot: "hsl(38 92% 50%)" },
  high: { bg: "hsl(0 72% 51% / 0.12)", text: "hsl(0 72% 51%)", dot: "hsl(0 72% 51%)" },
  increasing: { bg: "hsl(0 72% 51% / 0.12)", text: "hsl(0 72% 51%)", dot: "hsl(0 72% 51%)" },
  decreasing: { bg: "hsl(142 71% 45% / 0.12)", text: "hsl(142 71% 45%)", dot: "hsl(142 71% 45%)" },
  stable: { bg: "hsl(199 89% 48% / 0.12)", text: "hsl(199 89% 48%)", dot: "hsl(199 89% 48%)" },
  stat: { bg: "hsl(0 72% 51% / 0.12)", text: "hsl(0 72% 51%)", dot: "hsl(0 72% 51%)", label: "STAT" },
  urgent: { bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 50%)", dot: "hsl(38 92% 50%)", label: "URGENT" },
  routine: { bg: "hsl(199 89% 48% / 0.12)", text: "hsl(199 89% 48%)", dot: "hsl(199 89% 48%)", label: "ROUTINE" },
  blocked: { bg: "hsl(0 72% 51% / 0.12)", text: "hsl(0 72% 51%)", dot: "hsl(0 72% 51%)" },
  active: { bg: "hsl(199 89% 48% / 0.12)", text: "hsl(199 89% 48%)", dot: "hsl(199 89% 48%)" },
  completed: { bg: "hsl(142 71% 45% / 0.12)", text: "hsl(142 71% 45%)", dot: "hsl(142 71% 45%)" },
  pending: { bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 50%)", dot: "hsl(38 92% 50%)" },
  paid: { bg: "hsl(142 71% 45% / 0.12)", text: "hsl(142 71% 45%)", dot: "hsl(142 71% 45%)" },
  scheduled: { bg: "hsl(199 89% 48% / 0.12)", text: "hsl(199 89% 48%)", dot: "hsl(199 89% 48%)" },
};

export default function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const key = (severity ?? "info").toLowerCase();
  const cfg = CONFIGS[key] ?? CONFIGS.info;
  const displayLabel = cfg.label ?? (severity.charAt(0).toUpperCase() + severity.slice(1));

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}
      style={{ background: cfg.bg, color: cfg.text }}
      data-testid={`badge-${key}`}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.dot }} />
      {displayLabel}
    </span>
  );
}
