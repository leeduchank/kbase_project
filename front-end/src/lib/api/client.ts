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
const REFRESH_TOKEN_KEY = "kbase_refresh_token";

export const api = axios.create({ baseURL: API_BASE });

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

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
  async (error) => {
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
    const originalRequest = error.config;

    // Handle 401: Try to refresh the token (but not for auth endpoints themselves)
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/logout")
    ) {
      if (isRefreshing) {
        // Another request is already refreshing the token — wait for it
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null;

      if (refreshToken) {
        try {
          const r = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
          const newToken = r.data?.token || r.data?.data?.token;
          const newRefreshToken = r.data?.refreshToken || r.data?.data?.refreshToken;

          if (newToken) {
            localStorage.setItem(TOKEN_KEY, newToken);
            if (newRefreshToken) {
              localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
            }

            isRefreshing = false;
            onRefreshed(newToken);

            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("[API] Token refresh failed:", refreshError);
        }
      }

      // Refresh failed — clear tokens and redirect to login
      isRefreshing = false;
      refreshSubscribers = [];

      if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
        toast.error("Your session has expired. Please sign in again.");
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = "/login";
      }
    }

    // For all other HTTP errors (403, 404, 500, …), reject normally so each
    // call-site can handle and display its own context-aware error message.
    return Promise.reject(error);
  }
);