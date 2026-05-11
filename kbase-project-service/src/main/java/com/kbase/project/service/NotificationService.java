package com.kbase.project.service;

import com.kbase.project.dto.ActivityEvent;
import com.kbase.project.entity.Notification;
import com.kbase.project.entity.Project;
import com.kbase.project.entity.ProjectMember;
import com.kbase.project.repository.NotificationRepository;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final SseEmitterService sseEmitterService;

    @Transactional
    public void createDocumentNotifications(ActivityEvent event) {
        if (!"UPLOAD_FILE".equals(event.getAction()) && !"DELETE_FILE".equals(event.getAction())) {
            return;
        }

        Project project = projectRepository.findById(event.getProjectId()).orElse(null);
        if (project == null) return;

        List<ProjectMember> members = projectMemberRepository.findByProject_Id(event.getProjectId());
        
        String type = "UPLOAD_FILE".equals(event.getAction()) ? "DOC_UPLOAD" : "DOC_DELETE";
        String title = "UPLOAD_FILE".equals(event.getAction()) ? "Tài liệu mới" : "Xóa tài liệu";
        String actionText = "UPLOAD_FILE".equals(event.getAction()) ? "vừa được thêm vào" : "vừa bị xóa khỏi";
        
        List<Notification> notifications = members.stream()
                .filter(m -> !m.getMemberId().equals(event.getUserId()))
                .map(m -> Notification.builder()
                        .userId(m.getMemberId())
                        .type(type)
                        .title(title)
                        .message(String.format("Tài liệu [%s] %s dự án [%s].", event.getTargetName(), actionText, project.getName()))
                        .referenceId(String.valueOf(event.getProjectId()))
                        .build())
                .collect(Collectors.toList());

        List<Notification> savedNotifications = notificationRepository.saveAll(notifications);

        // Push real-time notification via SSE to each affected user
        for (Notification savedNotif : savedNotifications) {
            pushNotificationToUser(savedNotif);
        }
    }

    /**
     * Creates a single notification and pushes it in real-time via SSE.
     */
    @Transactional
    public Notification createAndPushNotification(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        pushNotificationToUser(saved);
        return saved;
    }

    /**
     * Pushes a saved notification to the user via SSE.
     * Sends both the full notification object and the updated unread count.
     */
    private void pushNotificationToUser(Notification notification) {
        try {
            // Send the full notification data
            sseEmitterService.sendToUser(notification.getUserId(), notification);

            // Send updated unread count
            long unreadCount = notificationRepository.countByUserIdAndIsRead(notification.getUserId(), false);
            sseEmitterService.sendCountUpdate(notification.getUserId(), unreadCount);
        } catch (Exception e) {
            log.error("Failed to push real-time notification to user {}: {}",
                    notification.getUserId(), e.getMessage());
        }
    }

    public List<Notification> getMyNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    @Transactional
    public void markAsRead(Long id, String userId) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification != null && notification.getUserId().equals(userId)) {
            notification.setRead(true);
            notificationRepository.save(notification);

            // Push updated unread count via SSE
            long unreadCount = notificationRepository.countByUserIdAndIsRead(userId, false);
            sseEmitterService.sendCountUpdate(userId, unreadCount);
        }
    }

    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);

        // Push updated unread count (0) via SSE
        sseEmitterService.sendCountUpdate(userId, 0);
    }
}
