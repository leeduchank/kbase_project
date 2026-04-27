import { useEffect, useState } from "react";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProjectsApi } from "@/lib/api/projects.api";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export function NotificationBell() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await ProjectsApi.getMyInvitations();
      setInvitations(data || []);
    } catch (error) {
      console.error("Failed to load invitations", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    if (open) {
      loadInvitations();
    }
  }, [open]);

  const handleAccept = async (id: number) => {
    setProcessingId(id);
    try {
      await ProjectsApi.acceptInvitation(id);
      toast.success("Đã chấp nhận lời mời tham gia dự án!");
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      // Optionally trigger a project list reload if needed
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi chấp nhận lời mời");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    try {
      await ProjectsApi.rejectInvitation(id);
      toast.success("Đã từ chối lời mời");
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi từ chối lời mời");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
          {/* Notification Badge (you can load unread count globally if needed, this is just a dot if opened) */}
          {!open && invitations.length > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"></span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Lời mời tham gia</h4>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {invitations.length} mới
          </span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : invitations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Không có lời mời nào.</div>
          ) : (
            <div className="flex flex-col">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 border-b last:border-0 hover:bg-secondary/20 transition-colors">
                  <div className="mb-2">
                    <p className="text-sm font-medium leading-tight">
                      Dự án: <span className="text-primary">{inv.project?.name || "Dự án mới"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Từ: {inv.inviterId}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleAccept(inv.id)}
                      disabled={processingId === inv.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium py-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {processingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => handleReject(inv.id)}
                      disabled={processingId === inv.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-medium py-1.5 rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      {processingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
