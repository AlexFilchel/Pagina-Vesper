package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.vesper.dto.*;
import org.vesper.service.EmailService;
import org.vesper.service.JwtService;
import org.vesper.service.UsuarioService;

import java.util.List;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class UsuarioController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UsuarioService usuarioService;
    private final EmailService emailService;

    /**
     * Endpoint para login de usuario.
     * Valida credenciales usando Spring Security y genera un JWT.
     *
     * @param request DTO con email y password
     * @return JWT, username y roles
     */
    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserDetails user = (UserDetails) authentication.getPrincipal();

        String token = jwtService.generateToken(user);

        List<String> roles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return ResponseEntity.ok(new JwtResponse(token, user.getUsername(), roles));
    }

    /**
     * Endpoint para registrar un nuevo usuario.
     * La lógica de creación se delega al UsuarioService.
     * Excepciones como AlreadyExistsException se manejan en GlobalExceptionHandler.
     *
     * @param request DTO con los datos del usuario
     * @return Mensaje de éxito
     */
    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request){
        usuarioService.registrarUsuario(request);
        return ResponseEntity.ok("Usuario registrado correctamente");
    }

    /**
     * Endpoint para solicitar recuperación de contraseña.
     * Genera un token de recuperación y envía el link por email.
     * Excepciones como ResourceNotFoundException se manejan en GlobalExceptionHandler.
     *
     * @param request DTO con el email del usuario
     * @return Mensaje con el link de recuperación (para pruebas)
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String resetToken = usuarioService.generarTokenRecuperacion(request.getEmail(), jwtService);
        String resetLink = "http://127.0.0.1:5500/reset-password.html?token=" + resetToken;
        usuarioService.enviarEmailRecuperacion(request.getEmail(), resetLink, emailService);
        return ResponseEntity.ok("Link de recuperación: " + resetLink);
    }

    /**
     * Endpoint para resetear la contraseña con token válido.
     * Valida token usando JwtService y actualiza la contraseña.
     *
     * @param request DTO con token y nueva contraseña
     * @return Mensaje de éxito
     */
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        if (!jwtService.isPasswordResetToken(request.getToken())) {
            return ResponseEntity.badRequest().body("Token inválido para resetear contraseña");
        }

        String email = jwtService.obtenerUsername(request.getToken());
        usuarioService.actualizarPassword(email, request.getNewPassword());

        return ResponseEntity.ok("Contraseña actualizada correctamente");
    }
}
