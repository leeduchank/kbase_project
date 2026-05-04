import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        nav({ to: "/login" });
      } else if (user.role !== "ADMIN") {
        nav({ to: "/" });
      }
    }
  }, [user, loading, nav]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  // Double check to prevent flash of content
  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center px-6 gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Admin Control Panel</h1>
              <p className="text-[11px] text-slate-500">Restricted area — system administrators only</p>
            </div>
            <div className="ml-auto">
              {/* Optional: Add a specific admin topbar or use the existing one */}
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
