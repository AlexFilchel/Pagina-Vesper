package org.vesper.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.vesper.constantes.JwtConstantes;

import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    private Key obtenerKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    // ======================= GENERACIÓN DE TOKENS =======================

    /**
     * Genera un token JWT estándar para login,
     * incluyendo los roles del usuario en los claims.
     */
    public String generateToken(UserDetails userDetails) {
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return Jwts.builder()
                .setSubject(userDetails.getUsername())
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JwtConstantes.JWT_EXPIRATION_TIME))
                .signWith(obtenerKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Genera un token corto y seguro para recuperación de contraseña.
     */
    public String generatePasswordResetToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim("reset", true) // Marca el token como de "reset"
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000)) // 15 minutos
                .signWith(obtenerKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // ======================= VALIDACIÓN Y EXTRACCIÓN =======================

    /**
     * Extrae el email (subject) del token.
     */
    public String obtenerUsername(String token) {
        return obtenerClaim(token, Claims::getSubject);
    }

    /**
     * Verifica si un token pertenece al flujo de recuperación de contraseña.
     * Devuelve false si el token es inválido, manipulado o expiró.
     */
    public boolean isPasswordResetToken(String token) {
        try {
            Claims claims = obtenerTodosLosClaims(token);
            Boolean resetFlag = claims.get("reset", Boolean.class);
            return resetFlag != null && resetFlag;
        } catch (JwtException | IllegalArgumentException e) {
            // Token inválido o expirado
            return false;
        }
    }

    /**
     * Valida si el token pertenece al usuario indicado y no está expirado.
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        try {
            final String email = obtenerUsername(token);
            return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (JwtException e) {
            return false;
        }
    }

    // ======================= HELPERS PRIVADOS =======================

    private <T> T obtenerClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = obtenerTodosLosClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims obtenerTodosLosClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(obtenerKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private boolean isTokenExpired(String token) {
        return obtenerClaim(token, Claims::getExpiration).before(new Date());
    }
}
