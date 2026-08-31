import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DictionaryPage from "@/pages/DictionaryPage";
import { AuthProvider, useAuth } from "@/lib/auth";
import { lazy, Suspense, useEffect } from "react";

const QuizPage = lazy(() => import("@/pages/QuizPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const TelegramAdminPage = lazy(() => import("@/pages/TelegramAdminPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Protected Route Component
function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (adminOnly && !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, adminOnly, setLocation]);

  if (!user || (adminOnly && !isAdmin)) {
    return null; // or a loading spinner
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DictionaryPage} />
      <Route path="/quiz" component={QuizPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/telegram">
        {() => <ProtectedRoute component={TelegramAdminPage} adminOnly={true} />}
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
          <Toaster />
          <Suspense
            fallback={
              <div className="grid min-h-screen place-items-center bg-background text-sm font-medium text-slate-500">
                Sahifa yuklanmoqda…
              </div>
            }
          >
            <Router />
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
