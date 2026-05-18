package com.kbase.storage.service;

import com.kbase.storage.client.ProjectServiceClient;
import com.kbase.storage.client.dto.ProjectInfoResponse;
import com.kbase.storage.dto.DocumentDto;
import com.kbase.storage.entity.Document;
import com.kbase.storage.exception.ResourceNotFoundException;
import com.kbase.storage.exception.StorageQuotaExceededException;
import com.kbase.storage.repository.DocumentRepository;
import com.kbase.storage.security.StoragePermissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private S3StorageService s3StorageService;

    @Mock
    private StoragePermissionService storagePermissionService;

    @Mock
    private ActivityEventPublisher activityEventPublisher;

    @Mock
    private ProjectServiceClient projectServiceClient;

    @InjectMocks
    private FileStorageService fileStorageService;

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
    void uploadFileChecksQuotaUploadsToS3AndSavesDocument() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "hello".getBytes());
        when(documentRepository.getTotalSizeByProject(3L)).thenReturn(10L);
        when(projectServiceClient.getProjectInfo(3L))
                .thenReturn(new ProjectInfoResponse(true, new ProjectInfoResponse.ProjectData(3L, 100L)));
        when(s3StorageService.uploadFile(any(), any(), eq(5L), eq("text/plain; charset=utf-8")))
                .thenReturn("https://bucket.s3.amazonaws.com/projects/3/key-notes.txt");
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document document = invocation.getArgument(0);
            document.setId(20L);
            return document;
        });

        DocumentDto dto = fileStorageService.uploadFile(file, 3L, "user-1");

        assertThat(dto.getId()).isEqualTo(20L);
        assertThat(dto.getFileType()).isEqualTo("text/plain; charset=utf-8");
        verify(activityEventPublisher).publish(any());
    }

    @Test
    void uploadFileRejectsWhenQuotaWouldBeExceeded() {
        MockMultipartFile file = new MockMultipartFile("file", "big.bin", "application/octet-stream", new byte[20]);
        when(documentRepository.getTotalSizeByProject(3L)).thenReturn(90L);
        when(projectServiceClient.getProjectInfo(3L))
                .thenReturn(new ProjectInfoResponse(true, new ProjectInfoResponse.ProjectData(3L, 100L)));

        assertThatThrownBy(() -> fileStorageService.uploadFile(file, 3L, "user-1"))
                .isInstanceOf(StorageQuotaExceededException.class);

        verify(s3StorageService, never()).uploadFile(any(), any(), any(Long.class), any());
    }

    @Test
    void deleteDocumentSoftDeletesAndPublishesActivity() {
        Document document = document(11L, "report.pdf", "https://bucket.s3.amazonaws.com/folder/report.pdf");
        when(documentRepository.findById(11L)).thenReturn(Optional.of(document));

        fileStorageService.deleteDocument(11L);

        assertThat(document.getIsDeleted()).isTrue();
        assertThat(document.getDeletedAt()).isNotNull();
        verify(storagePermissionService).requireWriteAccess(11L, "user-1");
        verify(documentRepository).save(document);
        verify(activityEventPublisher).publish(any());
    }

    @Test
    void restoreDocumentClearsSoftDeleteFields() {
        Document document = document(11L, "report.pdf", "https://bucket.s3.amazonaws.com/folder/report.pdf");
        document.setIsDeleted(true);
        document.setDeletedAt(java.time.LocalDateTime.now());
        when(documentRepository.findById(11L)).thenReturn(Optional.of(document));

        fileStorageService.restoreDocument(11L);

        assertThat(document.getIsDeleted()).isFalse();
        assertThat(document.getDeletedAt()).isNull();
        verify(activityEventPublisher).publish(any());
    }

    @Test
    void hardDeleteDocumentDeletesS3ObjectAndDatabaseRecord() {
        Document document = document(11L, "report.pdf", "https://bucket.s3.amazonaws.com/folder/report%20final.pdf");
        when(documentRepository.findById(11L)).thenReturn(Optional.of(document));

        fileStorageService.hardDeleteDocument(11L);

        verify(s3StorageService).deleteFile("folder/report final.pdf");
        verify(documentRepository).delete(document);
        verify(activityEventPublisher).publish(any());
    }

    @Test
    void getPreviewUrlRequiresReadAccessAndReturnsPresignedUrl() {
        Document document = document(11L, "report.pdf", "https://bucket.s3.amazonaws.com/folder/report.pdf");
        when(documentRepository.findById(11L)).thenReturn(Optional.of(document));
        when(s3StorageService.generatePresignedUrl("folder/report.pdf", 5)).thenReturn("https://preview");

        String previewUrl = fileStorageService.getPreviewUrl(11L);

        assertThat(previewUrl).isEqualTo("https://preview");
        verify(storagePermissionService).requireReadAccess(11L, "user-1");
    }

    @Test
    void downloadFileStreamReturnsS3Stream() {
        Document document = document(11L, "report.pdf", "https://bucket.s3.amazonaws.com/folder/report.pdf");
        ByteArrayInputStream stream = new ByteArrayInputStream("content".getBytes());
        when(documentRepository.findById(11L)).thenReturn(Optional.of(document));
        when(s3StorageService.downloadFile("folder/report.pdf")).thenReturn(stream);

        assertThat(fileStorageService.downloadFileStream(11L)).isSameAs(stream);
    }

    @Test
    void deleteAllDocumentsByProjectDeletesEveryS3FileAndRepositoryRows() {
        when(documentRepository.findByProjectId(3L)).thenReturn(List.of(
                document(11L, "a.pdf", "https://bucket.s3.amazonaws.com/a.pdf"),
                document(12L, "b.pdf", "https://bucket.s3.amazonaws.com/b.pdf")));

        int deleted = fileStorageService.deleteAllDocumentsByProject(3L);

        assertThat(deleted).isEqualTo(2);
        verify(s3StorageService).deleteFile("a.pdf");
        verify(s3StorageService).deleteFile("b.pdf");
        verify(documentRepository).deleteByProjectId(3L);
    }

    @Test
    void getDocumentThrowsWhenDocumentMissingAfterPermissionCheck() {
        when(documentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fileStorageService.getDocument(404L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listMethodsMapDocumentsToDtos() {
        Document document = document(11L, "report.pdf", "https://bucket.s3.amazonaws.com/report.pdf");
        when(documentRepository.findByProjectIdAndIsDeletedFalse(3L)).thenReturn(List.of(document));
        when(documentRepository.findByUploadedBy("user-1")).thenReturn(List.of(document));
        when(documentRepository.findByProjectIdAndIsDeletedTrue(3L)).thenReturn(List.of(document));

        assertThat(fileStorageService.getDocumentsByProject(3L)).hasSize(1);
        assertThat(fileStorageService.getDocumentsByUser("user-1")).hasSize(1);
        assertThat(fileStorageService.getTrashedDocuments(3L)).hasSize(1);
    }

    private static Document document(Long id, String fileName, String s3Url) {
        return Document.builder()
                .id(id)
                .fileName(fileName)
                .fileType("application/pdf")
                .fileSize(42L)
                .s3Url(s3Url)
                .projectId(3L)
                .uploadedBy("user-1")
                .isDeleted(false)
                .build();
    }
}
