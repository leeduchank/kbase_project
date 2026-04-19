package com.kbase.project.dto;

import com.kbase.project.security.ProjectMemberRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddProjectMemberRequest {
    private String memberId;
    private ProjectMemberRole role;
}