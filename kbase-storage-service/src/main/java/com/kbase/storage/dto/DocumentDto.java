package com.kbase.storage.dto;

import com.kbase.storage.entity.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDto {
    private Long id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String s3Url;
    private Long projectId;
    private String uploadedBy;
    private LocalDateTime createdAt;

    public static DocumentDto fromEntity(Document document) {
        return DocumentDto.builder()
                .id(document.getId())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .s3Url(document.getS3Url())
                .projectId(document.getProjectId())
                .uploadedBy(document.getUploadedBy())
                .createdAt(document.getCreatedAt())
                .build();
    }
}
