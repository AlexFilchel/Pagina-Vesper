package org.vesper.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.vesper.constantes.JwtConstantes;
import org.vesper.entity.Rol;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    private Key obtenerKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    /**
     * Genera token JWT para login incluyendo el rol del usuario como claim
     */
    public String generateToken(UserDetails userDetails, String rol) {
        return Jwts.builder()
                .setSubject(userDetails.getUsername())
                .claim("rol", rol) // claim con rol
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JwtConstantes.JWT_EXPIRATION_TIME)) // 7 días
                .signWith(obtenerKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Obtener username (email) desde token
     */
    public String obtenerUsername(String token) {
        return obtenerClaim(token, Claims::getSubject);
    }

    /**
     * Obtener rol como String desde token
     */
    public String obtenerRol(String token) {
        return obtenerClaim(token, claims -> claims.get("rol", String.class));
    }

    /**
     * Obtener rol como Enum desde token
     */
    public Rol obtenerRolEnum(String token) {
        String rolStr = obtenerRol(token);
        return Rol.valueOf(rolStr);
    }

    public <T> T obtenerClaim(String token, Function<Claims, T> claimsTFunction) {
        final Claims claims = obtenerTodosLosClaims(token);
        return claimsTFunction.apply(claims);
    }

    private Claims obtenerTodosLosClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(obtenerKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String email = obtenerUsername(token);
        return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return obtenerClaim(token, Claims::getExpiration).before(new Date());
    }

    // ------------------- Password Reset -------------------

    public String generatePasswordResetToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim("reset", true) // identificador de que es para reset
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000)) // 15 min
                .signWith(obtenerKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isPasswordResetToken(String token) {
        Claims claims = obtenerTodosLosClaims(token);
        Boolean resetFlag = claims.get("reset", Boolean.class);
        return resetFlag != null && resetFlag;
    }
}
