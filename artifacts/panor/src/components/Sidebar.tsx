import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  navItems: NavItem[];
  role?: string;
}

const ROLE_COLORS: Record<string, string> = {
  patient: "text-emerald-400",
  doctor: "text-sky-400",
  lab: "text-violet-400",
  analyst: "text-amber-400",
  admin: "text-rose-400",
};

const ROLE_LABELS: Record<string, string> = {
  patient: "Patient Portal",
  doctor: "Clinical Workstation",
  lab: "Laboratory",
  analyst: "Epidemiology",
  admin: "Administration",
};

export default function Sidebar({ navItems, role }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col"
      style={{ background: "hsl(var(--sidebar))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
    >
      <div className="flex items-center gap-2 px-4 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "hsl(var(--primary))" }}>
          <Activity size={14} className="text-black" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-wide" style={{ color: "hsl(var(--foreground))" }}>PANOR</div>
          <div className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            {role ? ROLE_LABELS[role] ?? role : "Clinical Intelligence"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "text-white font-medium"
                  : "font-normal hover:bg-white/5"
              )}
              style={active ? {
                background: "hsl(var(--primary) / 0.15)",
                color: "hsl(var(--primary))",
              } : {
                color: "hsl(var(--sidebar-foreground))",
              }}
            >
              <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t space-y-2" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        {user && (
          <div className="px-3 py-2 rounded-md" style={{ background: "hsl(var(--sidebar-accent))" }}>
            <div className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>{user.name}</div>
            <div className={cn("text-[10px] capitalize", role ? ROLE_COLORS[role] : "text-sky-400")}>
              {user.role}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          data-testid="button-logout"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-red-500/10 hover:text-red-400"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
