import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Activity, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: "Patient", email: "patient@panor.ai", color: "hsl(142 71% 45%)" },
  { label: "Doctor", email: "doctor@panor.ai", color: "hsl(199 89% 48%)" },
  { label: "Lab Tech", email: "lab@panor.ai", color: "hsl(270 60% 60%)" },
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
        patient: "/patient",
        doctor: "/doctor",
        lab: "/lab",
        analyst: "/analytics",
        admin: "/admin",
      };
      setLocation(roleRoutes[user.role] ?? "/patient");
    } catch {
      toast({ title: "Login failed", description: "Invalid credentials. Check your email and password.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "123456");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: "hsl(var(--primary))" }}>
            <Activity size={26} className="text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>PANOR</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Patient-Augmented Networked Omni-Records</p>
          </div>
        </div>

        <div className="rounded-xl p-6 space-y-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>Sign in to your account</h2>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Clinical-grade access control</p>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Email address</label>
              <input
                {...form.register("email")}
                type="email"
                data-testid="input-email"
                placeholder="you@panor.ai"
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none transition-colors placeholder:opacity-40"
                style={{
                  background: "hsl(var(--input))",
                  border: `1px solid ${form.formState.errors.email ? "hsl(0 72% 51%)" : "hsl(var(--border))"}`,
                  color: "hsl(var(--foreground))",
                }}
              />
              {form.formState.errors.email && (
                <p className="text-xs" style={{ color: "hsl(0 72% 51%)" }}>{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Password</label>
              <div className="relative">
                <input
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  placeholder="••••••••"
                  className="w-full rounded-md px-3 py-2.5 text-sm outline-none transition-colors placeholder:opacity-40 pr-10"
                  style={{
                    background: "hsl(var(--input))",
                    border: `1px solid ${form.formState.errors.password ? "hsl(0 72% 51%)" : "hsl(var(--border))"}`,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-login"
              className="w-full rounded-md py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Quick access — demo accounts</p>
            <div className="grid grid-cols-5 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email)}
                  data-testid={`button-demo-${acc.label.toLowerCase().replace(" ", "-")}`}
                  className="rounded-md py-1.5 text-[10px] font-semibold text-center transition-opacity hover:opacity-80"
                  style={{ background: `${acc.color}20`, color: acc.color, border: `1px solid ${acc.color}30` }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Password: <span className="mono font-medium">123456</span> for all demo accounts</p>
          </div>
        </div>

        <p className="text-center text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          PANOR Clinical Intelligence Platform &bull; Pakistan Health Initiative 2026
        </p>
      </div>
    </div>
  );
}
