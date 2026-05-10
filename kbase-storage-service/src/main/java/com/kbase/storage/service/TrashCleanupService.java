package com.kbase.storage.service;

import com.kbase.storage.entity.Document;
import com.kbase.storage.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service that hard-deletes documents
 * that have been in the trash for longer than the configured retention period.
 *
 * <p>Intended to be triggered by an external scheduler (e.g., AWS Lambda).
 * Retention is configurable via {@code storage.trash.retention-days} (default 30).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrashCleanupService {

    private final DocumentRepository documentRepository;
    private final S3StorageService s3StorageService;

    @Value("${storage.trash.retention-days:30}")
    private int retentionDays;

    /**
     * Purge expired trash documents.
     */
    @Transactional
    public int purgeExpiredTrash() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        List<Document> expired = documentRepository.findExpiredTrash(cutoff);

        if (expired.isEmpty()) {
            log.debug("Trash auto-cleanup: no expired documents found (retention={} days)", retentionDays);
            return 0;
        }

        log.info("Trash auto-cleanup: found {} expired documents (older than {})", expired.size(), cutoff);

        int successCount = 0;
        for (Document document : expired) {
            try {
                // Delete file from S3
                String s3Key = extractS3KeyFromUrl(document.getS3Url());
                if (s3Key != null) {
                    s3StorageService.deleteFile(s3Key);
                }
                // Delete record from DB
                documentRepository.delete(document);
                successCount++;
                log.info("Auto-purged document: id={}, file={}, project={}",
                        document.getId(), document.getFileName(), document.getProjectId());
            } catch (Exception e) {
                log.error("Failed to auto-purge document id={}: {}", document.getId(), e.getMessage(), e);
            }
        }

        log.info("Trash auto-cleanup completed: {}/{} documents purged", successCount, expired.size());
        return successCount;
    }

    private String extractS3KeyFromUrl(String s3Url) {
        if (s3Url == null) return null;
        try {
            String marker = ".amazonaws.com/";
            int markerIndex = s3Url.indexOf(marker);
            String extractedKey;
            if (markerIndex != -1) {
                extractedKey = s3Url.substring(markerIndex + marker.length());
            } else {
                extractedKey = s3Url.substring(Math.max(s3Url.lastIndexOf('/') + 1, 0));
            }
            return java.net.URLDecoder.decode(extractedKey, java.nio.charset.StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            log.error("Error extracting S3 key from URL: {}", s3Url, e);
            return s3Url;
        }
    }
}
