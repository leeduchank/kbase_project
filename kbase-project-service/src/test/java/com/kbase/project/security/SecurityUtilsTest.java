package com.kbase.project.security;

import com.kbase.project.exception.ForbiddenException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityUtilsTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUserIdAndRoleReadAuthenticatedPrincipal() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user-1", null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        assertThat(SecurityUtils.getCurrentUserId()).isEqualTo("user-1");
        assertThat(SecurityUtils.getCurrentUserRole()).isEqualTo("ADMIN");
        assertThat(SecurityUtils.getCurrentAuthorityNames()).containsExactly("ROLE_ADMIN");
    }

    @Test
    void getCurrentUserIdRejectsMissingAuthentication() {
        assertThatThrownBy(SecurityUtils::getCurrentUserId)
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not authenticated");
    }
}
