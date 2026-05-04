import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { BookOpen, Loader2, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { AuthApi } from "@/lib/api/auth.api";
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus dựa trên mode
  useEffect(() => {
    setErrorMsg(""); // Xóa lỗi khi chuyển mode
    if (mode === "register" && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if (mode === "login" && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [mode]);

  // Client-side Validation
  const validateForm = () => {
    setErrorMsg("");
    if (mode === "register" && name.trim().length < 2) {
      setErrorMsg("Full name must be at least 2 characters.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return false;
    }

    if (password.length < 5) {
      setErrorMsg("Password must be at least 5 characters.");
      return false;
    }

    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setBusy(true);
    setErrorMsg("");

    try {
      if (mode === "login") {
        await AuthApi.login(email, password);
        toast.success("Welcome back to KBase!");
        window.location.href = "/";
      } else {
        await AuthApi.register(name, email, password);
        toast.success("Account created! Please sign in.");
        // Optimistic UX: Làm trống password, giữ lại email, chuyển về màn hình đăng nhập
        setPassword("");
        setMode("login");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Something went wrong. Please try again.";
      setErrorMsg(msg);
      console.error("Authentication error:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background Decorators for visual depth (Gradients mờ) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 opacity-50 blur-[100px]"></div>
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[300px] w-[300px] translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-500/10 opacity-40 blur-[80px]"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground tracking-tight">KBase</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to continue to your workspace." : "Get started with KBase in seconds."}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20 animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <input
                ref={nameInputRef}
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-card/50 backdrop-blur-sm px-4 text-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/50 hover:bg-card focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-sm"
              />
            </div>
          )}
          <div className="space-y-1">
            <input
              ref={emailInputRef}
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-card/50 backdrop-blur-sm px-4 text-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/50 hover:bg-card focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-sm"
            />
          </div>
          <div className="relative space-y-1">
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-card/50 backdrop-blur-sm px-4 pr-12 text-sm transition-all duration-300 placeholder:text-muted-foreground hover:border-primary/50 hover:bg-card focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            disabled={busy}
            className="group mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-md transition-all duration-300 hover:bg-primary/90 hover:shadow-lg disabled:opacity-70 disabled:pointer-events-none"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New to KBase?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">Skip for now &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
