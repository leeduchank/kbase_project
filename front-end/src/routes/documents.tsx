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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMemo } from 'react'

export const Route = createFileRoute('/documents')({
  component: DocumentsPage,
})

function DocumentsPage() {
  const [docs, setDocs] = useState<KDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [memberMap, setMemberMap] = useState<Record<string, string>>({})
  const [projectMap, setProjectMap] = useState<Record<number, string>>({})

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

      const newProjectMap = projects.reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {} as Record<number, string>);

      const docPromises = projects.map(p => StorageApi.list(p.id.toString()).catch(() => []))
      const memberPromises = projects.map(p => ProjectsApi.getMembers(p.id.toString()).catch(() => []))

      const [docsArrays, membersArrays] = await Promise.all([
        Promise.all(docPromises),
        Promise.all(memberPromises)
      ])

      const allDocs = docsArrays.flat()
      const allMembers = membersArrays.flat()

      const newMemberMap = allMembers.reduce((acc, m) => {
        if (m && m.memberId) {
          acc[String(m.memberId)] = m.fullName;
        }
        return acc;
      }, {} as Record<string, string>);

      // Sắp xếp mới nhất lên đầu
      allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setDocs(allDocs)
      setMemberMap(newMemberMap)
      setProjectMap(newProjectMap)
    } catch (e) {
      console.error("Lỗi khi gom dữ liệu:", e)
      toast.error("Unable to load the document library")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllDocs()
  }, [])

  // Lọc file unique types
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    docs.forEach(doc => {
      const extension = doc.fileName.split('.').pop()?.toLowerCase();
      if (extension) types.add(extension);
    });
    return Array.from(types).sort();
  }, [docs]);

  // Logic tìm kiếm
  const filteredDocs = docs.filter(d => {
    const extension = d.fileName.split('.').pop()?.toLowerCase() || "";
    const matchesSearch = d.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || extension === typeFilter;
    return matchesSearch && matchesType;
  })

  const totalSize = docs.reduce((acc, d) => acc + d.fileSize, 0)

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Document Library" subtitle="All your documents in one place" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Thống kê nhanh và Công cụ */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/10 shadow-sm">
                    <FileText className="h-6 w-6" />
                  </div>
                  All Documents
                </h2>
                <p className="text-muted-foreground ml-[60px]">
                  Showing <span className="font-medium text-foreground">{docs.length}</span> file{docs.length !== 1 ? 's' : ''} across all projects.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 ml-[60px] md:ml-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full md:w-64 rounded-xl border border-input bg-background/50 pl-9 pr-4 text-sm shadow-sm transition-all focus:w-full md:focus:w-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 w-[140px] rounded-xl border-border bg-background/50 shadow-sm transition-all hover:bg-secondary">
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex items-center gap-2 bg-background/50 px-3 h-10 rounded-xl border border-border shadow-sm" title="Total storage used">
                  <HardDrive className="h-4 w-4 text-primary/70" />
                  <span className="text-xs font-medium text-foreground">{formatBytes(totalSize)}</span>
                </div>
                <button
                  onClick={loadAllDocs}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/50 shadow-sm hover:bg-secondary hover:text-foreground transition-all active:scale-95"
                  title="Refresh"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </button>
              </div>
            </div>



            {/* Bảng hiển thị chính */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Scanning documents across projects...</p>
                </div>
              ) : (
                <DocumentTable
                  documents={filteredDocs}
                  onChanged={loadAllDocs}
                  currentUserId={currentUserId}
                  currentUserRole="VIEWER"
                  memberMap={memberMap}
                  projectMap={projectMap}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}