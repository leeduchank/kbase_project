package com.kbase.storage.controller;

import com.kbase.storage.dto.ApiResponse;
import com.kbase.storage.dto.DocumentDto;
import com.kbase.storage.security.ProjectMemberRole;
import com.kbase.storage.security.RequireProjectRole;
import com.kbase.storage.security.SecurityUtils;
import com.kbase.storage.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final FileStorageService fileStorageService;

    public StorageController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    /**
     * Upload a file to a project.
     * Requires OWNER or EDITOR role within the project.
     * projectId is at arg index 1 (after file).
     */
    @PostMapping("/projects/{projectId}/upload")
    @RequireProjectRole(value = {ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR}, projectIdArgIndex = 0)
    public ResponseEntity<ApiResponse<DocumentDto>> uploadFile(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file) {

        String userId = SecurityUtils.getCurrentUserId();
        log.info("Upload request: file={}, projectId={}, userId={}", file.getOriginalFilename(), projectId, userId);

        DocumentDto documentDto = fileStorageService.uploadFile(file, projectId, userId);
        return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", documentDto));
    }

    /**
     * Download a file by document ID.
     * Any authenticated project member (OWNER, EDITOR, VIEWER) may download.
     * Note: membership check is done at the document level via projectId stored in DB.
     */
    @GetMapping("/documents/{id}/download")
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable Long id) throws IOException {
        log.info("Download request: documentId={}", id);

        DocumentDto document = fileStorageService.getDocument(id);
        InputStream inputStream = fileStorageService.downloadFileStream(id);
        String contentType = document.getFileType() != null
                ? document.getFileType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(document.getFileSize())
                .body(new InputStreamResource(inputStream));
    }

    /**
     * Get metadata of a single document.
     * Any authenticated user may view (ownership verified at service level).
     */
    @GetMapping("/documents/{id}")
    public ResponseEntity<ApiResponse<DocumentDto>> getDocument(@PathVariable Long id) {
        DocumentDto document = fileStorageService.getDocument(id);
        return ResponseEntity.ok(ApiResponse.success(document));
    }

    /**
     * List all documents of a project.
     * Requires at least VIEWER role within the project.
     */
    @GetMapping("/projects/{projectId}/documents")
    @RequireProjectRole(value = {ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR, ProjectMemberRole.VIEWER}, projectIdArgIndex = 0)
    public ResponseEntity<ApiResponse<List<DocumentDto>>> getProjectDocuments(@PathVariable Long projectId) {
        List<DocumentDto> documents = fileStorageService.getDocumentsByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(documents));
    }

    /**
     * List all documents uploaded by the currently authenticated user.
     */
    @GetMapping("/documents/me")
    public ResponseEntity<ApiResponse<List<DocumentDto>>> getMyDocuments() {
        String userId = SecurityUtils.getCurrentUserId();
        List<DocumentDto> documents = fileStorageService.getDocumentsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(documents));
    }

    /**
     * Delete a document.
     * Requires OWNER role within the project the document belongs to.
     * Project membership check is enforced at the service layer.
     */
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        log.info("Delete request: documentId={}, userId={}", id, userId);
        fileStorageService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }
}
