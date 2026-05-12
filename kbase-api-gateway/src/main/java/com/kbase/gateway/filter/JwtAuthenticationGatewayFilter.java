package com.kbase.gateway.filter;

import com.kbase.gateway.util.JwtTokenProvider;
import com.kbase.gateway.util.TokenBlacklist;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Global Gateway filter that:
 * 1. Validates JWT tokens for protected routes
 * 2. Checks token blacklist (for deactivated users)
 * 3. Extracts user info (userId, email, role) from the token
 * 4. Forwards them as X-User-* headers to downstream services
 *
 * Public endpoints (login, register, refresh, logout, actuator) are excluded.
 */
@Slf4j
@Component
public class JwtAuthenticationGatewayFilter implements GlobalFilter, Ordered {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklist tokenBlacklist;

    /**
     * Paths that do NOT require JWT authentication.
     */
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/actuator"
    );

    public JwtAuthenticationGatewayFilter(JwtTokenProvider jwtTokenProvider, TokenBlacklist tokenBlacklist) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenBlacklist = tokenBlacklist;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Skip authentication for public endpoints
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        // Extract token from Authorization header or query param (SSE support)
        String token = resolveToken(request);

        // No token → let downstream Spring Security handle 401
        if (!StringUtils.hasText(token)) {
            return chain.filter(stripUserHeaders(exchange));
        }

        // Validate token
        if (!jwtTokenProvider.validateToken(token)) {
            return sendUnauthorized(exchange, "Invalid or expired JWT token.");
        }

        // Extract user info from token
        String userId = jwtTokenProvider.getUserIdFromToken(token);
        String email = jwtTokenProvider.getEmailFromToken(token);
        String role = jwtTokenProvider.getRoleFromToken(token);

        // Check blacklist (deactivated users) — reactive Redis call
        return tokenBlacklist.isBlacklisted(userId)
                .flatMap(blacklisted -> {
                    if (blacklisted) {
                        log.warn("Blocked request from blacklisted user {}", userId);
                        return sendUnauthorized(exchange, "User account has been deactivated.");
                    }

                    log.debug("Gateway authenticated user {} (role: {}) for path {}", userId, role, path);

                    // Build mutated request: add X-User-* headers
                    ServerHttpRequest mutatedRequest = request.mutate()
                            .header("X-User-Id", userId)
                            .header("X-User-Email", email != null ? email : "")
                            .header("X-User-Role", role != null ? role : "USER")
                            .build();

                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                });
    }

    @Override
    public int getOrder() {
        // Run before other filters
        return -1;
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private String resolveToken(ServerHttpRequest request) {
        // From Authorization header
        String bearerToken = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        // From query parameter (for SSE EventSource which can't set headers)
        String tokenParam = request.getQueryParams().getFirst("token");
        if (StringUtils.hasText(tokenParam)) {
            return tokenParam;
        }

        return null;
    }

    /**
     * Strips any externally-provided X-User-* headers to prevent spoofing.
     */
    private ServerWebExchange stripUserHeaders(ServerWebExchange exchange) {
        ServerHttpRequest mutated = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove("X-User-Id");
                    headers.remove("X-User-Email");
                    headers.remove("X-User-Role");
                })
                .build();
        return exchange.mutate().request(mutated).build();
    }

    private Mono<Void> sendUnauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"success\":false,\"message\":\"" + message + "\",\"errorCode\":\"UNAUTHORIZED\"}";
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

        return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
    }
}
