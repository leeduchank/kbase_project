package com.kbase.storage.service;

import com.kbase.storage.dto.ActivityEvent;
import io.awspring.cloud.sqs.operations.SqsTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityEventPublisher {

    private final SqsTemplate sqsTemplate;

    @Value("${aws.sqs.activity-queue-name}")
    private String activityQueueName;


    public void publish(ActivityEvent event) {
        try {
            log.info("Publishing activity event to SQS: {}", event);
            sqsTemplate.send(to -> to
                    .queue(activityQueueName)
                    .payload(event)
                    .header("JavaType", "com.kbase.project.dto.ActivityEvent")
            );
        } catch (Exception e) {
            log.error("Lỗi khi gửi activity event vào SQS (sẽ bỏ qua): {}", e.getMessage(), e);
        }
    }
}