package com.kbase.storage.security;

import com.kbase.storage.client.ProjectServiceClient;
import com.kbase.storage.client.dto.MemberRoleResponse;
import com.kbase.storage.exception.ForbiddenException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class StorageAuthorizationAspect {

    private final ProjectServiceClient projectServiceClient;

    // ─── System Role Check ────────────────────────────────────────────────────

    @Around("@annotation(com.kbase.storage.security.RequireSystemRole)")
    public Object requireSystemRole(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireSystemRole annotation = method.getAnnotation(RequireSystemRole.class);

        String userRole = SecurityUtils.getCurrentUserRole();
        if (userRole == null) {
            throw new ForbiddenException("Missing authenticated user role");
        }

        boolean allowed = Arrays.stream(annotation.value())
                .anyMatch(requiredRole -> requiredRole.equalsIgnoreCase(userRole));

        if (!allowed) {
            throw new ForbiddenException("Insufficient system role. Required: " + Arrays.toString(annotation.value()));
        }

        return joinPoint.proceed();
    }

    // ─── Project Member Role Check ────────────────────────────────────────────

    @Around("@annotation(com.kbase.storage.security.RequireProjectRole)")
    public Object requireProjectRole(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireProjectRole annotation = method.getAnnotation(RequireProjectRole.class);

        Object[] args = joinPoint.getArgs();
        if (args.length <= annotation.projectIdArgIndex()) {
            throw new IllegalArgumentException("Invalid method signature for project authorization");
        }

        Long projectId = convertToLong(args[annotation.projectIdArgIndex()]);
        String userId = SecurityUtils.getCurrentUserId();

        MemberRoleResponse memberRole;
        try {
            memberRole = projectServiceClient.getMemberRole(projectId, userId);
        } catch (Exception e) {
            log.error("Failed to check project membership for user={} project={}: {}", userId, projectId, e.getMessage());
            throw new ForbiddenException("Unable to verify project membership");
        }

        if (!memberRole.isMember()) {
            throw new ForbiddenException("User is not a member of the project");
        }

        ProjectMemberRole actualRole;
        try {
            actualRole = ProjectMemberRole.valueOf(memberRole.getRole());
        } catch (IllegalArgumentException e) {
            throw new ForbiddenException("Unknown project role: " + memberRole.getRole());
        }

        boolean authorized = Arrays.stream(annotation.value())
                .anyMatch(requiredRole -> requiredRole == actualRole);

        if (!authorized) {
            throw new ForbiddenException(
                    "Insufficient project role. Required one of: " + Arrays.toString(annotation.value())
                    + ", but was: " + actualRole
            );
        }

        return joinPoint.proceed();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long convertToLong(Object value) {
        if (value instanceof Long l) return l;
        if (value instanceof Number n) return n.longValue();
        if (value instanceof String s) return Long.parseLong(s);
        throw new IllegalArgumentException("Unable to convert projectId argument to Long: " + value);
    }
}
