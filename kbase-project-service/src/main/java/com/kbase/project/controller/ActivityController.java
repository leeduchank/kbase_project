package com.kbase.project.controller;

import com.kbase.project.dto.ApiResponse;
import com.kbase.project.entity.Activity;
import com.kbase.project.security.ProjectMemberRole;
import com.kbase.project.security.RequireProjectRole;
import com.kbase.project.service.ActivityLogService;
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
@RequestMapping("/projects/{id}/activities")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Project Activities", description = "View project activity history and audit-style events.")
public class ActivityController {

    private final ActivityLogService activityLogService;

    @GetMapping
    @Operation(summary = "List project activities", description = "Returns activity events for a project the authenticated user can access.")
    @RequireProjectRole(value = { ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR, ProjectMemberRole.VIEWER }, projectIdArgIndex = 0)
    public ResponseEntity<ApiResponse<List<Activity>>> getProjectActivities(@PathVariable Long id) {
        log.info("Get activities for project: {}", id);
        List<Activity> activities = activityLogService.getProjectActivities(id);
        return ResponseEntity.ok(ApiResponse.success(activities));
    }
}
