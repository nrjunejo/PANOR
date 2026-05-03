import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import SkeletonCard from "@/components/SkeletonCard";
import {
  useGetPatientTimeline, useGetPatientMedications, useListAppointments, useListBills,
  useAiIntakeSummary,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { User, Clock, Pill, CreditCard, Activity, Stethoscope, FlaskConical, Bell, ChevronDown, ChevronUp } from "lucide-react";

const NAV = [
  { label: "Overview", href: "/patient", icon: <Activity size={14} /> },
  { label: "Timeline", href: "/patient#timeline", icon: <Clock size={14} /> },
  { label: "Medications", href: "/patient#meds", icon: <Pill size={14} /> },
  { label: "Appointments", href: "/patient#appts", icon: <Stethoscope size={14} /> },
  { label: "Billing", href: "/patient#billing", icon: <CreditCard size={14} /> },
];

const EVENT_ICONS: Record<string, React.ReactNode> = {
  visit: <Stethoscope size={12} />,
  prescription: <Pill size={12} />,
  lab_result: <FlaskConical size={12} />,
  alert: <Bell size={12} />,
};

function WhyPanel({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium"
        style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
      >
        <span>Why this assessment?</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 py-2 text-xs" style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--card))" }}>
          {text}
        </div>
      )}
    </div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  const patientId = 1;

  const { data: timeline, isLoading: tlLoading } = useGetPatientTimeline(patientId);
  const { data: medications, isLoading: medsLoading } = useGetPatientMedications(patientId);
  const { data: appointments, isLoading: apptsLoading } = useListAppointments({ patientId });
  const { data: bills, isLoading: billsLoading } = useListBills({ patientId });

  const intakeMutation = useAiIntakeSummary();

  const handleIntake = () => {
    if (!symptoms.trim()) return;
    intakeMutation.mutate(
      { data: { symptoms, language: "en" } },
      {
        onSuccess: (data: any) => { setAiResult(data); setWhyOpen(false); },
        onError: () => toast({ title: "AI Error", description: "Unable to process symptoms.", variant: "destructive" }),
      }
    );
  };

  const activeMeds = (medications?.medications ?? []).filter((m: any) => m.active);
  const pendingBills = (bills?.bills ?? []).filter((b: any) => b.status === "pending");
  const totalOwed = pendingBills.reduce((sum: number, b: any) => sum + (b.total ?? 0), 0);

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <Sidebar navItems={NAV} role="patient" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
            Welcome back, {user?.name?.split(" ")[0] ?? "Patient"}
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Your health dashboard — all your records in one place</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Medical ID" value="MED-PAT001" icon={<User size={14} />} />
          <StatCard title="Blood Group" value="B+" icon={<Activity size={14} />} accent="safe" />
          <StatCard title="Active Medications" value={activeMeds.length} icon={<Pill size={14} />} accent="default" />
          <StatCard title="Amount Owed" value={`PKR ${totalOwed.toLocaleString()}`} icon={<CreditCard size={14} />} accent={totalOwed > 0 ? "warning" : "safe"} />
        </div>

        <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>AI Symptom Intake</h2>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Describe your symptoms and let PANOR's AI pre-assess your condition</p>
          </div>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe your symptoms... (e.g., I have had a persistent headache for 3 days with mild fever and fatigue)"
            data-testid="input-symptoms"
            rows={3}
            className="w-full rounded-md px-3 py-2 text-sm outline-none resize-none"
            style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
          />
          <button
            onClick={handleIntake}
            disabled={intakeMutation.isPending || !symptoms.trim()}
            data-testid="button-analyze-symptoms"
            className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            {intakeMutation.isPending ? "Analyzing..." : "Analyze Symptoms"}
          </button>

          {aiResult && (
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center gap-3">
                <SeverityBadge severity={aiResult.urgencyLevel ?? "info"} />
                <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{aiResult.chiefComplaint}</span>
              </div>
              {aiResult.suggestedSpecialty && (
                <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Suggested specialty: <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>{aiResult.suggestedSpecialty}</span>
                </div>
              )}
              {aiResult.structuredSymptoms?.length > 0 && (
                <div className="space-y-1">
                  {aiResult.structuredSymptoms.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                      <span style={{ color: "hsl(var(--foreground))" }}>{s.symptom}</span>
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>&bull; {s.duration} &bull; {s.severity}</span>
                    </div>
                  ))}
                </div>
              )}
              <ConfidenceBar value={aiResult.confidenceScore ?? 0.7} />
              <WhyPanel text={aiResult.aiExplanation ?? ""} open={whyOpen} onToggle={() => setWhyOpen(!whyOpen)} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Health Timeline</h2>
            {tlLoading ? <SkeletonCard lines={4} /> : (
              <div className="space-y-0">
                {(timeline?.events ?? []).slice(0, 8).map((e: any, i: number) => (
                  <div key={e.id ?? i} className="flex gap-3 pb-4 relative">
                    {i < (timeline?.events ?? []).slice(0, 8).length - 1 && (
                      <div className="absolute left-3 top-6 bottom-0 w-px" style={{ background: "hsl(var(--border))" }} />
                    )}
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                      style={{ background: e.severity === "critical" ? "hsl(0 72% 51% / 0.2)" : e.severity === "warning" ? "hsl(38 92% 50% / 0.2)" : "hsl(var(--muted))", color: e.severity === "critical" ? "hsl(0 72% 51%)" : e.severity === "warning" ? "hsl(38 92% 50%)" : "hsl(var(--muted-foreground))" }}>
                      {EVENT_ICONS[e.type] ?? <Activity size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>{e.title}</span>
                        <SeverityBadge severity={e.severity ?? "info"} />
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{e.description}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {e.date ? new Date(e.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {!timeline?.events?.length && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No timeline events yet</p>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Active Medications</h2>
              {medsLoading ? <SkeletonCard lines={2} /> : (
                <div className="space-y-2">
                  {activeMeds.slice(0, 4).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-md" style={{ background: "hsl(var(--muted))" }}>
                      <Pill size={12} style={{ color: "hsl(var(--primary))" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{m.name}</div>
                        <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{m.dosage} &bull; {m.frequency}</div>
                      </div>
                      <SeverityBadge severity="active" />
                    </div>
                  ))}
                  {!activeMeds.length && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No active medications</p>}
                </div>
              )}
            </div>

            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Upcoming Appointments</h2>
              {apptsLoading ? <SkeletonCard lines={2} /> : (
                <div className="space-y-2">
                  {(appointments?.appointments ?? []).filter((a: any) => a.status === "scheduled").slice(0, 3).map((a: any) => (
                    <div key={a.id} className="p-2 rounded-md" style={{ background: "hsl(var(--muted))" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>{a.doctorName}</span>
                        <SeverityBadge severity={a.priority === "urgent" ? "warning" : "info"} />
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {a.specialty} &bull; {new Date(a.datetime).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                    </div>
                  ))}
                  {!(appointments?.appointments ?? []).filter((a: any) => a.status === "scheduled").length && (
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No upcoming appointments</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Billing</h2>
              {billsLoading ? <SkeletonCard lines={2} /> : (
                <div className="space-y-2">
                  {(bills?.bills ?? []).slice(0, 3).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-md" style={{ background: "hsl(var(--muted))" }}>
                      <div>
                        <div className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>PKR {Number(b.total).toLocaleString()}</div>
                        <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{b.aiSummary?.slice(0, 40)}</div>
                      </div>
                      <SeverityBadge severity={b.status} />
                    </div>
                  ))}
                  {!(bills?.bills ?? []).length && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No billing records</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
