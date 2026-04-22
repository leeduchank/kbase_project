import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { StorageApi, ProjectsApi, type KDocument, type KProject } from "@/lib/api";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Project documents — KBase" },
      { name: "description", content: "Manage and upload project documents." },
    ],
  }),
  component: ProjectDocuments,
});

function ProjectDocuments() {
  const { projectId } = Route.useParams();
  const [project, setProject] = useState<KProject | null>(null);
  const [docs, setDocs] = useState<KDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.allSettled([ProjectsApi.get(projectId), StorageApi.list(projectId)]).then(([p, d]) => {
      if (p.status === "fulfilled") setProject(p.value);
      else setProject({ id: projectId, name: "Project" });
      if (d.status === "fulfilled") setDocs(d.value);
      else setDocs([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [projectId]);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={project?.name || "Project"} subtitle="Documents & files" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
          </Link>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{project?.name}</h2>
              <p className="text-sm text-muted-foreground">{project?.description || "Project documents and assets"}</p>
            </div>
          </div>

          <div className="space-y-5">
            <UploadZone projectId={projectId} onUploaded={load} />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">All documents</h3>
              <span className="text-xs text-muted-foreground">{docs.length} item{docs.length !== 1 ? "s" : ""}</span>
            </div>
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
            ) : (
              <DocumentTable documents={docs} onChanged={load} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
