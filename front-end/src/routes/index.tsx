import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Users, FolderOpen, Lock, Globe, FolderPlus } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AuthApi } from "@/lib/api/auth.api";
import { ProjectsApi } from "@/lib/api/projects.api";
import { KProject } from "@/lib/api/types";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — KBase" },
      { name: "description", content: "Your KBase project workspace." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<KProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    console.log("🚀 Đang chuẩn bị gọi API /api/projects...");

    try {
      const p: any = await ProjectsApi.list();

      const projectList = Array.isArray(p) ? p : (p?.data ?? []);

      // Fetch members for each project
      const projectsWithMembers = await Promise.all(
        projectList.map(async (project: any) => {
          try {
            const membersData = await ProjectsApi.getMembers(project.id);
            const mappedMembers = (Array.isArray(membersData) ? membersData : []).map(m => ({
              id: String(m.memberId),
              name: m.fullName || `User #${m.memberId}`
            }));
            return { ...project, members: mappedMembers };
          } catch (e) {
            return { ...project, members: [] };
          }
        })
      );

      setProjects(projectsWithMembers);
    } catch (err) {
      console.error("❌ Lỗi khi gọi API projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Kiểm tra Auth status:", AuthApi.isAuthed()); // Thêm log để debug

    if (!AuthApi.isAuthed()) {
      console.log("Chưa có token, chuyển hướng về login");
      nav({ to: "/login" });
      return;
    }

    console.log("Đã có token, bắt đầu gọi API lấy project");
    load();
  }, [nav]);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Dashboard" subtitle="Manage your workspace" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> New Project
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm min-h-[176px]"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-secondary" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-secondary" />
                  </div>
                  <div className="h-5 w-3/4 animate-pulse rounded bg-secondary mb-3" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-secondary/60 mb-2" />
                  <div className="h-3.5 w-5/6 animate-pulse rounded bg-secondary/60" />
                  <div className="mt-auto pt-5 flex items-center justify-between">
                    <div className="flex -space-x-3">
                      <div className="h-7 w-7 animate-pulse rounded-full bg-secondary ring-2 ring-background" />
                      <div className="h-7 w-7 animate-pulse rounded-full bg-secondary ring-2 ring-background" />
                      <div className="h-7 w-7 animate-pulse rounded-full bg-secondary ring-2 ring-background" />
                    </div>
                    <div className="h-7 w-20 animate-pulse rounded-md bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl py-24 px-6 text-center bg-secondary/30">
              <FolderPlus className="h-20 w-20 text-primary/50 mb-5" />
              <h3 className="text-xl font-semibold text-foreground">No projects yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-8">
                Create your first project to start building your knowledge base.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-primary px-8 h-11 text-white rounded-full font-medium shadow-sm transition-all duration-300 hover:shadow-lg hover:bg-primary/90 hover:-translate-y-0.5"
              >
                Create your first project
              </button>
            </div>
          )}
        </main>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function ProjectCard({ p }: { p: KProject }) {
  const colors = [
    "bg-indigo-500",
    "bg-rose-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-sky-500",
  ];
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderOpen className="h-5 w-5" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {p.privacy === "PUBLIC" ? (
            <Globe className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {p.privacy === "PUBLIC" ? "Public" : "Private"}
        </span>
      </div>
      <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {p.description}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-3">
          {(p.members || []).slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className={`flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background text-[11px] font-medium text-white ${colors[i % colors.length]
                }`}
              title={m.name}
            >
              {m.name?.[0]?.toUpperCase()}
            </div>
          ))}
          {(p.members?.length || 0) > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background bg-secondary text-[11px] font-medium text-muted-foreground">
              +{(p.members?.length || 0) - 4}
            </div>
          )}
          {!p.members?.length && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> No members
            </span>
          )}
        </div>
        <Link
          to="/projects/$projectId"
          params={{ projectId: p.id.toString() }}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          View details
        </Link>
      </div>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const MAX_WORDS = 100;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string; server?: string }>({});

  const countWords = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const wordCount = countWords(description);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = "Project name is required.";
    }
    if (wordCount > MAX_WORDS) {
      newErrors.description = `Description must not exceed ${MAX_WORDS} words.`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setErrors({});
    try {
      await ProjectsApi.create({ name: name.trim(), description: description.trim() });
      onCreated();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Something went wrong. Please try again.";
      setErrors((prev) => ({ ...prev, server: msg }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all"
      >
        <h3 className="text-base font-semibold text-foreground">
          Create new project
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your knowledge base a clear name and purpose.
        </p>

        {errors.server && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {errors.server}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                if (errors.server) setErrors((prev) => ({ ...prev, server: undefined }));
              }}
              placeholder="e.g. Customer Research"
              className={`mt-1.5 h-11 w-full rounded-xl border bg-background px-3.5 text-sm transition-all duration-300 focus:outline-none focus:ring-4 hover:border-primary/50 ${
                errors.name
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/10"
                  : "border-border focus:border-primary focus:ring-primary/10"
              }`}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Description
              </label>
              <span
                className={`text-xs tabular-nums ${
                  wordCount > MAX_WORDS
                    ? "font-medium text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {wordCount}/{MAX_WORDS} words
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              rows={3}
              placeholder="What is this project about?"
              className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-3 text-sm transition-all duration-300 focus:outline-none focus:ring-4 hover:border-primary/50 ${
                errors.description
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/10"
                  : "border-border focus:border-primary focus:ring-primary/10"
              }`}
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-red-500">{errors.description}</p>
            )}
          </div>
          {/* <div>
            <label className="text-xs font-medium text-foreground">
              Privacy
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["PRIVATE", "PUBLIC"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPrivacy(p)}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${privacy === p
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                >
                  {p === "PRIVATE" ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  {p === "PRIVATE" ? "Private" : "Public"}
                </button>
              ))}
            </div>
          </div> */}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-border px-5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}