package com.kbase.project.controller;

import com.kbase.project.dto.*;
import com.kbase.project.service.ProjectService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectDto>> createProject(
            @Valid @RequestBody CreateProjectRequest request) {

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
        List<ProjectDto> projectList = projectService.getAllMyProjects();
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

    @GetMapping("/{id}/members")
    public ResponseEntity<ApiResponse<List<ProjectMemberDto>>> getProjectMembers(@PathVariable Long id) {
        log.info("Get members for project: {}", id);
        List<ProjectMemberDto> members = projectService.getProjectMembers(id);
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PatchMapping("/{id}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> updateProjectMemberRole(
            @PathVariable Long id,
            @PathVariable String memberId,
            @RequestBody UpdateProjectMemberRoleRequest request) {

        log.info("Update role for member: {} in project: {} to {}", memberId, id, request.getRole());
        projectService.updateMemberRole(id, memberId, request.getRole());

        return ResponseEntity.ok(ApiResponse.success("Member role updated successfully", null));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> removeProjectMember(
            @PathVariable Long id,
            @PathVariable String memberId) {

        log.info("Remove member: {} from project: {}", memberId, id);
        projectService.removeMember(id, memberId);

        return ResponseEntity.ok(ApiResponse.success("Member removed successfully", null));
    }

    @PostMapping("/{id}/transfer")
    public ResponseEntity<ApiResponse<Void>> transferOwnership(
            @PathVariable Long id,
            @RequestParam String newOwnerId) {

        log.info("Transfer ownership request: project={}, newOwner={}", id, newOwnerId);
        projectService.transferOwnership(id, newOwnerId);

        return ResponseEntity.ok(ApiResponse.success("Project ownership transferred successfully", null));
    }

}
