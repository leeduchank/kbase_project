import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Folders, Users, ChevronLeft, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Admin Dashboard", href: "/admin" },
  { icon: Folders, label: "Project Management", href: "/admin/projects" },
  { icon: Users, label: "User Management", href: "/admin/users" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { location } = useRouterState();

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-600 text-white shadow-sm">
          <ShieldAlert className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-slate-100 tracking-wide">ADMINISTRATOR</span>
            <span className="text-[10px] text-red-400 uppercase tracking-wider font-semibold">KBase System</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <div className={cn("mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider", collapsed && "hidden")}>
          System Administration
        </div>
        
        {adminNavItems.map((item) => {
          const active =
            item.href === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.href);
              
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href} 
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-red-500/10 text-red-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-red-400" : "text-slate-400")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          {!collapsed && <span>Exit Admin</span>}
        </Link>
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-sm hover:text-white hover:bg-slate-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
