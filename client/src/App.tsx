import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Budgets from "@/pages/budgets";
import Accounts from "@/pages/accounts";
import Goals from "@/pages/goals";
import Categories from "@/pages/categories";
import Reports from "@/pages/reports";
import Analytics from "@/pages/analytics";
import Insights from "@/pages/insights";
import Settings from "@/pages/settings";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show auth page for unauthenticated users
  if (!isLoading && !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Auth} />
        <Route component={Auth} />
      </Switch>
    );
  }

  // Show loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Show main app for authenticated users
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/chat" component={Chat} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/goals" component={Goals} />
      <Route path="/categories" component={Categories} />
      <Route path="/reports" component={Reports} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/insights" component={Insights} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border lg:p-4 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="lg:flex" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <Router />
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <InnerApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function InnerApp() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Show auth page while not authenticated
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Show authenticated app
  return <AuthenticatedApp />;
}
