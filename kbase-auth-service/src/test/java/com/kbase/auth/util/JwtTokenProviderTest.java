package com.kbase.auth.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "mySecretKeyForJWTTokenSigningAndValidationPurpose12345";

    private final JwtTokenProvider jwtTokenProvider = new JwtTokenProvider();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 60_000L);
    }

    @Test
    void generateTokenIncludesSubjectEmailAndRole() {
        String token = jwtTokenProvider.generateToken("42", "user@example.com", "ADMIN");

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo("42");
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo("user@example.com");
        assertThat(jwtTokenProvider.getRoleFromToken(token)).isEqualTo("ADMIN");
    }

    @Test
    void validateTokenReturnsFalseForMalformedToken() {
        assertThat(jwtTokenProvider.validateToken("not-a-jwt")).isFalse();
    }
}
