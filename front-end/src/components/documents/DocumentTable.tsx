import * as React from "react";
import { Search, SlidersHorizontal, X, Download, Trash2, Eye, MoreHorizontal } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  memberMap?: Record<string, string>;
  projectMap?: Record<number, string>;
}

export function DocumentTable({
  documents,
  onChanged,
  currentUserRole,
  currentUserId,
  memberMap = {},
  projectMap = {}
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

  return (
    <div className="space-y-4">

      {/* Table */}
      <div className="border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="w-[40%] text-xs uppercase tracking-wide">Tên tài liệu</TableHead>
              {Object.keys(projectMap).length > 0 && (
                <TableHead className="text-xs uppercase tracking-wide hidden sm:table-cell">Dự án</TableHead>
              )}
              <TableHead className="text-xs uppercase tracking-wide">Kích thước</TableHead>
              <TableHead className="text-xs uppercase tracking-wide hidden md:table-cell">Ngày tạo</TableHead>
              <TableHead className="text-xs uppercase tracking-wide hidden md:table-cell">Người tạo</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {documents.length === 0
                    ? "Chưa có tài liệu nào."
                    : "Không tìm thấy tài liệu nào phù hợp với bộ lọc."}
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => {
                const canDelete = currentUserRole === "OWNER" || String(doc.uploadedBy) === String(currentUserId);
                const uploaderName = memberMap[String(doc.uploadedBy)] || `User #${doc.uploadedBy}`;

                return (
                  <TableRow key={doc.id} className="hover:bg-secondary/30 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon name={doc.fileName} />
                        <span className="font-medium truncate max-w-[200px] md:max-w-[300px]" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                      </div>
                    </TableCell>

                    {Object.keys(projectMap).length > 0 && (
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium border">
                          {projectMap[doc.projectId] || `Project #${doc.projectId}`}
                        </span>
                      </TableCell>
                    )}

                    <TableCell className="text-muted-foreground">{formatBytes(doc.fileSize)}</TableCell>

                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {formatDate(doc.createdAt)}
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {uploaderName}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 data-[state=open]:opacity-100 shadow-sm"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Mở menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          {doc.s3Url && (
                            <DropdownMenuItem onClick={() => window.open(doc.s3Url, '_blank')} className="cursor-pointer transition-all duration-200 active:scale-[0.98]">
                              <Eye className="mr-2 size-4" />
                              Xem trực tiếp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.fileName)} className="cursor-pointer transition-all duration-200 active:scale-[0.98]">
                            <Download className="mr-2 size-4" />
                            Tải xuống
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem onClick={() => remove(doc)} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer transition-all duration-200 active:scale-[0.98]">
                              <Trash2 className="mr-2 size-4" />
                              Xóa tài liệu
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
