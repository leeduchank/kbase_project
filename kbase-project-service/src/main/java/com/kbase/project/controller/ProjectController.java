package com.kbase.project.controller;

import com.kbase.project.dto.AddProjectMemberRequest;
import com.kbase.project.dto.ApiResponse;
import com.kbase.project.dto.CreateProjectRequest;
import com.kbase.project.dto.ProjectDto;
import com.kbase.project.dto.UpdateProjectRequest;
import com.kbase.project.service.ProjectService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/projects")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectDto>> createProject(
            @RequestBody CreateProjectRequest request) {

        log.info("Create project request: {}", request.getName());
        ProjectDto project = projectService.createProject(request.getName(), request.getDescription());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Project created successfully", project));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectDto>> getProject(@PathVariable Long id) {
        ProjectDto project = projectService.getProject(id);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getAllProjects() {
        List<ProjectDto> projectList = projectService.getAllProjects();
        return ResponseEntity.ok(ApiResponse.success(projectList));
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getProjectsByOwner(@PathVariable String ownerId) {
        List<ProjectDto> projects = projectService.getProjectsByOwner(ownerId);
        return ResponseEntity.ok(ApiResponse.success(projects));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectDto>> updateProject(
            @PathVariable Long id,
            @RequestBody UpdateProjectRequest request) {

        log.info("Update project request: {}", id);
        ProjectDto project = projectService.updateProject(id, request.getName(), request.getDescription());
        return ResponseEntity.ok(ApiResponse.success("Project updated successfully", project));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ApiResponse<Void>> addProjectMember(
            @PathVariable Long id,
            @RequestBody AddProjectMemberRequest request) {

        log.info("Add project member request: {} -> {}", id, request.getMemberId());
        projectService.addMember(id, request.getMemberId(), request.getRole());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Member added to project successfully", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable Long id) {
        log.info("Delete project request: {}", id);
        projectService.deleteProject(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully", null));
    }
}
