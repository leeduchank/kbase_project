package com.kbase.project.controller;

import com.kbase.project.dto.ApiResponse;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.security.RequireSystemRole;
import com.kbase.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/admin/projects")
@RequiredArgsConstructor
public class AdminController {

    private final ProjectService projectService;

    @RequireSystemRole({"ADMIN"})
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getAllProjects() {
        log.info("Admin requested to get all projects");
        List<ProjectDto> projects = projectService.getAllProjects();
        return ResponseEntity.ok(ApiResponse.success("Successfully fetched all projects", projects));
    }

    @RequireSystemRole({"ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProjectAsAdmin(@PathVariable Long id) {
        log.info("Admin delete project request: {}", id);
        projectService.deleteProjectAsAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully by Admin", null));
    }

    @RequireSystemRole({"ADMIN"})
    @PostMapping("/{id}/transfer")
    public ResponseEntity<ApiResponse<Void>> forceTransferProjectAsAdmin(
            @PathVariable Long id, 
            @RequestParam String newOwnerId) {
        log.info("Admin force transfer project request: project={}, newOwner={}", id, newOwnerId);
        projectService.transferOwnershipAsAdmin(id, newOwnerId);
        return ResponseEntity.ok(ApiResponse.success("Project ownership forcefully transferred by Admin", null));
    }
}
