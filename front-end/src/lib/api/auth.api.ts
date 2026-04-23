import { api, TOKEN_KEY } from "./client";

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }).then((r) => {
      // Bao quát cả 2 trường hợp: không bọc và có bọc bởi ApiResponse
      const token = r.data?.token || r.data?.data?.token;
      
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        console.error("Backend không trả về token! Nguyên văn r.data:", r.data);
        throw new Error("Không lấy được token từ server");
      }
      return r.data;
    }),

  register: (name: string, email: string, password: string) =>
    api.post("/api/auth/register", { name, email, password }).then((r) => {
      const token = r.data?.token || r.data?.data?.token;
      if (token) localStorage.setItem(TOKEN_KEY, token);
      return r.data;
    }),

  logout: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(TOKEN_KEY);
    // Phải có token và token không được là chuỗi rác
    return !!token && token !== "undefined" && token !== "null";
  },
};