import { api } from "./client";
import { KDocument, StorageStats } from "./types";

export const StorageApi = {
  // Lấy danh sách tài liệu: GET /storage/projects/{projectId}/documents
  list: (projectId: string) =>
    api.get(`/api/storage/projects/${projectId}/documents`).then((r) => r.data.data as KDocument[]),

  // Lấy thống kê dung lượng: GET /storage/projects/{projectId}/stats
  getStats: (projectId: string) =>
    api.get(`/api/storage/projects/${projectId}/stats`).then((r) => r.data.data as StorageStats[]),

  
  // Tải file: POST /storage/projects/{projectId}/upload
  upload: (projectId: string, file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file); // Phải map đúng tên param @RequestParam("file")
    
    return api.post(`/api/storage/projects/${projectId}/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          const percentCompleted = Math.round((e.loaded * 100) / e.total);
          onProgress(percentCompleted);
        }
      },
    }).then((r) => r.data.data as KDocument);
  },

  // Thêm hàm lấy Presigned URL
  downloadFile: (documentId: number) => {
    return api.get(`/api/storage/documents/${documentId}/download`, {
      responseType: 'blob', 
    });
  },
  
  // Xóa file (soft-delete → thùng rác): DELETE /storage/documents/{id}
  remove: (id: number) => api.delete(`/api/storage/documents/${id}`).then(r => r.data),

  // Lấy danh sách thùng rác: GET /storage/projects/{projectId}/documents/trash
  getTrash: (projectId: string) =>
    api.get(`/api/storage/projects/${projectId}/documents/trash`).then((r) => r.data.data as KDocument[]),

  // Khôi phục file từ thùng rác: PUT /storage/documents/{id}/restore
  restore: (id: number) =>
    api.put(`/api/storage/documents/${id}/restore`).then((r) => r.data),

  // Xóa vĩnh viễn: DELETE /storage/documents/{id}/force
  forceDelete: (id: number) =>
    api.delete(`/api/storage/documents/${id}/force`).then((r) => r.data),
};