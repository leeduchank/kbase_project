import { useCallback, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { StorageApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function UploadZone({
  projectId,
  onUploaded,
}: {
  projectId: string;
  onUploaded: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setBusy(true);
      try {
        for (const file of list) {
          setProgress(0);
          await StorageApi.upload(projectId, file, setProgress);
          toast.success(`Uploaded ${file.name}`);
        }
        onUploaded();
      } catch {
        // toast handled by interceptor
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [projectId, onUploaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
        dragOver
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {busy ? "Uploading…" : "Drop files here, or click to browse"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sent as multipart/form-data with key <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">file</code>
        </p>
      </div>
      {progress !== null && (
        <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
