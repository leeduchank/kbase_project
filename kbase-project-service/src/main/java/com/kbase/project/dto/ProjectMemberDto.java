package com.kbase.project.dto;

import com.kbase.project.security.ProjectMemberRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberDto {
    private String memberId;
    private String email;       // Lấy từ Auth Service
    private String fullName;    // Lấy từ Auth Service
    private ProjectMemberRole role;
    private LocalDateTime joinedAt;
}