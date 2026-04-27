import { Search, LogOut } from "lucide-react";
import { AuthApi } from "@/lib/api/auth.api";
import { useNavigate } from "@tanstack/react-router";
import { NotificationBell } from "./NotificationBell";

import { useAuth } from "@/contexts/AuthContext";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search…"
            className="h-9 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        
        {/* Notification Bell (Invitations) */}
        <NotificationBell />

        <div className="flex items-center gap-2 border-l border-border pl-4">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-medium text-foreground leading-none">{user?.fullName || "Người dùng"}</span>
            <span className="text-[10px] text-muted-foreground mt-1">{user?.email || "Đang tải..."}</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.6_0.22_310)] text-white font-medium shadow-sm">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
          </div>
          <button
            onClick={() => {
              logout();
              nav({ to: "/login" });
            }}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
