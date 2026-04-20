package com.kbase.auth.service;

import com.kbase.auth.dto.AuthResponse;
import com.kbase.auth.dto.LoginRequest;
import com.kbase.auth.dto.RegisterRequest;
import com.kbase.auth.dto.UserDto;
import com.kbase.auth.entity.User;
import com.kbase.auth.event.SqsEventPublisher;
import com.kbase.auth.event.UserDeletedEvent;
import com.kbase.auth.repository.UserRepository;
import com.kbase.auth.exception.ResourceNotFoundException;
import com.kbase.auth.util.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final SqsEventPublisher sqsEventPublisher;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider, SqsEventPublisher sqsEventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.sqsEventPublisher = sqsEventPublisher;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(User.Role.USER)
                .active(true)
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully: {}", user.getEmail());

        String token = jwtTokenProvider.generateToken(
                user.getId().toString(),
                user.getEmail(),
                user.getRole().toString()
        );

        return AuthResponse.builder()
                .token(token)
                .user(UserDto.fromEntity(user))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.getEmail()));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }

        if (!user.getActive()) {
            throw new IllegalArgumentException("User account is inactive");
        }

        String token = jwtTokenProvider.generateToken(
                user.getId().toString(),
                user.getEmail(),
                user.getRole().toString()
        );

        log.info("User logged in successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(UserDto.fromEntity(user))
                .build();
    }

    /**
     * Get user by ID.
     * - ADMIN: can view any user
     * - USER/OWNER: can only view their own profile (id must match principal)
     */
    @PreAuthorize("hasRole('ADMIN') or #id.toString() == authentication.principal")
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserDto.fromEntity(user);
    }

    /**
     * Get all users - ADMIN only
     */
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> getAllUsers() {
        List<User> userList = userRepository.findAll();
        List<UserDto> userDtoList = new ArrayList<>();
        for (User user : userList) {
            userDtoList.add(UserDto.fromEntity(user));
        }
        return userDtoList;
    }

    /**
     * Get user by email.
     * - ADMIN: can view any user
     * - USER/OWNER: can only view their own profile (checked after fetching via returnObject)
     */
    @PostAuthorize("hasRole('ADMIN') or returnObject.id.toString() == authentication.principal")
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return UserDto.fromEntity(user);
    }

    /**
     * Delete user by ID - ADMIN only.
     * After deletion, publishes a USER_DELETED event to SQS
     * so other services (e.g. project-service) can clean up references.
     */
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String email = user.getEmail();
        userRepository.delete(user);
        log.info("User deleted successfully: {} (id: {})", email, id);

        // Publish event to SQS for other services to clean up
        sqsEventPublisher.publishUserDeletedEvent(
                UserDeletedEvent.of(id.toString(), email)
        );
    }
}
