package com.kbase.gateway.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "mySecretKeyForJWTTokenSigningAndValidationPurpose12345";

    private final JwtTokenProvider jwtTokenProvider = new JwtTokenProvider();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", SECRET);
    }

    @Test
    void validateTokenAndExtractClaims() {
        String token = createToken(new Date(System.currentTimeMillis() + 60_000));

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo("42");
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo("user@example.com");
        assertThat(jwtTokenProvider.getRoleFromToken(token)).isEqualTo("ADMIN");
    }

    @Test
    void validateTokenReturnsFalseForExpiredToken() {
        String token = createToken(new Date(System.currentTimeMillis() - 60_000));

        assertThat(jwtTokenProvider.validateToken(token)).isFalse();
    }

    private String createToken(Date expiration) {
        return Jwts.builder()
                .subject("42")
                .claim("email", "user@example.com")
                .claim("role", "ADMIN")
                .issuedAt(new Date())
                .expiration(expiration)
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
