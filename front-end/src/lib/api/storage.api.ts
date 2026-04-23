import { api } from "./client";
import { KDocument } from "./types";

export const StorageApi = {
  // Lấy danh sách tài liệu: GET /storage/projects/{projectId}/documents
  list: (projectId: string) =>
    api.get(`/api/storage/projects/${projectId}/documents`).then((r) => r.data.data as KDocument[]),
  
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
  
  // Xóa file: DELETE /storage/documents/{id}
  remove: (id: number) => api.delete(`/api/storage/documents/${id}`).then(r => r.data.data),
};