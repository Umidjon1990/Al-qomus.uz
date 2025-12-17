import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DictionaryPage from "@/pages/DictionaryPage";
import AdminPage from "@/pages/AdminPage";
import TelegramAdminPage from "@/pages/TelegramAdminPage";
import LoginPage from "@/pages/LoginPage";
import AboutPage from "@/pages/AboutPage";
import SynonymsPage from "@/pages/SynonymsPage";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";

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
      <Route path="/synonyms" component={SynonymsPage} />
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
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
