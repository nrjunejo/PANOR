import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import SkeletonCard from "@/components/SkeletonCard";
import {
  useGetDashboardSummary, useGetEpidemiologyClusters, useGetEpidemiologyTrends,
  useGetRecentActivity, useGetActiveAlerts,
} from "@workspace/api-client-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Users, Activity, FlaskConical, Calendar, TrendingUp, AlertTriangle, Radio } from "lucide-react";

const NAV = [
  { label: "Overview", href: "/analytics", icon: <Activity size={14} /> },
  { label: "Disease Map", href: "/analytics#map", icon: <Radio size={14} /> },
  { label: "Trends", href: "/analytics#trends", icon: <TrendingUp size={14} /> },
  { label: "Alerts", href: "/analytics#alerts", icon: <AlertTriangle size={14} /> },
];

const DISEASE_COLORS = [
  "hsl(199 89% 48%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)",
  "hsl(0 72% 51%)", "hsl(270 60% 60%)", "hsl(180 60% 45%)", "hsl(320 60% 55%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
      <p className="font-semibold mb-1.5" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          <span style={{ color: "hsl(var(--muted-foreground))" }}>{entry.name}:</span>
          <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const { data: dashboard, isLoading: dashLoading } = useGetDashboardSummary({});
  const { data: clusters, isLoading: clustersLoading } = useGetEpidemiologyClusters({});
  const { data: trends, isLoading: trendsLoading } = useGetEpidemiologyTrends();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({});
  const { data: alerts, isLoading: alertsLoading } = useGetActiveAlerts({});

  const diseases = trends?.diseases ?? [];
  const trendData = (trends?.trends ?? []).reduce((acc: Record<string, any>, item: any) => {
    if (!acc[item.date]) acc[item.date] = { date: item.date.slice(5) };
    acc[item.date][item.disease] = item.count;
    return acc;
  }, {});
  const chartData = Object.values(trendData).slice(-14);

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <Sidebar navItems={NAV} role="analyst" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Epidemiology Radar</h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Real-time disease surveillance and outbreak detection</p>
        </div>

        {dashLoading ? (
          <div className="grid grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Total Patients" value={(dashboard?.totalPatients ?? 0).toLocaleString()} icon={<Users size={14} />} />
            <StatCard title="Active Visits" value={dashboard?.activeVisits ?? 0} icon={<Activity size={14} />} accent="default" />
            <StatCard title="Pending Lab Orders" value={dashboard?.pendingLabOrders ?? 0} icon={<FlaskConical size={14} />} accent="warning" />
            <StatCard title="Critical Alerts" value={dashboard?.criticalAlerts ?? 0} icon={<AlertTriangle size={14} />} accent={dashboard?.criticalAlerts ? "critical" : "safe"} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center gap-2">
              <Radio size={14} style={{ color: "hsl(var(--primary))" }} />
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Disease Clusters</h2>
            </div>
            {clustersLoading ? <SkeletonCard lines={5} /> : (
              <div className="space-y-3">
                {(clusters?.clusters ?? []).map((c: any) => (
                  <div key={c.id} className="p-3 rounded-md space-y-2" style={{ background: "hsl(var(--muted))" }}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.disease}</span>
                          <SeverityBadge severity={c.trend ?? "stable"} />
                        </div>
                        <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{c.region}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>{c.caseCount}</div>
                        <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>cases</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>Outbreak probability</span>
                        <span className="font-medium"
                          style={{ color: c.outbreakProbability >= 0.6 ? "hsl(0 72% 51%)" : c.outbreakProbability >= 0.4 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)" }}>
                          {Math.round((c.outbreakProbability ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "hsl(var(--border))" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((c.outbreakProbability ?? 0) * 100)}%`,
                            background: c.outbreakProbability >= 0.6 ? "hsl(0 72% 51%)" : c.outbreakProbability >= 0.4 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)",
                          }} />
                      </div>
                    </div>
                    <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      First detected: {c.firstDetected ? new Date(c.firstDetected).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "Unknown"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: "hsl(var(--primary))" }} />
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Disease Trends (14-day)</h2>
              </div>
              {trendsLoading ? <SkeletonCard lines={6} /> : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 20% 18%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(215 15% 55%)" }} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(215 15% 55%)" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "9px", color: "hsl(215 15% 55%)" }} />
                      {diseases.map((disease: string, i: number) => (
                        <Line
                          key={disease}
                          type="monotone"
                          dataKey={disease}
                          stroke={DISEASE_COLORS[i % DISEASE_COLORS.length]}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Active Alerts</h2>
              {alertsLoading ? <SkeletonCard lines={3} /> : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(alerts?.alerts ?? []).slice(0, 6).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 p-2 rounded-md"
                      style={{ background: a.severity === "critical" ? "hsl(0 72% 51% / 0.1)" : "hsl(38 92% 50% / 0.1)" }}>
                      <SeverityBadge severity={a.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{a.title}</p>
                        <p className="text-[10px] truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{a.message}</p>
                      </div>
                    </div>
                  ))}
                  {!(alerts?.alerts ?? []).length && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No active alerts</p>}
                </div>
              )}
            </div>

            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Recent Activity</h2>
              {activityLoading ? <SkeletonCard lines={3} /> : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {(activity?.activities ?? []).slice(0, 6).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.severity === "critical" ? "hsl(0 72% 51%)" : "hsl(var(--primary))" }} />
                      <div>
                        <p className="text-xs" style={{ color: "hsl(var(--foreground))" }}>{a.description}</p>
                        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {new Date(a.timestamp).toLocaleString("en-PK", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
