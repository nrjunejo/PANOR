import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Activity, Calendar, FileText, Pill, CreditCard, Brain, LogOut, ChevronRight, AlertTriangle, CheckCircle, Clock, Star, Send, Upload } from "lucide-react";

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("panor_token");
  return fetch(`/api${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) } });
}

const TABS = [
  { id: "overview", label: "Overview", icon: <Activity size={13} /> },
  { id: "history", label: "Health History", icon: <FileText size={13} /> },
  { id: "appointments", label: "Appointments", icon: <Calendar size={13} /> },
  { id: "medicines", label: "Medicines", icon: <Pill size={13} /> },
  { id: "labs", label: "Lab Reports", icon: <FileText size={13} /> },
  { id: "billing", label: "Billing", icon: <CreditCard size={13} /> },
  { id: "ai", label: "AI Consult", icon: <Brain size={13} /> },
];

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [recResult, setRecResult] = useState<any>(null);
  const [recSymptoms, setRecSymptoms] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAll(); }, [user]);
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [aiMessages]);

  async function loadAll() {
    if (!user) return;
    const [patRes, docsRes] = await Promise.all([api(`/patient/profile/${user.id}`), api("/doctors")]);
    if (patRes.ok) { const d = await patRes.json(); setPatient(d.patient); }
    if (docsRes.ok) { const d = await docsRes.json(); setDoctors(d.doctors ?? d); }

    const pid = user.patientDbId ?? 1;
    const [timeRes, rxRes, apptRes, labRes, billRes] = await Promise.all([
      api(`/patients/${pid}/timeline`), api(`/prescriptions?patientId=${pid}`),
      api(`/appointments?patientId=${pid}`), api(`/lab/reports?patientId=${pid}`),
      api(`/billing/bills?patientId=${pid}`),
    ]);
    if (timeRes.ok) { const d = await timeRes.json(); setTimeline(d.events ?? d); }
    if (rxRes.ok) { const d = await rxRes.json(); setPrescriptions(d.prescriptions ?? d); }
    if (apptRes.ok) { const d = await apptRes.json(); setAppointments(d.appointments ?? d); }
    if (labRes.ok) { const d = await labRes.json(); setLabReports(d.reports ?? []); }
    if (billRes.ok) { const d = await billRes.json(); setBills(d.bills ?? d); }
  }

  async function sendAiMessage() {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim(); setAiInput(""); setAiLoading(true);
    const newMessages = [...aiMessages, { role: "user", content: msg }];
    setAiMessages(newMessages);
    try {
      const r = await api("/ai/intake", { method: "POST", body: JSON.stringify({ symptoms: msg, patientId: user?.patientDbId ?? 1 }) });
      const d = await r.json();
      setAiMessages([...newMessages, { role: "assistant", content: d.assessment ?? d.summary ?? JSON.stringify(d) }]);
    } catch { setAiMessages([...newMessages, { role: "assistant", content: "Unable to process. Please try again." }]); }
    setAiLoading(false);
  }

  async function getDoctorRecommendation() {
    if (!recSymptoms) return;
    setRecLoading(true);
    const r = await api("/ai/recommend-doctor", { method: "POST", body: JSON.stringify({ symptoms: recSymptoms }) });
    if (r.ok) setRecResult(await r.json());
    setRecLoading(false);
  }

  async function bookAppointment() {
    if (!bookingDoctor || !bookingDate) { toast({ title: "Select doctor and date", variant: "destructive" }); return; }
    const pid = user?.patientDbId ?? 1;
    const r = await api("/appointments", { method: "POST", body: JSON.stringify({ patientId: pid, doctorId: bookingDoctor.id, specialty: bookingDoctor.specialization ?? "General Medicine", datetime: bookingDate, notes: bookingNote, status: "scheduled" }) });
    if (r.ok) { toast({ title: "Appointment booked!" }); setBookingDoctor(null); setBookingDate(""); setBookingNote(""); loadAll(); }
    else { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); }
  }

  async function uploadLabReport(file: File) {
    setUploadingReport(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result as string;
      const r = await api("/lab/reports", { method: "POST", body: JSON.stringify({ patientId: user?.patientDbId ?? 1, fileName: file.name, fileType: file.type.includes("pdf") ? "pdf" : "image", fileData: data }) });
      if (r.ok) { toast({ title: "Report uploaded & AI-parsed!" }); loadAll(); }
      else toast({ title: "Upload failed", variant: "destructive" });
      setUploadingReport(false);
    };
    reader.readAsDataURL(file);
  }

  const activeMeds = prescriptions.filter(p => p.active);
  const upcomingAppts = appointments.filter(a => a.status === "scheduled");
  const pendingBills = bills.filter(b => b.status === "pending");

  const inp = { background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.8rem", outline: "none", width: "100%" };

  return (
    <div className="flex h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <aside className="w-52 flex-shrink-0 flex flex-col border-r" style={{ background: "hsl(217 27% 8%)", borderColor: "hsl(var(--border))" }}>
        <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}><Activity size={14} className="text-black" /></div>
            <span className="font-bold text-sm">PANOR</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(142 71% 45%)" }}>Patient Portal</div>
          <div className="text-xs truncate">{user?.name}</div>
          {patient?.welfareEligible && <div className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold inline-block" style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }}>✓ Welfare Eligible</div>}
        </div>
        <nav className="p-2 flex-1 space-y-0.5">
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ background: tab === t.id ? "hsl(142 71% 45% / 0.1)" : "transparent", color: tab === t.id ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" }}>{t.icon} {t.label}</button>)}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <button onClick={() => { logout(); setLocation("/"); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: "hsl(var(--muted-foreground))" }}><LogOut size={13} /> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 space-y-5 max-w-5xl">
        {tab === "overview" && <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Welcome, {user?.name?.split(" ")[0]}</h1>
            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[{ l: "Active Medicines", v: activeMeds.length, c: "hsl(142 71% 45%)" }, { l: "Upcoming Appts", v: upcomingAppts.length, c: "hsl(199 89% 48%)" }, { l: "Lab Reports", v: labReports.length, c: "hsl(270 60% 60%)" }, { l: "Pending Bills", v: pendingBills.length, c: "hsl(38 92% 50%)" }].map(s => (
              <div key={s.l} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="text-xs mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>{s.l}</div>
                <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          {patient && <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-semibold mb-3">Patient Profile</h3>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs">
              {[["Medical ID", patient.medicalId], ["Blood Group", patient.bloodGroup ?? "Not set"], ["CNIC", patient.cnicNumber ?? "Unverified"], ["City / District", `${patient.city ?? "-"} / ${patient.district ?? "-"}`], ["Province", patient.province ?? "Not set"], ["NADRA", patient.nadraVerified ? "✓ Verified" : "Pending"], ["Welfare Score", `${patient.socialWelfareScore ?? 0}/100`], ["Occupation", patient.occupation ?? "Not set"], ["Emergency Contact", patient.emergencyContact ?? "Not set"]].map(([l, v]) => (
                <div key={l}><span style={{ color: "hsl(var(--muted-foreground))" }}>{l}: </span><span className="font-medium">{v}</span></div>
              ))}
            </div>
            {patient.allergies?.length > 0 && <div className="mt-3 flex flex-wrap gap-1 items-center">
              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Allergies:</span>
              {patient.allergies.map((a: string) => <span key={a} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "hsl(0 72% 51% / 0.15)", color: "hsl(0 72% 51%)" }}>{a}</span>)}
            </div>}
          </div>}
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-semibold mb-3">Health Timeline</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timeline.slice(0, 10).map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.severity === "critical" ? "hsl(0 72% 51%)" : ev.severity === "warning" ? "hsl(38 92% 50%)" : "hsl(199 89% 48%)" }} />
                  <div><div className="font-medium">{ev.title}</div><div style={{ color: "hsl(var(--muted-foreground))" }}>{ev.description}</div><div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(ev.eventDate ?? ev.createdAt).toLocaleDateString()}</div></div>
                </div>
              ))}
              {timeline.length === 0 && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No events yet</p>}
            </div>
          </div>
        </>}

        {tab === "history" && <>
          <h1 className="text-xl font-bold">Complete Health History</h1>
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-semibold mb-3">All Visits & Events</h3>
            <div className="space-y-2">
              {timeline.map((ev: any) => (
                <div key={ev.id} className="border-l-2 pl-3 py-1" style={{ borderColor: ev.severity === "critical" ? "hsl(0 72% 51%)" : ev.severity === "warning" ? "hsl(38 92% 50%)" : "hsl(var(--primary))" }}>
                  <div className="text-xs font-semibold">{ev.title}</div>
                  <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{ev.description}</div>
                  <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(ev.eventDate ?? ev.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
              {timeline.length === 0 && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No history</p>}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-semibold mb-3">All Prescriptions</h3>
            <div className="space-y-2">
              {prescriptions.map((rx: any) => (
                <div key={rx.id} className="rounded-lg p-3" style={{ background: "hsl(var(--muted))" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">{rx.medication}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: rx.active ? "hsl(142 71% 45% / 0.2)" : "hsl(var(--muted))", color: rx.active ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))" }}>{rx.active ? "Active" : "Completed"}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{rx.dosage} · {rx.frequency} · {rx.duration}</div>
                  {rx.timings?.length > 0 && <div className="flex gap-1.5 mt-1 flex-wrap">{rx.timings.map((t: any, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>{t.time}: {t.amount}</span>)}</div>}
                </div>
              ))}
              {prescriptions.length === 0 && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No prescriptions</p>}
            </div>
          </div>
        </>}

        {tab === "appointments" && <>
          <h1 className="text-xl font-bold">Appointments</h1>
          <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-semibold">Book New Appointment</h3>
            <div>
              <label className="text-xs block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Describe symptoms for AI doctor recommendation</label>
              <div className="flex gap-2">
                <input value={recSymptoms} onChange={e => setRecSymptoms(e.target.value)} placeholder="e.g. chest pain, fever..." style={{ ...inp, flex: 1 }} />
                <button onClick={getDoctorRecommendation} disabled={recLoading} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <Brain size={12} /> {recLoading ? "Analysing..." : "AI Recommend"}
                </button>
              </div>
            </div>
            {recResult && <div className="rounded-lg p-3 space-y-2" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
              <div className="flex items-center gap-2 text-xs"><Brain size={12} style={{ color: "hsl(var(--primary))" }} /><span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>AI Recommendation</span><span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 50%)" }}>{recResult.urgencyLevel?.toUpperCase()} URGENCY</span></div>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{recResult.reasoning}</p>
              <p className="text-xs font-medium">Recommended: <span style={{ color: "hsl(var(--primary))" }}>{recResult.recommendedSpecialty}</span></p>
              {recResult.rankedDoctors?.map((d: any, i: number) => {
                const doc = doctors.find((dr: any) => dr.id === d.doctorId) ?? d;
                return <div key={i} className="flex items-center justify-between rounded p-2" style={{ background: "hsl(var(--muted))" }}>
                  <div><div className="text-xs font-semibold">{d.name ?? doc.name}</div><div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{d.specialization ?? doc.specialization} · {d.reason}</div></div>
                  <button onClick={() => setBookingDoctor(doc.id ? doc : (doctors.find((dr: any) => dr.id === d.doctorId) ?? doc))} className="px-2 py-1 rounded text-[10px] font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>Book</button>
                </div>;
              })}
            </div>}
            <div>
              <label className="text-xs block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>Select Doctor</label>
              <div className="grid grid-cols-2 gap-2">
                {doctors.filter((d: any) => d.availableToday).map((doc: any) => (
                  <button key={doc.id} onClick={() => setBookingDoctor(bookingDoctor?.id === doc.id ? null : doc)} className="text-left p-3 rounded-lg"
                    style={{ background: bookingDoctor?.id === doc.id ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted))", border: `1px solid ${bookingDoctor?.id === doc.id ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}` }}>
                    <div className="text-xs font-semibold">{doc.name}</div>
                    <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{doc.specialization ?? "General Medicine"}</div>
                    <div className="flex items-center gap-1 mt-1"><Star size={9} style={{ color: "hsl(38 92% 50%)" }} /><span className="text-[10px]" style={{ color: "hsl(38 92% 50%)" }}>{doc.rating}</span><span className="ml-1 text-[10px] px-1 py-0.5 rounded" style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }}>Available</span></div>
                  </button>
                ))}
              </div>
            </div>
            {bookingDoctor && <div className="space-y-2">
              <input type="datetime-local" value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={inp} />
              <input value={bookingNote} onChange={e => setBookingNote(e.target.value)} placeholder="Reason for visit (optional)" style={inp} />
              <button onClick={bookAppointment} className="w-full py-2 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                Confirm with {bookingDoctor.name}
              </button>
            </div>}
          </div>
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-semibold mb-3">My Appointments</h3>
            <div className="space-y-2">
              {appointments.map((a: any) => (
                <div key={a.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "hsl(var(--muted))" }}>
                  <div><div className="text-xs font-semibold">{a.doctorName ?? `Doctor #${a.doctorId}`}</div><div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{a.specialty} · {new Date(a.datetime).toLocaleString()}</div>{a.notes && <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{a.notes}</div>}</div>
                  <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: a.status === "scheduled" ? "hsl(199 89% 48% / 0.15)" : "hsl(142 71% 45% / 0.15)", color: a.status === "scheduled" ? "hsl(199 89% 48%)" : "hsl(142 71% 45%)" }}>{a.status?.toUpperCase()}</span>
                </div>
              ))}
              {appointments.length === 0 && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No appointments</p>}
            </div>
          </div>
        </>}

        {tab === "medicines" && <>
          <h1 className="text-xl font-bold">Current Medications</h1>
          {activeMeds.map((rx: any) => (
            <div key={rx.id} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{rx.medication}</div>
                  <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{rx.dosage} · {rx.frequency} · {rx.duration}</div>
                  {rx.instructions && <div className="text-xs italic" style={{ color: "hsl(var(--muted-foreground))" }}>{rx.instructions}</div>}
                  {rx.timings?.length > 0 && <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mt-2 mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Daily Schedule</div>
                    <div className="flex flex-wrap gap-2">
                      {rx.timings.map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                          <Clock size={9} style={{ color: "hsl(var(--primary))" }} />
                          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--primary))" }}>{t.time}</span>
                          <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.amount} {t.instructions ? `· ${t.instructions}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full ml-4" style={{ background: rx.safetyStatus === "safe" ? "hsl(142 71% 45% / 0.15)" : "hsl(0 72% 51% / 0.15)", color: rx.safetyStatus === "safe" ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{rx.safetyStatus?.toUpperCase()}</span>
              </div>
              {rx.interactionWarning && <div className="mt-2 p-2 rounded text-[10px]" style={{ background: "hsl(38 92% 50% / 0.1)", color: "hsl(38 92% 50%)" }}><AlertTriangle size={10} className="inline mr-1" />{rx.interactionWarning}</div>}
            </div>
          ))}
          {activeMeds.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No active medications</p>}
        </>}

        {tab === "labs" && <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Lab Reports</h1>
            <div>
              <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLabReport(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                <Upload size={12} /> {uploadingReport ? "Parsing with AI..." : "Upload PDF/Image"}
              </button>
            </div>
          </div>
          {labReports.map((rep: any) => (
            <div key={rep.id} className="rounded-xl p-4 cursor-pointer" onClick={() => setSelectedReport(selectedReport?.id === rep.id ? null : rep)} style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-semibold">{rep.fileName}</div><div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(rep.createdAt).toLocaleDateString()} · {rep.fileType?.toUpperCase()}</div>{rep.interpretation && <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{rep.interpretation}</div>}</div>
                <ChevronRight size={14} style={{ color: "hsl(var(--muted-foreground))", transform: selectedReport?.id === rep.id ? "rotate(90deg)" : "none" }} />
              </div>
              {selectedReport?.id === rep.id && rep.parsedValues?.length > 0 && (
                <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                  <table className="w-full text-xs"><thead><tr style={{ background: "hsl(var(--muted))" }}>{["Test", "Value", "Unit", "Normal Range", "Status"].map(h => <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>)}</tr></thead>
                    <tbody>{rep.parsedValues.map((v: any, i: number) => <tr key={i} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                      <td className="px-3 py-2 font-medium">{v.test}</td>
                      <td className="px-3 py-2 font-bold" style={{ color: v.status === "normal" ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{v.value}</td>
                      <td className="px-3 py-2" style={{ color: "hsl(var(--muted-foreground))" }}>{v.unit}</td>
                      <td className="px-3 py-2" style={{ color: "hsl(var(--muted-foreground))" }}>{v.normalRange}</td>
                      <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: v.status === "normal" ? "hsl(142 71% 45% / 0.15)" : "hsl(0 72% 51% / 0.15)", color: v.status === "normal" ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{v.status?.toUpperCase()}</span></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {labReports.length === 0 && <div className="text-center py-12"><FileText size={32} className="mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} /><p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Upload a PDF or image report to auto-parse values with AI</p></div>}
        </>}

        {tab === "billing" && <>
          <h1 className="text-xl font-bold">Billing & Payments</h1>
          {patient?.welfareEligible && <div className="rounded-xl p-3" style={{ background: "hsl(142 71% 45% / 0.08)", border: "1px solid hsl(142 71% 45% / 0.3)" }}>
            <div className="flex items-center gap-2"><CheckCircle size={14} style={{ color: "hsl(142 71% 45%)" }} /><span className="text-sm font-semibold" style={{ color: "hsl(142 71% 45%)" }}>Sehat Sahulat Program — Eligible</span></div>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Welfare Score: {patient?.socialWelfareScore}/100 · Discounts applied automatically</p>
          </div>}
          {bills.map((b: any) => (
            <div key={b.id} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-start justify-between">
                <div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{b.invoiceNumber ?? `Invoice #${b.id}`}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: b.status === "paid" ? "hsl(142 71% 45% / 0.15)" : "hsl(38 92% 50% / 0.15)", color: b.status === "paid" ? "hsl(142 71% 45%)" : "hsl(38 92% 50%)" }}>{b.status?.toUpperCase()}</span></div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{(b.items ?? []).map((i: any) => i.description).join(" + ")}</div>
                  {b.paymentMethod && <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Paid via {b.paymentMethod?.replace("_", " ")}</div>}</div>
                <div className="text-right"><div className="font-bold" style={{ color: b.status === "paid" ? "hsl(142 71% 45%)" : "hsl(38 92% 50%)" }}>PKR {Number(b.total).toLocaleString()}</div><div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(b.createdAt).toLocaleDateString()}</div></div>
              </div>
            </div>
          ))}
          {bills.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No bills yet</p>}
        </>}

        {tab === "ai" && <>
          <h1 className="text-xl font-bold">AI Health Consultant</h1>
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", height: "520px" }}>
            <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--primary) / 0.05)" }}>
              <Brain size={14} style={{ color: "hsl(var(--primary))" }} /><span className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>PANOR AI Consultant</span><span className="text-[10px] ml-auto" style={{ color: "hsl(var(--muted-foreground))" }}>GPT-Powered</span>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.length === 0 && <div className="text-center pt-8 space-y-2">
                <Brain size={32} className="mx-auto" style={{ color: "hsl(var(--primary) / 0.4)" }} />
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Describe your symptoms or ask a health question</p>
                {["I have headache and fever since 2 days", "What to do for high blood pressure?", "I feel chest pain when I walk"].map(q => (
                  <button key={q} onClick={() => setAiInput(q)} className="block w-full text-xs text-left px-3 py-2 rounded-lg mt-1" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>{q}</button>
                ))}
              </div>}
              {aiMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: m.role === "user" ? "hsl(var(--primary))" : "hsl(var(--muted))", color: m.role === "user" ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}>{m.content}</div>
                </div>
              ))}
              {aiLoading && <div className="flex justify-start"><div className="rounded-xl px-3 py-2 text-xs" style={{ background: "hsl(var(--muted))" }}><span className="animate-pulse">AI is thinking...</span></div></div>}
            </div>
            <div className="p-3 border-t flex gap-2" style={{ borderColor: "hsl(var(--border))" }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAiMessage()} placeholder="Describe your symptoms..." className="flex-1 rounded-lg px-3 py-2 text-xs" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} />
              <button onClick={sendAiMessage} disabled={aiLoading} className="px-3 py-2 rounded-lg disabled:opacity-50" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}><Send size={13} /></button>
            </div>
          </div>
        </>}
      </main>
    </div>
  );
}
