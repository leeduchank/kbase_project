package com.kbase.auth.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;

@Slf4j
@Component
public class SqsEventPublisher {

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;

    @Value("${aws.sqs.user-events-queue-url}")
    private String userEventsQueueUrl;

    public SqsEventPublisher(SqsClient sqsClient, ObjectMapper objectMapper) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
    }

    public void publishUserDeletedEvent(UserDeletedEvent event) {
        try {
            String messageBody = objectMapper.writeValueAsString(event);

            SendMessageRequest sendMessageRequest = SendMessageRequest.builder()
                    .queueUrl(userEventsQueueUrl)
                    .messageBody(messageBody)
                    .build();

            SendMessageResponse response = sqsClient.sendMessage(sendMessageRequest);
            log.info("Published USER_DELETED event to SQS for userId: {}, messageId: {}",
                    event.getUserId(), response.messageId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize UserDeletedEvent: {}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to publish USER_DELETED event to SQS for userId: {}: {}",
                    event.getUserId(), e.getMessage(), e);
        }
    }
}
