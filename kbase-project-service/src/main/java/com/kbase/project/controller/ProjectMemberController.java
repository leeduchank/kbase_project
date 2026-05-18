package com.kbase.project.controller;

import com.kbase.project.entity.ProjectMember;
import com.kbase.project.repository.ProjectMemberRepository;
import com.kbase.project.security.ProjectMemberRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * Internal endpoints used only for service-to-service communication.
 * These are protected by the JWT filter — only authenticated services
 * (with a valid user token forwarded via Feign) may call them.
 */
@Slf4j
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Project Member Checks", description = "Internal membership lookups used by other services.")
public class ProjectMemberController {

    private final ProjectMemberRepository projectMemberRepository;


    @GetMapping("/{projectId}/members/{userId}/role")
    @Operation(summary = "Get member role", description = "Checks whether a user belongs to a project and returns the user's project role.")
    public ResponseEntity<Map<String, Object>> getMemberRole(
            @PathVariable Long projectId,
            @PathVariable String userId) {

        log.debug("Internal role check: projectId={}, userId={}", projectId, userId);

        Optional<ProjectMember> membership =
                projectMemberRepository.findByProject_IdAndMemberId(projectId, userId);

        if (membership.isEmpty()) {
            return ResponseEntity.ok(Map.of("member", false, "role", ""));
        }

        ProjectMemberRole role = membership.get().getRole();
        return ResponseEntity.ok(Map.of("member", true, "role", role.name()));
    }


}
