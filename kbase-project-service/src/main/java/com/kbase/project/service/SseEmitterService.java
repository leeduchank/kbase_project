package com.kbase.project.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages Server-Sent Events (SSE) connections for real-time notification delivery.
 * Each user can have multiple SSE connections (multiple tabs/devices).
 */
@Slf4j
@Service
public class SseEmitterService {

    // userId -> list of SSE emitters (one per tab/device)
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    private static final long SSE_TIMEOUT = 30 * 60 * 1000L; // 30 minutes

    /**
     * Creates a new SSE connection for a user.
     */
    public SseEmitter createEmitter(String userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        // Send initial connection event
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("{\"status\":\"connected\"}"));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE event to user {}", userId);
            removeEmitter(userId, emitter);
        }

        log.info("SSE connection established for user: {} (total connections: {})",
                userId, emitters.getOrDefault(userId, new CopyOnWriteArrayList<>()).size());

        return emitter;
    }

    /**
     * Sends a notification event to all SSE connections of a specific user.
     */
    public void sendToUser(String userId, Object data) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) {
            log.debug("No active SSE connections for user: {}", userId);
            return;
        }

        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(data));
            } catch (IOException e) {
                log.debug("Failed to send SSE event to user {}, removing emitter", userId);
                removeEmitter(userId, emitter);
            }
        }
    }

    /**
     * Sends a "notification count updated" event to a specific user.
     * This is a lightweight event that just tells the client to update the badge count.
     */
    public void sendCountUpdate(String userId, long unreadCount) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("unread-count")
                        .data("{\"unreadCount\":" + unreadCount + "}"));
            } catch (IOException e) {
                removeEmitter(userId, emitter);
            }
        }
    }

    private void removeEmitter(String userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) {
                emitters.remove(userId);
            }
        }
        log.debug("SSE emitter removed for user: {}", userId);
    }
}
