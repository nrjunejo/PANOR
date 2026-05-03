import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import PatientDashboard from "@/pages/PatientDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import LabDashboard from "@/pages/LabDashboard";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

setAuthTokenGetter(() => localStorage.getItem("panor_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, role }: { component: React.ComponentType; role?: string }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }
  if (role && user?.role !== role) {
    const roleRoutes: Record<string, string> = {
      patient: "/patient",
      doctor: "/doctor",
      lab: "/lab",
      analyst: "/analytics",
      admin: "/admin",
    };
    setLocation(roleRoutes[user?.role ?? ""] ?? "/login");
    return null;
  }
  return <Component />;
}

function RedirectToRole() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }
  const roleRoutes: Record<string, string> = {
    patient: "/patient",
    doctor: "/doctor",
    lab: "/lab",
    analyst: "/analytics",
    admin: "/admin",
  };
  setLocation(roleRoutes[user?.role ?? ""] ?? "/login");
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RedirectToRole} />
      <Route path="/login" component={Login} />
      <Route path="/patient">
        {() => <ProtectedRoute component={PatientDashboard} role="patient" />}
      </Route>
      <Route path="/doctor">
        {() => <ProtectedRoute component={DoctorDashboard} role="doctor" />}
      </Route>
      <Route path="/lab">
        {() => <ProtectedRoute component={LabDashboard} role="lab" />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsDashboard} role="analyst" />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} role="admin" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
