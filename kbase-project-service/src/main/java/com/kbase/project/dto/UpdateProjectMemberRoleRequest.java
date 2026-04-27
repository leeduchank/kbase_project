package com.kbase.project.dto;

import com.kbase.project.security.ProjectMemberRole;
import lombok.Data;

@Data
public class UpdateProjectMemberRoleRequest {
    private ProjectMemberRole role;
}