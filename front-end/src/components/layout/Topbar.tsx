import { Search, Bell, LogOut } from "lucide-react";
import { AuthApi } from "@/lib/api";
import { useNavigate } from "@tanstack/react-router";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const nav = useNavigate();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search…"
            className="h-9 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            AuthApi.logout();
            nav({ to: "/login" });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-[oklch(0.6_0.22_310)]" />
      </div>
    </header>
  );
}
