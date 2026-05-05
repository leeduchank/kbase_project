import { useEffect, useState } from "react";
import { StorageApi } from "@/lib/api/storage.api";
import { StorageStats } from "@/lib/api/types";
import { formatBytes } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  HardDrive,
  FileType2,
  AlertTriangle,
} from "lucide-react";

interface StorageDashboardProps {
  project: {
    id: number;
    storageLimit: number;
  };
}

export function StorageDashboard({ project }: StorageDashboardProps) {
  const [stats, setStats] = useState<StorageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await StorageApi.getStats(String(project.id));
        setStats(data);
      } catch (error) {
        console.error("Failed to load storage stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [project.id]);

  // ── Derived values ──────────────────────────────────────────────────
  const totalUsed = stats.reduce((sum, s) => sum + s.totalSize, 0);
  const percentage = Math.min(
    Math.round((totalUsed / project.storageLimit) * 100),
    100,
  );
  const isWarning = percentage > 90;

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Quota Overview Card ────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Storage Usage
          </h3>
        </div>

        {/* Progress bar */}
        <Progress
          value={percentage}
          className={`h-3 mb-3 ${isWarning ? "[&>[data-state]]:bg-red-500" : ""}`}
        />

        {/* Labels */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatBytes(totalUsed)} / {formatBytes(project.storageLimit)}
          </span>
          <span
            className={`font-semibold ${isWarning ? "text-red-500" : "text-foreground"}`}
          >
            {percentage}%
          </span>
        </div>

        {isWarning && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Storage almost full! Consider removing unused files.</span>
          </div>
        )}
      </div>

      {/* ── Per-type Breakdown ─────────────────────────────────────── */}
      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileType2 className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">
              Breakdown by File Type
            </h4>
          </div>

          <ul className="divide-y divide-border">
            {stats.map((s) => {
              const typePercent =
                totalUsed > 0
                  ? Math.round((s.totalSize / totalUsed) * 100)
                  : 0;

              return (
                <li
                  key={s.fileType}
                  className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {typePercent}%
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {s.fileType}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                    <span>{s.fileCount} file{s.fileCount > 1 ? "s" : ""}</span>
                    <span className="font-semibold text-foreground">
                      {formatBytes(s.totalSize)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
