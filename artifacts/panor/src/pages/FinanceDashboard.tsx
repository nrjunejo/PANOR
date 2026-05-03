import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, CreditCard, Settings, FileText, Percent, Tag, LogOut, Activity, Plus, Edit2, X } from "lucide-react";

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("panor_token");
  return fetch(`/api${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) } });
}

const PAYMENT_METHODS = [
  { id: "easypaisa", label: "EasyPaisa", color: "#22c55e", icon: "💚" },
  { id: "jazzcash", label: "JazzCash", color: "#ef4444", icon: "🔴" },
  { id: "bank_transfer", label: "Bank Transfer", color: "#3b82f6", icon: "🏦" },
  { id: "paypal", label: "PayPal", color: "#0070ba", icon: "🅿️" },
  { id: "cash", label: "Cash", color: "#a855f7", icon: "💵" },
];

const CATEGORIES = ["All", "Consultation", "Lab", "Procedure", "Medicine", "Admission"];

export default function FinanceDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"overview" | "pricing" | "bills" | "payments">("overview");
  const [revenue, setRevenue] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [payingBill, setPayingBill] = useState<any>(null);
  const [newPrice, setNewPrice] = useState({ category: "Consultation", serviceName: "", serviceCode: "", basePrice: "", taxRate: "5", welfareDiscount: "0" });

  useEffect(() => {
    loadRevenue();
    loadPricing();
    loadBills();
  }, []);

  async function loadRevenue() {
    const r = await api("/finance/revenue");
    if (r.ok) setRevenue(await r.json());
  }

  async function loadPricing() {
    const r = await api("/finance/pricing");
    if (r.ok) { const d = await r.json(); setPricing(d.pricing); }
  }

  async function loadBills() {
    const r = await api("/billing/bills");
    if (r.ok) { const d = await r.json(); setBills(d.bills ?? d); }
  }

  async function updatePrice(id: number, data: any) {
    const r = await api(`/finance/pricing/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    if (r.ok) { toast({ title: "Price updated" }); loadPricing(); setEditingPrice(null); }
  }

  async function addPrice() {
    if (!newPrice.serviceName || !newPrice.serviceCode || !newPrice.basePrice) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    const r = await api("/finance/pricing", { method: "POST", body: JSON.stringify({ ...newPrice, basePrice: parseFloat(newPrice.basePrice), taxRate: parseFloat(newPrice.taxRate), welfareDiscount: parseFloat(newPrice.welfareDiscount) }) });
    if (r.ok) { toast({ title: "Service added" }); loadPricing(); setShowAddPrice(false); setNewPrice({ category: "Consultation", serviceName: "", serviceCode: "", basePrice: "", taxRate: "5", welfareDiscount: "0" }); }
    else { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); }
  }

  async function payBill(billId: number, method: string) {
    setLoading(true);
    const r = await api(`/finance/bills/${billId}/pay`, { method: "POST", body: JSON.stringify({ paymentMethod: method, paymentReference: `${method.toUpperCase()}-${Date.now()}` }) });
    if (r.ok) { toast({ title: "Payment recorded!" }); loadBills(); loadRevenue(); setPayingBill(null); }
    else { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); }
    setLoading(false);
  }

  const filteredPricing = catFilter === "All" ? pricing : pricing.filter(p => p.category === catFilter);
  const pendingBills = bills.filter(b => b.status === "pending");
  const paidBills = bills.filter(b => b.status === "paid");

  const inputStyle = { background: "hsl(var(--input))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.8rem", outline: "none", width: "100%" };

  const pieData = revenue ? Object.entries(revenue.byPaymentMethod).map(([name, value]) => ({ name, value })) : [];
  const PIE_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#0070ba", "#a855f7", "#f59e0b"];

  return (
    <div className="flex h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r" style={{ background: "hsl(217 27% 8%)", borderColor: "hsl(var(--border))" }}>
        <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
              <Activity size={14} className="text-black" />
            </div>
            <span className="font-bold text-sm">PANOR</span>
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(38 92% 50%)" }}>Finance Office</div>
          <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{user?.name}</div>
        </div>
        <nav className="p-2 flex-1 space-y-1">
          {[
            { id: "overview", icon: <TrendingUp size={14} />, label: "Revenue Overview" },
            { id: "pricing", icon: <Tag size={14} />, label: "Service Pricing" },
            { id: "bills", icon: <FileText size={14} />, label: "Pending Bills" },
            { id: "payments", icon: <CreditCard size={14} />, label: "Payment History" },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id as any)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{ background: tab === item.id ? "hsl(var(--primary) / 0.1)" : "transparent", color: tab === item.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <button onClick={() => { logout(); setLocation("/"); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {tab === "overview" && (
            <>
              <h1 className="text-xl font-bold">Revenue Overview</h1>
              {revenue && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: "Total Revenue", value: `PKR ${revenue.totalRevenue.toLocaleString()}`, icon: <DollarSign size={16} />, color: "hsl(142 71% 45%)" },
                      { label: "Pending Collection", value: `PKR ${revenue.pendingRevenue.toLocaleString()}`, icon: <Clock size={16} />, color: "hsl(38 92% 50%)" },
                      { label: "Total Tax Collected", value: `PKR ${revenue.totalTax.toLocaleString()}`, icon: <Percent size={16} />, color: "hsl(199 89% 48%)" },
                      { label: "Welfare Discounts", value: `PKR ${revenue.totalDiscount.toLocaleString()}`, icon: <TrendingUp size={16} />, color: "hsl(270 60% 60%)" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</span>
                          <span style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <h3 className="text-sm font-semibold mb-4">Monthly Revenue Trend</h3>
                      {revenue.monthlyRevenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={revenue.monthlyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <p className="text-xs py-16 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>No paid bills yet</p>}
                    </div>
                    <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                      <h3 className="text-sm font-semibold mb-4">Payment Methods Breakdown</h3>
                      {pieData.length > 0 ? (
                        <div className="flex items-center gap-4">
                          <PieChart width={140} height={140}>
                            <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value">
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                          <div className="space-y-2">
                            {pieData.map((item, i) => (
                              <div key={item.name} className="flex items-center gap-2 text-xs">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span style={{ color: "hsl(var(--muted-foreground))" }}>{item.name}</span>
                                <span className="font-semibold">PKR {Number(item.value).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <p className="text-xs py-16 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>No payment data yet</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Total Invoices", value: revenue.totalBills, color: "hsl(var(--foreground))" },
                      { label: "Paid Invoices", value: revenue.paidBills, color: "hsl(142 71% 45%)" },
                      { label: "Pending Invoices", value: revenue.pendingBills, color: "hsl(38 92% 50%)" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                        <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "pricing" && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Service Pricing</h1>
                <button onClick={() => setShowAddPrice(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <Plus size={12} /> Add Service
                </button>
              </div>

              {showAddPrice && (
                <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Add New Service</h3>
                    <button onClick={() => setShowAddPrice(false)}><X size={14} style={{ color: "hsl(var(--muted-foreground))" }} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Category</label>
                      <select value={newPrice.category} onChange={e => setNewPrice(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                        {["Consultation", "Lab", "Procedure", "Medicine", "Admission"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Service Name</label>
                      <input value={newPrice.serviceName} onChange={e => setNewPrice(p => ({ ...p, serviceName: e.target.value }))} placeholder="e.g. Complete Blood Count" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Service Code</label>
                      <input value={newPrice.serviceCode} onChange={e => setNewPrice(p => ({ ...p, serviceCode: e.target.value.toUpperCase() }))} placeholder="LAB-CBC" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Base Price (PKR)</label>
                      <input type="number" value={newPrice.basePrice} onChange={e => setNewPrice(p => ({ ...p, basePrice: e.target.value }))} placeholder="500" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Tax Rate (%)</label>
                      <input type="number" value={newPrice.taxRate} onChange={e => setNewPrice(p => ({ ...p, taxRate: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Welfare Discount (%)</label>
                      <input type="number" value={newPrice.welfareDiscount} onChange={e => setNewPrice(p => ({ ...p, welfareDiscount: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={addPrice} className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>Add Service</button>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: catFilter === c ? "hsl(var(--primary))" : "hsl(var(--muted))", color: catFilter === c ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }}>
                    {c}
                  </button>
                ))}
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "hsl(var(--muted))" }}>
                      {["Category", "Service Name", "Code", "Base Price", "Tax %", "Welfare Disc %", "Total w/Tax", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPricing.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : "none", background: editingPrice?.id === p.id ? "hsl(var(--primary) / 0.05)" : "transparent" }}>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{
                            background: p.category === "Lab" ? "hsl(270 60% 60% / 0.15)" : p.category === "Consultation" ? "hsl(199 89% 48% / 0.15)" : "hsl(38 92% 50% / 0.15)",
                            color: p.category === "Lab" ? "hsl(270 60% 60%)" : p.category === "Consultation" ? "hsl(199 89% 48%)" : "hsl(38 92% 50%)",
                          }}>{p.category}</span>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{p.serviceName}</td>
                        <td className="px-3 py-2.5 font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>{p.serviceCode}</td>
                        <td className="px-3 py-2.5">
                          {editingPrice?.id === p.id ? (
                            <input type="number" value={editingPrice.basePrice} onChange={e => setEditingPrice((ep: any) => ({ ...ep, basePrice: e.target.value }))} style={{ ...inputStyle, width: "80px" }} />
                          ) : <span>PKR {Number(p.basePrice).toLocaleString()}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {editingPrice?.id === p.id ? (
                            <input type="number" value={editingPrice.taxRate} onChange={e => setEditingPrice((ep: any) => ({ ...ep, taxRate: e.target.value }))} style={{ ...inputStyle, width: "60px" }} />
                          ) : <span>{p.taxRate}%</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {editingPrice?.id === p.id ? (
                            <input type="number" value={editingPrice.welfareDiscount} onChange={e => setEditingPrice((ep: any) => ({ ...ep, welfareDiscount: e.target.value }))} style={{ ...inputStyle, width: "60px" }} />
                          ) : <span style={{ color: "hsl(142 71% 45%)" }}>{p.welfareDiscount}%</span>}
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: "hsl(var(--primary))" }}>
                          PKR {(Number(p.basePrice) * (1 + Number(p.taxRate) / 100)).toFixed(0)}
                        </td>
                        <td className="px-3 py-2.5">
                          {editingPrice?.id === p.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => updatePrice(p.id, { basePrice: editingPrice.basePrice, taxRate: editingPrice.taxRate, welfareDiscount: editingPrice.welfareDiscount })}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "hsl(142 71% 45%)", color: "white" }}>Save</button>
                              <button onClick={() => setEditingPrice(null)} className="px-2 py-0.5 rounded text-[10px]" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingPrice({ id: p.id, basePrice: p.basePrice, taxRate: p.taxRate, welfareDiscount: p.welfareDiscount })}
                              className="p-1 rounded" style={{ color: "hsl(var(--primary))" }}>
                              <Edit2 size={11} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "bills" && (
            <>
              <h1 className="text-xl font-bold">Pending Bills — {pendingBills.length} awaiting payment</h1>
              <div className="space-y-3">
                {pendingBills.map(bill => (
                  <div key={bill.id} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{bill.patientName ?? `Patient #${bill.patientId}`}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 50%)" }}>PENDING</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {bill.invoiceNumber ?? `INV-${bill.id}`} • {new Date(bill.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {(bill.items ?? []).map((i: any) => i.description).join(" + ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: "hsl(var(--primary))" }}>PKR {Number(bill.total).toLocaleString()}</div>
                        {bill.taxAmount > 0 && <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>incl. PKR {Number(bill.taxAmount).toLocaleString()} tax</div>}
                        <button onClick={() => setPayingBill(bill)} className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                          Record Payment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingBills.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No pending bills</p>}
              </div>
            </>
          )}

          {tab === "payments" && (
            <>
              <h1 className="text-xl font-bold">Payment History — {paidBills.length} paid</h1>
              <div className="space-y-3">
                {paidBills.map(bill => (
                  <div key={bill.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle size={13} style={{ color: "hsl(142 71% 45%)" }} />
                        <span className="font-semibold text-sm">{bill.patientName ?? `Patient #${bill.patientId}`}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {bill.invoiceNumber ?? `INV-${bill.id}`} • Paid {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : "N/A"}
                      </div>
                      {bill.paymentMethod && (
                        <div className="text-xs mt-1">
                          {PAYMENT_METHODS.find(m => m.id === bill.paymentMethod)?.icon ?? "💳"} {bill.paymentMethod?.replace("_", " ").toUpperCase()}
                          {bill.paymentReference && <span style={{ color: "hsl(var(--muted-foreground))" }}> · {bill.paymentReference}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: "hsl(142 71% 45%)" }}>PKR {Number(bill.total).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {paidBills.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No paid bills yet</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md space-y-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Record Payment</h2>
              <button onClick={() => setPayingBill(null)}><X size={16} style={{ color: "hsl(var(--muted-foreground))" }} /></button>
            </div>
            <div className="rounded-lg p-3" style={{ background: "hsl(var(--muted))" }}>
              <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Patient</div>
              <div className="font-semibold text-sm">{payingBill.patientName ?? `Patient #${payingBill.patientId}`}</div>
              <div className="text-xl font-bold mt-1" style={{ color: "hsl(var(--primary))" }}>PKR {Number(payingBill.total).toLocaleString()}</div>
              {payingBill.taxAmount > 0 && <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>including PKR {Number(payingBill.taxAmount).toLocaleString()} GST</div>}
            </div>
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>Select payment method:</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} onClick={() => payBill(payingBill.id, m.id)} disabled={loading}
                    className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: `${m.color}15`, border: `1px solid ${m.color}30`, color: m.color }}>
                    <span>{m.icon}</span> {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
