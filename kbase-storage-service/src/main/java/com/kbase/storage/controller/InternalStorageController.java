package com.kbase.storage.controller;

import com.kbase.storage.dto.ApiResponse;
import com.kbase.storage.service.FileStorageService;
import com.kbase.storage.service.TrashCleanupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Internal Storage", description = "Internal storage maintenance endpoints used by services and scheduled jobs.")
public class InternalStorageController {

    private final FileStorageService fileStorageService;
    private final TrashCleanupService trashCleanupService;

    public InternalStorageController(FileStorageService fileStorageService, TrashCleanupService trashCleanupService) {
        this.fileStorageService = fileStorageService;
        this.trashCleanupService = trashCleanupService;
    }

    /**
     * Delete all documents belonging to a project.
     * Called by project-service when a project is deleted (cascade delete).
     */
    @DeleteMapping("/projects/{projectId}/documents")
    @Operation(summary = "Delete project documents internally", description = "Deletes all documents for a project after the project service removes that project.")
    public ResponseEntity<ApiResponse<Void>> deleteAllDocumentsByProject(@PathVariable Long projectId) {
        log.info("Internal request: delete all documents for project {}", projectId);
        int deletedCount = fileStorageService.deleteAllDocumentsByProject(projectId);
        String message = String.format("Deleted %d documents for project %d", deletedCount, projectId);
        log.info(message);
        return ResponseEntity.ok(ApiResponse.success(message, null));
    }

    /**
     * Purge all documents that have been in the trash for longer than the configured retention period.
     * Triggered by an external scheduler like AWS Lambda via EventBridge.
     */
    @PostMapping("/trash/purge")
    @Operation(summary = "Purge expired trash", description = "Permanently deletes documents that have stayed in trash longer than the configured retention period.")
    public ResponseEntity<ApiResponse<Void>> purgeExpiredTrash() {
        log.info("Internal request: purge expired trash documents");
        int deletedCount = trashCleanupService.purgeExpiredTrash();
        String message = String.format("Purged %d expired documents from trash", deletedCount);
        log.info(message);
        return ResponseEntity.ok(ApiResponse.success(message, null));
    }
}
