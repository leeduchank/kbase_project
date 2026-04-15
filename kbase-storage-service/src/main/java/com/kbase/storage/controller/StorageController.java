package com.kbase.storage.controller;

import com.kbase.storage.dto.ApiResponse;
import com.kbase.storage.dto.DocumentDto;
import com.kbase.storage.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/storage")
@CrossOrigin(origins = "*", maxAge = 3600)
public class StorageController {

    private final FileStorageService fileStorageService;

    public StorageController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<DocumentDto>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") Long projectId,
            @RequestHeader("X-User-Id") String userId) {

        log.info("File upload request: {}, projectId: {}, userId: {}", file.getOriginalFilename(), projectId, userId);

        DocumentDto documentDto = fileStorageService.uploadFile(file, projectId, userId);
        return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", documentDto));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable Long id) throws IOException {
        log.info("File download request: {}", id);

        DocumentDto document = fileStorageService.getDocument(id);
        InputStream inputStream = fileStorageService.downloadFileStream(id);
        String contentType = document.getFileType() != null ? document.getFileType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(document.getFileSize())
                .body(new InputStreamResource(inputStream));
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<ApiResponse<DocumentDto>> getDocument(@PathVariable Long id) {
        DocumentDto document = fileStorageService.getDocument(id);
        return ResponseEntity.ok(ApiResponse.success(document));
    }

    @GetMapping("/projects/{projectId}/documents")
    public ResponseEntity<ApiResponse<List<DocumentDto>>> getProjectDocuments(@PathVariable Long projectId) {
        List<DocumentDto> documents = fileStorageService.getDocumentsByProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(documents));
    }

    @GetMapping("/users/{userId}/documents")
    public ResponseEntity<ApiResponse<List<DocumentDto>>> getUserDocuments(@PathVariable String userId) {
        List<DocumentDto> documents = fileStorageService.getDocumentsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(documents));
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        log.info("File deletion request: {}", id);
        fileStorageService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }
}
