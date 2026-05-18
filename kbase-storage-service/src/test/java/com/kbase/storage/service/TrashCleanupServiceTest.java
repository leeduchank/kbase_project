package com.kbase.storage.service;

import com.kbase.storage.entity.Document;
import com.kbase.storage.repository.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrashCleanupServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private S3StorageService s3StorageService;

    @InjectMocks
    private TrashCleanupService trashCleanupService;

    @Test
    void purgeExpiredTrashDeletesS3ObjectAndDatabaseRecord() {
        ReflectionTestUtils.setField(trashCleanupService, "retentionDays", 30);
        Document document = Document.builder()
                .id(15L)
                .fileName("old report.pdf")
                .s3Url("https://bucket.s3.amazonaws.com/folder/old%20report.pdf")
                .projectId(3L)
                .isDeleted(true)
                .deletedAt(LocalDateTime.now().minusDays(31))
                .build();
        when(documentRepository.findExpiredTrash(any(LocalDateTime.class))).thenReturn(List.of(document));

        int purged = trashCleanupService.purgeExpiredTrash();

        assertThat(purged).isEqualTo(1);
        verify(s3StorageService).deleteFile("folder/old report.pdf");
        verify(documentRepository).delete(document);
    }

    @Test
    void purgeExpiredTrashReturnsZeroWhenNothingExpired() {
        ReflectionTestUtils.setField(trashCleanupService, "retentionDays", 30);
        when(documentRepository.findExpiredTrash(any(LocalDateTime.class))).thenReturn(List.of());

        int purged = trashCleanupService.purgeExpiredTrash();

        assertThat(purged).isZero();
        verify(s3StorageService, never()).deleteFile(any());
        verify(documentRepository, never()).delete(any());
    }
}
