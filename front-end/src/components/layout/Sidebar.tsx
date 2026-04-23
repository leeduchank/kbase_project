import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, FileText, Settings, ChevronLeft, BookOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Documents", href: "/documents" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { location } = useRouterState();

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-[var(--sidebar-bg)] transition-all duration-200",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpen className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">KBase</span>
            <span className="text-[11px] text-muted-foreground">Knowledge hub</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.href);
              
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href} 
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}