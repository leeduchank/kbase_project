package com.kbase.storage.client.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MemberRoleResponse {
    private boolean member;
    private String role; // OWNER | EDITOR | VIEWER, null if not a member
}
