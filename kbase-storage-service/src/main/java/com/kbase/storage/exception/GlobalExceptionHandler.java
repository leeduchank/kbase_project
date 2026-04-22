package com.kbase.storage.exception;

import com.kbase.storage.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.stream.Collectors;

/**
 * Centralized exception handler for the Storage Service.
 *
 * <p>Maps every known exception type to a structured {@link ApiResponse}
 * with an appropriate HTTP status code and a machine-readable {@code errorCode}.
 *
 * <p>Error code convention: {@code SCREAMING_SNAKE_CASE} string that clients
 * can switch on without parsing the human-readable {@code message}.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ─── Domain Exceptions ────────────────────────────────────────────────────

    /**
     * 403 – caller is authenticated but lacks the required project role.
     */
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ex.getMessage(), "FORBIDDEN"));
    }

    /**
     * 404 – requested document / resource was not found in the database.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage(), "RESOURCE_NOT_FOUND"));
    }

    // ─── Validation Exceptions ────────────────────────────────────────────────

    /**
     * 400 – bean-validation errors on {@code @Valid} / {@code @Validated} request bodies.
     * Collects all field errors into a single, comma-separated message.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", details);
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Validation failed: " + details, "VALIDATION_ERROR"));
    }

    /**
     * 400 – required query/path parameter is missing or has a wrong type.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParam(MissingServletRequestParameterException ex) {
        String message = "Required parameter '" + ex.getParameterName() + "' is missing";
        log.warn(message);
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(message, "MISSING_PARAMETER"));
    }

    /**
     * 400 – path variable or request parameter cannot be converted to its target type
     * (e.g. a non-numeric string where a {@code Long} is expected).
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = String.format("Parameter '%s' has invalid value: '%s'", ex.getName(), ex.getValue());
        log.warn(message);
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(message, "INVALID_PARAMETER"));
    }

    /**
     * 400 – request body is missing, malformed JSON, or cannot be deserialized.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException ex) {
        log.warn("Malformed request body: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Request body is missing or malformed", "MALFORMED_REQUEST"));
    }

    // ─── File Upload Exceptions ───────────────────────────────────────────────

    /**
     * 413 – uploaded file exceeds the configured {@code spring.servlet.multipart.max-file-size}
     * or {@code spring.servlet.multipart.max-request-size} limit.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.warn("Upload size exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.error("File size exceeds the maximum allowed limit", "FILE_TOO_LARGE"));
    }

    // ─── HTTP-Level Exceptions ────────────────────────────────────────────────

    /**
     * 405 – HTTP method not supported for the requested endpoint.
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        String message = "HTTP method '" + ex.getMethod() + "' is not supported for this endpoint";
        log.warn(message);
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.error(message, "METHOD_NOT_ALLOWED"));
    }

    /**
     * 415 – Content-Type sent by the client is not supported.
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnsupportedMedia(HttpMediaTypeNotSupportedException ex) {
        String message = "Content type '" + ex.getContentType() + "' is not supported";
        log.warn(message);
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(ApiResponse.error(message, "UNSUPPORTED_MEDIA_TYPE"));
    }

    /**
     * 404 – no handler mapped to the requested URL.
     * Requires {@code spring.mvc.throw-exception-if-no-handler-found=true} and
     * {@code spring.web.resources.add-mappings=false} to be effective.
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoHandler(NoHandlerFoundException ex) {
        String message = "No endpoint found for " + ex.getHttpMethod() + " " + ex.getRequestURL();
        log.warn(message);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(message, "ENDPOINT_NOT_FOUND"));
    }

    // ─── Catch-All ────────────────────────────────────────────────────────────

    /**
     * 500 – any unhandled exception falls through to here.
     * The real cause is logged server-side; only a generic message is returned
     * to the client to avoid leaking internal implementation details.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred. Please try again later.", "INTERNAL_SERVER_ERROR"));
    }
}
