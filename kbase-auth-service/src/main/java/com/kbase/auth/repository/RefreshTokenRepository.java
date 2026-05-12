package com.kbase.auth.repository;

import com.kbase.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    /**
     * Revoke all active refresh tokens for a user (used on logout-all or deactivation).
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.userId = :userId AND rt.revoked = false")
    int revokeAllByUserId(@Param("userId") Long userId);

    /**
     * Cleanup: delete expired tokens older than the given time.
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") Instant before);
}
