package com.kbase.project.controller;

import com.kbase.project.client.AuthServiceWrapper;
import com.kbase.project.client.dto.UserInternalDTO;
import com.kbase.project.dto.ApiResponse;
import com.kbase.project.entity.ProjectInvitation;
import com.kbase.project.security.ProjectMemberRole;
import com.kbase.project.security.RequireProjectRole;
import com.kbase.project.security.SecurityUtils;
import com.kbase.project.service.ProjectInvitationService;
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
public class ProjectInvitationController {

    private final ProjectInvitationService invitationService;
    private final AuthServiceWrapper authServiceWrapper;

    @PostMapping("/projects/{id}/invitations")
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

    @GetMapping("/projects/invitations/me")
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
