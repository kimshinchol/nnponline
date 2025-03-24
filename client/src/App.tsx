import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { InactivityOverlay } from "@/components/ui/inactivity-overlay";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import WebAdminAuthPage from "@/pages/web-admin-auth";
import HomePage from "@/pages/home-page";
import PersonalView from "@/pages/personal-view";
import TeamView from "@/pages/team-view";
import ProjectView from "@/pages/project-view";
import SchedulerView from "@/pages/scheduler-view";
import CoWorkView from "@/pages/co-work-view";
import AdminPage from "@/pages/admin-page";
import { ProtectedRoute } from "./lib/protected-route";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Admin-only protected route component
function AdminRoute({ path, component: Component }: { path: string; component: () => React.JSX.Element }) {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  return <ProtectedRoute path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/web_admin" component={WebAdminAuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/personal" component={PersonalView} />
      <ProtectedRoute path="/scheduler" component={SchedulerView} />
      <ProtectedRoute path="/team" component={TeamView} />
      <ProtectedRoute path="/project" component={ProjectView} />
      <ProtectedRoute path="/co-work" component={CoWorkView} />
      <AdminRoute path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const handleReconnect = () => {
    // Force refetch all queries
    queryClient.refetchQueries();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="relative min-h-screen">
          <Router />
          <Toaster />
          <InactivityOverlay 
            timeout={5 * 60 * 1000} // 5 minutes
            onReconnect={handleReconnect}
          />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;