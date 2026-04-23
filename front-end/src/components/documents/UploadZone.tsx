import { useState } from "react";
import { StorageApi } from "@/lib/api/storage.api";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export function UploadZone({ projectId, onUploadSuccess }: { projectId: string; onUploadSuccess: () => void }) {
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    try {
      await StorageApi.upload(projectId, file, (p: number) => {
        setProgress(p);
      });
      toast.success("Tải lên thành công");
      onUploadSuccess();
    } catch (err) {
      // Lỗi được xử lý bởi interceptor
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 border-2 border-dashed border-border rounded-xl bg-card/50">
      <div className="flex flex-col items-center justify-center gap-2">
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Chọn hoặc kéo thả file vào đây</p>
        <input 
          type="file" 
          onChange={onFileSelect} 
          disabled={isUploading} 
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Đang tải lên...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 w-full" />
        </div>
      )}
    </div>
  );
}