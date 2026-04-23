import { Download, Trash2, ExternalLink } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate } from "@/lib/format";
import { StorageApi } from "@/lib/api/storage.api";
import { KDocument } from "@/lib/api/types";
import { toast } from "sonner";

export function DocumentTable({
  documents,
  onChanged,
}: {
  documents: KDocument[];
  onChanged: () => void;
}) {

  const remove = async (d: KDocument) => {
    if (!confirm(`Xóa tài liệu "${d.fileName}"?`)) return;
    try {
      await StorageApi.remove(d.id);
      toast.success("Đã xóa tài liệu");
      onChanged();
    } catch {
      toast.error("Lỗi khi xóa tài liệu");
    }
  };

  if (!documents || !documents.length) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Chưa có tài liệu nào. Tải lên để bắt đầu.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Tên file</th>
            <th className="px-4 py-2.5 font-medium">Kích thước</th>
            <th className="px-4 py-2.5 font-medium">Loại</th>
            <th className="px-4 py-2.5 font-medium">Người tải</th>
            <th className="px-4 py-2.5 font-medium">Ngày tạo</th>
            <th className="w-24 px-4 py-2.5 font-medium text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className="group border-b border-border last:border-0 hover:bg-secondary/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileIcon name={d.fileName} />
                  <span className="truncate font-medium text-foreground">{d.fileName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatBytes(d.fileSize)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <span className="truncate block max-w-[120px]">{d.fileType || "—"}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">User #{d.uploadedBy}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(d.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <a
                    href={`http://localhost:8080/api/storage/documents/${d.id}/download`} // Trỏ tới API Download của Backend
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {d.s3Url && (
                     <a
                     href={d.s3Url} 
                     target="_blank"
                     rel="noreferrer"
                     className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                     title="View via S3"
                   >
                     <ExternalLink className="h-4 w-4" />
                   </a>
                  )}
                  <button
                    onClick={() => remove(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}