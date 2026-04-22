package com.kbase.storage.service;

import com.kbase.storage.exception.ResourceNotFoundException;
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

    public FileStorageService(DocumentRepository documentRepository,
                              S3StorageService s3StorageService,
                              StoragePermissionService storagePermissionService) {
        this.documentRepository = documentRepository;
        this.s3StorageService = s3StorageService;
        this.storagePermissionService = storagePermissionService;
    }

    public DocumentDto uploadFile(MultipartFile file, Long projectId, String uploadedBy) {
        try {
            String fileName = file.getOriginalFilename();
            String fileType = file.getContentType();
            long fileSize = file.getSize();

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
        return documentRepository.findByProjectId(projectId)
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

    public void deleteDocument(Long documentId) {
        // Only OWNER or EDITOR may delete documents
        String userId = SecurityUtils.getCurrentUserId();
        storagePermissionService.requireWriteAccess(documentId, userId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        String s3Key = extractS3KeyFromUrl(document.getS3Url());

        try {
            s3StorageService.deleteFile(s3Key);
        } catch (Exception e) {
            log.error("Error deleting file from S3, but proceeding with database deletion: {}", e.getMessage());
        }

        documentRepository.delete(document);
        log.info("Document deleted successfully: {}", documentId);
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

    private String generateS3Key(Long projectId, String fileName) {
        String random = UUID.randomUUID().toString().substring(0, 8);
        return String.format("projects/%d/%s-%s", projectId, random, fileName);
    }

    private String extractS3KeyFromUrl(String s3Url) {
        if (s3Url == null) {
            return null;
        }
        String marker = ".amazonaws.com/";
        int markerIndex = s3Url.indexOf(marker);
        if (markerIndex != -1) {
            return s3Url.substring(markerIndex + marker.length());
        }
        return s3Url.substring(Math.max(s3Url.lastIndexOf('/') + 1, 0));
    }
}
