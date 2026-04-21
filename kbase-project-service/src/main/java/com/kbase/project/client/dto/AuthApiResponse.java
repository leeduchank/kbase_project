package com.kbase.project.client.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO to deserialize auth-service API responses.
 * Mirrors the ApiResponse<T> structure from auth-service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthApiResponse {
    private boolean success;
    private String message;
    private Object data;
    private String errorCode;
}
