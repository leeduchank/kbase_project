import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { ProjectsApi } from "@/lib/api/projects.api";
import { StorageApi } from "@/lib/api/storage.api";
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()

  // Các state quản lý dữ liệu
  const [projectData, setProjectData] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  
  // State quản lý User và Phân quyền
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("") // Mới thêm để lưu role
  
  const loadData = async () => {
    try {
      let uId = "";
      
      if (typeof window !== "undefined") {
        // Lấy token từ localStorage theo đúng tên bạn đặt
        const token = localStorage.getItem("kbase_token"); 
        
        if (token) {
          try {
            // Giải mã phần Payload của JWT (nằm giữa 2 dấu chấm)
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // In toàn bộ cục payload ra để xem Backend đang đặt tên ID là gì (sub, id, hay userId)
            console.log("🟢 Thông tin giấu trong Token:", payload);
            
            // Lấy ID ra. (Thay đổi 'sub' thành trường tương ứng nếu Backend của bạn đặt tên khác)
            uId = payload.sub || payload.id || payload.userId || ""; 
          } catch (e) {
            console.error("🔴 Lỗi giải mã Kbase_token:", e);
          }
        }
      }
      
      setCurrentUserId(uId);
console.log("🔍 SO SÁNH DỮ LIỆU:");
console.log("- ID gửi đi:", uId);
console.log("- Project ID gửi đi:", projectId);
      // Nếu uId vẫn rỗng thì không gọi API phân quyền nữa để tránh lỗi 404
      const [pData, dData, roleResponse] = await Promise.all([
        ProjectsApi.get(projectId.toString()),
        StorageApi.list(projectId.toString()),
        uId ? ProjectsApi.getMemberRole(projectId, uId) : Promise.resolve({ role: "" })
      ]);

      setProjectData(pData);
      setDocs(dData);
      setUserRole(roleResponse?.role || "");

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  }

  // Chạy loadData khi vừa vào trang
  useEffect(() => {
    loadData()
  }, [projectId])

  if (!projectData) return <div className="p-8 text-center text-muted-foreground">Đang tải dữ liệu dự án...</div>

  const canUpload = userRole === "OWNER" || userRole === "EDITOR";

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={projectData.name} subtitle="Chi tiết dự án" />
        
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-8">
            
            {/* THÔNG TIN DỰ ÁN */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <h2 className="text-2xl font-bold text-foreground mb-2">{projectData.name}</h2>
              <p className="text-muted-foreground mb-4">{projectData.description || "Chưa có mô tả."}</p>
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                Vai trò của bạn: {userRole || "VIEWER"}
              </div>
            </div>

            {/* QUẢN LÝ TÀI LIỆU */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Quản lý Tài liệu</h3>
              </div>

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
              />
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}