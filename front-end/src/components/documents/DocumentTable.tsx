import * as React from "react";
import { Download, Trash2, Eye, MoreHorizontal } from "lucide-react";
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
    if (!confirm(`Move "${d.fileName}" to trash?`)) return;
    try {
      await StorageApi.remove(d.id);
      toast.success("Document moved to trash");
      onChanged();
    } catch {
      toast.error("Failed to delete document. You may not have permission.");
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const toastId = toast.loading(`Downloading ${fileName}...`);
      const response = await StorageApi.downloadFile(documentId);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download complete!", { id: toastId });
    } catch (error) {
      console.error("Lỗi tải file:", error);
      toast.error("Unable to download this document. You may not have permission.");
    }
  };

  // LOGIC MỚI: Lấy Presigned URL từ Backend và mở sang tab mới an toàn
  const handlePreview = async (documentId: number, fileName: string) => {
    let toastId;
    try {
      toastId = toast.loading(`Đang tải bản xem trước cho ${fileName}...`);

      const response = await StorageApi.getPreviewUrl(documentId);
      // KBase Backend thường bọc dữ liệu trong ApiResponse (response.data.data)
      const previewUrl = response?.data || response;

      toast.dismiss(toastId);

      if (previewUrl) {
        // Mở URL an toàn sang một tab mới
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error("Không tìm thấy đường dẫn xem trước.");
      }
    } catch (error) {
      console.error("Lỗi xem trước:", error);
      toast.dismiss(toastId);
      toast.error("Không thể xem trước tài liệu này. Có thể bạn không có quyền.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border-border bg-card overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="w-[40%] text-xs uppercase tracking-wide">File Name</TableHead>
              {Object.keys(projectMap).length > 0 && (
                <TableHead className="text-xs uppercase tracking-wide hidden sm:table-cell">Project</TableHead>
              )}
              <TableHead className="text-xs uppercase tracking-wide">Size</TableHead>
              <TableHead className="text-xs uppercase tracking-wide hidden md:table-cell">Created At</TableHead>
              <TableHead className="text-xs uppercase tracking-wide hidden md:table-cell">Uploaded By</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {documents.length === 0
                    ? "No documents yet."
                    : "No documents match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => {
                // Chỉ OWNER hoặc EDITOR mới được xóa
                const canDelete = currentUserRole === "OWNER" || currentUserRole === "EDITOR";
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
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          {/* Đã truyền cả doc.id và doc.fileName vào handlePreview */}
                          <DropdownMenuItem onClick={() => handlePreview(doc.id, doc.fileName)} className="cursor-pointer transition-all duration-200 active:scale-[0.98]">
                            <Eye className="mr-2 size-4" />
                            View file
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.fileName)} className="cursor-pointer transition-all duration-200 active:scale-[0.98]">
                            <Download className="mr-2 size-4" />
                            Download
                          </DropdownMenuItem>

                          {canDelete && (
                            <DropdownMenuItem onClick={() => remove(doc)} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer transition-all duration-200 active:scale-[0.98]">
                              <Trash2 className="mr-2 size-4" />
                              Move to trash
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