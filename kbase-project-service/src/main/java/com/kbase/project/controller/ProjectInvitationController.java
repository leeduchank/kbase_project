package com.kbase.project.controller;

import com.kbase.project.client.AuthServiceWrapper;
import com.kbase.project.client.dto.UserInternalDTO;
import com.kbase.project.dto.ApiResponse;
import com.kbase.project.entity.ProjectInvitation;
import com.kbase.project.security.ProjectMemberRole;
import com.kbase.project.security.RequireProjectRole;
import com.kbase.project.security.SecurityUtils;
import com.kbase.project.service.ProjectInvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Project Invitations", description = "Invite users to projects and accept, reject, view, or revoke pending invitations.")
public class ProjectInvitationController {

    private final ProjectInvitationService invitationService;
    private final AuthServiceWrapper authServiceWrapper;

    @PostMapping("/projects/{id}/invitations")
    @Operation(summary = "Invite a member", description = "Sends a project invitation to a user email address. The caller must be a project owner.")
    @RequireProjectRole(value = { ProjectMemberRole.OWNER }, projectIdArgIndex = 0)
    public ResponseEntity<ApiResponse<ProjectInvitation>> inviteMember(
            @PathVariable Long id,
            @RequestBody InviteRequest request) {

        String inviterId = SecurityUtils.getCurrentUserId();
        log.info("User {} invites {} to project {}", inviterId, request.getEmail(), id);
        
        ProjectInvitation invitation = invitationService.createInvitation(id, inviterId, request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi lời mời thành công", invitation));
    }

    @GetMapping("/projects/{id}/invitations/pending")
    @Operation(summary = "List project pending invitations", description = "Returns pending invitations for a project.")
    @RequireProjectRole(value = { ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR }, projectIdArgIndex = 0)
    public ResponseEntity<ApiResponse<List<ProjectInvitation>>> getProjectPendingInvitations(@PathVariable Long id) {
        List<ProjectInvitation> invitations = invitationService.getProjectPendingInvitations(id);
        return ResponseEntity.ok(ApiResponse.success(invitations));
    }

    @DeleteMapping("/projects/{id}/invitations/{invitationId}")
    @Operation(summary = "Revoke invitation", description = "Cancels a pending invitation for the selected project.")
    @RequireProjectRole(value = { ProjectMemberRole.OWNER }, projectIdArgIndex = 0)
    public ResponseEntity<ApiResponse<Void>> revokeInvitation(
            @PathVariable Long id,
            @PathVariable Long invitationId) {
        
        log.info("Revoke invitation {} for project {}", invitationId, id);
        invitationService.revokeInvitation(id, invitationId);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy lời mời thành công.", null));
    }

    @GetMapping("/projects/invitations/me")
    @Operation(summary = "List my invitations", description = "Returns pending project invitations for the authenticated user's email address.")
    public ResponseEntity<ApiResponse<List<ProjectInvitation>>> getMyInvitations() {
        String userId = SecurityUtils.getCurrentUserId();
        UserInternalDTO user = authServiceWrapper.getInternalUser(userId);
        
        if (user == null || user.email() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Không thể lấy thông tin user hiện tại."));
        }

        List<ProjectInvitation> invitations = invitationService.getMyPendingInvitations(user.email());
        return ResponseEntity.ok(ApiResponse.success(invitations));
    }

    @PostMapping("/projects/invitations/{invitationId}/accept")
    @Operation(summary = "Accept invitation", description = "Accepts a project invitation and adds the authenticated user as a project member.")
    public ResponseEntity<ApiResponse<Void>> acceptInvitation(@PathVariable Long invitationId) {
        String userId = SecurityUtils.getCurrentUserId();
        UserInternalDTO user = authServiceWrapper.getInternalUser(userId);
        
        if (user == null || user.email() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Không thể xác định email user."));
        }

        invitationService.acceptInvitation(invitationId, userId, user.email());
        return ResponseEntity.ok(ApiResponse.success("Đã chấp nhận lời mời tham gia dự án.", null));
    }

    @PostMapping("/projects/invitations/{invitationId}/reject")
    @Operation(summary = "Reject invitation", description = "Rejects a pending project invitation for the authenticated user.")
    public ResponseEntity<ApiResponse<Void>> rejectInvitation(@PathVariable Long invitationId) {
        String userId = SecurityUtils.getCurrentUserId();
        UserInternalDTO user = authServiceWrapper.getInternalUser(userId);
        
        if (user == null || user.email() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Không thể xác định email user."));
        }

        invitationService.rejectInvitation(invitationId, user.email());
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời.", null));
    }

    @Data
    public static class InviteRequest {
        private String email;
    }
}
