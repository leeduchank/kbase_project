import axios from "axios";
import { toast } from "sonner";

// SSR: đọc process.env tại runtime (Docker env var)
// Client: đọc import.meta.env (baked at build time) hoặc fallback
function getApiBase(): string {
  // Server-side (Node.js SSR)
  if (typeof window === "undefined") {
    return process.env.VITE_API_URL || "http://localhost:8080";
  }
  // Client-side (browser)
  return import.meta.env.VITE_API_URL || "http://localhost:8080";
}

export const API_BASE = getApiBase();
export const TOKEN_KEY = "kbase_token";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token && token !== "null" && token !== "undefined" && token.length > 10) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Nếu không có token hợp lệ, xóa luôn header Authorization để tránh gửi rác
    delete config.headers.Authorization;
  }
  return config;
}); 

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (!error.response) {
      // Network error, CORS block, or server unreachable.
      // Log full technical details for developers (visible in browser Console → F12).
      console.error("[API] Network / CORS error:", error);

      // Show a safe, generic message to the user — no technical details exposed.
      if (typeof window !== "undefined") {
        toast.error("Unable to connect to the server. Please check your internet connection or try again.");
      }
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 401) {
      // Session expired — redirect to login (client-only, skip on the login page itself).
      if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
        toast.error("Your session has expired. Please sign in again.");
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
      }
    }

    // For all other HTTP errors (403, 404, 500, …), reject normally so each
    // call-site can handle and display its own context-aware error message.
    return Promise.reject(error);
  }
);