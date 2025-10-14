package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.DomicilioRequest;
import org.vesper.dto.DomicilioResponse;
import org.vesper.service.DomicilioService;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestión de domicilios (direcciones de usuarios).
 * Estructura dividida por niveles de acceso:
 * - /api/user/...   → acceso con sesión
 * - /api/admin/...  → acceso restringido a ADMIN
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DomicilioController {

    private final DomicilioService domicilioService;

    // =========================================================
    // 🟡 ENDPOINTS DE USUARIO (requieren login)
    // =========================================================

    /**
     * Lista todos los domicilios del usuario autenticado.
     */
    @GetMapping("/user/domicilios")
    public ResponseEntity<List<DomicilioResponse>> listarDomiciliosUsuario(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0Id = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(domicilioService.listarPorAuth0Id(auth0Id));
    }

    /**
     * Crea un nuevo domicilio para el usuario autenticado.
     * Si el usuario no existe, se crea automáticamente con datos temporales.
     */
    @PostMapping("/user/domicilios")
    public ResponseEntity<DomicilioResponse> crearDomicilioUsuario(
            Authentication authentication,
            @Valid @RequestBody DomicilioRequest request) {

        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0Id = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email"); // 👈 extrae email del token si está disponible

        DomicilioResponse response = domicilioService.agregarDomicilioPorAuth0Id(auth0Id, email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Actualiza un domicilio existente del usuario autenticado.
     */
    @PutMapping("/user/domicilios/{domicilioId}")
    public ResponseEntity<DomicilioResponse> actualizarDomicilioUsuario(
            Authentication authentication,
            @PathVariable Long domicilioId,
            @Valid @RequestBody DomicilioRequest request) {

        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0Id = jwt.getClaimAsString("sub");

        return ResponseEntity.ok(domicilioService.actualizarDomicilioPorAuth0Id(auth0Id, domicilioId, request));
    }

    /**
     * Elimina un domicilio del usuario autenticado.
     */
    @DeleteMapping("/user/domicilios/{domicilioId}")
    public ResponseEntity<Map<String, String>> eliminarDomicilioUsuario(
            Authentication authentication,
            @PathVariable Long domicilioId) {

        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0Id = jwt.getClaimAsString("sub");

        domicilioService.eliminarDomicilioPorAuth0Id(auth0Id, domicilioId);
        return ResponseEntity.ok(Map.of("message", "Domicilio eliminado correctamente"));
    }

    // =========================================================
    // 🔴 ENDPOINTS DE ADMIN (requieren rol ADMIN)
    // =========================================================

    /**
     * Lista todos los domicilios registrados (solo administradores).
     */
    @GetMapping("/admin/domicilios")
    public ResponseEntity<List<DomicilioResponse>> listarDomiciliosAdmin() {
        return ResponseEntity.ok(domicilioService.listarTodos());
    }

    /**
     * Elimina un domicilio por su ID (solo administradores).
     */
    @DeleteMapping("/admin/domicilios/{domicilioId}")
    public ResponseEntity<Map<String, String>> eliminarDomicilioAdmin(@PathVariable Long domicilioId) {
        domicilioService.eliminarPorAdmin(domicilioId);
        return ResponseEntity.ok(Map.of("message", "Domicilio eliminado por administrador"));
    }
}
