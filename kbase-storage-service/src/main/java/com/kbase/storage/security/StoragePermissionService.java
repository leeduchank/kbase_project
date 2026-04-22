package com.kbase.storage.security;

import com.kbase.storage.client.ProjectServiceClient;
import com.kbase.storage.client.dto.MemberRoleResponse;
import com.kbase.storage.entity.Document;
import com.kbase.storage.exception.ForbiddenException;
import com.kbase.storage.exception.ResourceNotFoundException;
import com.kbase.storage.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Central permission-check helper for the Storage service.
 *
 * <p>Used by {@link com.kbase.storage.service.FileStorageService} for operations
 * whose endpoints expose only a {@code documentId} (not a {@code projectId}).
 * In those cases the aspect-based {@code @RequireProjectRole} cannot be used
 * directly, so we resolve the {@code projectId} from the document record and
 * then delegate to project-service via Feign.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StoragePermissionService {

    /** Roles that are allowed to mutate (add/update/delete) documents. */
    private static final Set<ProjectMemberRole> WRITE_ROLES =
            Set.of(ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR);

    /** Roles that are allowed to read documents (all members). */
    private static final Set<ProjectMemberRole> READ_ROLES =
            Set.of(ProjectMemberRole.OWNER, ProjectMemberRole.EDITOR, ProjectMemberRole.VIEWER);

    private final DocumentRepository documentRepository;
    private final ProjectServiceClient projectServiceClient;

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Verifies that {@code userId} has OWNER or EDITOR role in the project
     * that owns the given document.
     *
     * @throws ForbiddenException        if the user lacks the required role
     * @throws ResourceNotFoundException if the document does not exist
     */
    public void requireWriteAccess(Long documentId, String userId) {
        Long projectId = resolveProjectId(documentId);
        ProjectMemberRole role = fetchRole(projectId, userId);
        if (!WRITE_ROLES.contains(role)) {
            throw new ForbiddenException(
                    "Only OWNER or EDITOR can modify documents in this project. Your role: " + role);
        }
    }

    /**
     * Verifies that {@code userId} is a member (any role) of the project
     * that owns the given document.
     *
     * @throws ForbiddenException        if the user is not a project member
     * @throws ResourceNotFoundException if the document does not exist
     */
    public void requireReadAccess(Long documentId, String userId) {
        Long projectId = resolveProjectId(documentId);
        ProjectMemberRole role = fetchRole(projectId, userId);
        if (!READ_ROLES.contains(role)) {
            throw new ForbiddenException(
                    "You must be a member of the project to access this document. Your role: " + role);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long resolveProjectId(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        return document.getProjectId();
    }

    private ProjectMemberRole fetchRole(Long projectId, String userId) {
        MemberRoleResponse response;
        try {
            response = projectServiceClient.getMemberRole(projectId, userId);
        } catch (Exception e) {
            log.error("Failed to fetch project membership for user={} project={}: {}",
                    userId, projectId, e.getMessage());
            throw new ForbiddenException("Unable to verify project membership");
        }

        if (!response.isMember()) {
            throw new ForbiddenException("User is not a member of the project");
        }

        try {
            return ProjectMemberRole.valueOf(response.getRole());
        } catch (IllegalArgumentException e) {
            throw new ForbiddenException("Unknown project role: " + response.getRole());
        }
    }
}
