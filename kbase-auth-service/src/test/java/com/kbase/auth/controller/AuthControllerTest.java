package com.kbase.auth.controller;

import com.kbase.auth.dto.AuthResponse;
import com.kbase.auth.dto.LoginRequest;
import com.kbase.auth.dto.LogoutRequest;
import com.kbase.auth.dto.RefreshTokenRequest;
import com.kbase.auth.dto.RegisterRequest;
import com.kbase.auth.dto.UpdateProfileRequest;
import com.kbase.auth.dto.UserDto;
import com.kbase.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void registerReturnsCreatedResponse() {
        RegisterRequest request = RegisterRequest.builder().email("user@example.com").build();
        AuthResponse authResponse = AuthResponse.builder().token("token").build();
        when(authService.register(request)).thenReturn(authResponse);

        var response = authController.register(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData()).isSameAs(authResponse);
    }

    @Test
    void loginRefreshAndLogoutDelegateToService() {
        LoginRequest login = LoginRequest.builder().email("user@example.com").build();
        RefreshTokenRequest refresh = new RefreshTokenRequest();
        refresh.setRefreshToken("refresh-token");
        LogoutRequest logout = new LogoutRequest();
        logout.setRefreshToken("refresh-token");
        when(authService.login(login)).thenReturn(AuthResponse.builder().token("token").build());
        when(authService.refreshAccessToken("refresh-token")).thenReturn(AuthResponse.builder().token("new-token").build());

        assertThat(authController.login(login).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(authController.refreshToken(refresh).getBody().getData().getToken()).isEqualTo("new-token");
        assertThat(authController.logout(logout).getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(authService).logout("refresh-token");
    }

    @Test
    void userEndpointsReturnServiceData() {
        UserDto user = UserDto.builder().id(1L).email("user@example.com").build();
        when(authService.findUserForInternal("1")).thenReturn(Optional.empty());
        when(authService.getUserById(1L)).thenReturn(user);
        when(authService.getAllUsers()).thenReturn(List.of(user));
        when(authService.getUserByEmail("user@example.com")).thenReturn(user);
        when(authService.updateProfile(org.mockito.Mockito.eq(1L), org.mockito.Mockito.any(UpdateProfileRequest.class))).thenReturn(user);
        when(authService.deactivateUser(1L)).thenReturn(user);
        when(authService.activateUser(1L)).thenReturn(user);

        assertThat(authController.checkUserExists("1").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(authController.getUserById(1L).getBody().getData()).isSameAs(user);
        assertThat(authController.getUsers().getBody().getData()).containsExactly(user);
        assertThat(authController.getUserByEmail("user@example.com").getBody().getData()).isSameAs(user);
        assertThat(authController.updateUser(1L, UpdateProfileRequest.builder().fullName("User").build()).getBody().getData()).isSameAs(user);
        assertThat(authController.deactivateUser(1L).getBody().getData()).isSameAs(user);
        assertThat(authController.activateUser(1L).getBody().getData()).isSameAs(user);
    }
}
