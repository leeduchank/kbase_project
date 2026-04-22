import { Download, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate } from "@/lib/format";
import { StorageApi, type KDocument } from "@/lib/api";
import { toast } from "sonner";

export function DocumentTable({
  documents,
  onChanged,
}: {
  documents: KDocument[];
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (d: KDocument) => {
    setRenaming(d.id);
    setRenameValue(d.name);
  };

  const submitRename = async (id: string) => {
    if (!renameValue.trim()) return setRenaming(null);
    try {
      await StorageApi.rename(id, renameValue.trim());
      toast.success("Renamed");
      setRenaming(null);
      onChanged();
    } catch {
      /* handled */
    }
  };

  const remove = async (d: KDocument) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    try {
      await StorageApi.remove(d.id);
      toast.success("Deleted");
      onChanged();
    } catch {
      /* handled */
    }
  };

  if (!documents.length) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">No documents yet. Upload one above to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Size</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Uploaded by</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="w-32 px-4 py-2.5 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className="group border-b border-border last:border-0 hover:bg-secondary/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileIcon name={d.name} />
                  {renaming === d.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => submitRename(d.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(d.id);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="h-7 w-full max-w-xs rounded border border-ring bg-background px-2 text-sm focus:outline-none"
                    />
                  ) : (
                    <span className="truncate font-medium text-foreground">{d.name}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatBytes(d.size)}</td>
              <td className="px-4 py-3 text-muted-foreground">{d.type || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{d.uploadedBy || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(d.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {d.s3_url && (
                    <a
                      href={d.s3_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => startRename(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
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
