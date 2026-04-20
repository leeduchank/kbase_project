package com.kbase.project.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.service.ProjectMemberService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import java.util.List;

@Slf4j
@Component
public class SqsEventListener {

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;
    private final ProjectMemberService projectMemberService;

    @Value("${aws.sqs.user-events-queue-url}")
    private String userEventsQueueUrl;

    public SqsEventListener(SqsClient sqsClient, ObjectMapper objectMapper,
                            ProjectMemberService projectMemberService) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
        this.projectMemberService = projectMemberService;
    }

    /**
     * Polls SQS every 10 seconds for USER_DELETED events.
     * When a user is deleted, removes all their project memberships.
     */
    @Scheduled(fixedDelay = 10000)
    public void pollUserEvents() {
        try {
            ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
                    .queueUrl(userEventsQueueUrl)
                    .maxNumberOfMessages(10)
                    .waitTimeSeconds(5)
                    .build();

            ReceiveMessageResponse response = sqsClient.receiveMessage(receiveRequest);
            List<Message> messages = response.messages();

            for (Message message : messages) {
                processMessage(message);
            }
        } catch (Exception e) {
            log.error("Error polling SQS for user events: {}", e.getMessage(), e);
        }
    }

    private void processMessage(Message message) {
        try {
            UserDeletedEvent event = objectMapper.readValue(message.body(), UserDeletedEvent.class);

            if ("USER_DELETED".equals(event.getEventType())) {
                String userId = event.getUserId();

                log.info("Bắt đầu xử lý Event xóa dữ liệu cho User ID: {}", userId);

                projectMemberService.deleteAllUserData(userId);

                log.info("Hoàn thành xử lý Event xóa dữ liệu cho User ID: {}", userId);
            }

            DeleteMessageRequest deleteRequest = DeleteMessageRequest.builder()
                    .queueUrl(userEventsQueueUrl)
                    .receiptHandle(message.receiptHandle())
                    .build();
            sqsClient.deleteMessage(deleteRequest);
            log.debug("Đã xóa tin nhắn khỏi hàng đợi SQS.");

        } catch (Exception e) {

            log.error("Lỗi khi xử lý SQS message: {}", e.getMessage(), e);
        }
    }
}
