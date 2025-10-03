package org.vesper.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.vesper.service.JwtService;
import org.vesper.service.UserDetailsServiceImpl;
import org.vesper.exception.InvalidCredentialsException;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filerChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filerChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            final String username = jwtService.obtenerUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (!jwtService.validateToken(jwt, userDetails)) {
                    throw new InvalidCredentialsException("Token inválido o expirado");
                }

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

            filerChain.doFilter(request, response);

        } catch (io.jsonwebtoken.ExpiredJwtException |
                 io.jsonwebtoken.MalformedJwtException |
                 io.jsonwebtoken.SignatureException |
                 io.jsonwebtoken.UnsupportedJwtException |
                 IllegalArgumentException e) {

            // Lanza excepción para que tu GlobalExceptionHandler la capture
            throw new InvalidCredentialsException("Token inválido o expirado");
        } catch (Exception e) {
            // Cualquier otro error inesperado
            throw new InvalidCredentialsException("Error en la autenticación: " + e.getMessage());
        }
    }

}
