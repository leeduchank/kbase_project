import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminApi } from "@/lib/api/admin.api";
import { toast } from "sonner";
import { Loader2, AlertTriangle, ShieldCheck, User as UserIcon, Power, PowerOff } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  const handleDeactivate = async (id: number) => {
    try {
      setTogglingId(id);
      await AdminApi.deactivateUser(id);
      toast.success("Đã vô hiệu hóa tài khoản thành công");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi vô hiệu hóa tài khoản");
    } finally {
      setTogglingId(null);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      setTogglingId(id);
      await AdminApi.activateUser(id);
      toast.success("Đã kích hoạt lại tài khoản thành công");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi kích hoạt tài khoản");
    } finally {
      setTogglingId(null);
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
                  <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${!u.active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${u.active ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-400'}`}>
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
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span> Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Đã vô hiệu hóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <UserDetailDialog user={u} />
                        {u.role !== "ADMIN" ? (
                          u.active ? (
                            <DeactivateUserDialog
                              user={u}
                              onConfirm={() => handleDeactivate(u.id)}
                              isProcessing={togglingId === u.id}
                            />
                          ) : (
                            <button
                              onClick={() => handleActivate(u.id)}
                              disabled={togglingId === u.id}
                              className="inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 p-2 transition-colors disabled:opacity-50"
                              title="Kích hoạt lại tài khoản"
                            >
                              {togglingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không thể thay đổi</span>
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

function DeactivateUserDialog({
  user,
  onConfirm,
  isProcessing
}: {
  user: any;
  onConfirm: () => void;
  isProcessing: boolean
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
          className="inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 p-2 transition-colors disabled:opacity-50"
          title="Vô hiệu hóa tài khoản"
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  Vô hiệu hóa tài khoản
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  Bạn có chắc chắn muốn vô hiệu hóa tài khoản này? Người dùng sẽ không thể đăng nhập nhưng dữ liệu và dự án vẫn được bảo toàn.
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
              <p className="text-xs text-amber-600 font-semibold mt-4">
                LƯU Ý: Tài khoản sẽ bị vô hiệu hóa. Các dự án do người dùng sở hữu vẫn được giữ nguyên. Bạn có thể kích hoạt lại bất cứ lúc nào.
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none disabled:opacity-50"
                  disabled={isProcessing}
                >
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none disabled:opacity-50"
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận vô hiệu hóa
              </button>
            </div>

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
                {user.active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    Đã vô hiệu hóa
                  </span>
                )}
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
