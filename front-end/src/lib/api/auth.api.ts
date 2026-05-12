import { api, TOKEN_KEY } from "./client";

const REFRESH_TOKEN_KEY = "kbase_refresh_token";

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }).then((r) => {
      // Bao quát cả 2 trường hợp: không bọc và có bọc bởi ApiResponse
      const token = r.data?.token || r.data?.data?.token;
      const refreshToken = r.data?.refreshToken || r.data?.data?.refreshToken;

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        console.error("Backend không trả về token! Nguyên văn r.data:", r.data);
        throw new Error("Không lấy được token từ server");
      }

      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }

      return r.data;
    }),

  register: (fullName: string, email: string, password: string) =>
    api.post("/api/auth/register", { fullName, email, password }).then((r) => {
      const token = r.data?.token || r.data?.data?.token;
      const refreshToken = r.data?.refreshToken || r.data?.data?.refreshToken;

      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      return r.data;
    }),

  updateProfile: (id: number | string, fullName: string) =>
    api.put(`/api/auth/users/${id}`, { fullName }).then((r) => r.data),

  logout: async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    // Revoke refresh token on the server
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout", { refreshToken });
      } catch (e) {
        // Ignore errors — we're logging out anyway
        console.warn("Failed to revoke refresh token on server:", e);
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isAuthed: () => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(TOKEN_KEY);
    // Phải có token và token không được là chuỗi rác
    return !!token && token !== "undefined" && token !== "null";
  },

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns true if refresh was successful, false otherwise.
   */
  refreshToken: async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const r = await api.post("/api/auth/refresh", { refreshToken });
      const newToken = r.data?.token || r.data?.data?.token;
      const newRefreshToken =
        r.data?.refreshToken || r.data?.data?.refreshToken;

      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
      }
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }

      return !!newToken;
    } catch (e) {
      console.error("Token refresh failed:", e);
      // Refresh token is invalid/expired — clear everything
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return false;
    }
  },

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
};

export { REFRESH_TOKEN_KEY };