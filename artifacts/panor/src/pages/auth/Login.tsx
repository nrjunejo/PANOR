import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Activity, Eye, EyeOff, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: "Patient", email: "patient@panor.ai", color: "hsl(142 71% 45%)" },
  { label: "Doctor", email: "doctor@panor.ai", color: "hsl(199 89% 48%)" },
  { label: "Lab", email: "lab@panor.ai", color: "hsl(270 60% 60%)" },
  { label: "Finance", email: "finance@panor.ai", color: "hsl(38 92% 50%)" },
  { label: "Analyst", email: "analyst@panor.ai", color: "hsl(38 92% 50%)" },
  { label: "Admin", email: "admin@panor.ai", color: "hsl(0 72% 51%)" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      const user = JSON.parse(localStorage.getItem("panor_user") ?? "{}");
      const roleRoutes: Record<string, string> = {
        patient: "/patient", doctor: "/doctor", lab: "/lab",
        analyst: "/analytics", admin: "/admin", finance: "/finance",
      };
      setLocation(roleRoutes[user.role] ?? "/patient");
    } catch {
      toast({ title: "Login failed", description: "Invalid credentials. Please check your email and password.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "123456");
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-md space-y-5">
        <div>
          <Link href="/">
            <button className="text-xs flex items-center gap-1 mb-4 hover:text-white transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ArrowLeft size={12} /> Back to home
            </button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: "hsl(var(--primary))" }}>
            <Activity size={22} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold">Sign in to PANOR</h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Pakistan's National Health Intelligence Platform</p>
        </div>

        <div className="rounded-xl p-6 space-y-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Email address</label>
              <input {...form.register("email")} type="email" placeholder="you@panor.ai" style={inputStyle} data-testid="input-email" />
              {form.formState.errors.email && <p className="text-[10px]" style={{ color: "hsl(0 72% 51%)" }}>{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Password</label>
              <div className="relative">
                <input {...form.register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" style={{ ...inputStyle, paddingRight: "2.5rem" }} data-testid="input-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="text-xs" style={{ color: "hsl(var(--primary))" }}>Forgot password?</button>
            </div>
            <button type="submit" disabled={loading} data-testid="button-login"
              className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Demo accounts (all passwords: 123456)</p>
            <div className="grid grid-cols-3 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button key={acc.email} type="button" onClick={() => fillDemo(acc.email)} data-testid={`button-demo-${acc.label.toLowerCase()}`}
                  className="rounded-md py-1.5 text-[10px] font-semibold text-center transition-opacity hover:opacity-80"
                  style={{ background: `${acc.color}15`, color: acc.color, border: `1px solid ${acc.color}25` }}>
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          No account?{" "}
          <Link href="/auth/signup"><span className="font-medium cursor-pointer" style={{ color: "hsl(var(--primary))" }}>Register here</span></Link>
        </p>
      </div>
    </div>
  );
}
