package com.kbase.project.service;

import com.kbase.project.entity.InvitationStatus;
import com.kbase.project.entity.Notification;
import com.kbase.project.entity.Project;
import com.kbase.project.entity.ProjectInvitation;
import com.kbase.project.repository.ProjectInvitationRepository;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectInvitationServiceTest {

    @Mock
    private ProjectInvitationRepository invitationRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMemberRepository memberRepository;

    @Mock
    private ActivityLogService activityLogService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ProjectInvitationService invitationService;

    @Test
    void createInvitationSavesPendingInvitationAndLogsActivity() {
        Project project = Project.builder().id(5L).name("KBase").build();
        when(projectRepository.findById(5L)).thenReturn(Optional.of(project));
        when(invitationRepository.existsByProjectIdAndInviteeEmailAndStatus(5L, "user@example.com", InvitationStatus.PENDING))
                .thenReturn(false);
        when(invitationRepository.save(any(ProjectInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectInvitation invitation = invitationService.createInvitation(5L, "owner-1", "user@example.com");

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(invitation.getInviteeEmail()).isEqualTo("user@example.com");
        verify(activityLogService).logActivityEvent(any());
    }

    @Test
    void createInvitationRejectsDuplicatePendingInvite() {
        Project project = Project.builder().id(5L).name("KBase").build();
        when(projectRepository.findById(5L)).thenReturn(Optional.of(project));
        when(invitationRepository.existsByProjectIdAndInviteeEmailAndStatus(5L, "user@example.com", InvitationStatus.PENDING))
                .thenReturn(true);

        assertThatThrownBy(() -> invitationService.createInvitation(5L, "owner-1", "user@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already pending");
    }

    @Test
    void revokeInvitationDeletesPendingInvitationForProject() {
        Project project = Project.builder().id(5L).name("KBase").build();
        ProjectInvitation invitation = ProjectInvitation.builder()
                .id(9L)
                .project(project)
                .status(InvitationStatus.PENDING)
                .build();
        when(invitationRepository.findById(9L)).thenReturn(Optional.of(invitation));

        invitationService.revokeInvitation(5L, 9L);

        verify(invitationRepository).delete(invitation);
    }

    @Test
    void acceptInvitationAddsViewerWhenUserIsNotAlreadyMember() {
        Project project = Project.builder().id(5L).name("KBase").build();
        ProjectInvitation invitation = ProjectInvitation.builder()
                .id(9L)
                .project(project)
                .inviterId("owner-1")
                .inviteeEmail("user@example.com")
                .status(InvitationStatus.PENDING)
                .build();
        when(invitationRepository.findById(9L)).thenReturn(Optional.of(invitation));
        when(memberRepository.existsByProject_IdAndMemberId(5L, "user-2")).thenReturn(false);

        invitationService.acceptInvitation(9L, "user-2", "USER@example.com");

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        verify(invitationRepository).save(invitation);
        verify(memberRepository).save(any());
        verify(activityLogService).logActivityEvent(any());

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationService).createAndPushNotification(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo("INVITATION_ACCEPTED");
    }

    @Test
    void rejectInvitationUpdatesStatusAndNotifiesInviter() {
        Project project = Project.builder().id(5L).name("KBase").build();
        ProjectInvitation invitation = ProjectInvitation.builder()
                .id(9L)
                .project(project)
                .inviterId("owner-1")
                .inviteeEmail("user@example.com")
                .status(InvitationStatus.PENDING)
                .build();
        when(invitationRepository.findById(9L)).thenReturn(Optional.of(invitation));

        invitationService.rejectInvitation(9L, "user@example.com");

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.REJECTED);
        verify(invitationRepository).save(invitation);
        verify(notificationService).createAndPushNotification(any(Notification.class));
    }

    @Test
    void acceptInvitationRejectsWrongEmail() {
        ProjectInvitation invitation = ProjectInvitation.builder()
                .id(9L)
                .inviteeEmail("user@example.com")
                .status(InvitationStatus.PENDING)
                .build();
        when(invitationRepository.findById(9L)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> invitationService.acceptInvitation(9L, "user-2", "other@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("not authorized");

        verify(invitationRepository, never()).save(any());
    }
}
