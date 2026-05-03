import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import SkeletonCard, { SkeletonRow } from "@/components/SkeletonCard";
import {
  useListLabOrders, useUpdateLabOrder, getListLabOrdersQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Clock, CheckCircle, Activity, ChevronDown, ChevronUp } from "lucide-react";

const NAV = [
  { label: "All Orders", href: "/lab", icon: <FlaskConical size={14} /> },
  { label: "Pending", href: "/lab#pending", icon: <Clock size={14} /> },
  { label: "In Progress", href: "/lab#inprogress", icon: <Activity size={14} /> },
  { label: "Completed", href: "/lab#completed", icon: <CheckCircle size={14} /> },
];

const STATUS_FLOW: Record<string, string> = {
  pending: "in_progress",
  in_progress: "completed",
};

function LabOrderCard({ order, onUpdate }: { order: any; onUpdate: (id: number, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{order.patientName}</span>
            <SeverityBadge severity={order.priority} />
            <SeverityBadge severity={order.status} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {new Date(order.createdAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {STATUS_FLOW[order.status] && (
            <button
              onClick={() => onUpdate(order.id, STATUS_FLOW[order.status])}
              data-testid={`button-advance-order-${order.id}`}
              className="px-3 py-1.5 rounded-md text-xs font-semibold"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {order.status === "pending" ? "Start" : "Complete"}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>Clinical Intent</p>
        <p className="text-xs" style={{ color: "hsl(var(--foreground))" }}>{order.clinicalIntent}</p>
      </div>

      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>Ordered Tests</p>
        <div className="flex flex-wrap gap-1.5">
          {(order.tests ?? []).map((t: any, i: number) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
            >
              <span className="font-bold" style={{ color: "hsl(var(--primary))" }}>{t.code}</span>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>{t.name}</span>
            </span>
          ))}
        </div>
      </div>

      {order.aiTranslation && (
        <div className="rounded-md overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium"
            style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
            data-testid={`button-expand-ai-${order.id}`}
          >
            <span>AI Lab Instructions</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="px-3 py-2 space-y-2" style={{ background: "hsl(var(--card))" }}>
              <p className="text-xs" style={{ color: "hsl(var(--foreground))" }}>{order.aiTranslation}</p>
              {(order.tests ?? []).map((t: any, i: number) => (
                t.instructions && (
                  <div key={i} className="text-xs">
                    <span className="font-medium mono" style={{ color: "hsl(var(--primary))" }}>{t.code}:</span>
                    <span className="ml-1" style={{ color: "hsl(var(--muted-foreground))" }}>{t.instructions}</span>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabDashboard() {
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListLabOrders(filter === "all" ? {} : { status: filter });
  const updateMutation = useUpdateLabOrder();

  const handleUpdate = (id: number, status: string) => {
    updateMutation.mutate(
      { id, data: { status: status as "pending" | "in_progress" | "completed" | "cancelled" } },
      {
        onSuccess: () => {
          toast({ title: "Lab order updated", description: `Order marked as ${status.replace("_", " ")}` });
          queryClient.invalidateQueries({ queryKey: getListLabOrdersQueryKey({}) });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  const allOrders = orders?.orders ?? [];
  const pending = allOrders.filter((o: any) => o.status === "pending").length;
  const inProgress = allOrders.filter((o: any) => o.status === "in_progress").length;
  const completed = allOrders.filter((o: any) => o.status === "completed").length;

  const TABS = [
    { key: "all", label: "All Orders", count: allOrders.length },
    { key: "pending", label: "Pending", count: pending },
    { key: "in_progress", label: "In Progress", count: inProgress },
    { key: "completed", label: "Completed", count: completed },
  ] as const;

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <Sidebar navItems={NAV} role="lab" />
      <main className="ml-56 flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Laboratory Workstation</h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Manage lab orders with AI-translated clinical instructions</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Pending Orders" value={pending} icon={<Clock size={14} />} accent="warning" />
          <StatCard title="In Progress" value={inProgress} icon={<Activity size={14} />} accent="default" />
          <StatCard title="Completed Today" value={completed} icon={<CheckCircle size={14} />} accent="safe" />
          <StatCard title="Total Orders" value={allOrders.length} icon={<FlaskConical size={14} />} />
        </div>

        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "hsl(var(--muted))" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              data-testid={`tab-${tab.key}`}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={filter === tab.key ? {
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
              } : {
                color: "hsl(var(--muted-foreground))",
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ background: filter === tab.key ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border))", color: filter === tab.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} lines={4} />)}</div>
        ) : (
          <div className="space-y-3">
            {allOrders.length === 0 && (
              <div className="rounded-xl p-8 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <FlaskConical size={24} className="mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No lab orders found</p>
              </div>
            )}
            {allOrders.map((order: any) => (
              <LabOrderCard key={order.id} order={order} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
