import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminApi } from "@/lib/api/admin.api";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle, ShieldCheck, User as UserIcon } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await AdminApi.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await AdminApi.deleteUser(id);
      toast.success("Đã xóa người dùng thành công");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi xóa người dùng");
    } finally {
      setDeletingId(null);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Người dùng</h2>
        <p className="text-slate-500 mt-1">Xem và quản lý tất cả tài khoản trên hệ thống KBase.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Tài khoản</th>
                <th className="px-6 py-4 font-semibold">Phân quyền</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Không có người dùng nào trên hệ thống.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{u.fullName}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <ShieldCheck className="h-3.5 w-3.5" /> Quản trị viên
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <UserIcon className="h-3.5 w-3.5" /> Người dùng
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Đang hoạt động
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <UserDetailDialog user={u} />
                        {u.role !== "ADMIN" ? (
                          <DeleteUserDialog
                            user={u}
                            onConfirm={() => handleDelete(u.id)}
                            isDeleting={deletingId === u.id}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không thể xóa</span>
                        )}
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

function DeleteUserDialog({
  user,
  onConfirm,
  isDeleting
}: {
  user: any;
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
          title="Xóa người dùng"
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  Xóa tài khoản người dùng
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống?
                </Dialog.Description>
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-4 border border-slate-200 mt-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 font-semibold shadow-sm">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{user.fullName}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              </div>
              <p className="text-xs text-red-600 font-semibold mt-4">
                CẢNH BÁO: Mọi dữ liệu liên quan đến người dùng này có thể bị mất.
              </p>
            </div>

            {/* 🚀 BỔ SUNG PHẦN NÚT BẤM TẠI ĐÂY */}
            <div className="mt-4 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none disabled:opacity-50"
                  disabled={isDeleting}
                >
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
            {/* ================================== */}

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UserDetailDialog({ user }: { user: any }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md text-slate-600 hover:text-primary hover:bg-primary/10 p-2 transition-colors mr-1"
          title="Xem chi tiết"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg rounded-xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 shrink-0 text-xl font-bold border border-slate-200">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <Dialog.Title className="text-xl font-semibold text-slate-900">
                Hồ sơ người dùng
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                Chi tiết thông tin tài khoản trên hệ thống
              </Dialog.Description>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Họ và tên</div>
              <div className="col-span-2 font-semibold text-slate-900">{user.fullName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Email</div>
              <div className="col-span-2 text-slate-900">{user.email}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Tên đăng nhập</div>
              <div className="col-span-2 text-slate-900">{user.username}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">ID Hệ thống</div>
              <div className="col-span-2 font-mono text-xs text-slate-500">{user.id}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-slate-100">
              <div className="text-slate-500 font-medium">Phân quyền</div>
              <div className="col-span-2">
                {user.role === "ADMIN" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Quản trị viên</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Người dùng</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm py-2">
              <div className="text-slate-500 font-medium">Trạng thái</div>
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Đang hoạt động
                </span>
              </div>
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
