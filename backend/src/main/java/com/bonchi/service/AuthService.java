package com.bonchi.service;

import com.bonchi.dto.AuthDto;
import com.bonchi.entity.User;
import com.bonchi.repository.UserRepository;
import com.bonchi.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthDto.LoginResponse login(AuthDto.LoginRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }

        User user = userRepository.findByUsername(request.getUsername().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException("User account is inactive");
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                throw new IllegalArgumentException("Invalid username or password");
            }
        }

        String token = tokenProvider.generateToken(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getName(),
                user.getPhone()
        );

        AuthDto.UserResponse userResponse = AuthDto.UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .phone(user.getPhone())
                .avatar_url(user.getAvatarUrl())
                .build();

        return AuthDto.LoginResponse.builder()
                .token(token)
                .access_token(token)
                .user(userResponse)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthDto.UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return AuthDto.UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .phone(user.getPhone())
                .avatar_url(user.getAvatarUrl())
                .build();
    }
}
