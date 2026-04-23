import { createFileRoute } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useEffect, useState } from 'react'
import { ProjectsApi } from '@/lib/api/projects.api'
import { StorageApi } from '@/lib/api/storage.api'
import { DocumentTable } from '@/components/documents/DocumentTable'
import { KDocument } from '@/lib/api/types'
import { Loader2, FileText, Search, Filter, HardDrive } from 'lucide-react'
import { formatBytes } from '@/lib/format'

export const Route = createFileRoute('/documents')({
  component: DocumentsPage,
})

function DocumentsPage() {
  const [docs, setDocs] = useState<KDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadAllDocs = async () => {
    setLoading(true)
    try {
      const projects = await ProjectsApi.list()
      // Gom toàn bộ tài liệu từ tất cả các dự án
      const docPromises = projects.map(p => StorageApi.list(p.id.toString()))
      const docsArrays = await Promise.all(docPromises)
      const allDocs = docsArrays.flat()
      
      // Sắp xếp mới nhất lên đầu
      allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setDocs(allDocs)
    } catch (e) {
      console.error("Lỗi tải tài liệu tổng hợp:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllDocs()
  }, [])

  // Logic lọc tài liệu theo tên
  const filteredDocs = docs.filter(d => 
    d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSize = docs.reduce((acc, d) => acc + d.fileSize, 0)

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Tất cả tài liệu" subtitle="Quản lý tập trung" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* Hàng thống kê nhanh */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số tệp</p>
                  <p className="text-xl font-bold">{docs.length}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dung lượng sử dụng</p>
                  <p className="text-xl font-bold">{formatBytes(totalSize)}</p>
                </div>
              </div>
            </div>

            {/* Thanh công cụ: Tìm kiếm & Lọc */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Tìm kiếm tài liệu theo tên..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-secondary">
                  <Filter className="h-4 w-4" /> Lọc loại file
                </button>
              </div>
            </div>

            {/* Bảng dữ liệu */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="bg-card rounded-xl border shadow-sm">
                <DocumentTable documents={filteredDocs} onChanged={loadAllDocs} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}