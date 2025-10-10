import { Home, MessageSquare, PieChart, Wallet, Target } from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  { icon: MessageSquare, label: "Chat", path: "/", testId: "link-chat" },
  { icon: PieChart, label: "Budgets", path: "/budgets", testId: "link-budgets" },
  { icon: Wallet, label: "Accounts", path: "/accounts", testId: "link-accounts" },
  { icon: Target, label: "Goals", path: "/goals", testId: "link-goals" },
  { icon: Home, label: "Dashboard", path: "/dashboard", testId: "link-dashboard" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-purple-200/30 dark:border-purple-900/30">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-200 rounded-2xl cursor-pointer ${
                  isActive 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                }`}
                data-testid={item.testId}
              >
                <Icon className={`h-5 w-5 ${isActive ? "fill-current" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
