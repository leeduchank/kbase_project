package com.kbase.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated storage statistics per file type within a project.
 * Returned by the JPQL GROUP BY query in DocumentRepository.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StorageStatsDto {
    private String fileType;
    private Long totalSize;
    private Long fileCount;
}
