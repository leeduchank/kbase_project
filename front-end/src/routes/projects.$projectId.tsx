import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { MemberManagement } from "@/components/projects/MemberManagement";
import { ActivityLogs } from "@/components/projects/ActivityLogs";
import { StorageDashboard } from "@/components/projects/StorageDashboard";
import { TrashTable } from "@/components/documents/TrashTable";
import { ProjectsApi } from "@/lib/api/projects.api";
import { StorageApi } from "@/lib/api/storage.api";
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()

  const [projectData, setProjectData] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [trashedDocs, setTrashedDocs] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const loadData = async () => {
    try {
      let uId = "";

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("kbase_token");
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            uId = payload.sub || payload.id || payload.userId || "";
          } catch (e) {
            console.error("Lỗi giải mã token", e);
          }
        }
      }

      setCurrentUserId(uId);

      const [pData, dData, roleResponse, membersData, trashData] = await Promise.all([
        ProjectsApi.get(projectId.toString()),
        StorageApi.list(projectId.toString()),
        uId ? ProjectsApi.getMemberRole(projectId, uId) : Promise.resolve({ role: "" }),
        ProjectsApi.getMembers(projectId.toString()).catch(() => []),
        StorageApi.getTrash(projectId.toString()).catch(() => [])
      ]);

      setProjectData(pData);
      setDocs(dData);
      setUserRole(roleResponse?.role || "");
      setMembers(Array.isArray(membersData) ? membersData : []);
      setTrashedDocs(Array.isArray(trashData) ? trashData : []);

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    docs.forEach(doc => {
      const extension = doc.fileName.split('.').pop()?.toLowerCase();
      if (extension) types.add(extension);
    });
    return Array.from(types).sort();
  }, [docs]);

  const filteredDocs = useMemo(() => {
    return docs.filter(d => {
      const extension = d.fileName.split('.').pop()?.toLowerCase() || "";
      const matchesSearch = d.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || extension === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [docs, searchTerm, typeFilter]);

  if (!projectData) return <div className="p-8 text-center text-muted-foreground">Loading project...</div>

  const canUpload = userRole === "OWNER" || userRole === "EDITOR";
  const memberMap = members.reduce((acc, m) => {
    acc[String(m.memberId)] = m.fullName;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={projectData.name} subtitle="Project details" />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-6">

            {/* THÔNG TIN DỰ ÁN */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{projectData.name}</h2>
                <p className="text-muted-foreground">{projectData.description || "No description provided."}</p>
              </div>
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                {userRole || "VIEWER"}
              </div>
            </div>

            {/* SỬ DỤNG TABS ĐỂ CHIA KHU VỰC */}
            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="trash">
                  Trash{trashedDocs.length > 0 && (
                    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-semibold text-destructive">
                      {trashedDocs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="activities">Activity</TabsTrigger>
              </TabsList>

              {/* TAB 1: TÀI LIỆU */}
              <TabsContent value="documents" className="space-y-6 outline-none">
                {canUpload && (
                  <UploadZone
                    projectId={projectData.id}
                    onUploadSuccess={loadData}
                  />
                )}

                {/* Thanh công cụ tìm kiếm và lọc */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-10 w-full sm:w-[140px] rounded-xl border-input bg-background shadow-sm hover:bg-secondary transition-all">
                      <SelectValue placeholder="File type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DocumentTable
                  documents={filteredDocs}
                  onChanged={loadData}
                  currentUserRole={userRole}
                  currentUserId={currentUserId}
                  memberMap={memberMap}
                />
              </TabsContent>

              {/* TAB: THÙNG RÁC */}
              <TabsContent value="trash" className="outline-none">
                <TrashTable
                  documents={trashedDocs}
                  onChanged={loadData}
                  memberMap={memberMap}
                />
              </TabsContent>

              {/* TAB: STORAGE QUOTA */}
              <TabsContent value="storage" className="outline-none">
                <StorageDashboard
                  project={{
                    id: projectData.id,
                    storageLimit: projectData.storageLimit ?? 1_073_741_824,
                  }}
                />
              </TabsContent>

              {/* TAB 2: THÀNH VIÊN (Component mới) */}
              <TabsContent value="members" className="outline-none">
                <MemberManagement
                  projectId={projectId}
                  currentUserRole={userRole}
                />
              </TabsContent>

              {/* TAB 3: HOẠT ĐỘNG */}
              <TabsContent value="activities" className="outline-none">
                <ActivityLogs projectId={projectId} memberMap={memberMap} />
              </TabsContent>
            </Tabs>

          </div>
        </main>
      </div>
    </div>
  )
}