package com.kbase.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityEvent {
    private Long projectId;
    private String userId;
    private String action;
    private String targetName;
}
