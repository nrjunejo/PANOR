import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Activity, ArrowLeft, Eye, EyeOff, CheckCircle, User, Mail, Lock, Phone } from "lucide-react";

const step1Schema = z.object({
  name: z.string().min(3, "Full name required (min 3 chars)"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(11, "Valid phone number required"),
  role: z.enum(["patient", "doctor", "lab", "analyst", "admin", "finance"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

const otpSchema = z.object({ otp: z.string().length(6, "Enter 6-digit OTP") });

type Step1Form = z.infer<typeof step1Schema>;
type OtpForm = z.infer<typeof otpSchema>;

const ROLE_OPTIONS = [
  { value: "patient", label: "Patient", desc: "Access your health records" },
  { value: "doctor", label: "Doctor / Physician", desc: "Clinical workstation access" },
  { value: "lab", label: "Lab Technician", desc: "Laboratory management" },
  { value: "finance", label: "Finance Officer", desc: "Billing & pricing management" },
  { value: "analyst", label: "Health Analyst", desc: "Epidemiology & data analysis" },
  { value: "admin", label: "Administrator", desc: "System administration" },
];

export default function SignUp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Step1Form | null>(null);
  const [demoOtp, setDemoOtp] = useState<string>("");

  const form1 = useForm<Step1Form>({ resolver: zodResolver(step1Schema), defaultValues: { role: "patient" } });
  const form2 = useForm<OtpForm>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });

  const handleStep1 = async (data: Step1Form) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, purpose: "signup" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send OTP");
      setFormData(data);
      setDemoOtp(json.demoOtp ?? "");
      setStep(2);
      toast({ title: "OTP sent!", description: `Check your email (demo OTP shown below)` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (data: OtpForm) => {
    if (!formData) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, otp: data.otp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Signup failed");
      localStorage.setItem("panor_token", json.token);
      localStorage.setItem("panor_user", JSON.stringify(json.user));
      setStep(3);
    } catch (e: any) {
      toast({ title: "Signup failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    const user = JSON.parse(localStorage.getItem("panor_user") ?? "{}");
    const routes: Record<string, string> = { patient: "/patient", doctor: "/doctor", lab: "/lab", analyst: "/analytics", admin: "/admin", finance: "/finance" };
    setLocation(routes[user.role] ?? "/patient");
  };

  const inputStyle = {
    width: "100%" as const,
    background: "hsl(var(--input))",
    border: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    borderRadius: "0.5rem",
    padding: "0.625rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/">
            <button className="text-xs flex items-center gap-1 hover:text-white transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ArrowLeft size={12} /> Back to home
            </button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-1" style={{ background: "hsl(var(--primary))" }}>
            <Activity size={22} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold">Create your PANOR account</h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Pakistan's national health platform</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {[{ n: 1, label: "Account Details" }, { n: 2, label: "Verify Email" }, { n: 3, label: "Complete" }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}
                style={{ background: step >= s.n ? "hsl(var(--primary))" : "hsl(var(--muted))", color: step >= s.n ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }}>
                {step > s.n ? <CheckCircle size={12} /> : s.n}
              </div>
              <span className="text-[10px]" style={{ color: step >= s.n ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>{s.label}</span>
              {i < 2 && <div className="flex-1 h-px" style={{ background: step > s.n ? "hsl(var(--primary))" : "hsl(var(--border))" }} />}
            </div>
          ))}
        </div>

        <div className="rounded-xl p-6 space-y-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          {step === 1 && (
            <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>I am registering as</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const selected = form1.watch("role") === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => form1.setValue("role", r.value as any)}
                        data-testid={`role-option-${r.value}`}
                        className="p-3 rounded-lg text-left transition-colors"
                        style={{
                          background: selected ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted))",
                          border: `1px solid ${selected ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}`,
                        }}
                      >
                        <div className="text-xs font-semibold" style={{ color: selected ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>{r.label}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{r.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Full Name</label>
                  <input {...form1.register("name")} placeholder="Muhammad Ali Khan" style={inputStyle} data-testid="input-signup-name" />
                  {form1.formState.errors.name && <p className="text-[10px] mt-1" style={{ color: "hsl(0 72% 51%)" }}>{form1.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Email address</label>
                  <input {...form1.register("email")} type="email" placeholder="you@example.com" style={inputStyle} data-testid="input-signup-email" />
                  {form1.formState.errors.email && <p className="text-[10px] mt-1" style={{ color: "hsl(0 72% 51%)" }}>{form1.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Phone number</label>
                  <input {...form1.register("phone")} placeholder="0300-1234567" style={inputStyle} data-testid="input-signup-phone" />
                  {form1.formState.errors.phone && <p className="text-[10px] mt-1" style={{ color: "hsl(0 72% 51%)" }}>{form1.formState.errors.phone.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Password</label>
                  <div className="relative">
                    <input {...form1.register("password")} type={showPwd ? "text" : "password"} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: "2.5rem" }} data-testid="input-signup-password" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {form1.formState.errors.password && <p className="text-[10px] mt-1" style={{ color: "hsl(0 72% 51%)" }}>{form1.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Confirm Password</label>
                  <input {...form1.register("confirmPassword")} type="password" placeholder="Repeat password" style={inputStyle} data-testid="input-signup-confirm" />
                  {form1.formState.errors.confirmPassword && <p className="text-[10px] mt-1" style={{ color: "hsl(0 72% 51%)" }}>{form1.formState.errors.confirmPassword.message}</p>}
                </div>
              </div>

              <button type="submit" disabled={loading} data-testid="button-signup-next"
                className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                {loading ? "Sending OTP..." : "Continue — Send OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-5">
              <div className="text-center space-y-2">
                <Mail size={28} className="mx-auto" style={{ color: "hsl(var(--primary))" }} />
                <h3 className="font-semibold">Verify your email</h3>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>A 6-digit OTP was sent to <strong>{formData?.email}</strong></p>
                {demoOtp && (
                  <div className="rounded-lg p-3 mt-2" style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Demo OTP (shown for testing):</p>
                    <p className="text-2xl font-mono font-bold tracking-[0.5em] mt-1" style={{ color: "hsl(var(--primary))" }}>{demoOtp}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>Enter 6-digit OTP</label>
                <input {...form2.register("otp")} placeholder="123456" maxLength={6}
                  style={{ ...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.4em", fontFamily: "monospace" }}
                  data-testid="input-otp" />
                {form2.formState.errors.otp && <p className="text-[10px] mt-1 text-center" style={{ color: "hsl(0 72% 51%)" }}>{form2.formState.errors.otp.message}</p>}
              </div>
              <button type="submit" disabled={loading} data-testid="button-verify-otp"
                className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Back to previous step
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "hsl(142 71% 45% / 0.15)" }}>
                <CheckCircle size={32} style={{ color: "hsl(142 71% 45%)" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Account Created!</h3>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Welcome to PANOR. Your account is verified and ready.</p>
              </div>
              {formData?.role === "patient" && (
                <div className="rounded-lg p-3 text-xs text-left" style={{ background: "hsl(var(--muted))" }}>
                  <p className="font-semibold mb-1" style={{ color: "hsl(var(--primary))" }}>Next: Complete your health profile</p>
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>Add your CNIC for NADRA verification, complete your health history, and access government welfare benefits.</p>
                </div>
              )}
              <button onClick={goToDashboard} data-testid="button-go-dashboard"
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                Go to My Dashboard
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Already have an account?{" "}
          <Link href="/auth/login"><span className="font-medium cursor-pointer" style={{ color: "hsl(var(--primary))" }}>Sign in</span></Link>
        </p>
      </div>
    </div>
  );
}
