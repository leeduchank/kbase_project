package com.kbase.project.service;

import com.kbase.project.dto.ActivityEvent;
import com.kbase.project.entity.InvitationStatus;
import com.kbase.project.entity.Project;
import com.kbase.project.entity.ProjectInvitation;
import com.kbase.project.entity.ProjectMember;
import com.kbase.project.repository.ProjectInvitationRepository;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import com.kbase.project.security.ProjectMemberRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectInvitationService {

    private final ProjectInvitationRepository invitationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ActivityLogService activityLogService;

    @Transactional
    public ProjectInvitation createInvitation(Long projectId, String inviterId, String inviteeEmail) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + projectId));

        // Kiểm tra xem đã có lời mời PENDING nào chưa
        if (invitationRepository.existsByProjectIdAndInviteeEmailAndStatus(projectId, inviteeEmail, InvitationStatus.PENDING)) {
            throw new RuntimeException("An invitation to this email is already pending.");
        }

        ProjectInvitation invitation = ProjectInvitation.builder()
                .project(project)
                .inviterId(inviterId)
                .inviteeEmail(inviteeEmail)
                .status(InvitationStatus.PENDING)
                .build();

        ProjectInvitation savedInvitation = invitationRepository.save(invitation);

        // Bắn Activity event vào SQS (không block luồng chính)
        try {
            activityLogService.logActivityEvent(ActivityEvent.builder()
                    .projectId(projectId)
                    .userId(inviterId)
                    .action("INVITE_MEMBER")
                    .targetName(inviteeEmail)
                    .build());
        } catch (Exception e) {
            log.error("Lỗi khi gửi INVITE_MEMBER event vào SQS: {}", e.getMessage(), e);
        }

        return savedInvitation;
    }

    public List<ProjectInvitation> getMyPendingInvitations(String userEmail) {
        return invitationRepository.findByInviteeEmailAndStatusOrderByCreatedAtDesc(userEmail, InvitationStatus.PENDING);
    }

    @Transactional
    public void acceptInvitation(Long invitationId, String userId, String userEmail) {
        ProjectInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));

        if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
            throw new RuntimeException("You are not authorized to accept this invitation.");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Invitation is no longer pending.");
        }

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        Project project = invitation.getProject();

        boolean isAlreadyMember = memberRepository.existsByProject_IdAndMemberId(project.getId(), userId);
        if (!isAlreadyMember) {
            ProjectMember newMember = ProjectMember.builder()
                    .project(project)
                    .memberId(userId)
                    .role(ProjectMemberRole.VIEWER) // Mặc định là VIEWER
                    .build();
            memberRepository.save(newMember);

            // Bắn Activity log "User đã join project" (không block luồng chính)
            try {
                activityLogService.logActivityEvent(ActivityEvent.builder()
                        .projectId(project.getId())
                        .userId(userId)
                        .action("JOIN_PROJECT")
                        .targetName(project.getName())
                        .build());
            } catch (Exception e) {
                log.error("Lỗi khi gửi JOIN_PROJECT event vào SQS: {}", e.getMessage(), e);
            }
        }
    }
    @Transactional
    public void rejectInvitation(Long invitationId, String userEmail) {
        ProjectInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));

        if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
            throw new RuntimeException("You are not authorized to reject this invitation.");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Invitation is no longer pending.");
        }

        invitation.setStatus(InvitationStatus.REJECTED);
        invitationRepository.save(invitation);
    }
}
