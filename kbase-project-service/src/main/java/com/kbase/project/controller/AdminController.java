package com.kbase.project.controller;

import com.kbase.project.dto.ApiResponse;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.security.RequireSystemRole;
import com.kbase.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/admin/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Projects", description = "Administrative project operations for listing, deleting, transferring ownership, and changing storage limits.")
public class AdminController {

    private final ProjectService projectService;

    @RequireSystemRole({"ADMIN"})
    @GetMapping
    @Operation(summary = "Admin list all projects", description = "Returns every project in the system. Requires an ADMIN user.")
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getAllProjects() {
        log.info("Admin requested to get all projects");
        List<ProjectDto> projects = projectService.getAllProjects();
        return ResponseEntity.ok(ApiResponse.success("Successfully fetched all projects", projects));
    }

    @RequireSystemRole({"ADMIN"})
    @DeleteMapping("/{id}")
    @Operation(summary = "Admin delete project", description = "Deletes any project by ID regardless of project membership. Requires an ADMIN user.")
    public ResponseEntity<ApiResponse<Void>> deleteProjectAsAdmin(@PathVariable Long id) {
        log.info("Admin delete project request: {}", id);
        projectService.deleteProjectAsAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully by Admin", null));
    }

    @RequireSystemRole({"ADMIN"})
    @PostMapping("/{id}/transfer")
    @Operation(summary = "Admin transfer ownership", description = "Force transfers project ownership to another user. Requires an ADMIN user.")
    public ResponseEntity<ApiResponse<Void>> forceTransferProjectAsAdmin(
            @PathVariable Long id, 
            @RequestParam String newOwnerId) {
        log.info("Admin force transfer project request: project={}, newOwner={}", id, newOwnerId);
        projectService.transferOwnershipAsAdmin(id, newOwnerId);
        return ResponseEntity.ok(ApiResponse.success("Project ownership forcefully transferred by Admin", null));
    }

    @RequireSystemRole({"ADMIN"})
    @PatchMapping("/{id}/storage-limit")
    @Operation(summary = "Admin update storage limit", description = "Changes the storage quota for a project. Requires an ADMIN user.")
    public ResponseEntity<ApiResponse<ProjectDto>> updateStorageLimit(
            @PathVariable Long id,
            @RequestParam Long storageLimit) {
        log.info("Admin update storage limit: project={}, newLimit={}", id, storageLimit);
        ProjectDto updated = projectService.updateStorageLimitAsAdmin(id, storageLimit);
        return ResponseEntity.ok(ApiResponse.success("Storage limit updated successfully", updated));
    }
}
