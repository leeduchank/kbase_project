package com.kbase.project.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String action; // e.g., UPLOAD_FILE, DELETE_FILE, INVITE_MEMBER, JOIN_PROJECT

    @Column(name = "target_name")
    private String targetName; // e.g., "document.pdf", "user@email.com"

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
