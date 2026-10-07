package com.bonchi.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${bonchi.jwt.secret}") String secret,
            @Value("${bonchi.jwt.expiration-ms:86400000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public static String mapAppRoleToPgRole(String appRole) {
        if (appRole == null) return "anon";
        return switch (appRole.toLowerCase()) {
            case "owner" -> "bonchi_owner";
            case "manager" -> "bonchi_manager";
            case "staff" -> "bonchi_staff";
            default -> "anon";
        };
    }

    public String generateToken(Long userId, String username, String role, String name, String phone) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);
        String pgRole = mapAppRoleToPgRole(role);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", pgRole)
                .claim("app_role", role)
                .claim("username", username)
                .claim("name", name)
                .claim("phone", phone)
                .audience().add("postgrest").and()
                .issuer("bonchi-auth")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
