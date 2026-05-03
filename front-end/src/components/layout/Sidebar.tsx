import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, FileText, Settings, ChevronLeft, BookOpen, LifeBuoy, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Documents", href: "/documents" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { location } = useRouterState();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border/50 bg-[var(--sidebar-bg)] transition-all duration-300 ease-in-out z-20",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-4 transition-all duration-300">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all duration-300 hover:scale-105">
          <BookOpen className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
            <span className="text-sm font-bold text-foreground">KBase</span>
            <span className="text-[11px] font-medium text-muted-foreground mt-0.5">Knowledge Workspace</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
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
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110", active ? "text-primary" : "")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
        {user?.role === "ADMIN" && (
          <Link
            to="/admin/users"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 mt-4",
              location.pathname.startsWith("/admin")
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Shield className={cn("h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110", location.pathname.startsWith("/admin") ? "text-primary" : "")} />
            {!collapsed && <span className="truncate">Admin Panel</span>}
          </Link>
        )}
      </nav>

      {/* Pinned Support Button at Bottom */}
      <div className="p-3 border-t border-border/50 mt-auto bg-background/50 backdrop-blur-sm">
        <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/20">
            <LifeBuoy className="h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!collapsed && <span className="truncate">Trợ giúp & Hỗ trợ</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3.5 top-16 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-sm hover:text-foreground hover:border-primary/50 hover:shadow-md transition-all duration-200 z-30"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}