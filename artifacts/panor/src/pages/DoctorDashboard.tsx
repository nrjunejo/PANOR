import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Activity, Brain, Shield, FlaskConical, Users, FileText, LogOut, Send, Plus, X, Clock, AlertTriangle, CheckCircle, Stethoscope, MessageSquare } from "lucide-react";

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("panor_token");
  return fetch(`/api${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) } });
}

const TABS = [
  { id: "copilot", label: "AI Co-pilot", icon: <Brain size={13} /> },
  { id: "patients", label: "My Patients", icon: <Users size={13} /> },
  { id: "prescribe", label: "Prescribe", icon: <FlaskConical size={13} /> },
  { id: "laborders", label: "Request Lab", icon: <FileText size={13} /> },
  { id: "collab", label: "Collaborations", icon: <MessageSquare size={13} /> },
  { id: "drug", label: "Drug Safety", icon: <Shield size={13} /> },
];

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("copilot");
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any>({});
  const [collabs, setCollabs] = useState<any[]>([]);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);
  const [collabMessages, setCollabMessages] = useState<any[]>([]);
  const [collabMsg, setCollabMsg] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // AI Co-pilot
  const [notes, setNotes] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Drug safety
  const [drug, setDrug] = useState("");
  const [drugResult, setDrugResult] = useState<any>(null);
  const [drugLoading, setDrugLoading] = useState(false);

  // Prescribe
  const [rxForm, setRxForm] = useState({ medication: "", dosage: "", frequency: "", duration: "", instructions: "", timings: [{ time: "08:00", amount: "1 tablet", instructions: "After breakfast" }] });
  const [rxPatientId, setRxPatientId] = useState("");
  const [rxVisitId, setRxVisitId] = useState("");

  // Lab order
  const [labIntent, setLabIntent] = useState("");
  const [labPriority, setLabPriority] = useState("routine");
  const [labPatientId, setLabPatientId] = useState("");
  const [labAiResult, setLabAiResult] = useState<any>(null);
  const [labLoading, setLabLoading] = useState(false);

  // New collab
  const [newCollab, setNewCollab] = useState({ consultantId: "", subject: "", initialMessage: "" });
  const [showNewCollab, setShowNewCollab] = useState(false);

  useEffect(() => { loadAll(); }, [user]);
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [collabMessages]);

  async function loadAll() {
    const [patRes, docRes, collabRes] = await Promise.all([api("/patients"), api("/doctors"), api(`/doctor/collaborations?doctorId=${user?.id}`)]);
    if (patRes.ok) { const d = await patRes.json(); setPatients(d.patients ?? d); }
    if (docRes.ok) { const d = await docRes.json(); setDoctors(d.doctors ?? d); }
    if (collabRes.ok) { const d = await collabRes.json(); setCollabs(d.collaborations ?? []); }
  }

  async function loadPatientHistory(pid: number) {
    const [timeRes, rxRes, labRes, visitRes] = await Promise.all([
      api(`/patients/${pid}/timeline`), api(`/prescriptions?patientId=${pid}`),
      api(`/lab/reports?patientId=${pid}`), api(`/visits?patientId=${pid}`),
    ]);
    const history: any = {};
    if (timeRes.ok) { const d = await timeRes.json(); history.timeline = d.events ?? d; }
    if (rxRes.ok) { const d = await rxRes.json(); history.prescriptions = d.prescriptions ?? d; }
    if (labRes.ok) { const d = await labRes.json(); history.labReports = d.reports ?? []; }
    if (visitRes.ok) { const d = await visitRes.json(); history.visits = d.visits ?? d; }
    setPatientHistory(history);
  }

  async function selectPatient(p: any) {
    setSelectedPatient(p);
    await loadPatientHistory(p.id);
  }

  async function runCopilot() {
    if (!notes.trim()) return;
    setAiLoading(true);
    const r = await api("/ai/copilot", { method: "POST", body: JSON.stringify({ clinicalNotes: notes, patientId: selectedPatient?.id }) });
    if (r.ok) setAiResult(await r.json());
    setAiLoading(false);
  }

  async function checkDrug() {
    if (!drug.trim()) return;
    setDrugLoading(true);
    const r = await api("/ai/drug-check", { method: "POST", body: JSON.stringify({ medication: drug, patientId: selectedPatient?.id }) });
    if (r.ok) setDrugResult(await r.json());
    setDrugLoading(false);
  }

  async function prescribe() {
    if (!rxForm.medication || !rxPatientId) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    const r = await api("/prescriptions", { method: "POST", body: JSON.stringify({ ...rxForm, patientId: parseInt(rxPatientId), visitId: rxVisitId ? parseInt(rxVisitId) : 1, prescribedBy: user?.id }) });
    if (r.ok) { toast({ title: "Prescription saved!" }); setRxForm({ medication: "", dosage: "", frequency: "", duration: "", instructions: "", timings: [{ time: "08:00", amount: "1 tablet", instructions: "After breakfast" }] }); }
    else { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); }
  }

  async function translateLab() {
    if (!labIntent.trim()) return;
    setLabLoading(true);
    const r = await api("/ai/lab-translate", { method: "POST", body: JSON.stringify({ clinicalIntent: labIntent, priority: labPriority, patientId: selectedPatient?.id }) });
    if (r.ok) setLabAiResult(await r.json());
    setLabLoading(false);
  }

  async function submitLabOrder() {
    if (!labAiResult || !labPatientId) { toast({ title: "Run AI translation first and select patient", variant: "destructive" }); return; }
    const r = await api("/lab/orders", { method: "POST", body: JSON.stringify({ patientId: parseInt(labPatientId), clinicalIntent: labIntent, tests: labAiResult.tests ?? [], priority: labPriority, requestedBy: user?.id }) });
    if (r.ok) { toast({ title: "Lab order submitted!" }); setLabIntent(""); setLabAiResult(null); }
    else { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); }
  }

  async function loadCollabMessages(collab: any) {
    setSelectedCollab(collab);
    const r = await api(`/doctor/collaborations/${collab.id}/messages`);
    if (r.ok) { const d = await r.json(); setCollabMessages(d.messages ?? []); }
  }

  async function sendCollabMessage() {
    if (!collabMsg.trim() || !selectedCollab) return;
    const r = await api(`/doctor/collaborations/${selectedCollab.id}/messages`, { method: "POST", body: JSON.stringify({ senderId: user?.id, message: collabMsg }) });
    if (r.ok) { const d = await r.json(); setCollabMessages(prev => [...prev, d]); setCollabMsg(""); }
  }

  async function createCollab() {
    if (!newCollab.consultantId || !newCollab.subject) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    const pid = selectedPatient?.id ?? patients[0]?.id;
    if (!pid) { toast({ title: "Select a patient first", variant: "destructive" }); return; }
    const r = await api("/doctor/collaborations", { method: "POST", body: JSON.stringify({ initiatorId: user?.id, consultantId: parseInt(newCollab.consultantId), patientId: pid, subject: newCollab.subject, initialMessage: newCollab.initialMessage }) });
    if (r.ok) { toast({ title: "Consultation created!" }); setShowNewCollab(false); setNewCollab({ consultantId: "", subject: "", initialMessage: "" }); loadAll(); }
    else { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); }
  }

  const addTiming = () => setRxForm(f => ({ ...f, timings: [...f.timings, { time: "12:00", amount: "1 tablet", instructions: "" }] }));
  const removeTiming = (i: number) => setRxForm(f => ({ ...f, timings: f.timings.filter((_, idx) => idx !== i) }));
  const updateTiming = (i: number, field: string, val: string) => setRxForm(f => ({ ...f, timings: f.timings.map((t, idx) => idx === i ? { ...t, [field]: val } : t) }));

  const inp = { background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.8rem", outline: "none", width: "100%" };
  const sel = { ...inp };

  return (
    <div className="flex h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <aside className="w-52 flex-shrink-0 flex flex-col border-r" style={{ background: "hsl(217 27% 8%)", borderColor: "hsl(var(--border))" }}>
        <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}><Activity size={14} className="text-black" /></div><span className="font-bold text-sm">PANOR</span></div>
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(199 89% 48%)" }}>Doctor Portal</div>
          <div className="text-xs mt-0.5 truncate">{user?.name}</div>
          {user?.specialization && <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{user.specialization}</div>}
        </div>
        {selectedPatient && (
          <div className="mx-2 mt-2 p-2 rounded-lg" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>Active Patient</div>
            <div className="text-xs font-semibold mt-0.5">{selectedPatient.name}</div>
            <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{selectedPatient.medicalId}</div>
          </div>
        )}
        <nav className="p-2 flex-1 space-y-0.5 mt-2">
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors" style={{ background: tab === t.id ? "hsl(199 89% 48% / 0.1)" : "transparent", color: tab === t.id ? "hsl(199 89% 48%)" : "hsl(var(--muted-foreground))" }}>{t.icon} {t.label}</button>)}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <button onClick={() => { logout(); setLocation("/"); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: "hsl(var(--muted-foreground))" }}><LogOut size={13} /> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {tab === "copilot" && <>
          <h1 className="text-xl font-bold">AI Clinical Co-pilot</h1>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <h3 className="text-sm font-semibold">Clinical Notes → Differentials</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Enter clinical notes, symptoms, labs, vitals..." className="w-full rounded-lg px-3 py-2 text-xs resize-none" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} />
                <button onClick={runCopilot} disabled={aiLoading} className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <Brain size={13} /> {aiLoading ? "Analysing..." : "Generate Differentials"}
                </button>
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              {aiResult ? <>
                <h3 className="text-sm font-semibold mb-3">Differential Diagnoses</h3>
                <div className="space-y-2">
                  {(aiResult.differentials ?? aiResult.diagnoses ?? []).map((d: any, i: number) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: "hsl(var(--muted))" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{d.diagnosis ?? d.condition}</span>
                        <span className="text-[10px] font-bold" style={{ color: "hsl(var(--primary))" }}>{Math.round((d.probability ?? d.confidence ?? 0) * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round((d.probability ?? d.confidence ?? 0) * 100)}%`, background: "hsl(var(--primary))" }} />
                      </div>
                      {d.reasoning && <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{d.reasoning}</p>}
                    </div>
                  ))}
                </div>
                {aiResult.recommendedTests?.length > 0 && <div className="mt-3"><div className="text-[10px] font-semibold uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Recommended Tests</div>{aiResult.recommendedTests.map((t: string, i: number) => <div key={i} className="text-xs py-0.5" style={{ color: "hsl(var(--primary))" }}>• {t}</div>)}</div>}
              </> : <div className="h-full flex items-center justify-center"><p className="text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>Enter clinical notes and click Generate to see AI-powered differential diagnoses</p></div>}
            </div>
          </div>
        </>}

        {tab === "patients" && <>
          <h1 className="text-xl font-bold">Patient Registry</h1>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Select Patient</h3>
              <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                {patients.map((p: any) => (
                  <button key={p.id} onClick={() => selectPatient(p)} className="w-full text-left rounded-xl p-3 transition-colors"
                    style={{ background: selectedPatient?.id === p.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))", border: `1px solid ${selectedPatient?.id === p.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))"}` }}>
                    <div className="text-xs font-semibold">{p.name}</div>
                    <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{p.medicalId} · {p.gender} · {p.bloodGroup}</div>
                    {p.activeConditions?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{p.activeConditions.slice(0, 2).map((c: string) => <span key={c} className="text-[10px] px-1 rounded" style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 51%)" }}>{c}</span>)}</div>}
                  </button>
                ))}
              </div>
            </div>
            {selectedPatient && <div className="space-y-3">
              <h3 className="text-sm font-semibold">Patient History — {selectedPatient.name}</h3>
              <div className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[["Blood Group", selectedPatient.bloodGroup], ["DOB", selectedPatient.dateOfBirth], ["Phone", selectedPatient.phone], ["Risk Score", selectedPatient.riskScore]].map(([l, v]) => <div key={l}><span style={{ color: "hsl(var(--muted-foreground))" }}>{l}: </span><span className="font-medium">{v}</span></div>)}
                </div>
                {selectedPatient.allergies?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{selectedPatient.allergies.map((a: string) => <span key={a} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(0 72% 51% / 0.15)", color: "hsl(0 72% 51%)" }}>⚠ {a}</span>)}</div>}
              </div>
              {patientHistory.timeline?.length > 0 && <div className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="text-xs font-semibold mb-2">Timeline</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {patientHistory.timeline.slice(0, 8).map((ev: any) => <div key={ev.id} className="text-xs flex gap-2"><span style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(ev.eventDate ?? ev.createdAt).toLocaleDateString()}</span><span>{ev.title}</span></div>)}
                </div>
              </div>}
              {patientHistory.prescriptions?.length > 0 && <div className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="text-xs font-semibold mb-2">Active Prescriptions</div>
                {patientHistory.prescriptions.filter((r: any) => r.active).map((rx: any) => <div key={rx.id} className="text-xs py-1 border-b last:border-0" style={{ borderColor: "hsl(var(--border))" }}><span className="font-medium">{rx.medication}</span> · {rx.dosage} · {rx.frequency}</div>)}
              </div>}
              {patientHistory.labReports?.length > 0 && <div className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="text-xs font-semibold mb-2">Lab Reports ({patientHistory.labReports.length})</div>
                {patientHistory.labReports.map((r: any) => <div key={r.id} className="text-xs py-1 border-b last:border-0" style={{ borderColor: "hsl(var(--border))" }}>{r.fileName} · <span style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(r.createdAt).toLocaleDateString()}</span></div>)}
              </div>}
            </div>}
          </div>
        </>}

        {tab === "prescribe" && <>
          <h1 className="text-xl font-bold">Prescribe Medication</h1>
          <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Patient *</label>
                <select value={rxPatientId} onChange={e => setRxPatientId(e.target.value)} style={sel}>
                  <option value="">Select patient</option>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.medicalId})</option>)}
                </select>
              </div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Medication *</label><input value={rxForm.medication} onChange={e => setRxForm(f => ({ ...f, medication: e.target.value }))} placeholder="e.g. Metformin 500mg" style={inp} /></div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Dosage</label><input value={rxForm.dosage} onChange={e => setRxForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" style={inp} /></div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Frequency</label><input value={rxForm.frequency} onChange={e => setRxForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g. Twice daily" style={inp} /></div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Duration</label><input value={rxForm.duration} onChange={e => setRxForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 30 days" style={inp} /></div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Instructions</label><input value={rxForm.instructions} onChange={e => setRxForm(f => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Take with food" style={inp} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Daily Dose Schedule</label><button type="button" onClick={addTiming} className="text-[10px] flex items-center gap-1" style={{ color: "hsl(var(--primary))" }}><Plus size={10} /> Add Time</button></div>
              <div className="space-y-2">
                {rxForm.timings.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="time" value={t.time} onChange={e => updateTiming(i, "time", e.target.value)} style={{ ...inp, width: "120px" }} />
                    <input value={t.amount} onChange={e => updateTiming(i, "amount", e.target.value)} placeholder="Amount" style={{ ...inp, flex: 1 }} />
                    <input value={t.instructions} onChange={e => updateTiming(i, "instructions", e.target.value)} placeholder="e.g. After meal" style={{ ...inp, flex: 1 }} />
                    {rxForm.timings.length > 1 && <button onClick={() => removeTiming(i)}><X size={13} style={{ color: "hsl(var(--muted-foreground))" }} /></button>}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={prescribe} className="w-full py-2.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              Save Prescription
            </button>
          </div>
        </>}

        {tab === "laborders" && <>
          <h1 className="text-xl font-bold">Request Lab Tests</h1>
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="text-sm font-semibold">AI Lab Translator</h3>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Patient</label>
                <select value={labPatientId} onChange={e => setLabPatientId(e.target.value)} style={sel}>
                  <option value="">Select patient</option>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Clinical Intent</label>
                <textarea value={labIntent} onChange={e => setLabIntent(e.target.value)} rows={3} placeholder="e.g. Rule out myocardial infarction in patient with chest pain..." className="w-full rounded-lg px-3 py-2 text-xs resize-none" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} />
              </div>
              <div className="flex gap-2">
                {["stat", "urgent", "routine"].map(p => <button key={p} onClick={() => setLabPriority(p)} className="flex-1 py-1.5 rounded text-[10px] font-semibold capitalize" style={{ background: labPriority === p ? (p === "stat" ? "hsl(0 72% 51%)" : p === "urgent" ? "hsl(38 92% 50%)" : "hsl(var(--primary))") : "hsl(var(--muted))", color: labPriority === p ? "white" : "hsl(var(--muted-foreground))" }}>{p}</button>)}
              </div>
              <button onClick={translateLab} disabled={labLoading} className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                {labLoading ? "Translating..." : "AI Translate → Tests"}
              </button>
            </div>
            <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              {labAiResult ? <>
                <h3 className="text-sm font-semibold mb-3">Recommended Tests</h3>
                <div className="space-y-2">
                  {(labAiResult.tests ?? []).map((t: any, i: number) => (
                    <div key={i} className="rounded-lg p-2.5" style={{ background: "hsl(var(--muted))" }}>
                      <div className="flex items-center gap-2"><span className="text-xs font-semibold">{t.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: t.priority === "stat" ? "hsl(0 72% 51% / 0.15)" : t.priority === "urgent" ? "hsl(38 92% 50% / 0.15)" : "hsl(var(--muted))", color: t.priority === "stat" ? "hsl(0 72% 51%)" : t.priority === "urgent" ? "hsl(38 92% 50%)" : "hsl(var(--muted-foreground))" }}>{t.priority?.toUpperCase()}</span></div>
                      {t.instructions && <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t.instructions}</p>}
                    </div>
                  ))}
                </div>
                <button onClick={submitLabOrder} className="w-full mt-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "hsl(199 89% 48%)", color: "white" }}>Submit Lab Order</button>
              </> : <div className="h-full flex items-center justify-center"><p className="text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>Enter clinical intent and click "AI Translate" to get specific test recommendations</p></div>}
            </div>
          </div>
        </>}

        {tab === "collab" && <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Doctor Collaborations</h1>
            <button onClick={() => setShowNewCollab(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              <Plus size={12} /> New Consultation
            </button>
          </div>
          {showNewCollab && <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Request Specialist Consultation</h3><button onClick={() => setShowNewCollab(false)}><X size={14} style={{ color: "hsl(var(--muted-foreground))" }} /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Consultant Doctor *</label>
                <select value={newCollab.consultantId} onChange={e => setNewCollab(n => ({ ...n, consultantId: e.target.value }))} style={sel}>
                  <option value="">Select doctor</option>
                  {doctors.filter(d => d.id !== user?.id).map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialization ?? "General"}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Subject *</label><input value={newCollab.subject} onChange={e => setNewCollab(n => ({ ...n, subject: e.target.value }))} placeholder="e.g. NSTEMI Management Review" style={inp} /></div>
              <div className="col-span-2"><label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Initial Message</label><textarea value={newCollab.initialMessage} onChange={e => setNewCollab(n => ({ ...n, initialMessage: e.target.value }))} rows={2} placeholder="Brief clinical summary..." className="w-full rounded-lg px-3 py-2 text-xs resize-none" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} /></div>
            </div>
            <button onClick={createCollab} className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>Send Request</button>
          </div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {collabs.map(c => (
                <button key={c.id} onClick={() => loadCollabMessages(c)} className="w-full text-left rounded-xl p-3 transition-colors" style={{ background: selectedCollab?.id === c.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))", border: `1px solid ${selectedCollab?.id === c.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))"}` }}>
                  <div className="text-xs font-semibold truncate">{c.subject}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{c.patientName} · with {c.consultantName}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: c.status === "open" ? "hsl(199 89% 48% / 0.1)" : "hsl(142 71% 45% / 0.1)", color: c.status === "open" ? "hsl(199 89% 48%)" : "hsl(142 71% 45%)" }}>{c.status?.toUpperCase()}</span>
                    <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{c.messageCount} messages</span>
                  </div>
                </button>
              ))}
              {collabs.length === 0 && <p className="text-sm py-8 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>No consultations yet</p>}
            </div>
            {selectedCollab && <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", height: "500px" }}>
              <div className="p-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="text-xs font-semibold">{selectedCollab.subject}</div>
                <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{selectedCollab.patientName} · {selectedCollab.consultantName}</div>
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {collabMessages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%]">
                      <div className="text-[10px] mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{m.senderName} {m.senderSpec ? `(${m.senderSpec})` : ""}</div>
                      <div className="rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: m.senderId === user?.id ? "hsl(var(--primary))" : "hsl(var(--muted))", color: m.senderId === user?.id ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}>{m.message}</div>
                    </div>
                  </div>
                ))}
                {collabMessages.length === 0 && <p className="text-xs text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No messages yet</p>}
              </div>
              <div className="p-3 border-t flex gap-2" style={{ borderColor: "hsl(var(--border))" }}>
                <input value={collabMsg} onChange={e => setCollabMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendCollabMessage()} placeholder="Type message..." className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} />
                <button onClick={sendCollabMessage} className="px-3 py-2 rounded-lg" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}><Send size={13} /></button>
              </div>
            </div>}
          </div>
        </>}

        {tab === "drug" && <>
          <h1 className="text-xl font-bold">Drug Safety Guardian</h1>
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="text-sm font-semibold">Check Medication Safety</h3>
              <div className="flex gap-2">
                <input value={drug} onChange={e => setDrug(e.target.value)} onKeyDown={e => e.key === "Enter" && checkDrug()} placeholder="e.g. Warfarin + Aspirin..." className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} />
                <button onClick={checkDrug} disabled={drugLoading} className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>{drugLoading ? "..." : "Check"}</button>
              </div>
              {selectedPatient?.allergies?.length > 0 && <div className="rounded-lg p-2" style={{ background: "hsl(0 72% 51% / 0.08)" }}><div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(0 72% 51%)" }}>Patient Allergies</div>{selectedPatient.allergies.map((a: string) => <span key={a} className="text-[10px] mr-2" style={{ color: "hsl(0 72% 51%)" }}>⚠ {a}</span>)}</div>}
            </div>
            <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              {drugResult ? (() => {
                const status = drugResult.safetyStatus ?? drugResult.status ?? "unknown";
                const safe = status === "safe";
                const blocked = status === "blocked";
                return <>
                  <div className="flex items-center gap-2 mb-3">
                    {safe ? <CheckCircle size={18} style={{ color: "hsl(142 71% 45%)" }} /> : <AlertTriangle size={18} style={{ color: blocked ? "hsl(0 72% 51%)" : "hsl(38 92% 50%)" }} />}
                    <span className="font-bold text-sm" style={{ color: safe ? "hsl(142 71% 45%)" : blocked ? "hsl(0 72% 51%)" : "hsl(38 92% 50%)" }}>{status.toUpperCase()}</span>
                    <span className="text-xs ml-auto font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Confidence: {Math.round((drugResult.confidenceScore ?? 0.9) * 100)}%</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>{drugResult.reasoning ?? drugResult.explanation}</p>
                  {drugResult.alternatives?.length > 0 && <div className="mt-3"><div className="text-[10px] font-semibold mb-1" style={{ color: "hsl(142 71% 45%)" }}>Safe Alternatives</div>{drugResult.alternatives.map((a: string, i: number) => <div key={i} className="text-xs py-0.5" style={{ color: "hsl(142 71% 45%)" }}>• {a}</div>)}</div>}
                </>;
              })() : <div className="h-full flex items-center justify-center"><p className="text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>Enter a medication name to check for drug interactions</p></div>}
            </div>
          </div>
        </>}
      </main>
    </div>
  );
}
