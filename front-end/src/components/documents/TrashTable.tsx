import { useState } from "react";
import { RotateCcw, Trash2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileIcon } from "./FileIcon";
import { formatBytes } from "@/lib/format";
import { StorageApi } from "@/lib/api/storage.api";
import { KDocument } from "@/lib/api/types";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface TrashTableProps {
  documents: KDocument[];
  onChanged: () => void;
  memberMap?: Record<string, string>;
}

export function TrashTable({
  documents,
  onChanged,
  memberMap = {},
}: TrashTableProps) {
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleRestore = async (doc: KDocument) => {
    try {
      setRestoringId(doc.id);
      await StorageApi.restore(doc.id);
      toast.success(`"${doc.fileName}" has been restored`);
      onChanged();
    } catch {
      toast.error("Failed to restore document. You may not have permission.");
    } finally {
      setRestoringId(null);
    }
  };

  const handleForceDelete = async (doc: KDocument) => {
    try {
      setDeletingId(doc.id);
      await StorageApi.forceDelete(doc.id);
      toast.success(`"${doc.fileName}" has been permanently deleted`);
      onChanged();
    } catch {
      toast.error("Failed to permanently delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  /** Calculate remaining days before auto-purge (30-day retention). */
  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return null;
    const deletedDate = new Date(deletedAt);
    const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = purgeDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-secondary/50 rounded-full mb-4">
          <Trash2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium text-foreground">Trash is empty</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Deleted documents will appear here for recovery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Auto-purge info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Documents in trash are <strong>automatically deleted after 30 days</strong>. Restore them before the deadline to keep them.
        </p>
      </div>

    <div className="border-border bg-card overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow>
            <TableHead className="w-[40%] text-xs uppercase tracking-wide">File Name</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Size</TableHead>
            <TableHead className="text-xs uppercase tracking-wide hidden md:table-cell">Deleted By</TableHead>
            <TableHead className="text-xs uppercase tracking-wide hidden md:table-cell">Auto-delete</TableHead>
            <TableHead className="w-[140px] text-right text-xs uppercase tracking-wide">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const uploaderName = memberMap[String(doc.uploadedBy)] || `User #${doc.uploadedBy}`;

            return (
              <TableRow key={doc.id} className="hover:bg-secondary/30 transition-colors group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FileIcon name={doc.fileName} />
                    <span
                      className="font-medium truncate max-w-[200px] md:max-w-[300px] text-muted-foreground line-through"
                      title={doc.fileName}
                    >
                      {doc.fileName}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">{formatBytes(doc.fileSize)}</TableCell>

                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {uploaderName}
                </TableCell>

                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {(() => {
                    const days = getDaysRemaining(doc.deletedAt);
                    if (days === null) return <span className="text-xs">—</span>;
                    if (days <= 3) return (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                        <Clock className="h-3 w-3" /> {days}d left
                      </span>
                    );
                    if (days <= 7) return (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Clock className="h-3 w-3" /> {days}d left
                      </span>
                    );
                    return (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {days}d left
                      </span>
                    );
                  })()}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Restore button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(doc)}
                      disabled={restoringId === doc.id}
                      className="h-8 px-2.5 text-primary hover:bg-primary/10 hover:text-primary"
                      title="Restore document"
                    >
                      {restoringId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      <span className="ml-1 text-xs hidden sm:inline">Restore</span>
                    </Button>

                    {/* Hard-delete button with confirm dialog */}
                    <ForceDeleteDialog
                      doc={doc}
                      onConfirm={() => handleForceDelete(doc)}
                      isDeleting={deletingId === doc.id}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </div>
  );
}

function ForceDeleteDialog({
  doc,
  onConfirm,
  isDeleting,
}: {
  doc: KDocument;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDeleting}
          className="h-8 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Delete permanently"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Permanently Delete
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {doc.fileName}
              </Dialog.Description>
            </div>
          </div>

          <div className="rounded-md bg-destructive/5 border border-destructive/20 p-4 mt-1">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This action will permanently delete the file from the system and cannot be undone. Are you sure?
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.Close>
            <Button variant="destructive" onClick={handleConfirm}>
              Delete permanently
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
