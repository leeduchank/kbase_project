package com.kbase.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("auth-service", r -> r
                        .path("/api/auth/**")
                        .uri("lb://kbase-auth-service"))
                .route("project-service", r -> r
                        .path("/api/projects/**")
                        .uri("lb://kbase-project-service"))
                .route("storage-service", r -> r
                        .path("/api/storage/**")
                        .uri("lb://kbase-storage-service"))
                .build();
    }
}
