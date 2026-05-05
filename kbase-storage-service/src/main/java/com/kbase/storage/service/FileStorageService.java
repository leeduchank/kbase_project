package com.kbase.storage.service;

import com.kbase.storage.client.ProjectServiceClient;
import com.kbase.storage.client.dto.ProjectInfoResponse;
import com.kbase.storage.dto.ActivityEvent;
import com.kbase.storage.dto.StorageStatsDto;
import com.kbase.storage.exception.ResourceNotFoundException;
import com.kbase.storage.exception.StorageQuotaExceededException;
import com.kbase.storage.dto.DocumentDto;
import com.kbase.storage.entity.Document;
import com.kbase.storage.repository.DocumentRepository;
import com.kbase.storage.security.SecurityUtils;
import com.kbase.storage.security.StoragePermissionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class FileStorageService {

    private final DocumentRepository documentRepository;
    private final S3StorageService s3StorageService;
    private final StoragePermissionService storagePermissionService;
    private final ActivityEventPublisher activityEventPublisher;
    private final ProjectServiceClient projectServiceClient;

    public FileStorageService(DocumentRepository documentRepository,
            S3StorageService s3StorageService,
            StoragePermissionService storagePermissionService,
            ActivityEventPublisher activityEventPublisher,
            ProjectServiceClient projectServiceClient) {
        this.documentRepository = documentRepository;
        this.s3StorageService = s3StorageService;
        this.storagePermissionService = storagePermissionService;
        this.activityEventPublisher = activityEventPublisher;
        this.projectServiceClient = projectServiceClient;
    }



    public DocumentDto uploadFile(MultipartFile file, Long projectId, String uploadedBy) {
        // ── Storage Quota Check (before any I/O) ────────────────────
        long fileSize = file.getSize();
        long currentUsage = documentRepository.getTotalSizeByProject(projectId);
        long storageLimit = resolveStorageLimit(projectId);
        log.info("Quota check: projectId={}, currentUsage={}, fileSize={}, limit={}",
                projectId, currentUsage, fileSize, storageLimit);

        if (currentUsage + fileSize > storageLimit) {
            throw new StorageQuotaExceededException(
                    String.format("Storage quota exceeded! Used: %d bytes, File: %d bytes, Limit: %d bytes",
                            currentUsage, fileSize, storageLimit));
        }

        try {
            String fileName = file.getOriginalFilename();
            String fileType = file.getContentType();

            if (fileType != null && fileType.startsWith("text/")) {
                fileType = fileType + "; charset=utf-8";
                log.info("Add charset for file text: {}", fileType);
            }

            // Generate unique S3 key
            String s3Key = generateS3Key(projectId, fileName);

            // Upload to S3
            String s3Url = s3StorageService.uploadFile(
                    s3Key,
                    file.getInputStream(),
                    fileSize,
                    fileType);

            log.info("S3 Upload URL: {}", s3Url);

            // Save document metadata to database
            Document document = Document.builder()
                    .fileName(fileName)
                    .fileType(fileType)
                    .fileSize(fileSize)
                    .s3Url(s3Url)
                    .projectId(projectId)
                    .uploadedBy(uploadedBy)
                    .build();

            document = documentRepository.save(document);
            log.info("Document saved successfully: {}", document.getId());

            // Bắn UPLOAD_FILE event vào SQS (không block luồng chính)
            activityEventPublisher.publish(ActivityEvent.builder()
                    .projectId(projectId)
                    .userId(uploadedBy)
                    .action("UPLOAD_FILE")
                    .targetName(fileName)
                    .build());

            return DocumentDto.fromEntity(document);
        } catch (IOException e) {
            log.error("Error processing file upload: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process file upload", e);
        }
    }

    public DocumentDto getDocument(Long documentId) {
        // Verify the current user is at least a project member (VIEWER+)
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireReadAccess(documentId, userId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        return DocumentDto.fromEntity(document);
    }

    public List<DocumentDto> getDocumentsByProject(Long projectId) {
        return documentRepository.findByProjectIdAndIsDeletedFalse(projectId)
                .stream()
                .map(DocumentDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<DocumentDto> getDocumentsByUser(String userId) {
        return documentRepository.findByUploadedBy(userId)
                .stream()
                .map(DocumentDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Return per-fileType storage statistics for a project.
     */
    public List<StorageStatsDto> getStorageStats(Long projectId) {
        return documentRepository.getStorageStatsByProject(projectId);
    }

    /**
     * Soft-delete a document: mark as deleted without removing from S3.
     */
    public void deleteDocument(Long documentId) {
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireWriteAccess(documentId, userId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        document.setIsDeleted(true);
        document.setDeletedAt(java.time.LocalDateTime.now());
        documentRepository.save(document);
        log.info("Document soft-deleted: {}", documentId);

        activityEventPublisher.publish(ActivityEvent.builder()
                .projectId(document.getProjectId())
                .userId(userId)
                .action("DELETE_FILE")
                .targetName(document.getFileName())
                .build());
    }

    /**
     * Restore a soft-deleted document.
     */
    public void restoreDocument(Long documentId) {
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireWriteAccess(documentId, userId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        document.setIsDeleted(false);
        document.setDeletedAt(null);
        documentRepository.save(document);
        log.info("Document restored: {}", documentId);

        activityEventPublisher.publish(ActivityEvent.builder()
                .projectId(document.getProjectId())
                .userId(userId)
                .action("RESTORE_FILE")
                .targetName(document.getFileName())
                .build());
    }

    /**
     * Get trashed (soft-deleted) documents for a project.
     */
    public List<DocumentDto> getTrashedDocuments(Long projectId) {
        return documentRepository.findByProjectIdAndIsDeletedTrue(projectId)
                .stream()
                .map(DocumentDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Hard-delete: permanently remove file from S3 and DB.
     */
    public void hardDeleteDocument(Long documentId) {
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireWriteAccess(documentId, userId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        String s3Key = extractS3KeyFromUrl(document.getS3Url());
        String fileName = document.getFileName();
        Long projectId = document.getProjectId();

        try {
            s3StorageService.deleteFile(s3Key);
            log.info("S3 file deleted permanently: {}", s3Key);
        } catch (Exception e) {
            log.error("Error deleting file from S3, proceeding with DB deletion: {}", e.getMessage());
        }

        documentRepository.delete(document);
        log.info("Document hard-deleted permanently: {}", documentId);

        activityEventPublisher.publish(ActivityEvent.builder()
                .projectId(projectId)
                .userId(userId)
                .action("HARD_DELETE_FILE")
                .targetName(fileName)
                .build());
    }

    public String getPreviewUrl(Long documentId) {
        // 1. Kiểm tra quyền Đọc (VIEWER, EDITOR, OWNER đều được phép)
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireReadAccess(documentId, userId);

        // 2. Tìm tài liệu trong Database
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        // 3. Trích xuất S3 Key từ S3 URL đang lưu
        String s3Key = extractS3KeyFromUrl(document.getS3Url());

        // 4. Tạo URL có hiệu lực trong vòng 5 phút (tùy chỉnh số phút theo ý bạn)
        int expirationMinutes = 5;
        return s3StorageService.generatePresignedUrl(s3Key, expirationMinutes);
    }

    public InputStream downloadFileStream(Long documentId) {
        // Verify the current user is at least a project member (VIEWER+)
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireReadAccess(documentId, userId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        String s3Key = extractS3KeyFromUrl(document.getS3Url());
        return s3StorageService.downloadFile(s3Key);
    }

    /**
     * Delete all documents belonging to a project.
     * Called internally when a project is deleted (cascade delete).
     * Deletes files from S3 first, then removes records from DB.
     *
     * @param projectId the project ID whose documents should be deleted
     * @return the number of documents deleted
     */
    @Transactional
    public int deleteAllDocumentsByProject(Long projectId) {
        List<Document> documents = documentRepository.findByProjectId(projectId);
        if (documents.isEmpty()) {
            log.info("No documents found for project {}, nothing to delete", projectId);
            return 0;
        }

        // Delete files from S3
        for (Document document : documents) {
            try {
                String s3Key = extractS3KeyFromUrl(document.getS3Url());
                s3StorageService.deleteFile(s3Key);
                log.info("Deleted S3 file for document {}: {}", document.getId(), s3Key);
            } catch (Exception e) {
                log.error("Error deleting S3 file for document {}, proceeding with DB deletion: {}",
                        document.getId(), e.getMessage());
            }
        }

        // Delete all document records from DB
        int count = documents.size();
        documentRepository.deleteByProjectId(projectId);
        log.info("Deleted {} document records from DB for project {}", count, projectId);
        return count;
    }

    private String generateS3Key(Long projectId, String fileName) {
        String random = UUID.randomUUID().toString().substring(0, 8);
        return String.format("projects/%d/%s-%s", projectId, random, fileName);
    }

    private String extractS3KeyFromUrl(String s3Url) {
        if (s3Url == null) {
            return null;
        }

        try {
            String marker = ".amazonaws.com/";
            int markerIndex = s3Url.indexOf(marker);
            String extractedKey;

            if (markerIndex != -1) {
                extractedKey = s3Url.substring(markerIndex + marker.length());
            } else {
                extractedKey = s3Url.substring(Math.max(s3Url.lastIndexOf('/') + 1, 0));
            }

            return java.net.URLDecoder.decode(extractedKey, java.nio.charset.StandardCharsets.UTF_8.name());

        } catch (Exception e) {
            log.error("Lỗi khi giải mã S3 Key từ URL: {}", s3Url, e);
            return s3Url;
        }
    }

    /**
     * Fetch the storage limit for a project from kbase-project-service.
     * Falls back to 1 GB default if the remote call fails.
     */
    private long resolveStorageLimit(Long projectId) {
        try {
            ProjectInfoResponse response = projectServiceClient.getProjectInfo(projectId);
            if (response != null && response.getData() != null && response.getData().getStorageLimit() != null) {
                return response.getData().getStorageLimit();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch storage limit for project {}, using default 1 GB: {}", projectId, e.getMessage());
        }
        return 1_073_741_824L; // 1 GB default fallback
    }
}
