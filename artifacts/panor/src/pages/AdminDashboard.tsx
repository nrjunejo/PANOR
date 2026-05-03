import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import SkeletonCard, { SkeletonRow } from "@/components/SkeletonCard";
import {
  useGetDashboardSummary, useListPatients, useListAppointments, useListBills,
  useGetActiveAlerts, useUpdateAppointment, getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Users, Activity, CreditCard, AlertTriangle, Calendar, Settings } from "lucide-react";

const NAV = [
  { label: "Overview", href: "/admin", icon: <Activity size={14} /> },
  { label: "Patients", href: "/admin#patients", icon: <Users size={14} /> },
  { label: "Appointments", href: "/admin#appointments", icon: <Calendar size={14} /> },
  { label: "Billing", href: "/admin#billing", icon: <CreditCard size={14} /> },
  { label: "Alerts", href: "/admin#alerts", icon: <AlertTriangle size={14} /> },
  { label: "Settings", href: "/admin#settings", icon: <Settings size={14} /> },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"patients" | "appointments" | "billing" | "alerts">("patients");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: dashLoading } = useGetDashboardSummary({});
  const { data: patients, isLoading: patientsLoading } = useListPatients({ limit: 20 });
  const { data: appointments, isLoading: apptsLoading } = useListAppointments({});
  const { data: bills, isLoading: billsLoading } = useListBills({});
  const { data: alerts, isLoading: alertsLoading } = useGetActiveAlerts({});

  const updateAppt = useUpdateAppointment();

  const handleCancelAppt = (id: number) => {
    updateAppt.mutate(
      { id, data: { status: "cancelled" } },
      {
        onSuccess: () => {
          toast({ title: "Appointment cancelled" });
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({}) });
        },
        onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
      }
    );
  };

  const totalRevenue = (bills?.bills ?? []).filter((b: any) => b.status === "paid").reduce((sum: number, b: any) => sum + Number(b.total ?? 0), 0);
  const pendingRevenue = (bills?.bills ?? []).filter((b: any) => b.status === "pending").reduce((sum: number, b: any) => sum + Number(b.total ?? 0), 0);

  const TABS = [
    { key: "patients", label: "Patients", count: patients?.total ?? 0 },
    { key: "appointments", label: "Appointments", count: appointments?.total ?? 0 },
    { key: "billing", label: "Billing", count: bills?.total ?? 0 },
    { key: "alerts", label: "Alerts", count: alerts?.criticalCount ?? 0 },
  ] as const;

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <Sidebar navItems={NAV} role="admin" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Administration Panel</h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>PANOR system management and oversight</p>
        </div>

        {dashLoading ? (
          <div className="grid grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Total Patients" value={(dashboard?.totalPatients ?? 0).toLocaleString()} icon={<Users size={14} />} />
            <StatCard title="Today's Appointments" value={dashboard?.todayAppointments ?? 0} icon={<Calendar size={14} />} accent="default" />
            <StatCard title="Revenue Collected" value={`PKR ${totalRevenue.toLocaleString()}`} icon={<CreditCard size={14} />} accent="safe" />
            <StatCard title="Critical Alerts" value={dashboard?.criticalAlerts ?? 0} icon={<AlertTriangle size={14} />} accent={dashboard?.criticalAlerts ? "critical" : "safe"} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Active Visits" value={dashboard?.activeVisits ?? 0} icon={<Activity size={14} />} />
          <StatCard title="Pending Bills" value={`PKR ${pendingRevenue.toLocaleString()}`} icon={<CreditCard size={14} />} accent="warning" />
          <StatCard title="Pending Lab Orders" value={dashboard?.pendingLabOrders ?? 0} icon={<Activity size={14} />} accent="warning" />
        </div>

        <div>
          <div className="flex gap-1 p-1 rounded-lg w-fit mb-4" style={{ background: "hsl(var(--muted))" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                data-testid={`admin-tab-${tab.key}`}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={activeTab === tab.key ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))" } : { color: "hsl(var(--muted-foreground))" }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "patients" && (
            <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Patient Registry</h2>
              </div>
              {patientsLoading ? (
                <div className="space-y-0">{[0,1,2,3].map(i => <SkeletonRow key={i} />)}</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      {["Patient", "Medical ID", "Blood Group", "Conditions", "Risk Score"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider"
                          style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(patients?.patients ?? []).map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td className="px-4 py-3">
                          <div className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{p.name}</div>
                          <div style={{ color: "hsl(var(--muted-foreground))" }}>{p.gender} &bull; {p.phone}</div>
                        </td>
                        <td className="px-4 py-3 mono" style={{ color: "hsl(var(--primary))" }}>{p.medicalId}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "hsl(var(--foreground))" }}>{p.bloodGroup}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.activeConditions ?? []).slice(0, 2).map((c: string) => (
                              <span key={c} className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>{c}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: (p.riskScore ?? 0) >= 70 ? "hsl(0 72% 51%)" : (p.riskScore ?? 0) >= 40 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)" }}>
                            {p.riskScore ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>All Appointments</h2>
              </div>
              {apptsLoading ? (
                <div className="space-y-0">{[0,1,2,3].map(i => <SkeletonRow key={i} />)}</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      {["Patient", "Doctor", "Specialty", "Date/Time", "Status", "Action"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider"
                          style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(appointments?.appointments ?? []).map((a: any) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td className="px-4 py-3 font-medium" style={{ color: "hsl(var(--foreground))" }}>{a.patientName}</td>
                        <td className="px-4 py-3" style={{ color: "hsl(var(--foreground))" }}>{a.doctorName}</td>
                        <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{a.specialty}</td>
                        <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {new Date(a.datetime).toLocaleDateString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3"><SeverityBadge severity={a.status} /></td>
                        <td className="px-4 py-3">
                          {a.status === "scheduled" && (
                            <button
                              onClick={() => handleCancelAppt(a.id)}
                              data-testid={`button-cancel-appt-${a.id}`}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 51%)" }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "billing" && (
            <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Billing Overview</h2>
              </div>
              {billsLoading ? (
                <div className="space-y-0">{[0,1,2,3].map(i => <SkeletonRow key={i} />)}</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      {["Patient", "Summary", "Amount", "Status", "Date"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider"
                          style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(bills?.bills ?? []).map((b: any) => (
                      <tr key={b.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td className="px-4 py-3 font-medium" style={{ color: "hsl(var(--foreground))" }}>{b.patientName}</td>
                        <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{b.aiSummary?.slice(0, 40)}</td>
                        <td className="px-4 py-3 font-semibold mono" style={{ color: "hsl(var(--foreground))" }}>PKR {Number(b.total).toLocaleString()}</td>
                        <td className="px-4 py-3"><SeverityBadge severity={b.status} /></td>
                        <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {new Date(b.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="space-y-3">
              {alertsLoading ? (
                <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} lines={2} />)}</div>
              ) : (
                (alerts?.alerts ?? []).map((a: any) => (
                  <div key={a.id} className="rounded-xl p-4"
                    style={{
                      background: a.severity === "critical" ? "hsl(0 72% 51% / 0.08)" : "hsl(38 92% 50% / 0.08)",
                      border: `1px solid ${a.severity === "critical" ? "hsl(0 72% 51% / 0.25)" : "hsl(38 92% 50% / 0.25)"}`,
                    }}>
                    <div className="flex items-start gap-3">
                      <SeverityBadge severity={a.severity} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{a.message}</p>
                        <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {new Date(a.createdAt).toLocaleString("en-PK")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {!(alerts?.alerts ?? []).length && (
                <div className="rounded-xl p-8 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <AlertTriangle size={24} className="mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No active alerts</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
