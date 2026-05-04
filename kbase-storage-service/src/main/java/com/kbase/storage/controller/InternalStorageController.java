package com.kbase.storage.controller;

import com.kbase.storage.dto.ApiResponse;
import com.kbase.storage.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Internal endpoints for service-to-service communication.
 * These endpoints are NOT exposed through the API Gateway.
 * Security is enforced at the network level (only internal services can reach this).
 */
@Slf4j
@RestController
@RequestMapping("/storage/internal")
public class InternalStorageController {

    private final FileStorageService fileStorageService;

    public InternalStorageController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    /**
     * Delete all documents belonging to a project.
     * Called by project-service when a project is deleted (cascade delete).
     */
    @DeleteMapping("/projects/{projectId}/documents")
    public ResponseEntity<ApiResponse<Void>> deleteAllDocumentsByProject(@PathVariable Long projectId) {
        log.info("Internal request: delete all documents for project {}", projectId);
        int deletedCount = fileStorageService.deleteAllDocumentsByProject(projectId);
        String message = String.format("Deleted %d documents for project %d", deletedCount, projectId);
        log.info(message);
        return ResponseEntity.ok(ApiResponse.success(message, null));
    }
}
