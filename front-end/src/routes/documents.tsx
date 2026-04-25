import { createFileRoute } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useEffect, useState } from 'react'
import { ProjectsApi } from '@/lib/api/projects.api'
import { StorageApi } from '@/lib/api/storage.api'
import { DocumentTable } from '@/components/documents/DocumentTable'
import { KDocument } from '@/lib/api/types'
import { Loader2, FileText, Search, HardDrive, RefreshCw } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { cn } from "@/lib/utils"
import { toast } from 'sonner'

export const Route = createFileRoute('/documents')({
  component: DocumentsPage,
})

function DocumentsPage() {
  const [docs, setDocs] = useState<KDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>("")

  // 1. Lấy ID người dùng từ token (Dùng 'kbase_token' viết thường)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("kbase_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const uId = payload.sub || payload.id || payload.userId || "";
          setCurrentUserId(uId);
        } catch (e) {
          console.error("Lỗi giải mã token tại trang Documents:", e);
        }
      }
    }
  }, []);

  // 2. Tải tất cả tài liệu từ tất cả các dự án
  const loadAllDocs = async () => {
    setLoading(true)
    try {
      const projects = await ProjectsApi.list()
      const docPromises = projects.map(p => StorageApi.list(p.id.toString()))
      const docsArrays = await Promise.all(docPromises)
      const allDocs = docsArrays.flat()
      
      // Sắp xếp mới nhất lên đầu
      allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      setDocs(allDocs)
    } catch (e) {
      console.error("Lỗi khi gom dữ liệu:", e)
      toast.error("Không thể tải danh sách tài liệu tổng hợp")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllDocs()
  }, [])

  // Logic tìm kiếm
  const filteredDocs = docs.filter(d => 
    d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSize = docs.reduce((acc, d) => acc + d.fileSize, 0)

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Kho lưu trữ tập trung" subtitle="Tất cả tài liệu của bạn" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* Thống kê nhanh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Tất cả tài liệu</h2>
                  <p className="text-sm text-muted-foreground">Tổng cộng {docs.length} tệp tin trong hệ thống.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md border">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{formatBytes(totalSize)} đã sử dụng</span>
                </div>
                <button 
                  onClick={loadAllDocs}
                  className="p-2 rounded-md border hover:bg-secondary transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Tìm kiếm */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Tìm nhanh tên tài liệu theo từ khóa..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bảng hiển thị chính */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Đang quét tài liệu từ các dự án...</p>
                </div>
              ) : (
                <DocumentTable 
                  documents={filteredDocs} 
                  onChanged={loadAllDocs}
                  currentUserId={currentUserId}
                  currentUserRole="VIEWER" // Ở trang tổng hợp, mặc định role là VIEWER để check logic "Xóa file của chính mình"
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}