import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import SignUp from "@/pages/auth/SignUp";
import PatientDashboard from "@/pages/PatientDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import LabDashboard from "@/pages/LabDashboard";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import FinanceDashboard from "@/pages/FinanceDashboard";

setAuthTokenGetter(() => localStorage.getItem("panor_token"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const ROLE_ROUTES: Record<string, string> = {
  patient: "/patient", doctor: "/doctor", lab: "/lab",
  analyst: "/analytics", admin: "/admin", finance: "/finance",
};

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) { setLocation("/auth/login"); return; }
    if (roles && user?.role && !roles.includes(user.role)) {
      setLocation(ROLE_ROUTES[user.role] ?? "/auth/login");
    }
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated) return null;
  if (roles && user?.role && !roles.includes(user.role)) return null;
  return <Component />;
}

function HomeRoute() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation(ROLE_ROUTES[user.role] ?? "/patient");
    }
  }, [isAuthenticated, user?.role]);

  if (isAuthenticated) return null;
  return <Landing />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={SignUp} />
      {/* Legacy login redirect */}
      <Route path="/login" component={Login} />
      <Route path="/patient">
        {() => <ProtectedRoute component={PatientDashboard} roles={["patient"]} />}
      </Route>
      <Route path="/doctor">
        {() => <ProtectedRoute component={DoctorDashboard} roles={["doctor"]} />}
      </Route>
      <Route path="/lab">
        {() => <ProtectedRoute component={LabDashboard} roles={["lab"]} />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsDashboard} roles={["analyst", "admin"]} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} roles={["admin"]} />}
      </Route>
      <Route path="/finance">
        {() => <ProtectedRoute component={FinanceDashboard} roles={["finance", "admin"]} />}
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
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
