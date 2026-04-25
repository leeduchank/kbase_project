export type KProject = {
  id: number;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  // Các field phụ nếu UI cần hiển thị
  privacy?: "PUBLIC" | "PRIVATE";
  members?: { id: string; name: string; avatarUrl?: string }[];
  memberRole?: string;
};

export type KDocument = {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Url: string;
  projectId: number;
  uploadedBy: string;
  createdAt: string;
};