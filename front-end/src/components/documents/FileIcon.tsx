import { FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet, File as FileIco } from "lucide-react";
import { fileExt } from "@/lib/format";

const map: Record<string, { icon: typeof FileIco; color: string }> = {
  pdf: { icon: FileText, color: "text-red-500 bg-red-50" },
  doc: { icon: FileText, color: "text-blue-500 bg-blue-50" },
  docx: { icon: FileText, color: "text-blue-500 bg-blue-50" },
  txt: { icon: FileText, color: "text-slate-500 bg-slate-100" },
  md: { icon: FileText, color: "text-slate-500 bg-slate-100" },
  xls: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  csv: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  png: { icon: FileImage, color: "text-violet-500 bg-violet-50" },
  jpg: { icon: FileImage, color: "text-violet-500 bg-violet-50" },
  jpeg: { icon: FileImage, color: "text-violet-500 bg-violet-50" },
  gif: { icon: FileImage, color: "text-violet-500 bg-violet-50" },
  svg: { icon: FileImage, color: "text-violet-500 bg-violet-50" },
  mp4: { icon: FileVideo, color: "text-pink-500 bg-pink-50" },
  mov: { icon: FileVideo, color: "text-pink-500 bg-pink-50" },
  mp3: { icon: FileAudio, color: "text-amber-500 bg-amber-50" },
  wav: { icon: FileAudio, color: "text-amber-500 bg-amber-50" },
  zip: { icon: FileArchive, color: "text-yellow-600 bg-yellow-50" },
  rar: { icon: FileArchive, color: "text-yellow-600 bg-yellow-50" },
  json: { icon: FileCode, color: "text-cyan-600 bg-cyan-50" },
  js: { icon: FileCode, color: "text-cyan-600 bg-cyan-50" },
  ts: { icon: FileCode, color: "text-cyan-600 bg-cyan-50" },
  tsx: { icon: FileCode, color: "text-cyan-600 bg-cyan-50" },
};

export function FileIcon({ name }: { name: string }) {
  const ext = fileExt(name);
  const { icon: Icon, color } = map[ext] || { icon: FileIco, color: "text-muted-foreground bg-secondary" };
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}
