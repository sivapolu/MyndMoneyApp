import { Home, MessageSquare, PieChart, Wallet, Target } from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  { icon: Home, label: "Home", path: "/", testId: "link-home" },
  { icon: MessageSquare, label: "Chat", path: "/chat", testId: "link-chat" },
  { icon: PieChart, label: "Budgets", path: "/budgets", testId: "link-budgets" },
  { icon: Wallet, label: "Accounts", path: "/accounts", testId: "link-accounts" },
  { icon: Target, label: "Goals", path: "/goals", testId: "link-goals" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors hover-elevate rounded-lg ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={item.testId}
              >
                <Icon className={`h-5 w-5 ${isActive ? "fill-current" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
