import axios from "axios";
import { toast } from "sonner";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const TOKEN_KEY = "kbase_token";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    if (status === 401) {
      toast.error("401 Unauthorized — please log in again");
      localStorage.removeItem(TOKEN_KEY);
      if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
        window.location.href = "/login";
      }
    } else if (status === 400) {
      toast.error(`400 Bad Request — ${msg}`);
    } else if (status === 403) {
      toast.error("403 Forbidden");
    } else if (status >= 500) {
      toast.error(`Server error (${status})`);
    } else {
      toast.error(msg || "Request failed");
    }
    return Promise.reject(error);
  }
);

export type KProject = {
  id: string;
  name: string;
  description?: string;
  privacy?: "PUBLIC" | "PRIVATE";
  members?: { id: string; name: string; avatarUrl?: string }[];
};

export type KDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy?: string;
  createdAt?: string;
  s3_url?: string;
};

export const ProjectsApi = {
  list: () => api.get<KProject[]>("/api/projects").then((r) => r.data),
  get: (id: string) => api.get<KProject>(`/api/projects/${id}`).then((r) => r.data),
  create: (body: Partial<KProject>) => api.post<KProject>("/api/projects", body).then((r) => r.data),
};

export const StorageApi = {
  list: (projectId: string) =>
    api.get<KDocument[]>(`/api/storage/projects/${projectId}/documents`).then((r) => r.data),
  upload: (projectId: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post<KDocument>(`/api/storage/projects/${projectId}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  remove: (id: string) => api.delete(`/api/storage/documents/${id}`),
  rename: (id: string, name: string) =>
    api.patch<KDocument>(`/api/storage/documents/${id}`, { name }).then((r) => r.data),
};

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string }>("/api/auth/login", { email, password }).then((r) => {
      localStorage.setItem(TOKEN_KEY, r.data.token);
      return r.data;
    }),
  register: (name: string, email: string, password: string) =>
    api.post<{ token: string }>("/api/auth/register", { name, email, password }).then((r) => {
      if (r.data.token) localStorage.setItem(TOKEN_KEY, r.data.token);
      return r.data;
    }),
  logout: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEY),
};
