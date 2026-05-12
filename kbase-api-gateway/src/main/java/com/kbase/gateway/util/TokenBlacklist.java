package com.kbase.gateway.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Redis-backed token blacklist for immediately blocking deactivated users.
 *
 * When a user is deactivated, their userId is written to Redis with a TTL.
 * The Gateway checks this blacklist on every request and blocks
 * any request from a blacklisted user — even if their JWT is still valid.
 *
 * Key format: blacklist:{userId}
 * Value: "1" (presence-based check)
 * TTL: 1 hour (after which the access token is expired anyway)
 *
 * Benefits over in-memory:
 * - Persists across Gateway restarts
 * - Shared across multiple Gateway instances
 * - Auth-service writes directly (no HTTP call needed)
 */
@Slf4j
@Component
public class TokenBlacklist {

    private static final String KEY_PREFIX = "blacklist:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);

    private final ReactiveStringRedisTemplate redisTemplate;

    public TokenBlacklist(ReactiveStringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Check if a userId is currently blacklisted.
     * Returns a Mono<Boolean> for reactive integration.
     */
    public Mono<Boolean> isBlacklisted(String userId) {
        return redisTemplate.hasKey(KEY_PREFIX + userId)
                .doOnError(e -> log.warn("Redis blacklist check failed for {}: {}", userId, e.getMessage()))
                .onErrorReturn(false); // Fail-open: if Redis is down, allow the request
    }

    /**
     * Blacklist a userId with default TTL (for internal/testing use at Gateway).
     */
    public Mono<Boolean> blacklist(String userId) {
        return blacklist(userId, DEFAULT_TTL);
    }

    /**
     * Blacklist a userId with a specific TTL.
     */
    public Mono<Boolean> blacklist(String userId, Duration ttl) {
        return redisTemplate.opsForValue()
                .set(KEY_PREFIX + userId, "1", ttl)
                .doOnSuccess(v -> log.info("Blacklisted userId {} for {}", userId, ttl))
                .doOnError(e -> log.error("Failed to blacklist userId {}: {}", userId, e.getMessage()))
                .onErrorReturn(false);
    }

    /**
     * Remove a userId from the blacklist.
     */
    public Mono<Boolean> remove(String userId) {
        return redisTemplate.delete(KEY_PREFIX + userId)
                .map(count -> count > 0)
                .doOnSuccess(v -> log.info("Removed userId {} from blacklist", userId))
                .doOnError(e -> log.error("Failed to remove userId {} from blacklist: {}", userId, e.getMessage()))
                .onErrorReturn(false);
    }
}
