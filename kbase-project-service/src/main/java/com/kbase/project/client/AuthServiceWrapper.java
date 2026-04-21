package com.kbase.project.client;

import com.kbase.project.client.dto.UserInternalDTO;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Wrapper around AuthServiceClient Feign client.
 * Encapsulates error handling and provides business-level methods.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthServiceWrapper {

    private final AuthServiceClient authServiceClient;

    /**
     * Check if a user exists in auth-service by user ID.
     *
     * @param userId the user ID to check
     * @return true if user exists, false otherwise
     */
    public UserInternalDTO getInternalUser(String userId) {
        try {
            ResponseEntity<UserInternalDTO> response = authServiceClient.checkUserInternal(userId);
            return response.getBody();
        } catch (FeignException.NotFound e) {
            return null;
        } catch (Exception e) {
            log.error("Auth Service error: {}", e.getMessage());
            throw new RuntimeException("Dịch vụ xác thực không khả dụng.");
        }
    }
}
