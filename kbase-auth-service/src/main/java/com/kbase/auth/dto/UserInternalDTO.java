package com.kbase.auth.dto;

public record UserInternalDTO(
        String id,
        String email,
        String fullName
) {}