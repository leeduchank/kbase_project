package com.kbase.project.controller;

import com.kbase.project.dto.*;
import com.kbase.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/projects")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Projects", description = "Create projects, view owned projects, manage project members, and transfer ownership.")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    @Operation(summary = "Create project", description = "Creates a new project owned by the authenticated user.")
    public ResponseEntity<ApiResponse<ProjectDto>> createProject(
            @Valid @RequestBody CreateProjectRequest request) {

        log.info("Create project request: {}", request.getName());
        ProjectDto project = projectService.createProject(request.getName(), request.getDescription());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Project created successfully", project));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project", description = "Returns project details for a project the authenticated user can access.")
    public ResponseEntity<ApiResponse<ProjectDto>> getProject(@PathVariable Long id) {
        ProjectDto project = projectService.getProject(id);
        return ResponseEntity.ok(ApiResponse.success(project));
    }

    @GetMapping
    @Operation(summary = "List my projects", description = "Returns all projects where the authenticated user is the owner or a member.")
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getAllProjects() {
        List<ProjectDto> projectList = projectService.getAllMyProjects();
        return ResponseEntity.ok(ApiResponse.success(projectList));
    }

    @GetMapping("/owner/{ownerId}")
    @Operation(summary = "List projects by owner", description = "Returns projects created by the specified owner ID.")
    public ResponseEntity<ApiResponse<List<ProjectDto>>> getProjectsByOwner(@PathVariable String ownerId) {
        List<ProjectDto> projects = projectService.getProjectsByOwner(ownerId);
        return ResponseEntity.ok(ApiResponse.success(projects));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update project", description = "Updates the project name and description.")
    public ResponseEntity<ApiResponse<ProjectDto>> updateProject(
            @PathVariable Long id,
            @RequestBody UpdateProjectRequest request) {

        log.info("Update project request: {}", id);
        ProjectDto project = projectService.updateProject(id, request.getName(), request.getDescription());
        return ResponseEntity.ok(ApiResponse.success("Project updated successfully", project));
    }

    @PostMapping("/{id}/members")
    @Operation(summary = "Add project member", description = "Adds a user to a project with the requested role.")
    public ResponseEntity<ApiResponse<Void>> addProjectMember(
            @PathVariable Long id,
            @RequestBody AddProjectMemberRequest request) {

        log.info("Add project member request: {} -> {}", id, request.getMemberId());
        projectService.addMember(id, request.getMemberId(), request.getRole());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Member added to project successfully", null));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete project", description = "Deletes a project and its related resources.")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable Long id) {
        log.info("Delete project request: {}", id);
        projectService.deleteProject(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully", null));
    }

    @GetMapping("/{id}/members")
    @Operation(summary = "List project members", description = "Returns all members and roles for the selected project.")
    public ResponseEntity<ApiResponse<List<ProjectMemberDto>>> getProjectMembers(@PathVariable Long id) {
        log.info("Get members for project: {}", id);
        List<ProjectMemberDto> members = projectService.getProjectMembers(id);
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PatchMapping("/{id}/members/{memberId}")
    @Operation(summary = "Update member role", description = "Changes a project member's role, such as OWNER, EDITOR, or VIEWER.")
    public ResponseEntity<ApiResponse<Void>> updateProjectMemberRole(
            @PathVariable Long id,
            @PathVariable String memberId,
            @RequestBody UpdateProjectMemberRoleRequest request) {

        log.info("Update role for member: {} in project: {} to {}", memberId, id, request.getRole());
        projectService.updateMemberRole(id, memberId, request.getRole());

        return ResponseEntity.ok(ApiResponse.success("Member role updated successfully", null));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    @Operation(summary = "Remove project member", description = "Removes a member from the selected project.")
    public ResponseEntity<ApiResponse<Void>> removeProjectMember(
            @PathVariable Long id,
            @PathVariable String memberId) {

        log.info("Remove member: {} from project: {}", memberId, id);
        projectService.removeMember(id, memberId);

        return ResponseEntity.ok(ApiResponse.success("Member removed successfully", null));
    }

    @PostMapping("/{id}/transfer")
    @Operation(summary = "Transfer project ownership", description = "Transfers ownership of a project to another user.")
    public ResponseEntity<ApiResponse<Void>> transferOwnership(
            @PathVariable Long id,
            @RequestParam String newOwnerId) {

        log.info("Transfer ownership request: project={}, newOwner={}", id, newOwnerId);
        projectService.transferOwnership(id, newOwnerId);

        return ResponseEntity.ok(ApiResponse.success("Project ownership transferred successfully", null));
    }

}
