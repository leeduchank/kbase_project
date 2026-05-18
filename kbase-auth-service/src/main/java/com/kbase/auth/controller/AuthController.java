package com.kbase.auth.controller;

import com.kbase.auth.dto.*;
import com.kbase.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Register users, sign in, refresh tokens, sign out, and manage user accounts.")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user account and returns authentication tokens for the newly registered user.")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody RegisterRequest request) {
        log.info("Register request for email: {}", request.getEmail());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in", description = "Authenticates a user by email and password, then returns an access token and refresh token.")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody LoginRequest request) {
        log.info("Login request for email: {}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    /**
     * Refresh access token using a valid refresh token.
     * Returns a new access token + rotated refresh token.
     * This is a PUBLIC endpoint (no auth needed — the refresh token IS the auth).
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh tokens", description = "Uses a valid refresh token to issue a new access token and rotated refresh token.")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@RequestBody RefreshTokenRequest request) {
        log.info("Token refresh request");
        AuthResponse response = authService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    /**
     * Logout: revoke the provided refresh token.
     * This is a PUBLIC endpoint so the client can logout even with an expired access token.
     */
    @PostMapping("/logout")
    @Operation(summary = "Sign out", description = "Revokes the provided refresh token so it can no longer be used to obtain new access tokens.")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody LogoutRequest request) {
        log.info("Logout request");
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @GetMapping("/internal/users/{id}/exists")
    @Operation(summary = "Find an internal user", description = "Internal service endpoint that checks whether a user exists and returns minimal user details for service-to-service workflows.")
    public ResponseEntity<UserInternalDTO> checkUserExists(@PathVariable String id) {
        return authService.findUserForInternal(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Get user by ID", description = "Returns a user profile by its numeric identifier.")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto user = authService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @GetMapping("/users")
    @Operation(summary = "List users", description = "Returns all user profiles. Intended for authenticated administrative or internal views.")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUsers() {
        List<UserDto> userDtoList = authService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(userDtoList));
    }

    @GetMapping("/users/email/{email}")
    @Operation(summary = "Get user by email", description = "Returns a user profile that matches the provided email address.")
    public ResponseEntity<ApiResponse<UserDto>> getUserByEmail(@PathVariable String email) {
        UserDto user = authService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update user profile", description = "Updates editable profile fields for a user account.")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(@PathVariable Long id, @RequestBody UpdateProfileRequest request) {
        log.info("Update request for user id: {}", id);
        UserDto updatedUser = authService.updateProfile(id, request);
        return ResponseEntity.ok(ApiResponse.success("User profile updated successfully", updatedUser));
    }

    @PatchMapping("/users/{id}/deactivate")
    @Operation(summary = "Deactivate user", description = "Disables a user account and prevents the user from accessing protected APIs.")
    public ResponseEntity<ApiResponse<UserDto>> deactivateUser(@PathVariable Long id) {
        log.info("Deactivate request for user id: {}", id);
        UserDto deactivatedUser = authService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deactivated successfully", deactivatedUser));
    }

    @PatchMapping("/users/{id}/activate")
    @Operation(summary = "Activate user", description = "Re-enables a previously deactivated user account.")
    public ResponseEntity<ApiResponse<UserDto>> activateUser(@PathVariable Long id) {
        log.info("Activate request for user id: {}", id);
        UserDto activatedUser = authService.activateUser(id);
        return ResponseEntity.ok(ApiResponse.success("User activated successfully", activatedUser));
    }
}
