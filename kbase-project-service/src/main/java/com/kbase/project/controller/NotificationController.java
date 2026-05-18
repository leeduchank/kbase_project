package com.kbase.project.controller;

import com.kbase.project.dto.ApiResponse;
import com.kbase.project.entity.Notification;
import com.kbase.project.security.SecurityUtils;
import com.kbase.project.service.NotificationService;
import com.kbase.project.service.SseEmitterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notifications", description = "Read notifications, stream real-time notification events, and mark notifications as read.")
public class NotificationController {

    private final NotificationService notificationService;
    private final SseEmitterService sseEmitterService;

    /**
     * SSE endpoint for real-time notification streaming.
     * The client connects to this endpoint and receives events as they happen.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream notifications", description = "Opens a Server-Sent Events stream that pushes real-time notifications to the authenticated user.")
    public SseEmitter streamNotifications() {
        String userId = SecurityUtils.getCurrentUserId();
        return sseEmitterService.createEmitter(userId);
    }

    @GetMapping("/me")
    @Operation(summary = "List my notifications", description = "Returns notifications that belong to the authenticated user.")
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications() {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(notificationService.getMyNotifications(userId)));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread count", description = "Returns the number of unread notifications for the authenticated user.")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        String userId = SecurityUtils.getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark notification as read", description = "Marks a single notification as read for the authenticated user.")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Success", null));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Mark all notifications as read", description = "Marks every notification for the authenticated user as read.")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        String userId = SecurityUtils.getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("Success", null));
    }
}
