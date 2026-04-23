import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KProject, KDocument } from "@/lib/api/types";
import { ProjectsApi } from "@/lib/api/projects.api";
import { StorageApi } from "@/lib/api/storage.api";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDocuments,
});

function ProjectDocuments() {
  const { projectId } = Route.useParams(); 
  const [project, setProject] = useState<KProject | null>(null);
  const [docs, setDocs] = useState<KDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const loadData = async () => {
  setLoading(true);
  try {
    // Sử dụng Promise.all để gọi song song
    const [projectData, documentsData] = await Promise.all([
      ProjectsApi.get(projectId),
      StorageApi.list(projectId)
    ]);
    
    setProject(projectData);
    setDocs(documentsData || []);
  } catch (err: any) {
    console.error("Error loading data:", err);
    
    // XỬ LÝ LỖI 403 TẠI ĐÂY
    if (err.response?.status === 403) {
      toast.error("Bạn không có quyền truy cập vào dự án này");
      // Tùy chọn: Đẩy user về trang chủ sau 2 giây
      setTimeout(() => nav({ to: "/" }), 2000);
    } else {
      toast.error("Đã có lỗi xảy ra khi tải dữ liệu");
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadData();
  }, [projectId]);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={project?.name || "Loading..."} subtitle="Tài liệu dự án" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Trở về danh sách dự án
          </Link>

          {loading && !project ? (
            <div className="flex justify-center py-20">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{project?.name}</h2>
                  <p className="text-sm text-muted-foreground">{project?.description || "Không có mô tả cho dự án này."}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
                {/* Cột trái: Upload và thông tin */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                  <UploadZone projectId={projectId} onUploadSuccess={loadData} />
                  <div className="rounded-xl border bg-card p-5 text-sm">
                    <h3 className="font-semibold mb-3">Thông tin dự án</h3>
                    <div className="flex flex-col gap-2 text-muted-foreground">
                       <div className="flex justify-between">
                         <span>Chủ sở hữu:</span> <span className="text-foreground font-medium">#{project?.ownerId}</span>
                       </div>
                       <div className="flex justify-between">
                         <span>Ngày tạo:</span> <span className="text-foreground font-medium">{project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Bảng tài liệu */}
                <div className="xl:col-span-3">
                  <DocumentTable documents={docs} onChanged={loadData} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}