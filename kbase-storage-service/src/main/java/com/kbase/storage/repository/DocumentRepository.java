package com.kbase.storage.repository;

import com.kbase.storage.dto.StorageStatsDto;
import com.kbase.storage.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByProjectId(Long projectId);
    List<Document> findByUploadedBy(String uploadedBy);
    void deleteByProjectId(Long projectId);

    /** Active (non-deleted) documents for a project. */
    List<Document> findByProjectIdAndIsDeletedFalse(Long projectId);

    /** Soft-deleted (trashed) documents for a project. */
    List<Document> findByProjectIdAndIsDeletedTrue(Long projectId);

    /**
     * Aggregate storage stats grouped by fileType for a given project.
     * Only counts active (non-deleted) documents.
     */
    @Query("SELECT new com.kbase.storage.dto.StorageStatsDto(d.fileType, SUM(d.fileSize), COUNT(d)) " +
           "FROM Document d WHERE d.projectId = :projectId AND d.isDeleted = false GROUP BY d.fileType")
    List<StorageStatsDto> getStorageStatsByProject(@Param("projectId") Long projectId);

    /**
     * Calculate total storage used by a project (active documents only).
     */
    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d WHERE d.projectId = :projectId AND d.isDeleted = false")
    Long getTotalSizeByProject(@Param("projectId") Long projectId);

    /**
     * Find soft-deleted documents whose deletedAt is before the given cutoff.
     * Used by the auto-purge scheduler.
     */
    @Query("SELECT d FROM Document d WHERE d.isDeleted = true AND d.deletedAt IS NOT NULL AND d.deletedAt < :cutoff")
    List<Document> findExpiredTrash(@Param("cutoff") java.time.LocalDateTime cutoff);
}
