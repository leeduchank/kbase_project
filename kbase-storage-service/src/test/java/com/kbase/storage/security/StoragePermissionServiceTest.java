package com.kbase.storage.security;

import com.kbase.storage.client.ProjectServiceClient;
import com.kbase.storage.client.dto.MemberRoleResponse;
import com.kbase.storage.entity.Document;
import com.kbase.storage.exception.ForbiddenException;
import com.kbase.storage.exception.ResourceNotFoundException;
import com.kbase.storage.repository.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoragePermissionServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private ProjectServiceClient projectServiceClient;

    @InjectMocks
    private StoragePermissionService storagePermissionService;

    @Test
    void requireWriteAccessAllowsOwnerOrEditor() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document()));
        when(projectServiceClient.getMemberRole(3L, "user-1")).thenReturn(new MemberRoleResponse(true, "EDITOR"));

        storagePermissionService.requireWriteAccess(1L, "user-1");
    }

    @Test
    void requireWriteAccessRejectsViewer() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document()));
        when(projectServiceClient.getMemberRole(3L, "user-1")).thenReturn(new MemberRoleResponse(true, "VIEWER"));

        assertThatThrownBy(() -> storagePermissionService.requireWriteAccess(1L, "user-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("OWNER or EDITOR");
    }

    @Test
    void requireReadAccessRejectsNonMember() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document()));
        when(projectServiceClient.getMemberRole(3L, "user-1")).thenReturn(new MemberRoleResponse(false, ""));

        assertThatThrownBy(() -> storagePermissionService.requireReadAccess(1L, "user-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not a member");
    }

    @Test
    void requireReadAccessRejectsUnknownRole() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document()));
        when(projectServiceClient.getMemberRole(3L, "user-1")).thenReturn(new MemberRoleResponse(true, "MANAGER"));

        assertThatThrownBy(() -> storagePermissionService.requireReadAccess(1L, "user-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Unknown project role");
    }

    @Test
    void requireReadAccessThrowsWhenDocumentDoesNotExist() {
        when(documentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> storagePermissionService.requireReadAccess(404L, "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static Document document() {
        return Document.builder()
                .id(1L)
                .projectId(3L)
                .fileName("report.pdf")
                .fileType("application/pdf")
                .fileSize(10L)
                .s3Url("https://bucket.s3.amazonaws.com/report.pdf")
                .uploadedBy("owner")
                .build();
    }
}
