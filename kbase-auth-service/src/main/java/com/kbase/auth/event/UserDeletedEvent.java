package com.kbase.auth.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDeletedEvent {
    private String eventType;
    private String userId;
    private String email;
    private long timestamp;

    public static UserDeletedEvent of(String userId, String email) {
        return UserDeletedEvent.builder()
                .eventType("USER_DELETED")
                .userId(userId)
                .email(email)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
