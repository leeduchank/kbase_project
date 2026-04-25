import { api } from "./client";
import { KProject } from "./types";

export const ProjectsApi = {
  list: () => api.get("/api/projects").then((r) => r.data.data as KProject[]),
  get: (id: string) => api.get(`/api/projects/${id}`).then((r) => r.data.data as KProject),
  create: (body: Partial<KProject>) => api.post("/api/projects", body).then((r) => r.data.data as KProject),
  getMemberRole: async (projectId: string | number, userId: string) => {
    const res = await api.get(`/api/projects/${projectId}/members/${userId}/role`);
    return res.data; 
  }
};