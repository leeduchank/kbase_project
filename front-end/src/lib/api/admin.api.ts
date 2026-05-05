import { api } from "./client";
import { KProject } from "./types";

export const AdminApi = {
  getProjects: () => api.get("/api/admin/projects").then((r) => r.data.data),
  deleteProject: (id: number) => api.delete(`/api/admin/projects/${id}`).then((r) => r.data),
  forceTransferProject: (projectId: number, newOwnerId: string) => 
    api.post(`/api/admin/projects/${projectId}/transfer?newOwnerId=${newOwnerId}`).then((r) => r.data),
  getUsers: () => api.get("/api/auth/users").then((r) => r.data.data),
  deactivateUser: (id: number) => api.patch(`/api/auth/users/${id}/deactivate`).then((r) => r.data),
  activateUser: (id: number) => api.patch(`/api/auth/users/${id}/activate`).then((r) => r.data),
  updateStorageLimit: (projectId: number, storageLimitBytes: number) =>
    api.patch(`/api/admin/projects/${projectId}/storage-limit?storageLimit=${storageLimitBytes}`).then((r) => r.data),
};
