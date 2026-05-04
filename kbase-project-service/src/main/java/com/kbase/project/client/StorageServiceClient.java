package com.kbase.project.client;

import com.kbase.project.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client to communicate with storage-service via Eureka service discovery.
 * Used for cascade operations (e.g., deleting all documents when a project is deleted).
 */
@FeignClient(name = "kbase-storage-service", configuration = FeignClientConfig.class)
public interface StorageServiceClient {

    @DeleteMapping("/storage/internal/projects/{projectId}/documents")
    ResponseEntity<Void> deleteAllDocumentsByProject(@PathVariable("projectId") Long projectId);
}
