import { useState } from "react";
import { StorageApi } from "@/lib/api/storage.api";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export function UploadZone({ 
  projectId, 
  onUploadSuccess 
}: { 
  projectId: string | number; 
  onUploadSuccess: () => void 
}) {
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    const toastId = toast.loading(`Đang tải lên "${file.name}"...`);

    try {
      // Gọi API Upload (cần đảm bảo StorageApi.upload của bạn hỗ trợ callback progress)
      await StorageApi.upload(projectId.toString(), file, (p: number) => {
        setProgress(p);
      });
      
      toast.success("Tải lên thành công!", { id: toastId });
      onUploadSuccess(); // Gọi lại hàm load danh sách file
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi khi tải file lên. Vui lòng thử lại.", { id: toastId });
    } finally {
      setIsUploading(false);
      setProgress(0);
      e.target.value = ''; // Reset thẻ input để có thể tải lại cùng một file
    }
  };

  return (
    <div className="flex flex-col gap-4 p-8 border-2 border-dashed border-border rounded-xl bg-card/50 transition-colors hover:bg-secondary/20">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="p-3 bg-primary/10 rounded-full">
          <UploadCloud className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Chọn hoặc kéo thả file vào đây</p>
          <p className="text-xs text-muted-foreground mt-1">Tải lên các tài liệu liên quan đến dự án của bạn.</p>
        </div>
        <input 
          type="file" 
          onChange={onFileSelect} 
          disabled={isUploading} 
          className="mt-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50"
        />
      </div>

      {isUploading && (
        <div className="space-y-2 w-full max-w-md mx-auto mt-2">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Đang xử lý trên Cloud...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 w-full" />
        </div>
      )}
    </div>
  );
}