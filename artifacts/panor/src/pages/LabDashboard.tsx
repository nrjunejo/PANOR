import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Activity, FlaskConical, Upload, CheckCircle, Clock, AlertTriangle, LogOut, ChevronDown, ChevronUp, Brain } from "lucide-react";

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("panor_token");
  return fetch(`/api${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) } });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)" },
  "in-progress": { label: "In Progress", color: "hsl(199 89% 48%)", bg: "hsl(199 89% 48% / 0.1)" },
  completed: { label: "Completed", color: "hsl(142 71% 45%)", bg: "hsl(142 71% 45% / 0.1)" },
};

const PRIORITY_CONFIG: Record<string, { color: string }> = {
  stat: { color: "hsl(0 72% 51%)" },
  urgent: { color: "hsl(38 92% 50%)" },
  routine: { color: "hsl(199 89% 48%)" },
};

export default function LabDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [results, setResults] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [translating, setTranslating] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, any>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => { loadOrders(); loadReports(); }, []);

  async function loadOrders() {
    const r = await api("/lab/orders");
    if (r.ok) { const d = await r.json(); setOrders(d.orders ?? d); }
  }

  async function loadReports() {
    const r = await api("/lab/reports");
    if (r.ok) { const d = await r.json(); setReports(d.reports ?? []); }
  }

  async function updateStatus(id: number, status: string) {
    const r = await api(`/lab/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (r.ok) { toast({ title: `Order marked ${status}` }); loadOrders(); }
  }

  async function submitManualResult(id: number) {
    const text = results[id];
    if (!text?.trim()) { toast({ title: "Enter results first", variant: "destructive" }); return; }
    const r = await api(`/lab/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: "completed", results: text }) });
    if (r.ok) { toast({ title: "Results submitted!" }); setResults(prev => ({ ...prev, [id]: "" })); loadOrders(); }
  }

  async function uploadReport(orderId: number, patientId: number, file: File) {
    setUploadingId(orderId);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result as string;
      const r = await api("/lab/reports", { method: "POST", body: JSON.stringify({ labOrderId: orderId, patientId, uploadedBy: user?.id, fileName: file.name, fileType: file.type.includes("pdf") ? "pdf" : "image", fileData: data }) });
      if (r.ok) { toast({ title: "Report uploaded & AI-parsed!" }); loadOrders(); loadReports(); }
      else toast({ title: "Upload failed", variant: "destructive" });
      setUploadingId(null);
    };
    reader.readAsDataURL(file);
  }

  async function translateOrder(order: any) {
    if (translations[order.id]) { setExpanded(p => ({ ...p, [order.id]: !p[order.id] })); return; }
    setTranslating(order.id);
    const r = await api("/ai/lab-translate", { method: "POST", body: JSON.stringify({ clinicalIntent: order.clinicalIntent, priority: order.priority, patientId: order.patientId }) });
    if (r.ok) { const d = await r.json(); setTranslations(p => ({ ...p, [order.id]: d })); }
    setTranslating(null);
    setExpanded(p => ({ ...p, [order.id]: true }));
  }

  const filteredOrders = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const statCount = orders.filter(o => o.priority === "stat").length;
  const completedCount = orders.filter(o => o.status === "completed").length;

  return (
    <div className="flex h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <aside className="w-52 flex-shrink-0 flex flex-col border-r" style={{ background: "hsl(217 27% 8%)", borderColor: "hsl(var(--border))" }}>
        <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}><Activity size={14} className="text-black" /></div><span className="font-bold text-sm">PANOR</span></div>
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(270 60% 60%)" }}>Lab Portal</div>
          <div className="text-xs mt-0.5 truncate">{user?.name}</div>
        </div>
        <div className="p-3 space-y-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="rounded-lg p-3 text-center" style={{ background: "hsl(0 72% 51% / 0.1)" }}>
            <div className="text-2xl font-bold" style={{ color: "hsl(0 72% 51%)" }}>{statCount}</div>
            <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>STAT Orders</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "hsl(38 92% 50% / 0.1)" }}>
            <div className="text-2xl font-bold" style={{ color: "hsl(38 92% 50%)" }}>{pendingCount}</div>
            <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Pending</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "hsl(142 71% 45% / 0.1)" }}>
            <div className="text-2xl font-bold" style={{ color: "hsl(142 71% 45%)" }}>{completedCount}</div>
            <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Completed</div>
          </div>
        </div>
        <nav className="p-2 space-y-0.5">
          {(["all", "pending", "in-progress", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="w-full text-left px-3 py-2 rounded-lg text-xs capitalize transition-colors"
              style={{ background: filter === f ? "hsl(270 60% 60% / 0.1)" : "transparent", color: filter === f ? "hsl(270 60% 60%)" : "hsl(var(--muted-foreground))" }}>{f === "all" ? "All Orders" : f.replace("-", " ")}</button>
          ))}
        </nav>
        <div className="mt-auto p-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <button onClick={() => { logout(); setLocation("/"); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: "hsl(var(--muted-foreground))" }}><LogOut size={13} /> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Lab Order Queue</h1>
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{filteredOrders.length} orders</span>
        </div>

        {filteredOrders.sort((a, b) => {
          const pri = { stat: 0, urgent: 1, routine: 2 };
          return (pri[a.priority as keyof typeof pri] ?? 2) - (pri[b.priority as keyof typeof pri] ?? 2);
        }).map((order: any) => {
          const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
          const pc = PRIORITY_CONFIG[order.priority] ?? PRIORITY_CONFIG.routine;
          const isExpanded = expanded[order.id];
          const aiData = translations[order.id];
          const orderReports = reports.filter(r => r.labOrderId === order.id);

          return (
            <div key={order.id} className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: pc.color, background: `${pc.color}15` }}>{order.priority}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                      {order.requestedByName && <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>by {order.requestedByName}</span>}
                    </div>
                    <div className="text-sm font-semibold">{order.patientName ?? `Patient #${order.patientId}`}</div>
                    <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{order.clinicalIntent}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(order.tests ?? []).map((t: any, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>{t.name}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {order.status === "pending" && <button onClick={() => updateStatus(order.id, "in-progress")} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap" style={{ background: "hsl(199 89% 48% / 0.15)", color: "hsl(199 89% 48%)" }}>Start</button>}
                    {order.status === "in-progress" && <button onClick={() => updateStatus(order.id, "completed")} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap" style={{ background: "hsl(142 71% 45% / 0.15)", color: "hsl(142 71% 45%)" }}>Complete</button>}
                    <button onClick={() => translateOrder(order)} disabled={translating === order.id} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                      <Brain size={10} /> {translating === order.id ? "..." : "AI Guide"}
                    </button>
                    <button onClick={() => setExpanded(p => ({ ...p, [order.id]: !p[order.id] }))} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: "hsl(var(--border))" }}>
                    {aiData && (
                      <div className="rounded-lg p-3 space-y-2" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}><Brain size={12} /> AI Lab Instructions</div>
                        {(aiData.tests ?? []).map((t: any, i: number) => (
                          <div key={i} className="text-xs py-1.5 border-b last:border-0" style={{ borderColor: "hsl(var(--border))" }}>
                            <span className="font-semibold">{t.name}</span>
                            {t.instructions && <span style={{ color: "hsl(var(--muted-foreground))" }}> · {t.instructions}</span>}
                          </div>
                        ))}
                        {aiData.collectionInstructions && <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{aiData.collectionInstructions}</p>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold block" style={{ color: "hsl(var(--muted-foreground))" }}>Submit Results</label>
                      <textarea value={results[order.id] ?? ""} onChange={e => setResults(p => ({ ...p, [order.id]: e.target.value }))} rows={3} placeholder="Enter lab results manually..." className="w-full rounded-lg px-3 py-2 text-xs resize-none" style={{ background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", outline: "none" }} />
                      <div className="flex gap-2">
                        <button onClick={() => submitManualResult(order.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(142 71% 45%)", color: "white" }}>Submit Text Results</button>
                        <div>
                          <input type="file" accept=".pdf,image/*" className="hidden" ref={el => fileRefs.current[order.id] = el} onChange={e => e.target.files?.[0] && uploadReport(order.id, order.patientId, e.target.files[0])} />
                          <button onClick={() => fileRefs.current[order.id]?.click()} disabled={uploadingId === order.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" style={{ background: "hsl(270 60% 60% / 0.15)", color: "hsl(270 60% 60%)" }}>
                            <Upload size={11} /> {uploadingId === order.id ? "Uploading & Parsing..." : "Upload PDF / Image"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {orderReports.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Uploaded Reports</div>
                        {orderReports.map(rep => (
                          <div key={rep.id} className="rounded-lg p-3" style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle size={12} style={{ color: "hsl(142 71% 45%)" }} /><span className="font-semibold">{rep.fileName}</span></div>
                            {rep.interpretation && <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{rep.interpretation}</p>}
                            {rep.parsedValues?.length > 0 && (
                              <div className="mt-2 rounded overflow-hidden text-[10px]" style={{ border: "1px solid hsl(var(--border))" }}>
                                <table className="w-full"><thead><tr style={{ background: "hsl(var(--muted))" }}>{["Test", "Value", "Unit", "Status"].map(h => <th key={h} className="text-left px-2 py-1 font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>)}</tr></thead>
                                  <tbody>{rep.parsedValues.map((v: any, i: number) => <tr key={i} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                                    <td className="px-2 py-1">{v.test}</td>
                                    <td className="px-2 py-1 font-bold" style={{ color: v.status === "normal" ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{v.value}</td>
                                    <td className="px-2 py-1" style={{ color: "hsl(var(--muted-foreground))" }}>{v.unit}</td>
                                    <td className="px-2 py-1"><span className="px-1 py-0.5 rounded text-[9px]" style={{ background: v.status === "normal" ? "hsl(142 71% 45% / 0.1)" : "hsl(0 72% 51% / 0.1)", color: v.status === "normal" ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{v.status}</span></td>
                                  </tr>)}</tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {order.results && !orderReports.length && (
                      <div className="rounded-lg p-3 text-xs" style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
                        <div className="font-semibold mb-1" style={{ color: "hsl(142 71% 45%)" }}>Results</div>
                        <p style={{ color: "hsl(var(--muted-foreground))" }}>{order.results}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredOrders.length === 0 && <div className="text-center py-16"><FlaskConical size={40} className="mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} /><p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No lab orders found</p></div>}
      </main>
    </div>
  );
}
