import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

interface PageHeaderProps {
  title?: string;
  showTitle?: boolean;
}

export function PageHeader({ title, showTitle = false }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        {showTitle && title && (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}
      </div>
      <ThemeToggle />
    </header>
  );
}
