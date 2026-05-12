package com.kbase.storage.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Propagates gateway-injected headers (X-User-*) and Authorization
 * to all outbound Feign client calls (e.g. to project-service).
 */
@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();

                // Forward Authorization header (if present)
                String authorizationHeader = request.getHeader("Authorization");
                if (authorizationHeader != null) {
                    requestTemplate.header("Authorization", authorizationHeader);
                }

                // Forward gateway-injected user headers for service-to-service calls
                String userId = request.getHeader("X-User-Id");
                if (userId != null) {
                    requestTemplate.header("X-User-Id", userId);
                }

                String email = request.getHeader("X-User-Email");
                if (email != null) {
                    requestTemplate.header("X-User-Email", email);
                }

                String role = request.getHeader("X-User-Role");
                if (role != null) {
                    requestTemplate.header("X-User-Role", role);
                }
            }
        };
    }
}
