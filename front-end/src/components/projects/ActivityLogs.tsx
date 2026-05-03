import { useEffect, useState } from "react";
import { ProjectsApi } from "@/lib/api/projects.api";
import { Loader2, UploadCloud, FileMinus, UserPlus, LogIn, UserRoundPlus, Activity as ActivityIcon } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";

interface Activity {
  id: number;
  projectId: number;
  userId: string;
  action: string;
  targetName: string;
  createdAt: string;
}

export function ActivityLogs({ projectId, memberMap = {} }: { projectId: string; memberMap?: Record<string, string> }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await ProjectsApi.getActivities(projectId);
        setActivities(data);
      } catch (error) {
        console.error("Failed to load activities", error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [projectId]);

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ActivityIcon className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Chưa có hoạt động nào trong dự án.</p>
      </div>
    );
  }

  const getActionDetails = (action: string) => {
    switch (action) {
      case "UPLOAD_FILE":
        return { icon: <UploadCloud className="h-4 w-4" />, color: "text-blue-500 bg-blue-500/10", label: "đã tải lên tài liệu" };
      case "DELETE_FILE":
        return { icon: <FileMinus className="h-4 w-4" />, color: "text-red-500 bg-red-500/10", label: "đã xóa tài liệu" };
      case "EDIT_FILE":
        return { icon: <ActivityIcon className="h-4 w-4" />, color: "text-amber-500 bg-amber-500/10", label: "đã chỉnh sửa tài liệu" };
      default:
        return { icon: <ActivityIcon className="h-4 w-4" />, color: "text-gray-500 bg-gray-500/10", label: "đã tương tác với tài liệu" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative border-l-2 border-border/60 ml-4 space-y-6 pb-4">
        {activities.map((activity) => {
          const details = getActionDetails(activity.action);
          return (
            <div key={activity.id} className="relative pl-6 sm:pl-8 group">
              {/* Icon / Timeline dot */}
              <div className={`absolute -left-3.5 mt-1.5 h-7 w-7 flex items-center justify-center rounded-full ring-4 ring-background ${details.color} transition-transform group-hover:scale-110`}>
                {details.icon}
              </div>
              
              {/* Content box */}
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:border-primary/20">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">
                    {memberMap[String(activity.userId)] || `User #${activity.userId}`}
                  </span>{" "}
                  <span className="text-muted-foreground">{details.label}</span>{" "}
                  <span className="font-medium text-foreground">{activity.targetName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  {formatTimeAgo(activity.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
