package com.kbase.storage.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Authentication filter that reads user information from headers
 * set by the API Gateway after JWT validation.
 *
 * Headers expected:
 * - X-User-Id: the authenticated user's ID
 * - X-User-Email: the user's email
 * - X-User-Role: the user's role (USER, ADMIN, etc.)
 *
 * The Gateway is responsible for JWT validation. This filter only
 * populates the Spring SecurityContext from trusted gateway headers.
 */
@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String userId = request.getHeader("X-User-Id");
        String email = request.getHeader("X-User-Email");
        String role = request.getHeader("X-User-Role");

        if (StringUtils.hasText(userId)) {
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + (StringUtils.hasText(role) ? role : "USER")))
            );

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.debug("Authenticated user {} with role {} (from gateway headers)", userId, role);
        }

        filterChain.doFilter(request, response);
    }
}
