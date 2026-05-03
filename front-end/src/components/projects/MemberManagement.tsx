import { useEffect, useState } from "react";
import { ProjectsApi } from "@/lib/api/projects.api";
import { KProjectMember } from "@/lib/api/types";
import { Shield, ShieldAlert, ShieldCheck, Trash2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export function MemberManagement({
    projectId,
    currentUserRole
}: {
    projectId: string;
    currentUserRole: string
}) {
    const [members, setMembers] = useState<KProjectMember[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const loadMembers = async () => {
        try {
            const [membersData, invitationsData] = await Promise.all([
                ProjectsApi.getMembers(projectId),
                currentUserRole === "OWNER" ? ProjectsApi.getPendingInvitations(projectId) : Promise.resolve([])
            ]);
            setMembers(membersData);
            setPendingInvitations(invitationsData);
        } catch (error) {
            toast.error("Không thể tải danh sách thành viên");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, [projectId]);

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberEmail.trim()) return;
        setIsAdding(true);
        try {
            await ProjectsApi.inviteMember(projectId, newMemberEmail);
            toast.success("Đã gửi lời mời thành công");
            setNewMemberEmail("");
            loadMembers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Lỗi khi gửi lời mời");
        } finally {
            setIsAdding(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            await ProjectsApi.updateMemberRole(projectId, memberId, newRole);
            toast.success("Đã cập nhật quyền");
            loadMembers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Lỗi cập nhật quyền");
        }
    };

    const handleRemove = async (memberId: string, name: string) => {
        if (!confirm(`Xóa ${name} khỏi dự án?`)) return;
        try {
            await ProjectsApi.removeMember(projectId, memberId);
            toast.success("Đã xóa thành viên");
            loadMembers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Lỗi khi xóa thành viên");
        }
    };

    if (loading) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

    const handleRevokeInvitation = async (invitationId: string | number) => {
        if (!confirm("Bạn có chắc chắn muốn hủy lời mời này?")) return;
        try {
            await ProjectsApi.revokeInvitation(projectId, invitationId);
            toast.success("Đã hủy lời mời thành công!");
            setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Lỗi khi hủy lời mời");
        }
    };

    return (
        <div className="space-y-6">
            {/* KHU VỰC THÊM THÀNH VIÊN (CHỈ OWNER) */}
            {currentUserRole === "OWNER" && (
                <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Người được mời</label>
                        <input
                            type="email"
                            placeholder="Nhập email người dùng..."
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <button
                        disabled={isAdding}
                        className="h-9 px-4 mt-3 sm:mt-0 w-full sm:w-auto rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Mời thành viên
                    </button>
                </form>
            )}

            {/* DANH SÁCH LỜI MỜI CHỜ (CHỈ OWNER) */}
            {currentUserRole === "OWNER" && pendingInvitations.length > 0 && (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="bg-orange-50/50 px-4 py-2 border-b">
                        <h4 className="text-sm font-semibold text-orange-800">Lời mời đang chờ ({pendingInvitations.length})</h4>
                    </div>
                    <div className="divide-y">
                        {pendingInvitations.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="font-medium text-sm">{inv.inviteeEmail}</p>
                                    <p className="text-xs text-muted-foreground">Đã mời lúc: {formatDate(inv.createdAt)}</p>
                                </div>
                                <button
                                    onClick={() => handleRevokeInvitation(inv.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hủy lời mời
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DANH SÁCH THÀNH VIÊN */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                            <th className="px-4 py-3 font-medium">Thành viên</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Vai trò</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">Ngày tham gia</th>
                            {currentUserRole === "OWNER" && <th className="w-20 px-4 py-3"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((m) => (
                            <tr key={m.memberId} className="border-b last:border-0 hover:bg-secondary/30">
                                <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                                        {m.fullName.charAt(0)}
                                    </div>
                                    {m.fullName}
                                    {m.role === "OWNER" && (
                                        <span title="Chủ sở hữu">
                                            <ShieldAlert className="h-4 w-4 text-rose-500 ml-1" />
                                        </span>
                                    )}                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                                <td className="px-4 py-3">
                                    {currentUserRole === "OWNER" && m.role !== "OWNER" ? (
                                        <select
                                            value={m.role}
                                            onChange={(e) => handleRoleChange(m.memberId, e.target.value)}
                                            className="h-8 rounded-md border bg-background px-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                                        >
                                            <option value="VIEWER">Viewer</option>
                                            <option value="EDITOR">Editor</option>
                                        </select>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                                            {m.role === "OWNER" && <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />}
                                            {m.role === "EDITOR" && <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />}
                                            {m.role === "VIEWER" && <Shield className="h-3.5 w-3.5 text-slate-400" />}
                                            {m.role}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(m.joinedAt)}</td>

                                {currentUserRole === "OWNER" && (
                                    <td className="px-4 py-3 text-right">
                                        {m.role !== "OWNER" && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Bạn có chắc chắn muốn BÀN GIAO quyền Owner cho ${m.fullName}? Bạn sẽ mất quyền Chủ sở hữu và trở thành Editor.`)) {
                                                            try {
                                                                await ProjectsApi.transferOwnership(projectId, m.memberId);
                                                                toast.success("Đã bàn giao dự án thành công!");
                                                                window.location.reload(); // Reload to refresh permissions entirely
                                                            } catch (error: any) {
                                                                toast.error(error.response?.data?.message || "Lỗi khi bàn giao");
                                                            }
                                                        }
                                                    }}
                                                    className="text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded transition-colors"
                                                    title="Bàn giao Chủ sở hữu"
                                                >
                                                    Bàn giao
                                                </button>
                                                <button
                                                    onClick={() => handleRemove(m.memberId, m.fullName)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                    title="Xóa thành viên"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}