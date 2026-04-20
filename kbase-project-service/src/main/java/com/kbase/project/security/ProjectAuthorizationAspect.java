package com.kbase.project.security;

import com.kbase.project.entity.ProjectMember;
import com.kbase.project.exception.ForbiddenException;
import com.kbase.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Optional;

@Aspect
@Component
@RequiredArgsConstructor
public class ProjectAuthorizationAspect {

    private final ProjectMemberRepository projectMemberRepository;

    @Around("@annotation(com.kbase.project.security.RequireSystemRole)")
    public Object requireSystemRole(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireSystemRole annotation = method.getAnnotation(RequireSystemRole.class);

        String userRole = SecurityUtils.getCurrentUserRole();
        if (userRole == null) {
            throw new ForbiddenException("Missing authenticated user role");
        }

        boolean allowed = Arrays.stream(annotation.value())
                .anyMatch(allowedRole -> allowedRole.equalsIgnoreCase(userRole));

        if (!allowed) {
            throw new ForbiddenException("Insufficient system role. Required: " + Arrays.toString(annotation.value()));
        }

        return joinPoint.proceed();
    }

    @Around("@annotation(com.kbase.project.security.RequireProjectRole)")
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
        if (userId == null) {
            throw new ForbiddenException("Missing authenticated user ID");
        }

        Optional<ProjectMember> membership = projectMemberRepository.findByProjectIdAndMemberId(projectId, userId);
        if (membership.isEmpty()) {
            throw new ForbiddenException("User is not a member of the project");
        }

        ProjectMemberRole actualRole = membership.get().getRole();
        boolean authorized = Arrays.stream(annotation.value())
                .anyMatch(requiredRole -> requiredRole == actualRole);

        if (!authorized) {
            throw new ForbiddenException("Insufficient project role. Required: " + Arrays.toString(annotation.value()));
        }

        return joinPoint.proceed();
    }

    private Long convertToLong(Object value) {
        if (value instanceof Long) {
            return (Long) value;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            return Long.parseLong((String) value);
        }
        throw new IllegalArgumentException("Unable to convert projectId to Long");
    }
}
