import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import SkeletonCard from "@/components/SkeletonCard";
import {
  useListVisits, useGetDashboardSummary, useGetActiveAlerts,
  useAiCopilot, useCheckDrugInteraction, useCreatePrescription, useListPatients,
  getListVisitsQueryKey, getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity, Stethoscope, Brain, Shield, Calendar, Users,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/doctor", icon: <Activity size={14} /> },
  { label: "Active Visits", href: "/doctor#visits", icon: <Stethoscope size={14} /> },
  { label: "AI Co-pilot", href: "/doctor#copilot", icon: <Brain size={14} /> },
  { label: "Drug Safety", href: "/doctor#drug", icon: <Shield size={14} /> },
  { label: "Schedule", href: "/doctor#schedule", icon: <Calendar size={14} /> },
  { label: "Patients", href: "/doctor#patients", icon: <Users size={14} /> },
];

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

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [clinicalNotes, setClinicalNotes] = useState("");
  const [symptomsInput, setSymptomsInput] = useState("");
  const [copilotResult, setCopilotResult] = useState<any>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  const [drugInput, setDrugInput] = useState("");
  const [drugPatientId, setDrugPatientId] = useState("1");
  const [drugResult, setDrugResult] = useState<any>(null);

  const [rxPatientId, setRxPatientId] = useState("1");
  const [rxMed, setRxMed] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxFreq, setRxFreq] = useState("");
  const [rxDuration, setRxDuration] = useState("");

  const { data: dashboard, isLoading: dashLoading } = useGetDashboardSummary({});
  const { data: visits, isLoading: visitsLoading } = useListVisits({ status: "active", limit: 10 });
  const { data: alerts, isLoading: alertsLoading } = useGetActiveAlerts({});
  const { data: patients } = useListPatients({});

  const copilotMutation = useAiCopilot();
  const drugCheckMutation = useCheckDrugInteraction();
  const prescribeMutation = useCreatePrescription();

  const handleCopilot = () => {
    if (!clinicalNotes.trim()) return;
    copilotMutation.mutate(
      { data: { clinicalNotes, symptoms: symptomsInput, visitId: (visits?.visits ?? [])[0]?.id ?? 1 } },
      {
        onSuccess: (data: any) => { setCopilotResult(data); setWhyOpen(false); },
        onError: () => toast({ title: "AI Error", description: "Could not run AI analysis.", variant: "destructive" }),
      }
    );
  };

  const handleDrugCheck = () => {
    if (!drugInput.trim()) return;
    drugCheckMutation.mutate(
      { data: { newMedication: drugInput, patientId: parseInt(drugPatientId) || 1 } },
      {
        onSuccess: (data: any) => setDrugResult(data),
        onError: () => toast({ title: "Drug check failed", variant: "destructive" }),
      }
    );
  };

  const handlePrescribe = () => {
    if (!rxMed.trim() || !rxDosage.trim()) return;
    prescribeMutation.mutate(
      {
        data: {
          patientId: parseInt(rxPatientId) || 1,
          visitId: (visits?.visits ?? [])[0]?.id ?? 1,
          medication: rxMed,
          dosage: rxDosage,
          frequency: rxFreq || "Once daily",
          duration: rxDuration || "7 days",
          instructions: "",
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Prescription created", description: `${rxMed} prescribed successfully` });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({}) });
          setRxMed(""); setRxDosage(""); setRxFreq(""); setRxDuration("");
        },
        onError: () => toast({ title: "Prescription failed", variant: "destructive" }),
      }
    );
  };

  const safetyColor = drugResult
    ? drugResult.status === "blocked" ? "hsl(0 72% 51%)"
    : drugResult.status === "warning" ? "hsl(38 92% 50%)"
    : "hsl(142 71% 45%)"
    : "";

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <Sidebar navItems={NAV} role="doctor" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {user?.name ?? "Doctor"} — Clinical Workstation
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {user?.specialization ?? "General Medicine"} &bull; {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {dashLoading ? (
          <div className="grid grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Active Visits" value={dashboard?.activeVisits ?? 0} icon={<Stethoscope size={14} />} accent="default" />
            <StatCard title="Today's Appointments" value={dashboard?.todayAppointments ?? 0} icon={<Calendar size={14} />} />
            <StatCard title="Critical Alerts" value={dashboard?.criticalAlerts ?? 0} icon={<AlertTriangle size={14} />} accent={dashboard?.criticalAlerts ? "critical" : "safe"} />
            <StatCard title="Pending Lab Orders" value={dashboard?.pendingLabOrders ?? 0} icon={<Activity size={14} />} accent="warning" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-2">
                <Brain size={14} style={{ color: "hsl(var(--primary))" }} />
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>AI Co-pilot</h2>
              </div>
              <div className="space-y-2">
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Enter clinical notes, observations, vitals..."
                  data-testid="input-clinical-notes"
                  rows={3}
                  className="w-full rounded-md px-3 py-2 text-sm outline-none resize-none"
                  style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                />
                <input
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder="Key symptoms (optional)"
                  data-testid="input-symptoms-copilot"
                  className="w-full rounded-md px-3 py-2 text-sm outline-none"
                  style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                />
                <button
                  onClick={handleCopilot}
                  disabled={copilotMutation.isPending || !clinicalNotes.trim()}
                  data-testid="button-run-copilot"
                  className="w-full py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  {copilotMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
                </button>
              </div>

              {copilotResult && (
                <div className="space-y-3 pt-2 border-t" style={{ borderColor: "hsl(var(--border))" }}>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Differential Diagnoses</p>
                    {(copilotResult.differentialDiagnoses ?? []).map((d: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-md space-y-1.5" style={{ background: "hsl(var(--muted))" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>{d.diagnosis}</span>
                          <SeverityBadge severity={d.urgency ?? "info"} />
                        </div>
                        <div className="h-1 rounded-full" style={{ background: "hsl(var(--border))" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.round((d.probability ?? 0) * 100)}%`, background: "hsl(var(--primary))" }} />
                        </div>
                        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{d.reasoning}</p>
                      </div>
                    ))}
                  </div>

                  {(copilotResult.riskAlerts ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Risk Alerts</p>
                      {copilotResult.riskAlerts.map((a: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-md"
                          style={{ background: a.severity === "critical" ? "hsl(0 72% 51% / 0.1)" : "hsl(38 92% 50% / 0.1)", border: `1px solid ${a.severity === "critical" ? "hsl(0 72% 51% / 0.3)" : "hsl(38 92% 50% / 0.3)"}` }}>
                          <AlertTriangle size={12} style={{ color: a.severity === "critical" ? "hsl(0 72% 51%)" : "hsl(38 92% 50%)", flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p className="text-xs font-medium" style={{ color: a.severity === "critical" ? "hsl(0 72% 51%)" : "hsl(38 92% 50%)" }}>{a.alert}</p>
                            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{a.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(copilotResult.recommendedActions ?? []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Recommended Actions</p>
                      {copilotResult.recommendedActions.map((a: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle size={11} style={{ color: "hsl(142 71% 45%)" }} />
                          <span style={{ color: "hsl(var(--foreground))" }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <ConfidenceBar value={copilotResult.confidenceScore ?? 0.7} />
                  <WhyPanel text={copilotResult.aiExplanation ?? ""} open={whyOpen} onToggle={() => setWhyOpen(!whyOpen)} />
                </div>
              )}
            </div>

            <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-2">
                <Shield size={14} style={{ color: "hsl(var(--primary))" }} />
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Drug Safety Guardian</h2>
              </div>
              <div className="space-y-2">
                <input
                  value={drugInput}
                  onChange={(e) => setDrugInput(e.target.value)}
                  placeholder="New medication name (e.g., Warfarin)"
                  data-testid="input-drug-name"
                  className="w-full rounded-md px-3 py-2 text-sm outline-none"
                  style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                />
                <div className="flex gap-2">
                  <select
                    value={drugPatientId}
                    onChange={(e) => setDrugPatientId(e.target.value)}
                    data-testid="select-drug-patient"
                    className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
                    style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  >
                    {(patients?.patients ?? []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleDrugCheck}
                    disabled={drugCheckMutation.isPending || !drugInput.trim()}
                    data-testid="button-check-drug"
                    className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                    style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                  >
                    {drugCheckMutation.isPending ? "Checking..." : "Check"}
                  </button>
                </div>
              </div>

              {drugResult && (
                <div className="rounded-md p-3 space-y-3"
                  style={{ background: `${safetyColor}10`, border: `1px solid ${safetyColor}30` }}>
                  <div className="flex items-center gap-2">
                    {drugResult.status === "blocked" ? <XCircle size={14} style={{ color: safetyColor }} /> :
                      drugResult.status === "warning" ? <AlertTriangle size={14} style={{ color: safetyColor }} /> :
                      <CheckCircle size={14} style={{ color: safetyColor }} />}
                    <span className="text-sm font-semibold" style={{ color: safetyColor }}>
                      {drugResult.status === "blocked" ? "BLOCKED — Dangerous Interaction" :
                       drugResult.status === "warning" ? "WARNING — Interaction Detected" :
                       "SAFE — No Interactions Found"}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "hsl(var(--foreground))" }}>{drugResult.recommendation}</p>
                  {(drugResult.interactions ?? []).map((inter: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={inter.severity ?? "warning"} />
                        <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>with {inter.drug}</span>
                      </div>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{inter.explanation}</p>
                      {inter.suggestion && (
                        <p className="text-xs font-medium" style={{ color: "hsl(142 71% 45%)" }}>Alternative: {inter.suggestion}</p>
                      )}
                    </div>
                  ))}
                  <ConfidenceBar value={drugResult.confidenceScore ?? 0.7} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Active Visits</h2>
              {visitsLoading ? <SkeletonCard lines={4} /> : (
                <div className="space-y-2">
                  {(visits?.visits ?? []).map((v: any) => (
                    <div key={v.id} className="p-3 rounded-md space-y-1.5" style={{ background: "hsl(var(--muted))" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{v.patientName}</span>
                        <SeverityBadge severity="active" />
                      </div>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{v.chiefComplaint}</p>
                      {v.aiSummary && (
                        <p className="text-[10px] italic" style={{ color: "hsl(var(--muted-foreground))" }}>{v.aiSummary?.slice(0, 100)}...</p>
                      )}
                    </div>
                  ))}
                  {!(visits?.visits ?? []).length && (
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No active visits</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Quick Prescribe</h2>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rxPatientId}
                  onChange={(e) => setRxPatientId(e.target.value)}
                  data-testid="select-rx-patient"
                  className="col-span-2 rounded-md px-3 py-2 text-sm outline-none"
                  style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                >
                  {(patients?.patients ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {[
                  { val: rxMed, set: setRxMed, placeholder: "Medication name", testId: "input-rx-med" },
                  { val: rxDosage, set: setRxDosage, placeholder: "Dosage (e.g. 500mg)", testId: "input-rx-dosage" },
                  { val: rxFreq, set: setRxFreq, placeholder: "Frequency (e.g. TID)", testId: "input-rx-freq" },
                  { val: rxDuration, set: setRxDuration, placeholder: "Duration (e.g. 7 days)", testId: "input-rx-duration" },
                ].map(({ val, set, placeholder, testId }) => (
                  <input
                    key={testId}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    data-testid={testId}
                    className="rounded-md px-3 py-2 text-sm outline-none"
                    style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  />
                ))}
              </div>
              <button
                onClick={handlePrescribe}
                disabled={prescribeMutation.isPending || !rxMed.trim()}
                data-testid="button-prescribe"
                className="w-full py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                {prescribeMutation.isPending ? "Prescribing..." : "Prescribe Medication"}
              </button>
            </div>

            <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Active Alerts</h2>
              {alertsLoading ? <SkeletonCard lines={3} /> : (
                <div className="space-y-2">
                  {(alerts?.alerts ?? []).slice(0, 4).map((a: any) => (
                    <div key={a.id} className="p-2.5 rounded-md"
                      style={{ background: a.severity === "critical" ? "hsl(0 72% 51% / 0.1)" : "hsl(38 92% 50% / 0.1)", border: `1px solid ${a.severity === "critical" ? "hsl(0 72% 51% / 0.3)" : "hsl(38 92% 50% / 0.3)"}` }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <SeverityBadge severity={a.severity ?? "warning"} />
                        <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>{a.title}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{a.message?.slice(0, 80)}</p>
                    </div>
                  ))}
                  {!(alerts?.alerts ?? []).length && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No active alerts</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
