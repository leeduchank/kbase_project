package com.kbase.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Service to manage the token blacklist in Redis.
 *
 * When a user is deactivated, their userId is written to Redis with a TTL.
 * The API Gateway reads from the same Redis to block requests immediately.
 *
 * Key format: blacklist:{userId}  (must match Gateway's TokenBlacklist)
 * Value: "1" (presence-based check)
 * TTL: 1 hour (after which the access token is expired anyway)
 */
@Slf4j
@Service
public class GatewayBlacklistService {

    private static final String KEY_PREFIX = "blacklist:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);

    private final StringRedisTemplate redisTemplate;

    public GatewayBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Blacklist a user (on deactivation).
     * Writes directly to Redis — shared with all Gateway instances.
     */
    public void blacklistUser(String userId) {
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + userId, "1", DEFAULT_TTL);
            log.info("Blacklisted userId {} in Redis for {}", userId, DEFAULT_TTL);
        } catch (Exception e) {
            // Non-critical: if Redis is down, the access token will expire naturally (15 min)
            log.warn("Failed to blacklist userId {} in Redis: {}", userId, e.getMessage());
        }
    }

    /**
     * Remove a user from the blacklist (on reactivation).
     */
    public void removeFromBlacklist(String userId) {
        try {
            redisTemplate.delete(KEY_PREFIX + userId);
            log.info("Removed userId {} from Redis blacklist", userId);
        } catch (Exception e) {
            log.warn("Failed to remove userId {} from Redis blacklist: {}", userId, e.getMessage());
        }
    }
}
