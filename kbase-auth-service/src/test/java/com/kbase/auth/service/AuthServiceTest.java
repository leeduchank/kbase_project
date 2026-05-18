package com.kbase.auth.service;

import com.kbase.auth.dto.AuthResponse;
import com.kbase.auth.dto.LoginRequest;
import com.kbase.auth.dto.RefreshTokenRequest;
import com.kbase.auth.dto.RegisterRequest;
import com.kbase.auth.dto.UpdateProfileRequest;
import com.kbase.auth.entity.User;
import com.kbase.auth.entity.RefreshToken;
import com.kbase.auth.event.SqsEventPublisher;
import com.kbase.auth.repository.UserRepository;
import com.kbase.auth.util.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private SqsEventPublisher sqsEventPublisher;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private GatewayBlacklistService gatewayBlacklistService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerCreatesUserAndReturnsTokens() {
        RegisterRequest request = RegisterRequest.builder()
                .email("user@example.com")
                .password("plain-password")
                .fullName("Test User")
                .build();

        User savedUser = User.builder()
                .id(10L)
                .email(request.getEmail())
                .password("encoded-password")
                .fullName(request.getFullName())
                .role(User.Role.USER)
                .active(true)
                .build();

        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateToken("10", request.getEmail(), "USER")).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken(10L)).thenReturn("refresh-token");

        AuthResponse response = authService.register(request);

        assertThat(response.getToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPassword()).isEqualTo("encoded-password");
        assertThat(userCaptor.getValue().getRole()).isEqualTo(User.Role.USER);
        assertThat(userCaptor.getValue().getActive()).isTrue();
    }

    @Test
    void registerRejectsDuplicateEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .email("user@example.com")
                .password("plain-password")
                .fullName("Test User")
                .build();

        when(userRepository.findByEmail(request.getEmail()))
                .thenReturn(Optional.of(User.builder().email(request.getEmail()).build()));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email already exists");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginRejectsInactiveUser() {
        LoginRequest request = LoginRequest.builder()
                .email("inactive@example.com")
                .password("plain-password")
                .build();

        User inactiveUser = User.builder()
                .id(11L)
                .email(request.getEmail())
                .password("encoded-password")
                .fullName("Inactive User")
                .role(User.Role.USER)
                .active(false)
                .build();

        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(inactiveUser));
        when(passwordEncoder.matches(request.getPassword(), inactiveUser.getPassword())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User account is inactive");

        verify(jwtTokenProvider, never()).generateToken(any(), any(), any());
        verify(refreshTokenService, never()).createRefreshToken(any());
    }

    @Test
    void loginReturnsTokensForActiveUser() {
        LoginRequest request = LoginRequest.builder()
                .email("active@example.com")
                .password("plain-password")
                .build();
        User user = User.builder()
                .id(12L)
                .email(request.getEmail())
                .password("encoded-password")
                .fullName("Active User")
                .role(User.Role.ADMIN)
                .active(true)
                .build();
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPassword())).thenReturn(true);
        when(jwtTokenProvider.generateToken("12", request.getEmail(), "ADMIN")).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken(12L)).thenReturn("refresh-token");

        AuthResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getUser().getRole()).isEqualTo("ADMIN");
    }

    @Test
    void refreshAccessTokenRotatesRefreshToken() {
        RefreshToken refreshToken = RefreshToken.builder()
                .token("old-refresh")
                .userId(12L)
                .revoked(false)
                .build();
        User user = User.builder()
                .id(12L)
                .email("active@example.com")
                .password("encoded-password")
                .fullName("Active User")
                .role(User.Role.USER)
                .active(true)
                .build();
        when(refreshTokenService.validateRefreshToken("old-refresh")).thenReturn(Optional.of(refreshToken));
        when(userRepository.findById(12L)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateToken("12", user.getEmail(), "USER")).thenReturn("new-access");
        when(refreshTokenService.rotateRefreshToken(refreshToken)).thenReturn("new-refresh");

        AuthResponse response = authService.refreshAccessToken("old-refresh");

        assertThat(response.getToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
    }

    @Test
    void refreshAccessTokenRevokesAllTokensWhenUserIsInactive() {
        RefreshToken refreshToken = RefreshToken.builder()
                .token("old-refresh")
                .userId(12L)
                .revoked(false)
                .build();
        User inactiveUser = User.builder()
                .id(12L)
                .email("inactive@example.com")
                .fullName("Inactive User")
                .role(User.Role.USER)
                .active(false)
                .build();
        when(refreshTokenService.validateRefreshToken("old-refresh")).thenReturn(Optional.of(refreshToken));
        when(userRepository.findById(12L)).thenReturn(Optional.of(inactiveUser));

        assertThatThrownBy(() -> authService.refreshAccessToken("old-refresh"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User account is inactive");

        verify(refreshTokenService).revokeAllTokensForUser(12L);
    }

    @Test
    void findUserForInternalReturnsEmptyForInvalidId() {
        assertThat(authService.findUserForInternal("not-a-number")).isEmpty();
    }

    @Test
    void updateProfileTrimsFullName() {
        User user = User.builder()
                .id(12L)
                .email("active@example.com")
                .fullName("Old Name")
                .role(User.Role.USER)
                .active(true)
                .build();
        when(userRepository.findById(12L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        authService.updateProfile(12L, UpdateProfileRequest.builder().fullName("  New Name  ").build());

        assertThat(user.getFullName()).isEqualTo("New Name");
    }

    @Test
    void deactivateUserRevokesTokensBlacklistsUserAndPublishesEvent() {
        User user = User.builder()
                .id(12L)
                .email("active@example.com")
                .fullName("Active User")
                .role(User.Role.USER)
                .active(true)
                .build();
        when(userRepository.findById(12L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        authService.deactivateUser(12L);

        assertThat(user.getActive()).isFalse();
        verify(refreshTokenService).revokeAllTokensForUser(12L);
        verify(gatewayBlacklistService).blacklistUser("12");
        verify(sqsEventPublisher).publishUserDeactivatedEvent(any());
    }

    @Test
    void activateUserRemovesBlacklist() {
        User user = User.builder()
                .id(12L)
                .email("inactive@example.com")
                .fullName("Inactive User")
                .role(User.Role.USER)
                .active(false)
                .build();
        when(userRepository.findById(12L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        authService.activateUser(12L);

        assertThat(user.getActive()).isTrue();
        verify(gatewayBlacklistService).removeFromBlacklist("12");
    }
}
