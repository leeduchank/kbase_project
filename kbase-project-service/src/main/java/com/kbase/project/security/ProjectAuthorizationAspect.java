package com.kbase.project.security;

import com.kbase.project.entity.ProjectMember;
import com.kbase.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

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
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing authenticated user role");
        }

        boolean allowed = Arrays.stream(annotation.value())
                .anyMatch(allowedRole -> allowedRole.equalsIgnoreCase(userRole));

        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient system role");
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
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid method signature for project authorization");
        }

        Long projectId = convertToLong(args[annotation.projectIdArgIndex()]);
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing authenticated user ID");
        }

        Optional<ProjectMember> membership = projectMemberRepository.findByProjectIdAndMemberId(projectId, userId);
        if (membership.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not a member of the project");
        }

        ProjectMemberRole actualRole = membership.get().getRole();
        boolean authorized = Arrays.stream(annotation.value())
                .anyMatch(requiredRole -> requiredRole == actualRole);

        if (!authorized) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient project role");
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
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to convert projectId to Long");
    }
}
