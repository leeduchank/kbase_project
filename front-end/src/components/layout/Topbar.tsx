import { Search, LogOut } from "lucide-react";
import { AuthApi } from "@/lib/api/auth.api";
import { useNavigate } from "@tanstack/react-router";
import { NotificationBell } from "./NotificationBell";

import { useAuth } from "@/contexts/AuthContext";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-6 backdrop-blur-md transition-all">
      <div className="min-w-0">
        <h1 className="truncate text-base font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs font-medium text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Pro Search Input */}
        <div className="relative hidden md:block group">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-hover:text-foreground transition-colors" />
          <input
            placeholder="Tìm kiếm nhanh..."
            className="h-10 w-[260px] lg:w-[320px] rounded-lg border border-border bg-muted/40 pl-9 pr-12 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300 hover:bg-muted/60"
          />
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
             <kbd className="inline-flex h-6 items-center gap-1 rounded border border-border/80 bg-background px-2 text-[10px] font-medium text-muted-foreground shadow-sm">
               <span className="text-xs">⌘</span>K
             </kbd>
          </div>
        </div>
        
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-border/50 pl-5 ml-1">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-bold text-foreground leading-none">{user?.fullName || "Người dùng"}</span>
            <span className="text-[11px] font-medium text-muted-foreground mt-1.5 leading-none">{user?.email || "Đang tải..."}</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shadow-inner border border-primary/20">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
          </div>
          
          <button
            onClick={() => {
              logout();
              nav({ to: "/login" });
            }}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 outline-none focus:ring-2 focus:ring-destructive/20"
            title="Đăng xuất"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
