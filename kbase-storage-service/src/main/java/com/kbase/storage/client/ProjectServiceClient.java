package com.kbase.storage.client;

import com.kbase.storage.client.dto.MemberRoleResponse;
import com.kbase.storage.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client to query project membership info from kbase-project-service.
 * Used by StorageAuthorizationAspect to enforce project-level role checks.
 */
@FeignClient(name = "kbase-project-service", configuration = FeignClientConfig.class)
public interface ProjectServiceClient {

    @GetMapping("/projects/{projectId}/members/{userId}/role")
    MemberRoleResponse getMemberRole(
            @PathVariable("projectId") Long projectId,
            @PathVariable("userId") String userId
    );
}
