package com.kbase.storage.service;

import com.kbase.storage.entity.Document;
import com.kbase.storage.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that automatically hard-deletes documents
 * that have been in the trash for longer than the configured retention period.
 *
 * <p>Runs daily at 3:00 AM server time by default.
 * Retention is configurable via {@code storage.trash.retention-days} (default 30).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrashAutoCleanupScheduler {

    private final DocumentRepository documentRepository;
    private final S3StorageService s3StorageService;

    @Value("${storage.trash.retention-days:30}")
    private int retentionDays;

    /**
     * Purge expired trash documents every day at 3:00 AM.
     */
    @Scheduled(cron = "${storage.trash.cleanup-cron:0 0 3 * * *}")
    @Transactional
    public void purgeExpiredTrash() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        List<Document> expired = documentRepository.findExpiredTrash(cutoff);

        if (expired.isEmpty()) {
            log.debug("Trash auto-cleanup: no expired documents found (retention={} days)", retentionDays);
            return;
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
