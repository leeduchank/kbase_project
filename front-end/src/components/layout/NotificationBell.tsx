import { useEffect, useState, useCallback, useRef } from "react";
import { Bell, Check, X, Loader2, FileText, FileMinus, UserPlus, CheckCircle2, UserCheck, UserMinus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProjectsApi } from "@/lib/api/projects.api";
import { NotificationsApi } from "@/lib/api/notifications.api";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";
import { useNotificationSSE } from "@/hooks/use-notification-sse";

export function NotificationBell() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Use refs to avoid re-creating SSE callbacks and causing reconnects
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const loadData = async () => {
    try {
      setLoading(true);
      const [invData, notifData] = await Promise.all([
        ProjectsApi.getMyInvitations().catch(() => []),
        NotificationsApi.getMyNotifications().catch(() => [])
      ]);
      setInvitations(invData || []);
      setNotifications(notifData || []);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  // SSE event handlers (stable references using useCallback)
  const handleSSENotification = useCallback((newNotif: any) => {
    // Add the new notification to the top of the list
    setNotifications(prev => {
      // Avoid duplicates
      if (prev.some(n => n.id === newNotif.id)) return prev;
      return [newNotif, ...prev];
    });
    
    // Show a toast for the new notification
    toast.info(newNotif.title, {
      description: newNotif.message,
    });
  }, []);

  const handleSSEUnreadCount = useCallback((_count: number) => {
    // The unread count is computed from state, so this event
    // mainly serves as a trigger to re-render. The actual count
    // is derived from notifications + invitations state.
    // We can use this for more precise count if needed.
  }, []);

  // Connect to SSE for real-time notifications
  useNotificationSSE({
    onNotification: handleSSENotification,
    onUnreadCountUpdate: handleSSEUnreadCount,
  });

  // Load initial data once on mount (no polling needed anymore!)
  useEffect(() => {
    loadData();
  }, []);

  // Reload data when popover opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleAccept = async (id: number) => {
    setProcessingId(id);
    try {
      await ProjectsApi.acceptInvitation(id);
      toast.success("Invitation accepted!");
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    try {
      await ProjectsApi.rejectInvitation(id);
      toast.success("Invitation declined");
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to decline invitation");
    } finally {
      setProcessingId(null);
    }
  };

  // Map notification type to the corresponding project tab
  const getTabForNotificationType = (type: string): string => {
    switch (type) {
      case 'DOC_UPLOAD':
      case 'DOC_DELETE':
        return 'documents';
      case 'INVITATION_ACCEPTED':
      case 'INVITATION_REJECTED':
        return 'members';
      default:
        return 'activities';
    }
  };

  const handleReadNotification = async (notif: any) => {
    if (!notif.read) {
      try {
        await NotificationsApi.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (e) {}
    }
    if (notif.referenceId) {
       const tab = getTabForNotificationType(notif.type);
       navigate({ to: `/projects/${notif.referenceId}`, search: { tab } });
       setOpen(false);
    }
  };

  const handleReadAll = async () => {
      try {
          await NotificationsApi.markAllAsRead();
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (e) {}
  };

  const getNotificationUI = (type: string) => {
    switch (type) {
      case 'DOC_UPLOAD':
        return { icon: <FileText className="h-4 w-4 text-blue-500"/>, bg: "bg-blue-100" };
      case 'DOC_DELETE':
        return { icon: <FileMinus className="h-4 w-4 text-red-500"/>, bg: "bg-red-100" };
      case 'INVITATION_ACCEPTED':
        return { icon: <UserCheck className="h-4 w-4 text-emerald-500"/>, bg: "bg-emerald-100" };
      case 'INVITATION_REJECTED':
        return { icon: <UserMinus className="h-4 w-4 text-red-500"/>, bg: "bg-red-100" };
      default:
        return { icon: <CheckCircle2 className="h-4 w-4 text-gray-500"/>, bg: "bg-gray-100" };
    }
  };

  const unreadCount = invitations.length + notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
          {!open && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background animate-in fade-in zoom-in duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex gap-2 items-center">
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
              {notifications.some(n => !n.read) && (
                  <button onClick={handleReadAll} className="text-xs text-primary hover:underline">
                      Mark all as read
                  </button>
              )}
          </div>
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {loading && invitations.length === 0 && notifications.length === 0 ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : invitations.length === 0 && notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No notifications.</div>
          ) : (
            <div className="flex flex-col">
              {/* Render Invitations First */}
              {invitations.map((inv) => (
                <div key={`inv-${inv.id}`} className="p-4 border-b last:border-0 bg-orange-50/30">
                  <div className="flex gap-3">
                      <div className="mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-orange-100">
                        <UserPlus className="h-4 w-4 text-orange-500"/>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Project Invitation</p>
                        <p className="text-sm mt-0.5 text-foreground">
                          You've been invited to join <span className="font-semibold text-primary">{inv.project?.name || "a new project"}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          From: {inv.inviterId}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatTimeAgo(inv.createdAt)}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleAccept(inv.id)}
                            disabled={processingId === inv.id}
                            className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-medium py-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {processingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(inv.id)}
                            disabled={processingId === inv.id}
                            className="flex-1 flex items-center justify-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium py-1.5 rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
                          >
                            {processingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            Decline
                          </button>
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>
                  </div>
                </div>
              ))}

              {/* Render System Notifications */}
              {notifications.map((notif) => {
                const { icon, bg } = getNotificationUI(notif.type);
                return (
                  <div 
                    key={`notif-${notif.id}`} 
                    className={`p-4 border-b last:border-0 flex gap-3 cursor-pointer transition-colors ${notif.read ? 'opacity-70 hover:bg-secondary/20' : 'bg-blue-50/20 hover:bg-blue-50/40'}`}
                    onClick={() => handleReadNotification(notif)}
                  >
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                      {icon}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(notif.createdAt)}</p>
                    </div>
                    
                    {!notif.read && <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0"></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
