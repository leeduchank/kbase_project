import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { AuthApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — KBase" },
      { name: "description", content: "Sign in to your KBase workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await AuthApi.login(email, password);
      else await AuthApi.register(name, email, password);
      toast.success("Welcome to KBase");
      nav({ to: "/" });
    } catch {
      /* handled */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">KBase</p>
            <p className="text-xs text-muted-foreground">Knowledge Management</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Sign in to continue to your workspace." : "Get started with KBase in seconds."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" && (
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? "New to KBase?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Skip for now →</Link>
        </p>
      </div>
    </div>
  );
}
