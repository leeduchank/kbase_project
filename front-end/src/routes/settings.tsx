import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Settings, User, ShieldAlert } from 'lucide-react'
import { AuthApi } from '@/lib/api/auth.api'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName)
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !fullName.trim()) return

    setSaving(true)
    try {
      await AuthApi.updateProfile(user.id, fullName)
      toast.success("Cập nhật thông tin thành công!")
      await refreshUser()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật thông tin")
    } finally {
      setSaving(false)
    }
  }

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
              
              <div className="mt-8 pt-6 border-t border-border">
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-sm">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Tên hiển thị</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Email (Không thể thay đổi)</label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={saving || !fullName.trim() || fullName === user?.fullName}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Đang lưu..." : "Cập nhật thông tin"}
                  </button>
                </form>
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