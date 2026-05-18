package com.kbase.project.service;

import com.kbase.project.dto.ActivityEvent;
import com.kbase.project.entity.Activity;
import com.kbase.project.repository.ActivityRepository;
import io.awspring.cloud.sqs.operations.SqsTemplate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceTest {

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private SqsTemplate sqsTemplate;

    @InjectMocks
    private ActivityLogService activityLogService;

    @Test
    void logActivityEventSendsMessageToConfiguredQueue() {
        ReflectionTestUtils.setField(activityLogService, "activityQueueName", "activity-events");
        ActivityEvent event = ActivityEvent.builder()
                .projectId(1L)
                .userId("user-1")
                .action("UPLOAD_FILE")
                .targetName("doc.pdf")
                .build();

        activityLogService.logActivityEvent(event);

        verify(sqsTemplate).send("activity-events", event);
    }

    @Test
    void saveActivityMapsEventToEntity() {
        ActivityEvent event = ActivityEvent.builder()
                .projectId(1L)
                .userId("user-1")
                .action("UPLOAD_FILE")
                .targetName("doc.pdf")
                .build();

        activityLogService.saveActivity(event);

        ArgumentCaptor<Activity> captor = ArgumentCaptor.forClass(Activity.class);
        verify(activityRepository).save(captor.capture());
        assertThat(captor.getValue().getProjectId()).isEqualTo(1L);
        assertThat(captor.getValue().getAction()).isEqualTo("UPLOAD_FILE");
    }

    @Test
    void getProjectActivitiesUsesDocumentActionsOnly() {
        when(activityRepository.findByProjectIdAndActionInOrderByCreatedAtDesc(1L,
                List.of("UPLOAD_FILE", "DELETE_FILE", "EDIT_FILE"))).thenReturn(List.of());

        assertThat(activityLogService.getProjectActivities(1L)).isEmpty();
    }
}
