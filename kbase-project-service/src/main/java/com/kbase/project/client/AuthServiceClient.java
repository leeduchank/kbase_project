package com.kbase.project.client;

import com.kbase.project.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * REST client to communicate with auth-service via Eureka service discovery.
 * Used for synchronous operations like validating user existence.
 */
@Slf4j
@Component
public class AuthServiceClient {

    private final RestTemplate restTemplate;

    @Value("${auth-service.url:http://kbase-auth-service}")
    private String authServiceUrl;

    public AuthServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Check if a user exists in auth-service by user ID.
     *
     * @param userId the user ID to check
     * @return true if user exists, false otherwise
     */
    public boolean userExists(String userId) {
        try {
            String url = authServiceUrl + "/auth/users/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (HttpClientErrorException.NotFound e) {
            return false;
        } catch (Exception e) {
            log.error("Error checking user existence for userId {}: {}", userId, e.getMessage());
            throw new RuntimeException("Unable to verify user existence. Auth service may be unavailable.", e);
        }
    }
}
