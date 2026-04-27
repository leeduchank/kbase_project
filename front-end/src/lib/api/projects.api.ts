import { api } from "./client";
import { KProject, KProjectMember } from "./types";

export const ProjectsApi = {
  list: () => api.get("/api/projects").then((r) => r.data.data as KProject[]),
  get: (id: string) => api.get(`/api/projects/${id}`).then((r) => r.data.data as KProject),
  create: (body: Partial<KProject>) => api.post("/api/projects", body).then((r) => r.data.data as KProject),
  getMemberRole: async (projectId: string | number, userId: string) => {
    const res = await api.get(`/api/projects/${projectId}/members/${userId}/role`);
    return res.data;
  },
  getMembers: (projectId: string | number) =>
    api.get(`/api/projects/${projectId}/members`).then(r => r.data.data as KProjectMember[]),

  addMember: (projectId: string | number, memberId: string, role: string) =>
    api.post(`/api/projects/${projectId}/members`, { memberId, role }).then(r => r.data.data),

  updateMemberRole: (projectId: string | number, memberId: string, role: string) =>
    api.patch(`/api/projects/${projectId}/members/${memberId}`, { role }).then(r => r.data.data),

  removeMember: (projectId: string | number, memberId: string) =>
    api.delete(`/api/projects/${projectId}/members/${memberId}`).then(r => r.data.data),

  transferOwnership: (projectId: string | number, newOwnerId: string) =>
    api.post(`/api/projects/${projectId}/transfer?newOwnerId=${newOwnerId}`).then(r => r.data.data),

  getActivities: (projectId: string | number) =>
    api.get(`/api/projects/${projectId}/activities`).then(r => r.data.data),

  inviteMember: (projectId: string | number, email: string) =>
    api.post(`/api/projects/${projectId}/invitations`, { email }).then(r => r.data.data),

  getMyInvitations: () =>
    api.get('/api/projects/invitations/me').then(r => r.data.data),

  acceptInvitation: (invitationId: number) =>
    api.post(`/api/projects/invitations/${invitationId}/accept`).then(r => r.data.data),

  rejectInvitation: (invitationId: number) =>
    api.post(`/api/projects/invitations/${invitationId}/reject`).then(r => r.data.data),
};