export type KProject = {
  id: number;
  name: string;
  description?: string;
  ownerId: string;
  storageLimit: number;
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
  deleted?: boolean;
  deletedAt?: string;
};

export type StorageStats = {
  fileType: string;
  totalSize: number;
  fileCount: number;
};

export type KProjectMember = {
  memberId: string;
  email: string;
  fullName: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  joinedAt?: string;
};