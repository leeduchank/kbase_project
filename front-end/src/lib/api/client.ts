import axios from "axios";
import { toast } from "sonner";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
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
      toast.error("Lỗi kết nối hoặc lỗi CORS");
      return Promise.reject(error);
    }

    const status = error.response.status;
    if (status === 401) {
      // Chỉ xóa token và redirect khi KHÔNG phải đang ở trang login
      if (!window.location.pathname.includes("login")) {
        toast.error("Phiên đăng nhập hết hạn");
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);