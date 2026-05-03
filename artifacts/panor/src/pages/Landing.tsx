import { Link } from "wouter";
import { Activity, Shield, Brain, FlaskConical, BarChart3, Users, Stethoscope, CreditCard, CheckCircle, ArrowRight, Globe, Lock, Zap, Heart, Building2, Star } from "lucide-react";

const FEATURES = [
  { icon: <Brain size={20} />, title: "AI Clinical Co-pilot", desc: "GPT-powered differential diagnosis, drug interaction guardian, and symptom intake — all in real time.", color: "hsl(199 89% 48%)" },
  { icon: <FlaskConical size={20} />, title: "Lab Intelligence", desc: "Auto-translate clinical orders to lab tests. Upload PDF/image results and AI parses values instantly.", color: "hsl(270 60% 60%)" },
  { icon: <BarChart3 size={20} />, title: "Epidemiology Radar", desc: "City-to-province outbreak detection. Real-time disease cluster tracking for government decision-making.", color: "hsl(38 92% 50%)" },
  { icon: <Shield size={20} />, title: "Drug Safety Guardian", desc: "Real-time interaction checking with 97%+ confidence. Blocked prescriptions auto-suggest safe alternatives.", color: "hsl(142 71% 45%)" },
  { icon: <CreditCard size={20} />, title: "Integrated Billing", desc: "Multi-method payments — EasyPaisa, JazzCash, PayPal, bank transfer. With GST, welfare discounts, and digital receipts.", color: "hsl(38 92% 50%)" },
  { icon: <Users size={20} />, title: "Doctor Collaboration", desc: "Real-time physician-to-physician consultation threads. Share patient records and get expert second opinions.", color: "hsl(199 89% 48%)" },
];

const ROLES = [
  { role: "Patient", color: "hsl(142 71% 45%)", bg: "hsl(142 71% 45% / 0.1)", desc: "AI health assistant, complete medical history, appointment booking, lab reports, prescriptions, and billing — all in one portal.", href: "/auth/login?role=patient", points: ["AI symptom analysis", "Book appointments", "View lab reports & history", "Digital prescriptions", "Pay bills online"] },
  { role: "Doctor", color: "hsl(199 89% 48%)", bg: "hsl(199 89% 48% / 0.1)", desc: "Clinical workstation with AI co-pilot, drug safety guardian, complete patient records, and peer collaboration tools.", href: "/auth/login?role=doctor", points: ["AI differential diagnosis", "Drug interaction guardian", "Full patient history", "Prescribe with dosage schedule", "Collaborate with specialists"] },
  { role: "Lab Technician", color: "hsl(270 60% 60%)", bg: "hsl(270 60% 60% / 0.1)", desc: "Smart order management with AI-translated instructions. Submit reports via PDF or manual entry with AI parsing.", href: "/auth/login?role=lab", points: ["View ordered tests instantly", "AI-translated instructions", "Upload PDF reports", "Auto-parse lab values", "Priority queue management"] },
  { role: "Finance Officer", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)", desc: "Complete billing system with configurable service pricing, GST management, welfare scheme discounts, and payment tracking.", href: "/auth/login?role=finance", points: ["Set service pricing", "Configure tax rates", "Welfare discount management", "Revenue analytics", "Multi-method payment tracking"] },
  { role: "Analyst", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)", desc: "Government-grade epidemiology intelligence. Drill down from national to city level with real-time outbreak alerts.", href: "/auth/login?role=analyst", points: ["Disease outbreak mapping", "District-level analytics", "Custom visualizations", "Emergency response triggers", "Export government reports"] },
  { role: "Admin", color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.1)", desc: "Executive oversight of the entire healthcare infrastructure — users, facilities, billing, and system-wide alerts.", href: "/auth/login?role=admin", points: ["User & facility management", "System-wide monitoring", "Audit logs", "Role management", "Infrastructure alerts"] },
];

const STATS = [
  { value: "2.4M+", label: "Patient Records" },
  { value: "48,000+", label: "Registered Doctors" },
  { value: "1,200+", label: "Healthcare Facilities" },
  { value: "99.97%", label: "System Uptime" },
];

