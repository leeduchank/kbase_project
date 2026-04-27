import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { MemberManagement } from "@/components/projects/MemberManagement";
import { ActivityLogs } from "@/components/projects/ActivityLogs";
import { ProjectsApi } from "@/lib/api/projects.api";
import { StorageApi } from "@/lib/api/storage.api";
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 🚀 Import Tabs

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()

  const [projectData, setProjectData] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("")

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

      const [pData, dData, roleResponse, membersData] = await Promise.all([
        ProjectsApi.get(projectId.toString()),
        StorageApi.list(projectId.toString()),
        uId ? ProjectsApi.getMemberRole(projectId, uId) : Promise.resolve({ role: "" }),
        ProjectsApi.getMembers(projectId.toString()).catch(() => [])
      ]);

      setProjectData(pData);
      setDocs(dData);
      setUserRole(roleResponse?.role || "");
      setMembers(Array.isArray(membersData) ? membersData : []);

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  if (!projectData) return <div className="p-8 text-center text-muted-foreground">Đang tải dữ liệu dự án...</div>

  const canUpload = userRole === "OWNER" || userRole === "EDITOR";
  const memberMap = members.reduce((acc, m) => {
    acc[String(m.memberId)] = m.fullName;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={projectData.name} subtitle="Chi tiết dự án" />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-6">

            {/* THÔNG TIN DỰ ÁN */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{projectData.name}</h2>
                <p className="text-muted-foreground">{projectData.description || "Chưa có mô tả."}</p>
              </div>
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                {userRole || "VIEWER"}
              </div>
            </div>

            {/* SỬ DỤNG TABS ĐỂ CHIA KHU VỰC */}
            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="documents">Tài liệu dự án</TabsTrigger>
                <TabsTrigger value="members">Thành viên</TabsTrigger>
                <TabsTrigger value="activities">Hoạt động</TabsTrigger>
              </TabsList>

              {/* TAB 1: TÀI LIỆU (Giữ nguyên logic cũ của bạn) */}
              <TabsContent value="documents" className="space-y-6 outline-none">
                {canUpload && (
                  <UploadZone
                    projectId={projectData.id}
                    onUploadSuccess={loadData}
                  />
                )}
                <DocumentTable
                  documents={docs}
                  onChanged={loadData}
                  currentUserRole={userRole}
                  currentUserId={currentUserId}
                  memberMap={memberMap}
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