package com.kbase.storage.client.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight response DTO for project info fetched from kbase-project-service.
 * Maps only the fields needed by the storage service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectInfoResponse {
    private boolean success;
    private ProjectData data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectData {
        private Long id;
        private Long storageLimit;
    }
}
