package com.kbase.project.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret:mySecretKeyForJWTTokenSigningAndValidationPurpose12345}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    public String generateToken(String userId, String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        return createToken(claims, userId);
    }

    public String generateToken(String userId, String email, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("role", role);
        return createToken(claims, userId);
    }

    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                // In 0.12+, signWith(Key) automatically determines the algorithm
                // based on key strength (e.g., HS512)
                .signWith(getSigningKey())
                .compact();
    }

    public String getUserIdFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }

    public String getEmailFromToken(String token) {
        return getAllClaimsFromToken(token).get("email", String.class);
    }

    public String getRoleFromToken(String token) {
        return getAllClaimsFromToken(token).get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            // Strict format check: reject tokens with tampered Base64URL parts
            if (!isValidTokenFormat(token)) {
                log.error("JWT Validation error: Token has invalid Base64URL format");
                return false;
            }

            Jwts.parser()
                    .verifyWith(getSigningKey()) // Replaces setSigningKey
                    .build()                    // Creates the Parser
                    .parseSignedClaims(token);   // Replaces parseClaimsJws
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Catching the parent JwtException covers Malformed, Expired, and Security exceptions
            log.error("JWT Validation error: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Validates that the token has exactly 3 Base64URL-encoded parts
     * and each part has valid Base64URL length (not mod 4 == 1, which causes
     * decoders to silently drop trailing characters).
     */
    private boolean isValidTokenFormat(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false;
        }
        for (String part : parts) {
            // Base64URL valid characters: A-Z, a-z, 0-9, -, _
            if (!part.matches("^[A-Za-z0-9_-]+$")) {
                return false;
            }
            // Base64 encodes 3 bytes into 4 chars.
            // Valid lengths mod 4: 0 (no padding), 2 (1 byte remainder), 3 (2 byte remainder)
            // Length mod 4 == 1 is INVALID — decoder silently ignores the trailing char
            if (part.length() % 4 == 1) {
                return false;
            }
        }
        return true;
    }

    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload(); // Replaces getBody()
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}