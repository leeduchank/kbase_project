import { api } from "./client";

export const NotificationsApi = {
  getMyNotifications: () =>
    api.get("/api/notifications/me").then((r) => r.data.data),

  markAsRead: (id: number | string) =>
    api.put(`/api/notifications/${id}/read`).then((r) => r.data.data),

  markAllAsRead: () =>
    api.put("/api/notifications/read-all").then((r) => r.data.data),
};
