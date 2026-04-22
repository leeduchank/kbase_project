import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Users, FolderOpen, Lock, Globe } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ProjectsApi, type KProject } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — KBase" },
      { name: "description", content: "Your KBase project workspace." },
    ],
  }),
  component: Dashboard,
});

const fallback: KProject[] = [
  { id: "demo-1", name: "Engineering Wiki", description: "Architecture docs, RFCs, and onboarding guides for the platform team.", privacy: "PRIVATE", members: [{ id: "1", name: "Ada" }, { id: "2", name: "Linus" }, { id: "3", name: "Grace" }] },
  { id: "demo-2", name: "Product Knowledge", description: "Specs, research notes, customer interviews and roadmap artifacts.", privacy: "PUBLIC", members: [{ id: "1", name: "Sam" }, { id: "2", name: "Mia" }] },
  { id: "demo-3", name: "Design System", description: "Tokens, components, accessibility guidelines and brand assets.", privacy: "PRIVATE", members: [{ id: "1", name: "Jin" }, { id: "2", name: "Eli" }, { id: "3", name: "Rae" }, { id: "4", name: "Tom" }] },
];

function Dashboard() {
  const [projects, setProjects] = useState<KProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    ProjectsApi.list()
      .then((p) => setProjects(p.length ? p : fallback))
      .catch(() => setProjects(fallback))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Dashboard" subtitle="Your workspaces and knowledge bases" />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Projects</h2>
              <p className="text-sm text-muted-foreground">{projects.length} active workspace{projects.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)]"
            >
              <Plus className="h-4 w-4" />
              New project
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </main>
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function ProjectCard({ p }: { p: KProject }) {
  const colors = ["bg-indigo-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500"];
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderOpen className="h-5 w-5" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {p.privacy === "PUBLIC" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {p.privacy === "PUBLIC" ? "Public" : "Private"}
        </span>
      </div>
      <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {(p.members || []).slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[11px] font-medium text-white ${colors[i % colors.length]}`}
              title={m.name}
            >
              {m.name?.[0]?.toUpperCase()}
            </div>
          ))}
          {(p.members?.length || 0) > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-[11px] font-medium text-muted-foreground">
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
          params={{ projectId: p.id }}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          View details
        </Link>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await ProjectsApi.create({ name, description, privacy });
      onCreated();
      onClose();
    } catch {
      /* handled */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-foreground">Create new project</h3>
        <p className="mt-1 text-sm text-muted-foreground">Give your knowledge base a clear name and purpose.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Research"
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this project about?"
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Privacy</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["PRIVATE", "PUBLIC"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPrivacy(p)}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    privacy === p
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {p === "PRIVATE" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {p === "PRIVATE" ? "Private" : "Public"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
          <button
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
