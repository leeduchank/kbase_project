import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, Folders, Users, Activity, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminApi } from "@/lib/api/admin.api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, isSameDay, parseISO } from "date-fns";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ projects: 0, users: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projects, users] = await Promise.all([
          AdminApi.getProjects(),
          AdminApi.getUsers(),
        ]);
        
        setStats({
          projects: projects?.length || 0,
          users: users?.length || 0,
        });

        // Generate chart data for last 7 days of projects
        const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
        
        // Safely parse date from various backend formats (ISO string or Array)
        const safeParseDate = (val: any) => {
          if (!val) return null;
          if (typeof val === 'string') return parseISO(val);
          if (Array.isArray(val)) {
            const [y, m, d, h=0, min=0, s=0] = val;
            return new Date(y, m - 1, d, h, min, s);
          }
          return new Date(val);
        };

        const data = last7Days.map(date => {
          const count = (projects || []).filter((p: any) => {
            const pDate = safeParseDate(p.createdAt);
            return pDate && isSameDay(pDate, date);
          }).length;
          
          return {
            name: format(date, "dd/MM"),
            "New Projects": count
          };
        });
        
        setChartData(data);
      } catch (error) {
        console.error("Failed to load admin stats", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">System-wide activity overview for KBase.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 transition-transform group-hover:scale-150"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-inner">
              <Folders className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Projects</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.projects}
              </h3>
            </div>
          </div>
          <div className="relative mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <Link to="/admin/projects" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
              Manage projects <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 transition-transform group-hover:scale-150"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-inner">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Users</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.users}
              </h3>
            </div>
          </div>
          <div className="relative mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <Link to="/admin/users" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Manage users <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-500/10 transition-transform group-hover:scale-150"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-inner">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">System Status</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Operational
              </h3>
            </div>
          </div>
          <div className="relative mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="inline-flex items-center text-sm font-medium text-violet-600">
              All services online
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Project Growth (Last 7 days)</h3>
        </div>
        <div className="p-6 h-[400px]">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl">
              <span className="text-slate-400 font-medium animate-pulse">Loading data...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  allowDecimals={false}
                />
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="New Projects" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProjects)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
