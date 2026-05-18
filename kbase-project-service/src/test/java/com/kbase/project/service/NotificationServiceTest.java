package com.kbase.project.service;

import com.kbase.project.dto.ActivityEvent;
import com.kbase.project.entity.Notification;
import com.kbase.project.entity.Project;
import com.kbase.project.entity.ProjectMember;
import com.kbase.project.repository.NotificationRepository;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import com.kbase.project.security.ProjectMemberRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private SseEmitterService sseEmitterService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void createDocumentNotificationsNotifiesOtherProjectMembersOnly() {
        ActivityEvent event = ActivityEvent.builder()
                .projectId(7L)
                .userId("uploader")
                .action("UPLOAD_FILE")
                .targetName("brief.pdf")
                .build();
        Project project = Project.builder().id(7L).name("Knowledge Base").build();
        ProjectMember uploader = ProjectMember.builder()
                .memberId("uploader")
                .role(ProjectMemberRole.EDITOR)
                .project(project)
                .build();
        ProjectMember viewer = ProjectMember.builder()
                .memberId("viewer")
                .role(ProjectMemberRole.VIEWER)
                .project(project)
                .build();

        when(projectRepository.findById(7L)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProject_Id(7L)).thenReturn(List.of(uploader, viewer));
        when(notificationRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(notificationRepository.countByUserIdAndIsRead("viewer", false)).thenReturn(1L);

        notificationService.createDocumentNotifications(event);

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
        Notification notification = captor.getValue().get(0);
        assertThat(notification.getUserId()).isEqualTo("viewer");
        assertThat(notification.getType()).isEqualTo("DOC_UPLOAD");
        assertThat(notification.getReferenceId()).isEqualTo("7");
        assertThat(notification.getMessage()).contains("brief.pdf", "Knowledge Base");

        verify(sseEmitterService).sendToUser("viewer", notification);
        verify(sseEmitterService).sendCountUpdate("viewer", 1L);
    }

    @Test
    void createDocumentNotificationsIgnoresUnsupportedActions() {
        ActivityEvent event = ActivityEvent.builder()
                .projectId(7L)
                .userId("user")
                .action("VIEW_FILE")
                .targetName("brief.pdf")
                .build();

        notificationService.createDocumentNotifications(event);

        verify(projectRepository, never()).findById(7L);
        verify(notificationRepository, never()).saveAll(anyList());
    }
}
