import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Settings, User, ShieldAlert } from 'lucide-react'
import { AuthApi } from '@/lib/api/auth.api'
import { toast } from 'sonner'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const handleLogout = () => {
    AuthApi.logout()
    toast.success("Đã đăng xuất khỏi hệ thống")
    // Dùng window.location để clear hoàn toàn cache của trình duyệt
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Cài đặt hệ thống" subtitle="Quản lý tài khoản" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Cài đặt</h2>
                <p className="text-sm text-muted-foreground">Tùy chỉnh trải nghiệm KBase của bạn.</p>
              </div>
            </div>

            {/* Thẻ Thông tin cá nhân */}
            <div className="rounded-xl border bg-card shadow-sm p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 border-b pb-4">
                <User className="h-5 w-5" /> Thông tin hồ sơ
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Trạng thái xác thực:</span>
                  <span className="col-span-2 text-sm font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded w-fit">
                    Đã đăng nhập an toàn
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Phân quyền:</span>
                  <span className="col-span-2 text-sm font-medium">Bạn có quyền quản lý dự án & tài liệu</span>
                </div>
              </div>
            </div>

            {/* Thẻ Danger Zone */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 shadow-sm p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-destructive">
                <ShieldAlert className="h-5 w-5" /> Khu vực nguy hiểm
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Đăng xuất sẽ xóa token truy cập khỏi trình duyệt này. Bạn sẽ cần nhập lại email và mật khẩu để tiếp tục sử dụng.
              </p>
              <button 
                onClick={handleLogout}
                className="rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Đăng xuất tài khoản
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}