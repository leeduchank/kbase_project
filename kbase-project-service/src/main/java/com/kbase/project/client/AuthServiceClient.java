package com.kbase.project.client;

import com.kbase.project.client.dto.AuthApiResponse;
import com.kbase.project.client.dto.UserInternalDTO;
import com.kbase.project.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client to communicate with auth-service via Eureka service discovery.
 * The service name "kbase-auth-service" is resolved through Eureka.
 */
@FeignClient(name = "kbase-auth-service", configuration = FeignClientConfig.class)
public interface AuthServiceClient {

    @GetMapping("/auth/internal/users/{id}/exists")
    ResponseEntity<UserInternalDTO> checkUserInternal(@PathVariable("id") String id);}
