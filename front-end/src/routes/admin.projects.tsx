import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminApi } from "@/lib/api/admin.api";
import { KProject } from "@/lib/api/types";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format";
import * as Dialog from "@radix-ui/react-dialog";

export const Route = createFileRoute("/admin/projects")({
  component: AdminProjectsPage,
});

function AdminProjectsPage() {
  const [projects, setProjects] = useState<KProject[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, usersData] = await Promise.all([
        AdminApi.getProjects(),
        AdminApi.getUsers()
      ]);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      toast.error("Không thể tải danh sách dự án và người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await AdminApi.deleteProject(id);
      toast.success("Đã xóa dự án thành công");
      await loadData();
    } catch (error) {
      toast.error("Có lỗi xảy ra khi xóa dự án");
    } finally {
      setDeletingId(null);
    }
  };

  const handleForceTransfer = async (projectId: number, newOwnerId: string) => {
    try {
      await AdminApi.forceTransferProject(projectId, newOwnerId);
      toast.success("Cưỡng chế chuyển quyền thành công");
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi chuyển quyền");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Dự án</h2>
        <p className="text-slate-500">Xem và quản lý tất cả các dự án trên hệ thống KBase.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Tên dự án</th>
                <th className="px-6 py-3">Mô tả ngắn</th>
                <th className="px-6 py-3">Ngày tạo</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Không có dự án nào trên hệ thống.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{p.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-md truncate">
                      {p.description || "Không có mô tả"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <ProjectDetailDialog project={p} users={users} />
                        <ForceTransferDialog
                          project={p}
                          users={users}
                          onConfirm={(newOwnerId) => handleForceTransfer(p.id, newOwnerId)}
                        />
                        <DeleteDialog
                          project={p}
                          onConfirm={() => handleDelete(p.id)}
                          isDeleting={deletingId === p.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ 
  project, 
  onConfirm, 
  isDeleting 
}: { 
  project: KProject; 
  onConfirm: () => void; 
  isDeleting: boolean 
}) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 p-2 transition-colors disabled:opacity-50"
          title="Xóa dự án"
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  Xóa dự án hệ thống
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  Bạn đang thao tác với quyền Admin. Chắc chắn muốn xóa dự án này không?
                </Dialog.Description>
              </div>
            </div>
            
            <div className="rounded-md bg-slate-50 p-4 border border-slate-200 mt-2">
              <p className="text-sm font-medium text-slate-900">{project.name}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{project.description}</p>
              <p className="text-xs text-red-600 font-semibold mt-2">
                CẢNH BÁO: Hành động này không thể hoàn tác và sẽ xóa toàn bộ dữ liệu của dự án.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
            <Dialog.Close asChild>
              <button className="mt-2 sm:mt-0 inline-flex justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus:outline-none">
                Hủy bỏ
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
            >
              Xóa dự án
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ForceTransferDialog({
  project,
  users,
  onConfirm
}: {
  project: KProject;
  users: any[];
  onConfirm: (newOwnerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleConfirm = () => {
    if (!selectedUserId) {
      toast.error("Vui lòng chọn người dùng");
      return;
    }
    onConfirm(selectedUserId);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) setSelectedUserId("");
    }}>
      <Dialog.Trigger asChild>
        <button
          className="text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1.5 rounded transition-colors mr-2"
          title="Cưỡng chế chuyển quyền"
        >
          Chuyển quyền
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl">
          <div className="flex flex-col gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                Cưỡng chế Bàn giao Dự án
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1">
                Admin có thể ép chuyển quyền Chủ sở hữu (Owner) của dự án "{project.name}" cho một người dùng khác.
              </Dialog.Description>
            </div>
            
            <div className="space-y-2 mt-2">
              <label className="text-sm font-medium text-slate-700">
                Chọn Chủ sở hữu mới:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Vui lòng chọn --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
            <Dialog.Close asChild>
              <button className="mt-2 sm:mt-0 inline-flex justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus:outline-none">
                Hủy bỏ
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              className="inline-flex justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none"
            >
              Xác nhận Bàn giao
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProjectDetailDialog({ project, users }: { project: KProject; users: any[] }) {
  const [open, setOpen] = useState(false);
  const owner = users.find(u => String(u.id) === String(project.ownerId));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md text-slate-600 hover:text-primary hover:bg-primary/10 p-2 transition-colors mr-1"
          title="Xem chi tiết dự án"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg rounded-xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div>
              <Dialog.Title className="text-xl font-semibold text-slate-900">
                Chi tiết Dự án
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                Thông tin hệ thống của dự án
              </Dialog.Description>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Tên dự án</div>
              <div className="col-span-2 font-semibold text-slate-900">{project.name}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Mô tả</div>
              <div className="col-span-2 text-slate-900">{project.description || "Không có mô tả"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Chủ sở hữu</div>
              <div className="col-span-2 text-slate-900 font-medium text-orange-600">
                {owner ? `${owner.fullName} (${owner.email})` : `User #${project.ownerId} (Bị mất)`}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Ngày tạo</div>
              <div className="col-span-2 text-slate-900">{formatDate(project.createdAt)}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2">
              <div className="text-slate-500 font-medium">ID Hệ thống</div>
              <div className="col-span-2 font-mono text-xs text-slate-500">{project.id}</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none">
                Đóng
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
