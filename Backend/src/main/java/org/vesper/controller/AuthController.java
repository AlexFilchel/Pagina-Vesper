package org.vesper.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.UserResponse;
import org.vesper.dto.UserRequest;
import org.vesper.service.AuthService;
import jakarta.validation.Valid;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // =========================================================
    // 🟡 ENDPOINTS DE USUARIO (requieren login)
    // =========================================================

    /**
     * Registra al usuario autenticado en la base de datos si aún no existe.
     */
    @PostMapping("/user/registrar")
    public ResponseEntity<?> registrarUsuario(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0Id = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");
        String nombre = jwt.getClaimAsString("name");
        String nickname = jwt.getClaimAsString("nickname");

        UserResponse user = authService.registrarUsuario(auth0Id, email, nombre, nickname);
        return ResponseEntity.ok(Map.of("id", user.getId()));
    }

    /**
     * Devuelve la información del usuario autenticado.
     */
    @GetMapping("/user/perfil")
    public ResponseEntity<UserResponse> obtenerPerfilUsuario(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0Id = jwt.getClaimAsString("sub");

        UserResponse perfil = authService.obtenerPerfil(auth0Id);
        return ResponseEntity.ok(perfil);
    }

    @PutMapping("/user/perfil")
    public ResponseEntity<UserResponse> completarPerfil(
        Authentication authentication,
        @RequestBody @Valid UserRequest request) {

    Jwt jwt = (Jwt) authentication.getPrincipal();
    String auth0Id = jwt.getClaimAsString("sub");

    UserResponse actualizado = authService.actualizarPerfil(auth0Id, request);
    return ResponseEntity.ok(actualizado);
}


    
}