const GOVLOGOS = ["Federal Ministry of Health", "NADRA", "Punjab Health Authority", "KP Health Dept", "SECP", "State Bank of Pakistan"];

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4" style={{ background: "hsl(215 35% 6% / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
            <Activity size={16} className="text-black" />
          </div>
          <span className="text-base font-bold tracking-wide">PANOR</span>
          <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>GOV</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#roles" className="hover:text-white transition-colors">Portals</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <button className="text-sm px-4 py-2 rounded-lg transition-colors hover:text-white" style={{ color: "hsl(var(--muted-foreground))" }} data-testid="link-nav-login">
              Sign in
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="text-sm px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-90" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }} data-testid="link-nav-signup">
              Register
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(199 89% 48% / 0.12), transparent)" }} />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: "hsl(var(--primary))" }} />
          Pakistan's National Healthcare Infrastructure Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
          Clinical Intelligence
          <span style={{ color: "hsl(var(--primary))" }}> Powered by AI</span>
          <br />for Every Pakistani
        </h1>
        <p className="mt-6 text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
          PANOR is Pakistan's government-grade medical intelligence platform — connecting patients, doctors, labs, finance, and health authorities in one secure, AI-powered system.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Link href="/auth/signup">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }} data-testid="button-hero-register">
              Register as Patient <ArrowRight size={15} />
            </button>
          </Link>
          <Link href="/auth/login">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors hover:text-white" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" }} data-testid="button-hero-login">
              Healthcare Staff Login
            </button>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-6 mt-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust logos */}
      <section className="py-8 px-6" style={{ borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }}>
        <p className="text-center text-xs uppercase tracking-wider mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>Authorized by Government of Pakistan</p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {GOVLOGOS.map((name) => (
            <div key={name} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted))" }}>{name}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Everything Healthcare Needs</h2>
            <p className="text-sm mt-3 max-w-xl mx-auto" style={{ color: "hsl(var(--muted-foreground))" }}>
              From AI-powered diagnostics to government-level epidemiology — PANOR is the complete clinical operating system.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl p-5 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${f.color}15` }}>
                  <span style={{ color: f.color }}>{f.icon}</span>
                </div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Portals */}
      <section id="roles" className="py-24 px-6" style={{ background: "hsl(217 27% 8%)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Purpose-Built for Every Role</h2>
            <p className="text-sm mt-3 max-w-xl mx-auto" style={{ color: "hsl(var(--muted-foreground))" }}>
              Each user sees exactly what they need — nothing more, nothing less. Role-based access with NADRA-verified identity.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-xl p-5 space-y-4" style={{ background: r.bg, border: `1px solid ${r.color}30` }}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: r.color }}>{r.role}</span>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>{r.desc}</p>
                </div>
                <ul className="space-y-1.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs">
                      <CheckCircle size={11} style={{ color: r.color, flexShrink: 0 }} />
                      <span style={{ color: "hsl(var(--foreground))" }}>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href={r.href}>
                  <button className="w-full py-2 rounded-lg text-xs font-semibold mt-2 transition-opacity hover:opacity-80" style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }} data-testid={`button-role-${r.role.toLowerCase().replace(" ", "-")}`}>
                    Access {r.role} Portal →
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Government-Grade Security</h2>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              PANOR integrates with NADRA's national identity database for real-time patient identity verification. Every access is logged, audited, and encrypted.
            </p>
            <div className="space-y-3">
              {[
                { icon: <Lock size={14} />, text: "End-to-end encryption for all patient data" },
                { icon: <Globe size={14} />, text: "NADRA integration for identity verification" },
                { icon: <Shield size={14} />, text: "Role-based access control with OTP 2FA" },
                { icon: <Zap size={14} />, text: "Real-time audit logs for every action" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>{item.icon}</div>
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-8 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <Heart size={28} style={{ color: "hsl(var(--primary))" }} />
            <h3 className="text-xl font-bold">Social Welfare Integration</h3>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              PANOR calculates each patient's Social Welfare Score based on income, dependents, and geographic factors — automatically applying government healthcare subsidies and Sehat Sahulat Program benefits.
            </p>
            <div className="rounded-lg p-3 space-y-2" style={{ background: "hsl(var(--muted))" }}>
              {[
                { label: "Sehat Sahulat Program", value: "Eligible" },
                { label: "Welfare discount", value: "30%" },
                { label: "Annual coverage", value: "PKR 720,000" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{item.label}</span>
                  <span className="font-semibold" style={{ color: "hsl(142 71% 45%)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6" style={{ background: "hsl(217 27% 8%)" }}>
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Building2 size={32} className="mx-auto" style={{ color: "hsl(var(--primary))" }} />
          <h2 className="text-3xl font-bold">A National Health Infrastructure</h2>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            PANOR is Pakistan's government-mandated healthcare platform, developed under the Federal Ministry of Health's Digital Pakistan Initiative. It serves as the backbone for all public healthcare facilities — from primary health centers to tertiary hospitals — providing a single, unified medical record system for every citizen.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: "Health Facilities", value: "1,200+" },
              { label: "Provinces Covered", value: "All 4 + AJK" },
              { label: "Daily Consultations", value: "85,000+" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Start Your Health Journey Today</h2>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Register with your CNIC. Verify your identity in seconds. Access your complete health record instantly.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/signup">
              <button className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-opacity hover:opacity-90" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }} data-testid="button-cta-register">
                Register Now — It's Free <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/auth/login">
              <button className="px-8 py-3 rounded-xl font-semibold transition-colors" style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" }} data-testid="button-cta-login">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12" style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(215 35% 6%)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
                <Activity size={14} className="text-black" />
              </div>
              <span className="font-bold">PANOR</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>Patient-Augmented Networked Omni-Records. Pakistan's National Health Intelligence Platform.</p>
          </div>
          {[
            { title: "Platform", links: ["Patient Portal", "Doctor Workstation", "Lab Management", "Finance & Billing", "Analytics Dashboard"] },
            { title: "Government", links: ["Ministry of Health", "NADRA Integration", "Sehat Sahulat Program", "District Health", "Emergency Response"] },
            { title: "Legal", links: ["Privacy Policy", "Data Protection", "Terms of Service", "Security Policy", "Compliance"] },
          ].map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-xs transition-colors hover:text-white" style={{ color: "hsl(var(--muted-foreground))" }}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 flex items-center justify-between" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>© 2026 PANOR — Government of Pakistan. All rights reserved.</p>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Powered by GenAI | Built with Replit</p>
        </div>
      </footer>
    </div>
  );
}
