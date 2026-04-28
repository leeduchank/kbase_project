package com.kbase.auth.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDeactivatedEvent {
    private String eventType;
    private String userId;
    private String email;
    private long timestamp;

    public static UserDeactivatedEvent of(String userId, String email) {
        return UserDeactivatedEvent.builder()
                .eventType("USER_DEACTIVATED")
                .userId(userId)
                .email(email)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
