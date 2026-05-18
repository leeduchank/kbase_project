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
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://kbase-auth-service"))
                .route("project-service", r -> r
                        .path("/api/projects/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://kbase-project-service"))
                .route("storage-service", r -> r
                        .path("/api/storage/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://kbase-storage-service"))
                .route("auth-openapi", r -> r
                        .path("/api-docs/auth")
                        .filters(f -> f.rewritePath("/api-docs/auth", "/v3/api-docs"))
                        .uri("lb://kbase-auth-service"))
                .route("project-openapi", r -> r
                        .path("/api-docs/projects")
                        .filters(f -> f.rewritePath("/api-docs/projects", "/v3/api-docs"))
                        .uri("lb://kbase-project-service"))
                .route("storage-openapi", r -> r
                        .path("/api-docs/storage")
                        .filters(f -> f.rewritePath("/api-docs/storage", "/v3/api-docs"))
                        .uri("lb://kbase-storage-service"))
                .build();
    }
}
