package com.kbase.project.client;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Wrapper around StorageServiceClient Feign client.
 * Encapsulates error handling for storage-service calls.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StorageServiceWrapper {

    private final StorageServiceClient storageServiceClient;

    /**
     * Delete all documents belonging to a project.
     * Called during project deletion for cascade cleanup.
     * Failures are logged but do NOT block project deletion.
     *
     * @param projectId the project ID whose documents should be deleted
     */
    public void deleteAllDocumentsByProject(Long projectId) {
        try {
            storageServiceClient.deleteAllDocumentsByProject(projectId);
            log.info("Successfully deleted all documents for project {} via storage-service", projectId);
        } catch (FeignException e) {
            log.error("Failed to delete documents for project {} via storage-service: {} (status={})",
                    projectId, e.getMessage(), e.status());
        } catch (Exception e) {
            log.error("Error calling storage-service to delete documents for project {}: {}",
                    projectId, e.getMessage(), e);
        }
    }
}
