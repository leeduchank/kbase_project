package com.kbase.project.service;

import com.kbase.project.dto.ActivityEvent;
import com.kbase.project.entity.Activity;
import com.kbase.project.repository.ActivityRepository;
import io.awspring.cloud.sqs.operations.SqsTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogService {

    private final ActivityRepository activityRepository;
    private final SqsTemplate sqsTemplate;

    @Value("${aws.sqs.activity-queue-name}")
    private String activityQueueName;

    // Các Service khác sẽ gọi hàm này để bắn message vào SQS
    public void logActivityEvent(ActivityEvent event) {
        log.info("Sending activity event to SQS: {}", event);
        sqsTemplate.send(activityQueueName, event);
    }

    // Consumer SQS sẽ gọi hàm này để lưu vào DB
    public void saveActivity(ActivityEvent event) {
        Activity activity = Activity.builder()
                .projectId(event.getProjectId())
                .userId(event.getUserId())
                .action(event.getAction())
                .targetName(event.getTargetName())
                .build();
        activityRepository.save(activity);
    }

    public List<Activity> getProjectActivities(Long projectId) {
        return activityRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}
