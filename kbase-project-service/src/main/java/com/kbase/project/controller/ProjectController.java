package com.kbase.project.controller;

import com.kbase.project.dto.ApiResponse;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.service.ProjectService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectDto>> createProject(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestHeader("X-User-Id") String userId) {

        log.info("Create project request: {}", name);
        ProjectDto project = projectService.createProject(name, description, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Project created successfully", project));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectDto>> getProject(@PathVariable Long id) {
        ProjectDto project = projectService.getProject(id);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getProjectsByOwner(@PathVariable String ownerId) {
        List<ProjectDto> projects = projectService.getProjectsByOwner(ownerId);
        return ResponseEntity.ok(ApiResponse.success(projects));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectDto>> updateProject(
            @PathVariable Long id,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String description) {

        log.info("Update project request: {}", id);
        ProjectDto project = projectService.updateProject(id, name, description);
        return ResponseEntity.ok(ApiResponse.success("Project updated successfully", project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable Long id) {
        log.info("Delete project request: {}", id);
        projectService.deleteProject(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully", null));
    }
}
