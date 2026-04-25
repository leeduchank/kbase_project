import { Download, Trash2, ExternalLink } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate } from "@/lib/format";
import { StorageApi } from "@/lib/api/storage.api";
import { KDocument } from "@/lib/api/types";
import { toast } from "sonner";

interface DocumentTableProps {
  documents: KDocument[];
  onChanged: () => void;
  currentUserRole?: string;
  currentUserId?: string;
}

export function DocumentTable({
  documents,
  onChanged,
  currentUserRole,
  currentUserId
}: DocumentTableProps) {

  const remove = async (d: KDocument) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${d.fileName}"?`)) return;
    try {
      await StorageApi.remove(d.id);
      toast.success("Đã xóa tài liệu");
      onChanged();
    } catch {
      toast.error("Lỗi khi xóa tài liệu. Bạn không có quyền thực hiện.");
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const toastId = toast.loading(`Đang tải ${fileName}...`);
      const response = await StorageApi.downloadFile(documentId);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Tải tài liệu thành công!", { id: toastId });
    } catch (error) {
      console.error("Lỗi tải file:", error);
      toast.error("Không thể tải tài liệu này. Có thể bạn không có quyền.");
    }
  };

  if (!documents || !documents.length) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Chưa có tài liệu nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Tên file</th>
            <th className="px-4 py-3 font-medium">Kích thước</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Loại</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Người tải</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Ngày tạo</th>
            <th className="w-24 px-4 py-3 font-medium text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => {
            const canDelete = currentUserRole === "OWNER" || String(d.uploadedBy) === String(currentUserId);

            return (
              <tr key={d.id} className="group border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileIcon name={d.fileName} />
                    <span className="truncate font-medium text-foreground max-w-[180px] md:max-w-[300px]" title={d.fileName}>
                      {d.fileName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatBytes(d.fileSize)}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  <span className="truncate block max-w-[100px] uppercase text-xs font-medium">{d.fileType || "—"}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">User #{d.uploadedBy}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(d.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    
                    <button
                      onClick={() => handleDownload(d.id, d.fileName)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Tải xuống"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {d.s3Url && (
                      <a
                        href={d.s3Url} 
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        title="Mở tab mới (S3)"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => remove(d)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}