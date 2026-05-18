package com.kbase.storage.controller;

import com.kbase.storage.dto.DocumentDto;
import com.kbase.storage.dto.StorageStatsDto;
import com.kbase.storage.service.FileStorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StorageControllerTest {

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private StorageController storageController;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken("user-1", null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void uploadAndReadEndpointsReturnServiceData() {
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", "data".getBytes());
        DocumentDto document = document();
        when(fileStorageService.uploadFile(file, 3L, "user-1")).thenReturn(document);
        when(fileStorageService.getDocument(11L)).thenReturn(document);
        when(fileStorageService.getDocumentsByProject(3L)).thenReturn(List.of(document));
        when(fileStorageService.getDocumentsByUser("user-1")).thenReturn(List.of(document));
        when(fileStorageService.getTrashedDocuments(3L)).thenReturn(List.of(document));
        when(fileStorageService.getPreviewUrl(11L)).thenReturn("https://preview");

        assertThat(storageController.uploadFile(3L, file).getBody().getData()).isSameAs(document);
        assertThat(storageController.getDocument(11L).getBody().getData()).isSameAs(document);
        assertThat(storageController.getProjectDocuments(3L).getBody().getData()).containsExactly(document);
        assertThat(storageController.getMyDocuments().getBody().getData()).containsExactly(document);
        assertThat(storageController.getTrashedDocuments(3L).getBody().getData()).containsExactly(document);
        assertThat(storageController.getPreviewUrl(11L).getBody().getData()).isEqualTo("https://preview");
    }

    @Test
    void mutationEndpointsDelegateToService() {
        assertThat(storageController.deleteDocument(11L).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(storageController.restoreDocument(11L).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(storageController.hardDeleteDocument(11L).getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(fileStorageService).deleteDocument(11L);
        verify(fileStorageService).restoreDocument(11L);
        verify(fileStorageService).hardDeleteDocument(11L);
    }

    @Test
    void downloadEndpointReturnsFileResource() throws Exception {
        DocumentDto document = document();
        when(fileStorageService.getDocument(11L)).thenReturn(document);
        when(fileStorageService.downloadFileStream(11L)).thenReturn(new ByteArrayInputStream("data".getBytes()));

        var response = storageController.downloadFile(11L);

        assertThat(response.getBody()).isInstanceOf(InputStreamResource.class);
        assertThat(response.getHeaders().getFirst("Content-Disposition")).contains("report.pdf");
        assertThat(response.getHeaders().getContentLength()).isEqualTo(4L);
    }

    @Test
    void statsEndpointReturnsProjectStats() {
        StorageStatsDto stats = new StorageStatsDto("application/pdf", 10L, 1L);
        when(fileStorageService.getStorageStats(3L)).thenReturn(List.of(stats));

        assertThat(storageController.getStorageStats(3L).getBody().getData()).containsExactly(stats);
    }

    private static DocumentDto document() {
        return DocumentDto.builder()
                .id(11L)
                .fileName("report.pdf")
                .fileType("application/pdf")
                .fileSize(4L)
                .projectId(3L)
                .uploadedBy("user-1")
                .build();
    }
}
