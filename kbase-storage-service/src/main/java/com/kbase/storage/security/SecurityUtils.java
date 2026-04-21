package com.kbase.storage.security;

import com.kbase.storage.exception.ForbiddenException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;
import java.util.stream.Collectors;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public static String getCurrentUserId() {
        Authentication authentication = getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ForbiddenException("User is not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal == null) {
            throw new ForbiddenException("Missing authenticated principal");
        }
        return principal.toString();
    }

    public static String getCurrentUserRole() {
        Set<String> authorities = getCurrentAuthorityNames();
        return authorities.stream()
                .filter(role -> role.startsWith("ROLE_"))
                .map(role -> role.substring("ROLE_".length()))
                .findFirst()
                .orElse(null);
    }

    public static Set<String> getCurrentAuthorityNames() {
        Authentication authentication = getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Set.of();
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }
}
