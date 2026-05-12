package com.kbase.auth.service;

import com.kbase.auth.entity.RefreshToken;
import com.kbase.auth.repository.RefreshTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing refresh tokens.
 *
 * Refresh tokens are stored in the database (not JWT) so they can be
 * individually revoked. They use opaque UUIDs rather than signed tokens.
 */
@Slf4j
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-expiration:604800000}") // 7 days default
    private long refreshExpirationMs;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    /**
     * Create a new refresh token for a user.
     */
    @Transactional
    public String createRefreshToken(Long userId) {
        RefreshToken refreshToken = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .userId(userId)
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .build();

        refreshToken = refreshTokenRepository.save(refreshToken);
        log.debug("Created refresh token for user {}", userId);
        return refreshToken.getToken();
    }

    /**
     * Validate and return the refresh token entity.
     * Returns empty if token doesn't exist, is revoked, or is expired.
     */
    @Transactional(readOnly = true)
    public Optional<RefreshToken> validateRefreshToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .filter(RefreshToken::isUsable);
    }

    /**
     * Rotate: revoke the old refresh token and issue a new one.
     * This prevents refresh token reuse attacks.
     */
    @Transactional
    public String rotateRefreshToken(RefreshToken oldToken) {
        // Revoke old token
        oldToken.setRevoked(true);
        refreshTokenRepository.save(oldToken);

        // Issue new token for the same user
        return createRefreshToken(oldToken.getUserId());
    }

    /**
     * Revoke a specific refresh token (logout from this device).
     */
    @Transactional
    public void revokeToken(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
            log.info("Revoked refresh token for user {}", rt.getUserId());
        });
    }

    /**
     * Revoke ALL refresh tokens for a user (logout everywhere / deactivation).
     */
    @Transactional
    public void revokeAllTokensForUser(Long userId) {
        int count = refreshTokenRepository.revokeAllByUserId(userId);
        log.info("Revoked {} refresh tokens for user {}", count, userId);
    }

    /**
     * Scheduled cleanup: delete expired tokens every 6 hours.
     */
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000) // 6 hours
    @Transactional
    public void cleanupExpiredTokens() {
        int deleted = refreshTokenRepository.deleteExpiredBefore(Instant.now());
        if (deleted > 0) {
            log.info("Cleaned up {} expired refresh tokens", deleted);
        }
    }
}
